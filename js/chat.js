/* =========================================================================
   FIX DE ALTURA DINÂMICA
   Resolve o bug do bottom bar a ficar "encostado" / invisível no Chrome
   mobile quando a barra de endereço colapsa ou expande ao fazer scroll.
   100vh sozinho não acompanha essa mudança em tempo real; recalculamos
   --vh manualmente e usamos visualViewport quando disponível.
   ========================================================================= */
(function setupDynamicViewportHeight() {
    function applyVH() {
        const h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        document.documentElement.style.setProperty('--vh', (h * 0.01) + 'px');
    }
    applyVH();
    window.addEventListener('resize', applyVH);
    window.addEventListener('orientationchange', () => setTimeout(applyVH, 120));
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', applyVH);
        window.visualViewport.addEventListener('scroll', applyVH);
    }
})();

/* =========================================================================
   MODELO DE DADOS
   ========================================================================= */

class DisplayMessage {
    constructor(role, content = '', isStreaming = false, isThinking = false, thinkingContent = '') {
        this.role = role;
        this.content = content;
        this.isStreaming = isStreaming;
        this.isThinking = isThinking;
        this.thinkingContent = thinkingContent;
    }
}

/* =========================================================================
   ESTADO DO CHAT
   ========================================================================= */

class ChatState {
    constructor() {
        this.currentConversationId = '';
        this.currentConversationTitle = 'Nova conversa';
        this.titleGenerated = false;
        this.chatHistory = [];
        this.displayMessages = [];
        this.flashMode = false;
        this.thinkMoreMode = false;
        this.sheetsEnabled = false;
        this.isStreaming = false;
        this.listeners = [];
    }

    subscribe(fn) { this.listeners.push(fn); }
    notify() { this.listeners.forEach(fn => fn(this)); }

    addUserMessage(text) {
        this.chatHistory.push({ role: 'user', content: text });
        this.displayMessages.push(new DisplayMessage('user', text));
        this.notify();
    }

    addAssistantPlaceholder(thinking) {
        const msg = new DisplayMessage('assistant', '', true, thinking);
        this.displayMessages.push(msg);
        this.notify();
        return this.displayMessages.length - 1;
    }

    appendThinkToken(index, text) {
        const msg = this.displayMessages[index];
        if (!msg) return;
        msg.thinkingContent += text;
        this.notify();
    }

    appendToken(index, text) {
        const msg = this.displayMessages[index];
        if (!msg) return;
        msg.isThinking = false;
        msg.content += text;
        this.notify();
    }

    finishAssistantMessage(index, content, thinking) {
        const msg = this.displayMessages[index];
        if (!msg) return;
        msg.content = content;
        msg.isStreaming = false;
        msg.isThinking = false;
        msg.thinkingContent = thinking;
        this.chatHistory.push({ role: 'assistant', content });
        this.notify();
    }

    failAssistantMessage(index, errorText) {
        const msg = this.displayMessages[index];
        if (!msg) return;
        msg.content = errorText;
        msg.isStreaming = false;
        msg.isThinking = false;
        this.notify();
    }

    resetConversation() {
        this.currentConversationId = '';
        this.currentConversationTitle = 'Nova conversa';
        this.titleGenerated = false;
        this.chatHistory = [];
        this.displayMessages = [];
        this.notify();
    }

    loadConversation(conv) {
        this.currentConversationId = conv.id;
        this.currentConversationTitle = conv.title;
        this.titleGenerated = true;
        this.chatHistory = [...conv.messages];
        this.displayMessages = conv.messages.map(m => new DisplayMessage(m.role, m.content));
        this.notify();
    }

    toggleFlashMode() {
        this.flashMode = !this.flashMode;
        if (this.flashMode) this.thinkMoreMode = false;
        this.notify();
    }

    toggleThinkMoreMode() {
        this.thinkMoreMode = !this.thinkMoreMode;
        if (this.thinkMoreMode) this.flashMode = false;
        this.notify();
    }

    toggleSheets() {
        this.sheetsEnabled = !this.sheetsEnabled;
        this.notify();
    }
}

const chatState = new ChatState();

/* =========================================================================
   PREFERÊNCIAS DE WIDGETS (switches do modal "Edit")
   ========================================================================= */

const WIDGET_SETTINGS_KEY = 'ipc_widget_settings_v1';

function loadWidgetSettings() {
    try {
        const raw = localStorage.getItem(WIDGET_SETTINGS_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        return {};
    }
}

let widgetSettings = loadWidgetSettings();

function isWidgetEnabled(type) {
    return widgetSettings[type] !== false;
}

function setWidgetEnabled(type, enabled) {
    widgetSettings[type] = enabled;
    try { localStorage.setItem(WIDGET_SETTINGS_KEY, JSON.stringify(widgetSettings)); } catch (e) {}
}

/* =========================================================================
   RENDERIZAÇÃO DE MARKDOWN
   ========================================================================= */

const ALL_WIDGET_TYPES = new Set([
    'widget_table', 'widget_code', 'widget_bar', 'widget_pie',
    'widget_sheet', 'widget_market', 'widget_calendar', 'widget_timer',
    'widget_mindmap', 'widget_graph', 'widget_map'
]);

const WIDGET_META = {
    widget_table:    { label: 'Tabela',              icon: 'sheets',   color: '#2F7BF6' },
    widget_code:     { label: 'Código',              icon: 'extras',   color: '#6F5AF6' },
    widget_bar:      { label: 'Gráfico Barras',      icon: 'flash',    color: '#F59E0B' },
    widget_pie:      { label: 'Gráfico Pizza',       icon: 'hub',      color: '#EF4444' },
    widget_sheet:    { label: 'Folha Notas',         icon: 'sheets',   color: '#10B981' },
    widget_market:   { label: 'Mercado',             icon: 'database', color: '#059669' },
    widget_calendar: { label: 'Calendário',          icon: 'history',  color: '#8B5CF6' },
    widget_timer:    { label: 'Temporizador',        icon: 'record',   color: '#F97316' },
    widget_mindmap:  { label: 'Mapa Mental',         icon: 'brain',    color: '#EC4899' },
    widget_graph:    { label: 'Gráfico Matemático',  icon: 'find',     color: '#14B8A6' },
    widget_map:      { label: 'Mapa',                icon: 'web',      color: '#3B82F6' }
};

function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeAttr(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function renderMarkdown(rawText) {
    if (!rawText) return '';

    const codeBlocks = [];
    let text = rawText.replace(/```([\w_]*)[\r\n]+([\s\S]*?)```/g, (match, lang, code) => {
        const index = codeBlocks.length;
        codeBlocks.push({ lang: lang.trim(), code: code.replace(/\n$/, '') });
        return `\u0000CODEBLOCK${index}\u0000`;
    });

    const lines = text.split('\n');
    const resultParts = [];
    let listItems = [];
    let orderedItems = [];
    let paraLines = [];
    let inBlockquote = false;
    let blockquoteLines = [];

    const flushPara = () => {
        if (paraLines.length === 0) return;
        const joined = paraLines.join('\n');
        if (joined.trim()) resultParts.push(`<p class="md-para">${joined}</p>`);
        paraLines = [];
    };

    const flushList = () => {
        if (listItems.length === 0) return;
        const items = listItems.map(li => `<li class="md-li">${li}</li>`).join('');
        resultParts.push(`<ul class="md-list">${items}</ul>`);
        listItems = [];
    };

    const flushOrdered = () => {
        if (orderedItems.length === 0) return;
        const items = orderedItems.map(li => `<li class="md-li">${li}</li>`).join('');
        resultParts.push(`<ol class="md-olist">${items}</ol>`);
        orderedItems = [];
    };

    const flushBlockquote = () => {
        if (blockquoteLines.length === 0) return;
        const inner = blockquoteLines.join('<br>');
        resultParts.push(`<blockquote class="md-blockquote">${inner}</blockquote>`);
        blockquoteLines = [];
        inBlockquote = false;
    };

    for (let i = 0; i < lines.length; i++) {
        const raw = lines[i];
        const escaped = escapeHtml(raw);

        if (raw.trim() === '') {
            flushList();
            flushOrdered();
            flushBlockquote();
            flushPara();
            continue;
        }

        if (raw.trim().startsWith('\u0000CODEBLOCK')) {
            flushList();
            flushOrdered();
            flushBlockquote();
            flushPara();
            resultParts.push(raw.trim());
            continue;
        }

        // Headings
        const h4 = raw.match(/^####\s+(.+)/);
        const h3 = raw.match(/^###\s+(.+)/);
        const h2 = raw.match(/^##\s+(.+)/);
        const h1 = raw.match(/^#\s+(.+)/);
        if (h4 || h3 || h2 || h1) {
            flushList(); flushOrdered(); flushBlockquote(); flushPara();
            if (h4) { resultParts.push(`<h4 class="md-h4">${applyInline(escapeHtml(h4[1]))}</h4>`); continue; }
            if (h3) { resultParts.push(`<h3 class="md-h3">${applyInline(escapeHtml(h3[1]))}</h3>`); continue; }
            if (h2) { resultParts.push(`<h2 class="md-h2">${applyInline(escapeHtml(h2[1]))}</h2>`); continue; }
            if (h1) { resultParts.push(`<h1 class="md-h1">${applyInline(escapeHtml(h1[1]))}</h1>`); continue; }
        }

        // Horizontal rule
        if (/^(\*{3,}|-{3,}|_{3,})\s*$/.test(raw.trim())) {
            flushList(); flushOrdered(); flushBlockquote(); flushPara();
            resultParts.push(`<hr class="md-hr">`);
            continue;
        }

        // Blockquote
        const bqMatch = raw.match(/^>\s*(.*)/);
        if (bqMatch) {
            flushList(); flushOrdered(); flushPara();
            blockquoteLines.push(applyInline(escapeHtml(bqMatch[1])));
            inBlockquote = true;
            continue;
        }
        if (inBlockquote) { flushBlockquote(); }

        // Unordered list
        const listMatch = raw.match(/^(\s*)[-*+]\s+(.+)/);
        if (listMatch) {
            flushOrdered(); flushPara();
            listItems.push(applyInline(escapeHtml(listMatch[2])));
            continue;
        }

        // Ordered list
        const numMatch = raw.match(/^(\s*)\d+\.\s+(.+)/);
        if (numMatch) {
            flushList(); flushPara();
            orderedItems.push(applyInline(escapeHtml(numMatch[2])));
            continue;
        }

        // Paragraph
        flushList();
        flushOrdered();
        paraLines.push(applyInline(escaped));
    }

    flushList();
    flushOrdered();
    flushBlockquote();
    flushPara();

    text = resultParts.join('');

    text = text.replace(/\u0000CODEBLOCK(\d+)\u0000/g, (match, idx) => {
        const block = codeBlocks[Number(idx)];
        const lang = block.lang;

        if (ALL_WIDGET_TYPES.has(lang) && isWidgetEnabled(lang)) {
            return `<div class="native-widget" data-widget-type="${lang}" data-widget-json="${escapeAttr(block.code)}"></div>`;
        }

        const safeCode = escapeHtml(block.code);
        const langLabel = lang
            ? `<div class="code-block-header"><span class="code-lang-label">${escapeHtml(lang)}</span><button class="code-copy-btn pulse-tap" onclick="copyCodeBlock(this)" title="Copiar código"><span class="icon-mask" style="mask-image:url('assets/icons/svg/copy.svg');-webkit-mask-image:url('assets/icons/svg/copy.svg');width:13px;height:13px;background:currentColor;"></span></button></div>`
            : '';
        return `<div class="code-block-wrapper">${langLabel}<pre class="code-block"><code>${safeCode}</code></pre></div>`;
    });

    return text;
}

function applyInline(text) {
    // Bold
    text = text.replace(/\*\*\*([^*\n]+)\*\*\*/g, '<strong><em>$1</em></strong>');
    text = text.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__([^_\n]+)__/g, '<strong>$1</strong>');
    // Italic
    text = text.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');
    text = text.replace(/(?<!_)_([^_\n]+)_(?!_)/g, '<em>$1</em>');
    // Strikethrough
    text = text.replace(/~~([^~\n]+)~~/g, '<del>$1</del>');
    // Inline code
    text = text.replace(/`([^`\n]+)`/g, '<code class="inline-code">$1</code>');
    // Links
    text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
        '<a class="md-link" href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    // Mark/highlight
    text = text.replace(/==([^=\n]+)==/g, '<mark class="md-mark">$1</mark>');
    return text;
}

function copyCodeBlock(btn) {
    const pre = btn.closest('.code-block-wrapper')?.querySelector('code');
    if (!pre) return;
    navigator.clipboard.writeText(pre.textContent).then(() => showToast('Código copiado!')).catch(() => {});
}

/* =========================================================================
   PÁGINA DE CHAT
   ========================================================================= */

function renderChatPage() {
    const colors = getThemeColors();
    document.getElementById('app').innerHTML = `
    <div id="chatApp" class="h-full w-full flex flex-col relative overflow-hidden">

        <div class="app-bar-gradient ${isDarkMode ? 'dark' : 'light'}"></div>

        <div class="app-bar">
            <button id="menuBtn" class="pulse-tap circular w-10 h-10 ml-2 flex items-center justify-center" style="color: ${colors.iconTint}">
                <span class="icon-mask" style="mask-image: url('assets/icons/svg/menu.svg'); -webkit-mask-image: url('assets/icons/svg/menu.svg'); width: 18px; height: 18px; background: ${colors.iconTint};"></span>
            </button>
            <span id="appBarTitle" class="text-sm font-semibold ml-2 hidden truncate" style="color: ${colors.textSecondary}; max-width: 180px; letter-spacing: 0.01em;">${MODEL_NAME}</span>
            <div class="flex-1"></div>
            <button id="newChatBtn" class="pulse-tap circular w-10 h-10 px-2 hidden" style="color: ${colors.iconTint}">
                <span class="icon-mask" style="mask-image: url('assets/icons/svg/new_chat.svg'); -webkit-mask-image: url('assets/icons/svg/new_chat.svg'); width: 17px; height: 17px; background: ${colors.iconTint};"></span>
            </button>
            <button id="moreBtn" class="pulse-tap circular w-10 h-10 px-2 hidden" style="color: ${colors.iconTint}">
                <span class="icon-mask" style="mask-image: url('assets/icons/svg/more_vertical.svg'); -webkit-mask-image: url('assets/icons/svg/more_vertical.svg'); width: 16px; height: 16px; background: ${colors.iconTint};"></span>
            </button>
        </div>

        <div class="drawer-overlay" id="drawerOverlay"></div>

        <div class="drawer ${isDarkMode ? 'dark' : 'light'}" id="drawer">
            <div class="drawer-header">
                <div class="drawer-header-left">
                    <img src="assets/icons/png/logo.png" class="drawer-logo" alt="Logo" />
                    <div class="drawer-app-name" style="color: ${colors.drawerText}">Nexa</div>
                </div>
                <button id="newChatDrawerBtn" class="pulse-tap circular w-9 h-9 flex items-center justify-center" style="color: ${colors.iconTint}" title="Nova conversa">
                    <span class="icon-mask" style="mask-image: url('assets/icons/svg/new_chat.svg'); -webkit-mask-image: url('assets/icons/svg/new_chat.svg'); width: 17px; height: 17px; background: ${colors.iconTint};"></span>
                </button>
            </div>

            <div class="drawer-menu-section">
                <div class="drawer-menu-item pulse-tap" id="profileTile" style="color: ${colors.drawerText}">
                    <span class="icon-mask" style="mask-image: url('assets/icons/svg/user.svg'); -webkit-mask-image: url('assets/icons/svg/user.svg'); width: 18px; height: 18px; background: ${colors.iconTint};"></span>
                    <span class="drawer-menu-label">${authState.user?.name || 'Perfil'}</span>
                </div>
                <div class="drawer-menu-item pulse-tap" id="projectsDrawerBtn" style="color: ${colors.drawerText}">
                    <span class="icon-mask" style="mask-image: url('assets/icons/svg/bookmark.svg'); -webkit-mask-image: url('assets/icons/svg/bookmark.svg'); width: 18px; height: 18px; background: ${colors.iconTint};"></span>
                    <span class="drawer-menu-label">Projetos</span>
                </div>
                <div class="drawer-menu-item pulse-tap" id="extrasDrawerBtn" style="color: ${colors.drawerText}">
                    <span class="icon-mask" style="mask-image: url('assets/icons/svg/extras.svg'); -webkit-mask-image: url('assets/icons/svg/extras.svg'); width: 18px; height: 18px; background: ${colors.iconTint};"></span>
                    <span class="drawer-menu-label">Extras</span>
                </div>
                <div class="drawer-menu-item pulse-tap" id="settingsDrawerBtn" style="color: ${colors.drawerText}">
                    <span class="icon-mask" style="mask-image: url('assets/icons/svg/settings.svg'); -webkit-mask-image: url('assets/icons/svg/settings.svg'); width: 18px; height: 18px; background: ${colors.iconTint};"></span>
                    <span class="drawer-menu-label">Definições</span>
                </div>
            </div>

            <div class="drawer-section-divider" style="background: ${colors.divider}"></div>

            <div class="drawer-conv-section-header pulse-tap" id="convSectionToggle">
                <img src="assets/icons/png/chat.png" class="drawer-conv-section-icon" alt="" />
                <span class="drawer-conv-section-label" style="color: ${colors.settings_section_label}">CONVERSAS</span>
                <span class="icon-mask drawer-conv-chevron" id="convSectionChevron" style="mask-image: url('assets/icons/svg/chevron_right.svg'); -webkit-mask-image: url('assets/icons/svg/chevron_right.svg'); width: 11px; height: 11px; background: ${colors.settings_section_label}; transform: rotate(90deg);"></span>
            </div>

            <div class="drawer-conv-list-outer" id="conversationsListOuter">
                <div class="drawer-conv-list" id="conversationsList"></div>
            </div>
        </div>

        <div class="messages-container" id="messagesContainer">
            <div id="emptyState" class="flex flex-col items-center justify-start pt-20 min-h-full">
                <img src="assets/icons/png/logo.png" class="w-[72px] h-[72px] mb-4" alt="Logo" />
                <h1 id="greetingText" class="text-5xl font-bold text-center mb-2" style="font-family: 'TimesNewRoman', serif; color: ${colors.textPrimary}"></h1>
                <p class="text-base text-center" style="color: ${colors.textSecondary}">Em que estás a pensar?</p>
            </div>
            <div id="chatMessages" class="hidden"></div>
        </div>

        <div class="bottom-bar ${isDarkMode ? 'dark' : 'light'}" id="bottomBar">
            <textarea id="textInput" class="chat-input ${isDarkMode ? 'dark' : 'light'}" placeholder="Escreve aqui..." rows="1"></textarea>
            <div class="flex items-center h-[52px] px-[10px]">
                <button id="addBtn" class="pulse-tap circular w-10 h-10 ml-1 flex items-center justify-center rounded-full" style="background: ${colors.addCircleBg}; color: ${colors.iconTint}">
                    <span class="icon-mask" style="mask-image: url('assets/icons/svg/add.svg'); -webkit-mask-image: url('assets/icons/svg/add.svg'); width: 18px; height: 18px; background: ${colors.iconTint};"></span>
                </button>
                <div class="flex-1"></div>
                <button id="editBtn" class="flex items-center gap-1.5 px-3.5 py-2 rounded-full pulse-tap" style="background: ${colors.tabPreviewPillBg}; color: ${colors.textPrimary}">
                    <span class="icon-mask" style="mask-image: url('assets/icons/svg/preview_filled.svg'); -webkit-mask-image: url('assets/icons/svg/preview_filled.svg'); width: 20px; height: 20px; background: ${colors.textPrimary};"></span>
                    <span class="text-sm font-bold" style="color: ${colors.textPrimary}">Edit</span>
                </button>
                <div class="w-2"></div>
                <button id="sendBtn" class="pulse-tap circular w-10 h-10 flex items-center justify-center rounded-full hidden" style="background: ${colors.sendBtnColor}; color: ${colors.sendIconColor}">
                    <span class="icon-mask" style="mask-image: url('assets/icons/svg/ic_send_arrow.svg'); -webkit-mask-image: url('assets/icons/svg/ic_send_arrow.svg'); width: 15px; height: 15px; background: ${colors.sendIconColor};"></span>
                </button>
                <button id="micBtn" class="pulse-tap circular w-10 h-10 flex items-center justify-center rounded-full" style="background: ${colors.sendBtnColor}; color: ${colors.sendIconColor}">
                    <span class="icon-mask" style="mask-image: url('assets/icons/svg/record.svg'); -webkit-mask-image: url('assets/icons/svg/record.svg'); width: 18px; height: 18px; background: ${colors.sendIconColor};"></span>
                </button>
            </div>
        </div>
    </div>
    <div class="modal-overlay" id="modalOverlay"></div>
    <div class="modal-sheet" id="modalSheet">
        <div id="modalSheetContent"></div>
    </div>`;

    const hour = new Date().getHours();
    document.getElementById('greetingText').textContent =
        hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

    bindChatEvents();
    updateChatUI();
}

/* =========================================================================
   EVENTOS
   ========================================================================= */

function bindChatEvents() {
    document.getElementById('menuBtn').onclick = () => toggleDrawer();
    document.getElementById('drawerOverlay').onclick = () => closeDrawer();

    document.getElementById('profileTile').onclick = () => { closeDrawer(); renderSettingsPage(); };
    document.getElementById('newChatDrawerBtn').onclick = () => { chatState.resetConversation(); closeDrawer(); };
    document.getElementById('projectsDrawerBtn').onclick = () => { closeDrawer(); showToast('Projetos em breve'); };
    document.getElementById('extrasDrawerBtn').onclick = () => { closeDrawer(); setTimeout(() => showExtrasSheet(), 300); };
    document.getElementById('settingsDrawerBtn').onclick = () => { closeDrawer(); renderSettingsPage(); };
    document.getElementById('convSectionToggle').onclick = () => toggleConversationsSection();

    document.getElementById('newChatBtn').onclick = () => chatState.resetConversation();
    document.getElementById('moreBtn').onclick = () => showAddPopup();
    document.getElementById('addBtn').onclick = () => showAddPopup();
    document.getElementById('editBtn').onclick = () => showEditModal();
    document.getElementById('sendBtn').onclick = () => {
        const text = document.getElementById('textInput').value;
        if (text.trim() && !chatState.isStreaming) sendMessage(text);
    };
    document.getElementById('micBtn').onclick = () => showToast('Funcionalidade de voz em breve');

    const textInput = document.getElementById('textInput');
    textInput.oninput = () => {
        updateSendButton();
        textInput.style.height = 'auto';
        textInput.style.height = Math.min(textInput.scrollHeight, 150) + 'px';
    };
    textInput.onkeydown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (textInput.value.trim() && !chatState.isStreaming) sendMessage(textInput.value);
        }
    };

    document.getElementById('modalOverlay').onclick = closeAllModals;
    chatState.subscribe(() => updateChatUI());
}

/* =========================================================================
   SECÇÃO COLAPSÁVEL "CONVERSAS"
   ========================================================================= */

let conversationsCollapsed = false;

function toggleConversationsSection() {
    conversationsCollapsed = !conversationsCollapsed;
    const outer = document.getElementById('conversationsListOuter');
    const chevron = document.getElementById('convSectionChevron');
    if (outer) outer.classList.toggle('collapsed', conversationsCollapsed);
    if (chevron) chevron.style.transform = conversationsCollapsed ? 'rotate(0deg)' : 'rotate(90deg)';
}

/* =========================================================================
   ATUALIZAÇÃO DE UI
   ========================================================================= */

function updateChatUI() {
    const hasMessages = chatState.displayMessages.length > 0;
    document.getElementById('appBarTitle').classList.toggle('hidden', !hasMessages);
    document.getElementById('newChatBtn').classList.toggle('hidden', !hasMessages);
    document.getElementById('moreBtn').classList.toggle('hidden', !hasMessages);
    document.getElementById('emptyState').style.display = hasMessages ? 'none' : 'flex';
    document.getElementById('chatMessages').classList.toggle('hidden', !hasMessages);

    renderMessages();
    renderConversationsList();
    updateSendButton();
    scrollToBottom();
}

function updateSendButton() {
    const hasText = document.getElementById('textInput')?.value.trim().length > 0;
    document.getElementById('sendBtn')?.classList.toggle('hidden', !hasText);
    document.getElementById('micBtn')?.classList.toggle('hidden', hasText);
}

function scrollToBottom() {
    const container = document.getElementById('messagesContainer');
    if (!container) return;
    requestAnimationFrame(() => { container.scrollTop = container.scrollHeight; });
    setTimeout(() => { container.scrollTop = container.scrollHeight; }, 100);
}

/* =========================================================================
   RENDERIZAÇÃO DE MENSAGENS
   ========================================================================= */

function renderMessages() {
    const colors = getThemeColors();
    const chatDiv = document.getElementById('chatMessages');
    if (!chatDiv) return;

    const messages = chatState.displayMessages;

    while (chatDiv.children.length > messages.length) {
        chatDiv.removeChild(chatDiv.lastChild);
    }

    messages.forEach((msg, idx) => {
        const existing = chatDiv.children[idx];
        const fresh = createMessageBubble(msg, idx, colors);

        if (!existing) {
            chatDiv.appendChild(fresh);
            mountNativeWidgets(fresh);
        } else {
            const isMounted = existing.querySelector('.native-widget[data-mounted]');
            const wasStreaming = existing.hasAttribute('data-streaming');
            const isNowStreaming = msg.isStreaming;

            if (isNowStreaming || (!isMounted && !isNowStreaming) || wasStreaming !== String(isNowStreaming)) {
                existing.setAttribute('data-streaming', String(isNowStreaming));
                if (msg.role === 'assistant' && isNowStreaming) {
                    const contentDiv = existing.querySelector('.assistant-content');
                    if (contentDiv) {
                        contentDiv.innerHTML = renderMarkdown(msg.content);
                        const thinkBadge = existing.querySelector('.thinking-badge');
                        if (msg.thinkingContent && !thinkBadge) {
                            existing.insertBefore(buildThinkingBadge(msg.thinkingContent, colors), contentDiv);
                        }
                    } else {
                        chatDiv.replaceChild(fresh, existing);
                        mountNativeWidgets(fresh);
                    }
                } else {
                    chatDiv.replaceChild(fresh, existing);
                    mountNativeWidgets(fresh);
                }
            }
        }
    });
}

function mountNativeWidgets(container) {
    container.querySelectorAll('.native-widget:not([data-mounted])').forEach(el => {
        el.setAttribute('data-mounted', '1');
        const widgetType = el.getAttribute('data-widget-type');
        const rawJson    = el.getAttribute('data-widget-json');
        try {
            buildNativeWidget(widgetType, rawJson, el);
        } catch (e) {
            console.error('mountNativeWidgets error:', widgetType, e);
        }
    });
}

function rerenderAllAssistantContent() {
    const chatDiv = document.getElementById('chatMessages');
    if (!chatDiv) return;
    const colors = getThemeColors();
    chatDiv.innerHTML = '';
    chatState.displayMessages.forEach((msg, idx) => {
        const bubble = createMessageBubble(msg, idx, colors);
        chatDiv.appendChild(bubble);
        mountNativeWidgets(bubble);
    });
}

function createMessageBubble(msg, idx, colors) {
    const wrapper = document.createElement('div');

    if (msg.role === 'user') {
        wrapper.className = 'px-4 py-2 flex justify-end';
        const bubble = document.createElement('div');
        bubble.className = 'max-w-[82%] rounded-2xl px-4 py-3';
        bubble.style.cssText = `background-color: ${colors.userBubbleBg}; color: ${colors.textPrimary}; border-bottom-right-radius: 6px;`;
        const p = document.createElement('p');
        p.className = 'text-sm leading-relaxed whitespace-pre-wrap';
        p.style.margin = '0';
        p.textContent = msg.content;
        bubble.appendChild(p);
        wrapper.appendChild(bubble);

    } else {
        wrapper.className = 'px-4 pt-3 pb-1';
        wrapper.style.color = colors.textPrimary;
        if (msg.isStreaming) wrapper.setAttribute('data-streaming', 'true');

        if (msg.isStreaming && msg.isThinking && !msg.content && !msg.thinkingContent) {
            wrapper.appendChild(buildThinkingSkeleton(colors));
            return wrapper;
        }

        if (msg.isStreaming && msg.isThinking && msg.thinkingContent && !msg.content) {
            wrapper.appendChild(buildThinkingBadge(msg.thinkingContent, colors));
            wrapper.appendChild(buildThinkingSkeleton(colors));
            return wrapper;
        }

        if (msg.thinkingContent && !msg.isThinking) {
            wrapper.appendChild(buildThinkingBadge(msg.thinkingContent, colors));
        }

        const contentDiv = document.createElement('div');
        contentDiv.className = 'assistant-content';
        contentDiv.style.cssText = `font-size: 15px; line-height: 1.65; color: ${isDarkMode ? colors.textPrimary : '#232933'};`;
        contentDiv.innerHTML = renderMarkdown(msg.content);
        if (msg.isStreaming && msg.content) contentDiv.classList.add('cursor-blink');
        wrapper.appendChild(contentDiv);

        if (!msg.isStreaming && msg.content) {
            wrapper.appendChild(buildActionButtons(msg.content, colors));
        }
    }

    return wrapper;
}

function buildThinkingSkeleton(colors) {
    const container = document.createElement('div');
    container.style.cssText = 'padding: 4px 0;';
    const label = document.createElement('div');
    label.style.cssText = `font-size: 14px; color: ${colors.textSecondary}; margin-bottom: 8px;`;
    label.textContent = '🧠 A pensar…';
    container.appendChild(label);
    [0.85, 0.70, 0.55].forEach(fraction => {
        const bar = document.createElement('div');
        bar.className = 'thinking-bar';
        bar.style.cssText = `height: 12px; width: ${fraction * 100}%; max-width: ${fraction * 260}px; background: ${isDarkMode ? '#2a2a2e' : '#e5e7eb'}; border-radius: 6px; margin-bottom: 6px;`;
        container.appendChild(bar);
    });
    return container;
}

function buildThinkingBadge(thinkingContent, colors) {
    const div = document.createElement('div');
    div.className = 'thinking-badge';
    div.style.cssText = `font-size: 12px; font-style: italic; opacity: 0.6; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px dashed ${colors.divider}; color: ${colors.textSecondary};`;
    div.textContent = '💭 ' + thinkingContent;
    return div;
}

function buildActionButtons(content, colors) {
    const row = document.createElement('div');
    row.style.cssText = 'display: flex; align-items: center; gap: 2px; margin-top: 8px; padding-top: 2px;';

    const actions = [
        { icon: 'copy',        title: 'Copiar',    fn: () => copyMessageToClipboard(content) },
        { icon: 'thumbs_up',   title: 'Gosto',     fn: () => {} },
        { icon: 'thumbs_down', title: 'Não gosto', fn: () => {} },
        { icon: 'share',       title: 'Partilhar', fn: () => shareMessage(content) },
        { icon: 'regenerate',  title: 'Regenerar', fn: () => regenerateLastResponse() }
    ];

    actions.forEach(({ icon, title, fn }) => {
        const btn = document.createElement('button');
        btn.className = 'pulse-tap circular';
        btn.title = title;
        btn.style.cssText = `width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: transparent; border: none; cursor: pointer; color: ${colors.iconTintSecondary}; opacity: 0.65; padding: 0; flex-shrink: 0;`;
        btn.innerHTML = `<span class="icon-mask" style="mask-image: url('assets/icons/svg/${icon}.svg'); -webkit-mask-image: url('assets/icons/svg/${icon}.svg'); width: 17px; height: 17px; background: ${colors.iconTintSecondary};"></span>`;
        btn.onmouseenter = () => { btn.style.opacity = '1'; };
        btn.onmouseleave = () => { btn.style.opacity = '0.65'; };
        btn.onclick = fn;
        row.appendChild(btn);
    });

    return row;
}

function copyMessageToClipboard(content) {
    navigator.clipboard.writeText(content).then(() => {
        showToast('Copiado!');
    }).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = content;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('Copiado!');
    });
}

function shareMessage(content) {
    if (navigator.share) {
        navigator.share({ text: content }).catch(() => {});
    } else {
        copyMessageToClipboard(content);
        showToast('Copiado para partilha!');
    }
}

function regenerateLastResponse() {
    const lastUser = [...chatState.chatHistory].reverse().find(m => m.role === 'user');
    if (lastUser && !chatState.isStreaming) sendMessage(lastUser.content);
}

/* =========================================================================
   LISTA DE CONVERSAS (DRAWER)
   ========================================================================= */

function renderConversationsList() {
    const list = document.getElementById('conversationsList');
    if (!list) return;
    const colors = getThemeColors();
    list.innerHTML = '';

    if (conversations.length === 0) {
        const empty = document.createElement('div');
        empty.style.cssText = 'display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 24px; gap: 10px; opacity: 0.45;';
        empty.innerHTML = `
            <span class="icon-mask" style="mask-image: url('assets/icons/svg/new_chat.svg'); -webkit-mask-image: url('assets/icons/svg/new_chat.svg'); width: 28px; height: 28px; background: ${colors.textHint};"></span>
            <span style="font-size:13px; color:${colors.textHint}; text-align:center;">Ainda não há conversas</span>`;
        list.appendChild(empty);
        return;
    }

    conversations.forEach(conv => {
        const item = document.createElement('div');
        item.className = 'drawer-conv-item pulse-tap';
        const isActive = conv.id === chatState.currentConversationId;
        item.style.backgroundColor = isActive ? (colors.extrasCardActiveText + '12') : 'transparent';
        item.onclick = () => openConversation(conv);

        let pressTimer = null;
        let didLongPress = false;

        item.addEventListener('pointerdown', () => {
            didLongPress = false;
            pressTimer = setTimeout(() => { didLongPress = true; showConvOptionsSheet(conv); }, 500);
        });
        item.addEventListener('pointerup', () => { if (pressTimer) clearTimeout(pressTimer); });
        item.addEventListener('pointercancel', () => { if (pressTimer) clearTimeout(pressTimer); });
        item.addEventListener('pointermove', () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } });
        item.addEventListener('click', (e) => { if (didLongPress) { e.stopImmediatePropagation(); didLongPress = false; } }, true);

        if (conv.pinned) {
            const pinIcon = document.createElement('span');
            pinIcon.className = 'icon-mask drawer-conv-pin-icon';
            const pinColor = isActive ? colors.extrasCardActiveText : colors.iconTintSecondary;
            pinIcon.style.cssText = `mask-image: url('assets/icons/svg/pin_filled.svg'); -webkit-mask-image: url('assets/icons/svg/pin_filled.svg'); background: ${pinColor};`;
            item.appendChild(pinIcon);
        }

        const title = document.createElement('div');
        title.className = 'drawer-conv-title';
        title.style.color = isActive ? colors.extrasCardActiveText : colors.drawerText;
        title.textContent = conv.title;

        item.appendChild(title);
        list.appendChild(item);
    });
}

/* ── Modal de opções de conversa (redesenhado) ────────────────────────────── */
function showConvOptionsSheet(conv) {
    closeDrawer();
    const colors = getThemeColors();
    const content = document.getElementById('modalSheetContent');
    content.innerHTML = '';

    content.appendChild(buildSheetHandle(
        document.getElementById('modalSheet'),
        document.getElementById('modalOverlay'),
        closeModalSheet
    ));

    const dt = new Date(conv.updatedAt);
    const dateStr = dt.toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' });
    const timeStr = dt.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

    const header = document.createElement('div');
    header.className = 'conv-options-header';
    header.innerHTML = `
        <div class="conv-options-avatar" style="background:${colors.extrasCardActiveText}1A;">
            <span class="icon-mask" style="mask-image:url('assets/icons/svg/new_chat.svg'); -webkit-mask-image:url('assets/icons/svg/new_chat.svg'); width:16px; height:16px; background:${colors.extrasCardActiveText};"></span>
        </div>
        <div class="conv-options-header-text">
            <div class="conv-options-title" style="color:${colors.textPrimary};">${escapeHtml(conv.title)}</div>
            <div class="conv-options-subtitle" style="color:${colors.textSecondary};">${dateStr} · ${timeStr}</div>
        </div>`;
    content.appendChild(header);

    const card = document.createElement('div');
    card.className = 'conv-options-card';
    card.style.background = isDarkMode ? '#1C1C1E' : '#F2F2F7';
    content.appendChild(card);

    const options = [
        {
            icon: 'external', label: 'Abrir conversa', tint: colors.extrasCardActiveText, danger: false,
            action: () => { closeAllModals(); setTimeout(() => chatState.loadConversation(conv), 200); }
        },
        {
            icon: conv.pinned ? 'pin_filled' : 'pin',
            label: conv.pinned ? 'Desafixar conversa' : 'Fixar conversa',
            tint: colors.extrasCardActiveText, danger: false,
            action: async () => {
                closeAllModals();
                const previous = conv.pinned;
                conv.pinned = !conv.pinned;
                renderConversationsList();
                const token = authState.user?.token || '';
                try {
                    if (typeof AuthApiService.pinConversation === 'function') {
                        await AuthApiService.pinConversation(token, conv.id, conv.pinned);
                    }
                } catch (err) {
                    conv.pinned = previous;
                    renderConversationsList();
                    showToast('Não foi possível atualizar a conversa');
                }
            }
        },
        {
            icon: 'pen', label: 'Renomear', tint: colors.extrasCardActiveText, danger: false,
            action: () => showRenameDialog(conv)
        },
        {
            icon: 'share', label: 'Partilhar conversa', tint: colors.extrasCardActiveText, danger: false,
            action: () => { closeAllModals(); shareConversationText(conv); }
        },
        {
            icon: 'trash', label: 'Eliminar conversa', tint: '#EF4444', danger: true,
            action: () => { closeAllModals(); deleteConversation(conv); }
        }
    ];

    options.forEach((opt, i) => {
        if (i > 0) {
            const div = document.createElement('div');
            div.style.cssText = `height:1px; margin-left:60px; background:${colors.divider};`;
            card.appendChild(div);
        }
        const row = document.createElement('div');
        row.className = 'conv-options-row pulse-tap';
        row.onclick = opt.action;

        const iconCircle = document.createElement('span');
        iconCircle.className = 'conv-options-icon-circle';
        iconCircle.style.background = opt.tint + '1A';
        const icon = document.createElement('span');
        icon.className = 'icon-mask';
        icon.style.cssText = `mask-image:url('assets/icons/svg/${opt.icon}.svg'); -webkit-mask-image:url('assets/icons/svg/${opt.icon}.svg'); width:16px; height:16px; background:${opt.tint};`;
        iconCircle.appendChild(icon);

        const label = document.createElement('span');
        label.className = 'conv-options-label';
        label.style.color = opt.danger ? '#EF4444' : colors.textPrimary;
        label.textContent = opt.label;

        row.appendChild(iconCircle);
        row.appendChild(label);
        card.appendChild(row);
    });

    const pad = document.createElement('div');
    pad.style.height = '20px';
    content.appendChild(pad);

    openModalSheet();
}

function shareConversationText(conv) {
    const intentText = conv.title;
    if (navigator.share) {
        navigator.share({ title: conv.title, text: intentText }).catch(() => {});
    } else {
        navigator.clipboard.writeText(intentText).catch(() => {});
        showToast('Título copiado para partilha!');
    }
}

/* ── Renomear conversa: diálogo central nativo ────────────────────────────── */
function showRenameDialog(conv) {
    closeAllModals();
    document.getElementById('renameDialogOverlay')?.remove();

    const colors = getThemeColors();
    const dialogBg = isDarkMode ? '#1C1C1E' : '#FFFFFF';
    const inputBg = isDarkMode ? '#2C2C2E' : '#F2F2F7';

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'renameDialogOverlay';

    const dialog = document.createElement('div');
    dialog.className = 'center-dialog';
    dialog.id = 'renameDialogBox';
    dialog.style.background = dialogBg;

    const title = document.createElement('div');
    title.className = 'center-dialog-title';
    title.style.color = colors.textPrimary;
    title.textContent = 'Renomear conversa';
    dialog.appendChild(title);

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'center-dialog-input';
    input.value = conv.title;
    input.maxLength = 80;
    input.style.color = colors.textPrimary;
    input.style.background = inputBg;
    input.style.borderColor = colors.divider;
    dialog.appendChild(input);

    const btnRow = document.createElement('div');
    btnRow.className = 'center-dialog-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'center-dialog-btn cancel pulse-tap';
    cancelBtn.style.color = colors.textPrimary;
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.onclick = closeRenameDialog;

    const saveBtn = document.createElement('button');
    saveBtn.className = 'center-dialog-btn confirm pulse-tap';
    saveBtn.style.background = colors.extrasCardActiveText;
    saveBtn.style.color = '#fff';
    saveBtn.textContent = 'Guardar';
    saveBtn.onclick = () => confirmRenameConversation(conv, input.value);

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(saveBtn);
    dialog.appendChild(btnRow);

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
        overlay.classList.add('open');
        dialog.classList.add('open');
    });

    overlay.onclick = (e) => { if (e.target === overlay) closeRenameDialog(); };
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); confirmRenameConversation(conv, input.value); }
        if (e.key === 'Escape') closeRenameDialog();
    });

    setTimeout(() => { input.focus(); input.select(); }, 260);
}

function closeRenameDialog() {
    const overlay = document.getElementById('renameDialogOverlay');
    const dialog = document.getElementById('renameDialogBox');
    if (!overlay) return;
    overlay.classList.remove('open');
    dialog?.classList.remove('open');
    setTimeout(() => overlay.remove(), 240);
}

async function confirmRenameConversation(conv, newTitleRaw) {
    const newTitle = (newTitleRaw || '').trim();
    if (!newTitle) { showToast('O título não pode estar vazio'); return; }
    closeRenameDialog();

    const token = authState.user?.token || '';
    const previousTitle = conv.title;
    conv.title = newTitle;
    if (chatState.currentConversationId === conv.id) chatState.currentConversationTitle = newTitle;
    renderConversationsList();

    try {
        await AuthApiService.updateConversation(token, conv.id, newTitle, conv.messages || chatState.chatHistory);
        showToast('Conversa renomeada');
    } catch (err) {
        conv.title = previousTitle;
        if (chatState.currentConversationId === conv.id) chatState.currentConversationTitle = previousTitle;
        renderConversationsList();
        showToast('Não foi possível renomear a conversa');
    }
}

/* ── Eliminar conversa ──────────────────────────────────────────────────── */
async function deleteConversation(conv) {
    const token = authState.user?.token || '';
    const previousList = conversations.slice();

    conversations = conversations.filter(c => c.id !== conv.id);
    if (chatState.currentConversationId === conv.id) chatState.resetConversation();
    renderConversationsList();

    try {
        if (conv.id && typeof AuthApiService.deleteConversation === 'function') {
            await AuthApiService.deleteConversation(token, conv.id);
        }
        showToast('Conversa eliminada');
    } catch (err) {
        conversations = previousList;
        renderConversationsList();
        showToast('Não foi possível eliminar a conversa');
    }
}

/* =========================================================================
   DRAWER
   ========================================================================= */

let drawerOpen = false;

function toggleDrawer() { drawerOpen ? closeDrawer() : openDrawer(); }

function openDrawer() {
    document.getElementById('drawer').classList.add('open');
    document.getElementById('drawerOverlay').classList.add('open');
    drawerOpen = true;

    if (authState.user) {
        AuthApiService.listConversations(authState.user.token).then(list => {
            conversations = list.map(c => ({
                id: c.id, title: c.title,
                messages: c.messages || [],
                updatedAt: c.updatedAt || Date.now(),
                pinned: c.pinned || false
            }));
            renderConversationsList();
        });
    }
}

function closeDrawer() {
    document.getElementById('drawer')?.classList.remove('open');
    document.getElementById('drawerOverlay')?.classList.remove('open');
    drawerOpen = false;
}

function openConversation(conv) {
    if (chatState.isStreaming) return;
    chatState.loadConversation(conv);
    closeDrawer();
}

/* =========================================================================
   ENVIO DE MENSAGENS
   ========================================================================= */

async function sendMessage(text) {
    const trimmed = text.trim();
    if (!trimmed || chatState.isStreaming) return;

    const isFirstMessage = chatState.chatHistory.length === 0;
    chatState.isStreaming = true;

    chatState.addUserMessage(trimmed);
    document.getElementById('textInput').value = '';
    updateSendButton();
    scrollToBottom();

    const think = chatState.thinkMoreMode;
    const assistantIndex = chatState.addAssistantPlaceholder(think);
    scrollToBottom();

    const token = authState.user?.token || '';
    const systemPrompt = GeminiApiService.buildSystemPrompt('pt', chatState.sheetsEnabled);

    try {
        const stream = GeminiApiService.streamChat({ messages: chatState.chatHistory, systemPrompt, token, think });

        for await (const chunk of stream) {
            switch (chunk.type) {
                case 'think':
                    chatState.appendThinkToken(assistantIndex, chunk.text);
                    break;
                case 'token':
                    chatState.appendToken(assistantIndex, chunk.text);
                    scrollToBottom();
                    break;
                case 'done':
                    chatState.finishAssistantMessage(
                        assistantIndex,
                        chunk.fullText || chatState.displayMessages[assistantIndex].content,
                        chatState.displayMessages[assistantIndex].thinkingContent
                    );
                    break;
                case 'error':
                    chatState.failAssistantMessage(assistantIndex, chunk.message);
                    break;
            }
        }
    } catch (e) {
        chatState.failAssistantMessage(assistantIndex, 'Erro de rede: ' + e.message);
    }

    chatState.isStreaming = false;
    chatState.notify();
    scrollToBottom();

    if (isFirstMessage && !chatState.titleGenerated) {
        chatState.titleGenerated = true;
        const title = await GeminiApiService.generateTitle(trimmed, token);
        chatState.currentConversationTitle = title;
    }

    if (!chatState.currentConversationId) {
        const newId = await AuthApiService.createConversation(token, chatState.currentConversationTitle, chatState.chatHistory);
        if (newId) chatState.currentConversationId = newId;
    } else {
        await AuthApiService.updateConversation(token, chatState.currentConversationId, chatState.currentConversationTitle, chatState.chatHistory);
    }

    if (authState.user) {
        const list = await AuthApiService.listConversations(token);
        conversations = list.map(c => ({
            id: c.id, title: c.title,
            messages: c.messages || [],
            updatedAt: c.updatedAt || Date.now(),
            pinned: c.pinned || false
        }));
        renderConversationsList();
    }
}

/* =========================================================================
   MODAIS
   ========================================================================= */

function openModalSheet() {
    const overlay = document.getElementById('modalOverlay');
    const sheet = document.getElementById('modalSheet');
    sheet.style.transition = '';
    sheet.style.transform = '';
    overlay.style.opacity = '';
    overlay.classList.add('open');
    sheet.classList.add('open');
}

function closeModalSheet() {
    const overlay = document.getElementById('modalOverlay');
    const sheet = document.getElementById('modalSheet');
    if (!overlay || !sheet) return;
    overlay.classList.remove('open');
    sheet.classList.remove('open');
    sheet.style.transform = '';
    sheet.style.transition = '';
    overlay.style.opacity = '';
    // Restaurar altura padrão
    sheet.style.minHeight = '';
}

/* ── Handle de arrastar reutilizável (drag-to-dismiss nativo) ─────────────── */
function buildSheetHandle(sheetEl, overlayEl, closeFn) {
    const wrap = document.createElement('div');
    wrap.className = 'sheet-handle-wrap';
    const bar = document.createElement('div');
    bar.className = 'sheet-handle-bar';
    bar.style.background = isDarkMode ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)';
    wrap.appendChild(bar);
    if (sheetEl) makeSheetDraggable(wrap, sheetEl, overlayEl, closeFn);
    return wrap;
}

function makeSheetDraggable(handleEl, sheetEl, overlayEl, closeFn) {
    let startY = 0, dy = 0, dragging = false, startHeight = 0;

    const isCentered = () => window.matchMedia('(min-width: 768px)').matches;
    const prefix = () => isCentered() ? 'translateX(-50%) translateY(' : 'translateY(';

    function getClientY(e) {
        if (typeof e.clientY === 'number') return e.clientY;
        if (e.touches && e.touches[0]) return e.touches[0].clientY;
        return 0;
    }

    function onDown(e) {
        dragging = true;
        startY = getClientY(e);
        dy = 0;
        startHeight = sheetEl.offsetHeight || 1;
        sheetEl.style.transition = 'none';
        try { handleEl.setPointerCapture?.(e.pointerId); } catch (err) {}
    }

    function onMove(e) {
        if (!dragging) return;
        const y = getClientY(e);
        dy = Math.max(0, y - startY);
        sheetEl.style.transform = `${prefix()}${dy}px)`;
        if (overlayEl) overlayEl.style.opacity = String(Math.max(0.08, 1 - (dy / startHeight) * 1.1));
    }

    function onUp() {
        if (!dragging) return;
        dragging = false;
        sheetEl.style.transition = '';
        const closeThreshold = Math.min(140, startHeight * 0.3);
        if (dy > closeThreshold) {
            sheetEl.style.transform = `${prefix()}100%)`;
            if (overlayEl) overlayEl.style.opacity = '0';
            setTimeout(() => { closeFn(); }, 350);
        } else {
            sheetEl.style.transform = '';
            if (overlayEl) overlayEl.style.opacity = '';
        }
        dy = 0;
    }

    handleEl.addEventListener('pointerdown', onDown);
    handleEl.addEventListener('pointermove', onMove);
    handleEl.addEventListener('pointerup', onUp);
    handleEl.addEventListener('pointercancel', onUp);
}

/* ── Modal "Adicionar" ──────────────────────────────────────────────────── */
function showAddPopup() {
    const colors = getThemeColors();
    const content = document.getElementById('modalSheetContent');
    content.innerHTML = '';

    content.appendChild(buildSheetHandle(
        document.getElementById('modalSheet'),
        document.getElementById('modalOverlay'),
        closeModalSheet
    ));

    // Input de ficheiro escondido
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    fileInput.onchange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            closeAllModals();
            showToast(`Imagem "${file.name}" selecionada`);
        }
    };
    content.appendChild(fileInput);

    const rowImage = document.createElement('div');
    rowImage.className = 'pulse-tap';
    rowImage.style.cssText = `display: flex; align-items: center; padding: 14px 20px; cursor: pointer;`;
    rowImage.onclick = () => fileInput.click();
    const iconImage = document.createElement('span');
    iconImage.className = 'icon-mask';
    iconImage.style.cssText = `mask-image: url('assets/icons/svg/image.svg'); -webkit-mask-image: url('assets/icons/svg/image.svg'); width: 22px; height: 22px; background: ${colors.iconTint}; flex-shrink: 0;`;
    rowImage.appendChild(iconImage);
    const labelImage = document.createElement('span');
    labelImage.style.cssText = `margin-left: 14px; font-size: 15px; font-weight: 500; color: ${colors.textPrimary};`;
    labelImage.textContent = 'Enviar Imagem';
    rowImage.appendChild(labelImage);
    content.appendChild(rowImage);

    const sep = document.createElement('div');
    sep.style.cssText = `height: 1px; margin-left: 56px; background: ${colors.divider};`;
    content.appendChild(sep);

    const rowExtras = document.createElement('div');
    rowExtras.className = 'pulse-tap';
    rowExtras.style.cssText = `display: flex; align-items: center; padding: 14px 20px; cursor: pointer;`;
    rowExtras.onclick = () => { closeAllModals(); setTimeout(showExtrasSheet, 180); };
    const iconExtras = document.createElement('span');
    iconExtras.className = 'icon-mask';
    iconExtras.style.cssText = `mask-image: url('assets/icons/svg/extras.svg'); -webkit-mask-image: url('assets/icons/svg/extras.svg'); width: 22px; height: 22px; background: ${colors.iconTint}; flex-shrink: 0;`;
    rowExtras.appendChild(iconExtras);
    const labelExtras = document.createElement('span');
    labelExtras.style.cssText = `margin-left: 14px; font-size: 15px; font-weight: 500; color: ${colors.textPrimary};`;
    labelExtras.textContent = 'Extras';
    rowExtras.appendChild(labelExtras);
    content.appendChild(rowExtras);

    const pad = document.createElement('div');
    pad.style.height = '16px';
    content.appendChild(pad);

    openModalSheet();
}

/* ── Extras sheet ───────────────────────────────────────────────────────── */
function showExtrasSheet() {
    const colors = getThemeColors();
    const content = document.getElementById('modalSheetContent');
    content.innerHTML = '';

    content.appendChild(buildSheetHandle(
        document.getElementById('modalSheet'),
        document.getElementById('modalOverlay'),
        closeModalSheet
    ));

    const titleEl = document.createElement('div');
    titleEl.style.cssText = `padding: 4px 20px 12px; font-size: 17px; font-weight: 700; color: ${colors.textPrimary};`;
    titleEl.textContent = 'Extras';
    content.appendChild(titleEl);

    const items = [
        { title: 'Flash',      iconOff: 'flash',  iconOn: 'flash_filled',  active: chatState.flashMode,     action: () => { chatState.toggleFlashMode();     closeAllModals(); } },
        { title: 'Think More', iconOff: 'brain',  iconOn: 'brain_filled',  active: chatState.thinkMoreMode, action: () => { chatState.toggleThinkMoreMode(); closeAllModals(); } },
        { title: 'Sheets',     iconOff: 'sheets', iconOn: 'sheets_filled', active: chatState.sheetsEnabled, action: () => { chatState.toggleSheets();        closeAllModals(); } }
    ];

    items.forEach((item, i) => {
        if (i > 0) appendDividerRow(content, 62);
        const row = document.createElement('div');
        row.className = 'flex items-center px-4 py-3 pulse-tap';
        row.style.backgroundColor = item.active ? (colors.extrasCardActiveText + '14') : 'transparent';
        row.style.cursor = 'pointer';
        row.onclick = item.action;

        const icon = createIconElement(
            `assets/icons/svg/${item.active ? item.iconOn : item.iconOff}.svg`, 20,
            item.active ? colors.extrasCardActiveText : colors.iconTint);
        row.appendChild(icon);

        const span = document.createElement('span');
        span.className = 'ml-3.5 text-sm font-medium flex-1';
        span.textContent = item.title;
        span.style.color = item.active ? colors.extrasCardActiveText : colors.textPrimary;
        row.appendChild(span);

        if (item.active) {
            const dot = document.createElement('div');
            dot.className = 'w-2 h-2 rounded-full';
            dot.style.background = colors.extrasCardActiveText;
            row.appendChild(dot);
        }

        content.appendChild(row);
    });

    openModalSheet();
}

function appendDividerRow(container, marginLeftPx) {
    const colors = getThemeColors();
    const div = document.createElement('div');
    div.style.cssText = `height: 1px; margin-left: ${marginLeftPx}px; margin-right: 0; background: ${colors.divider};`;
    container.appendChild(div);
}

/* ── Interruptor nativo reutilizável ──────────────────────────────────────── */
function buildSwitch(initialValue, onChange) {
    let value = !!initialValue;
    const track = document.createElement('div');
    track.className = 'native-switch-track' + (value ? ' on' : '');
    const thumb = document.createElement('div');
    thumb.className = 'native-switch-thumb';
    track.appendChild(thumb);
    track.onclick = () => {
        value = !value;
        track.classList.toggle('on', value);
        onChange(value);
    };
    return track;
}

/* ── Modal "Edit" (antigo Widgets) esvaziado e mais alto ────────────────── */
function showEditModal() {
    const colors = getThemeColors();
    const content = document.getElementById('modalSheetContent');
    content.innerHTML = '';

    // Handle de arrastar
    content.appendChild(buildSheetHandle(
        document.getElementById('modalSheet'),
        document.getElementById('modalOverlay'),
        closeModalSheet
    ));

    // Título "Edit"
    const titleEl = document.createElement('div');
    titleEl.style.cssText = `padding: 4px 20px 20px; font-size: 17px; font-weight: 700; color: ${colors.textPrimary};`;
    titleEl.textContent = 'Edit';
    content.appendChild(titleEl);

    // Aumentar altura mínima do sheet
    const sheet = document.getElementById('modalSheet');
    if (sheet) sheet.style.minHeight = '58vh';

    openModalSheet();
}

function closeAllModals() {
    closeModalSheet();
    const overlay = document.getElementById('modalOverlay');
    overlay.classList.remove('open');
    overlay.style.opacity = '';
}