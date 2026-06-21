/* =========================================================================
   FIX DE ALTURA DINÂMICA + TECLADO
   Uma ÚNICA fonte de verdade para o deslocamento do teclado, para nunca
   haver duas animações a competir (o "sobe demais e depois volta").
   O appbar NUNCA é tocado por este sistema — fica sempre fixo no topo,
   em qualquer situação, mesmo com o teclado aberto.
   ========================================================================= */
(function setupDynamicViewportHeight() {
    function applyVH() {
        const h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        document.documentElement.style.setProperty('--vh', (h * 0.01) + 'px');
    }
    applyVH();
    window.addEventListener('resize', applyVH);
    window.addEventListener('orientationchange', () => setTimeout(applyVH, 120));
})();

(function setupKeyboardAwareLayout() {
    let lastOffset = -1;
    let rafId = null;

    function computeOffset() {
        if (!window.visualViewport) return 0;
        const vv = window.visualViewport;
        const offset = window.innerHeight - vv.height - vv.offsetTop;
        return Math.round(Math.max(0, offset));
    }

    function applyOffset(offset) {
        if (offset === lastOffset) return;
        lastOffset = offset;

        const bottomBar = document.getElementById('bottomBar');
        const messagesContainer = document.getElementById('messagesContainer');
        const keyboardOpen = offset > 40;

        if (bottomBar) {
            // Usa 'bottom' em vez de 'transform': uma única propriedade,
            // sem nenhuma transição concorrente, sobe e fica parado — e
            // quando o teclado fecha, volta a descer de forma estável.
            bottomBar.style.bottom = keyboardOpen ? offset + 'px' : '0px';
        }
        if (messagesContainer) {
            const baseBottomPad = 170;
            messagesContainer.style.paddingBottom = keyboardOpen
                ? (baseBottomPad + offset) + 'px'
                : baseBottomPad + 'px';
        }
        // O appbar nunca é alterado aqui — fica sempre no topo, parado.
    }

    function scheduleUpdate() {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
            rafId = null;
            applyOffset(computeOffset());
        });
    }

    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', scheduleUpdate);
        window.visualViewport.addEventListener('scroll', scheduleUpdate);
    }

    window._refreshKeyboardLayout = scheduleUpdate;
})();

/* =========================================================================
   SPLASH SCREEN — usado APENAS na abertura inicial do site (ver app.js).
   Estas funções existem só por compatibilidade; renderChatPage() NÃO as
   chama mais a cada navegação, evitando o flash repetido entre telas.
   ========================================================================= */
function showSplashScreen() {
    const splash = document.createElement('div');
    splash.id = 'splashScreen';
    const dark = isDarkMode;
    const bg = dark
        ? 'radial-gradient(circle at 30% 20%, #1d2440 0%, #121212 55%, #0a0a0a 100%)'
        : 'radial-gradient(circle at 30% 20%, #eaf1ff 0%, #ffffff 55%, #f5f6fa 100%)';
    splash.style.cssText = `
        position: fixed; inset: 0; z-index: 99999;
        display: flex; align-items: center; justify-content: center;
        background: ${bg};
        transition: opacity 0.4s ease;
    `;
    splash.innerHTML = `<img src="assets/icons/png/logo.png" style="width:88px;height:88px;border-radius:22px;" alt="Nexa" />`;
    document.body.appendChild(splash);
    return splash;
}

function hideSplashScreen() {
    const splash = document.getElementById('splashScreen');
    if (!splash) return;
    splash.style.opacity = '0';
    setTimeout(() => splash.remove(), 420);
}

/* =========================================================================
   MODELO DE DADOS
   ========================================================================= */

class DisplayMessage {
    constructor(role, content = '', isStreaming = false, isThinking = false, thinkingContent = '', attachments = []) {
        this.role = role;
        this.content = content;
        this.isStreaming = isStreaming;
        this.isThinking = isThinking;
        this.thinkingContent = thinkingContent;
        this.attachments = attachments || [];
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
        this.isIncognito = false;
        this.pendingAttachments = [];
        this.listeners = [];
    }

    subscribe(fn) { this.listeners.push(fn); }
    notify() { this.listeners.forEach(fn => fn(this)); }

    addUserMessage(text, attachments) {
        const atts = attachments && attachments.length ? attachments : [];
        this.chatHistory.push({ role: 'user', content: text });
        this.displayMessages.push(new DisplayMessage('user', text, false, false, '', atts));
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
        if (this.isIncognito) return; // não é possível sair/trocar de uma conversa incógnita
        this.currentConversationId = '';
        this.currentConversationTitle = 'Nova conversa';
        this.titleGenerated = false;
        this.chatHistory = [];
        this.displayMessages = [];
        this.pendingAttachments = [];
        this.notify();
    }

    startIncognito() {
        this.currentConversationId = '';
        this.currentConversationTitle = 'Conversa privada';
        this.titleGenerated = true;
        this.chatHistory = [];
        this.displayMessages = [];
        this.pendingAttachments = [];
        this.isIncognito = true;
        this.notify();
    }

    loadConversation(conv) {
        if (this.isIncognito) return; // bloqueado: não se pode sair do incógnito carregando outra conversa
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

    removeLastExchange() {
        // Remove o último par (assistant + user) do histórico para permitir regenerar de forma fiel
        const lastUserIdx = [...this.displayMessages].reverse().findIndex(m => m.role === 'user');
        if (lastUserIdx === -1) return null;
        const realIdx = this.displayMessages.length - 1 - lastUserIdx;
        const userMsg = this.displayMessages[realIdx];
        const userText = userMsg.content;
        const userAttachments = userMsg.attachments || [];

        // Remove todas as mensagens a partir do último user (inclusive) da UI e do histórico real
        this.displayMessages = this.displayMessages.slice(0, realIdx);
        this.chatHistory = this.chatHistory.slice(0, realIdx);
        this.notify();
        return { text: userText, attachments: userAttachments };
    }
}

const chatState = new ChatState();

/* =========================================================================
   PREFERÊNCIAS DE WIDGETS
   ========================================================================= */

const WIDGET_SETTINGS_KEY = 'ipc_widget_settings_v1';

function loadWidgetSettings() {
    try {
        const raw = localStorage.getItem(WIDGET_SETTINGS_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
}

let widgetSettings = loadWidgetSettings();

function isWidgetEnabled(type) { return widgetSettings[type] !== false; }

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

/* =========================================================================
   MOTOR DE MATEMÁTICA (sem dependências externas)
   Suporta: $...$ e $$...$$, \sqrt{}, \frac{}{}, expoentes ^, subscritos _,
   símbolos gregos \alpha \beta etc, somatórios \sum, integrais \int,
   infinito \infty, mais/menos \pm, comparação \leq \geq \neq \approx,
   setas \to \rightarrow, e operadores comuns.
   ========================================================================= */

const GREEK_MAP = {
    alpha:'α', beta:'β', gamma:'γ', delta:'δ', epsilon:'ε', zeta:'ζ', eta:'η',
    theta:'θ', iota:'ι', kappa:'κ', lambda:'λ', mu:'μ', nu:'ν', xi:'ξ',
    omicron:'ο', pi:'π', rho:'ρ', sigma:'σ', tau:'τ', upsilon:'υ', phi:'φ',
    chi:'χ', psi:'ψ', omega:'ω',
    Alpha:'Α', Beta:'Β', Gamma:'Γ', Delta:'Δ', Epsilon:'Ε', Zeta:'Ζ', Eta:'Η',
    Theta:'Θ', Iota:'Ι', Kappa:'Κ', Lambda:'Λ', Mu:'Μ', Nu:'Ν', Xi:'Ξ',
    Omicron:'Ο', Pi:'Π', Rho:'Ρ', Sigma:'Σ', Tau:'Τ', Upsilon:'Υ', Phi:'Φ',
    Chi:'Χ', Psi:'Ψ', Omega:'Ω'
};

function renderMathToken(expr) {
    let out = String(expr).trim();

    // \sqrt{x} ou \sqrt[n]{x}
    out = out.replace(/\\sqrt\[(.+?)\]\{(.+?)\}/g,
        '<span class="math-root"><sup class="math-root-index">$1</sup><span class="math-radical">√</span><span class="math-radicand">$2</span></span>');
    out = out.replace(/\\sqrt\{(.+?)\}/g,
        '<span class="math-root"><span class="math-radical">√</span><span class="math-radicand">$1</span></span>');

    // \frac{a}{b}
    out = out.replace(/\\frac\{(.+?)\}\{(.+?)\}/g,
        '<span class="math-frac"><span class="math-frac-num">$1</span><span class="math-frac-den">$2</span></span>');

    // símbolos gregos \alpha
    out = out.replace(/\\([A-Za-z]+)/g, (m, name) => {
        if (GREEK_MAP[name]) return GREEK_MAP[name];
        const symbolMap = {
            sum: '∑', int: '∫', infty: '∞', infin: '∞',
            pm: '±', mp: '∓', times: '×', div: '÷', cdot: '·',
            leq: '≤', geq: '≥', neq: '≠', approx: '≈', equiv: '≡',
            to: '→', rightarrow: '→', leftarrow: '←', Rightarrow: '⇒',
            partial: '∂', nabla: '∇', forall: '∀', exists: '∃',
            in: '∈', notin: '∉', subset: '⊂', subseteq: '⊆',
            cup: '∪', cap: '∩', emptyset: '∅', therefore: '∴',
            cdots: '⋯', ldots: '…', degree: '°', sim: '∼'
        };
        return symbolMap[name] || m;
    });

    // expoentes x^2, x^{10}
    out = out.replace(/\^\{(.+?)\}/g, '<sup>$1</sup>');
    out = out.replace(/\^(-?[A-Za-z0-9]+)/g, '<sup>$1</sup>');

    // subscritos x_2, x_{ij}
    out = out.replace(/_\{(.+?)\}/g, '<sub>$1</sub>');
    out = out.replace(/_(-?[A-Za-z0-9]+)/g, '<sub>$1</sub>');

    return out;
}

function renderMathBlocks(text) {
    text = text.replace(/\$\$([\s\S]+?)\$\$/g, (m, inner) =>
        `<div class="math-display">${renderMathToken(inner)}</div>`);
    text = text.replace(/\$([^\$\n]+?)\$/g, (m, inner) =>
        `<span class="math-inline">${renderMathToken(inner)}</span>`);
    return text;
}

/* =========================================================================
   TABELAS GFM (| col | col |)
   ========================================================================= */

function tryParseTable(lines, startIdx) {
    if (startIdx + 1 >= lines.length) return null;
    const headerLine = lines[startIdx];
    const sepLine = lines[startIdx + 1];
    if (!/^\s*\|?.+\|.+\|?\s*$/.test(headerLine)) return null;
    if (!/^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(sepLine)) return null;

    const splitRow = (line) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
    const headers = splitRow(headerLine);
    const aligns = splitRow(sepLine).map(c => {
        const left = c.startsWith(':');
        const right = c.endsWith(':');
        if (left && right) return 'center';
        if (right) return 'right';
        if (left) return 'left';
        return '';
    });

    let i = startIdx + 2;
    const rows = [];
    while (i < lines.length && /^\s*\|?.+\|.+\|?\s*$/.test(lines[i]) && lines[i].trim() !== '') {
        rows.push(splitRow(lines[i]));
        i++;
    }

    return { headers, aligns, rows, nextIdx: i };
}

function buildTableHtml(table) {
    const alignStyle = (a) => a ? `text-align:${a};` : '';
    const thead = `<thead><tr>${table.headers.map((h, idx) =>
        `<th style="${alignStyle(table.aligns[idx])}">${applyInline(escapeHtml(h))}</th>`).join('')}</tr></thead>`;
    const tbody = `<tbody>${table.rows.map(row =>
        `<tr>${row.map((cell, idx) =>
            `<td style="${alignStyle(table.aligns[idx])}">${applyInline(escapeHtml(cell))}</td>`).join('')}</tr>`
    ).join('')}</tbody>`;
    return `<div class="md-table-wrapper"><table class="md-table">${thead}${tbody}</table></div>`;
}

function renderMarkdown(rawText) {
    if (!rawText) return '';

    const codeBlocks = [];
    let text = rawText.replace(/```([\w_]*?)[\r\n]+([\s\S]*?)```/g, (match, lang, code) => {
        const index = codeBlocks.length;
        codeBlocks.push({ lang: lang.trim(), code: code.replace(/\n$/, '') });
        return `\u0000CODEBLOCK${index}\u0000`;
    });

    // Protege blocos de matemática $$...$$ e $...$ ANTES do escape de HTML,
    // para que símbolos como \, {, } não sejam destruídos pelo parser de markdown.
    const mathBlocks = [];
    text = text.replace(/\$\$([\s\S]+?)\$\$/g, (m, inner) => {
        const idx = mathBlocks.length;
        mathBlocks.push({ display: true, content: inner });
        return `\u0000MATHBLOCK${idx}\u0000`;
    });
    text = text.replace(/\$([^\$\n]+?)\$/g, (m, inner) => {
        const idx = mathBlocks.length;
        mathBlocks.push({ display: false, content: inner });
        return `\u0000MATHBLOCK${idx}\u0000`;
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
            flushList(); flushOrdered(); flushBlockquote(); flushPara();
            continue;
        }
        if (raw.trim().startsWith('\u0000CODEBLOCK')) {
            flushList(); flushOrdered(); flushBlockquote(); flushPara();
            resultParts.push(raw.trim());
            continue;
        }

        // Tabela GFM
        const tableTry = tryParseTable(lines, i);
        if (tableTry) {
            flushList(); flushOrdered(); flushBlockquote(); flushPara();
            resultParts.push(buildTableHtml(tableTry));
            i = tableTry.nextIdx - 1;
            continue;
        }

        const h4 = raw.match(/^####\s+(.+)/);
        const h3 = raw.match(/^###\s+(.+)/);
        const h2 = raw.match(/^##\s+(.+)/);
        const h1 = raw.match(/^#\s+(.+)/);
        if (h4 || h3 || h2 || h1) {
            flushList(); flushOrdered(); flushBlockquote(); flushPara();
            if (h4) { resultParts.push(`<h4 class="md-h4">${applyInline(escapeHtml(h4[1]))}</h4>`); continue; }
            if (h3) { resultParts.push(`<h3 class="md-h3">${applyInline(escapeHtml(h3[1]))}</h3>`); continue; }
            if (h2) { resultParts.push(`<h2 class="md-h2 md-serif">${applyInline(escapeHtml(h2[1]))}</h2>`); continue; }
            if (h1) { resultParts.push(`<h1 class="md-h1 md-serif">${applyInline(escapeHtml(h1[1]))}</h1>`); continue; }
        }
        if (/^(\*{3,}|-{3,}|_{3,})\s*$/.test(raw.trim())) {
            flushList(); flushOrdered(); flushBlockquote(); flushPara();
            resultParts.push(`<hr class="md-hr">`);
            continue;
        }
        const bqMatch = raw.match(/^>\s*(.*)/);
        if (bqMatch) {
            flushList(); flushOrdered(); flushPara();
            blockquoteLines.push(applyInline(escapeHtml(bqMatch[1])));
            inBlockquote = true;
            continue;
        }
        if (inBlockquote) { flushBlockquote(); }
        const listMatch = raw.match(/^(\s*)[-*+]\s+(.+)/);
        if (listMatch) {
            flushOrdered(); flushPara();
            listItems.push(applyInline(escapeHtml(listMatch[2])));
            continue;
        }
        const numMatch = raw.match(/^(\s*)\d+\.\s+(.+)/);
        if (numMatch) {
            flushList(); flushPara();
            orderedItems.push(applyInline(escapeHtml(numMatch[2])));
            continue;
        }
        flushList(); flushOrdered();
        paraLines.push(applyInline(escaped));
    }

    flushList(); flushOrdered(); flushBlockquote(); flushPara();

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
        return `<div class="code-block-wrapper"><div class="code-block-header-pad"></div>${langLabel}<pre class="code-block"><code>${safeCode}</code></pre></div>`;
    });

    text = text.replace(/\u0000MATHBLOCK(\d+)\u0000/g, (match, idx) => {
        const block = mathBlocks[Number(idx)];
        const rendered = renderMathToken(block.content);
        return block.display
            ? `<div class="math-display">${rendered}</div>`
            : `<span class="math-inline">${rendered}</span>`;
    });

    return text;
}

function applyInline(text) {
    text = text.replace(/\*\*\*([^*\n]+)\*\*\*/g, '<strong><em>$1</em></strong>');
    text = text.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__([^_\n]+)__/g, '<strong>$1</strong>');
    text = text.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');
    text = text.replace(/(?<!_)_([^_\n]+)_(?!_)/g, '<em>$1</em>');
    text = text.replace(/~~([^~\n]+)~~/g, '<del>$1</del>');
    text = text.replace(/`([^`\n]+)`/g, '<code class="inline-code">$1</code>');
    text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
        '<a class="md-link" href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    text = text.replace(/(?<![">])(https?:\/\/[^\s<>"']+)/g,
        '<a class="md-link" href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
    text = text.replace(/(?<![">@\w])([\w.+-]+@[\w-]+\.[\w.-]+)(?![\w])/g,
        '<a class="md-link" href="mailto:$1">$1</a>');
    text = text.replace(/==([^=\n]+)==/g, '<mark class="md-mark">$1</mark>');
    return text;
}

function copyCodeBlock(btn) {
    const pre = btn.closest('.code-block-wrapper')?.querySelector('code');
    if (!pre) return;
    navigator.clipboard.writeText(pre.textContent).then(() => showToast('Código copiado!')).catch(() => {});
}

/* =========================================================================
   GRAVAÇÃO DE VOZ — OVERLAY COM ONDA
   ========================================================================= */

let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

let waveOverlayCtx = null;
let waveOverlayAnalyser = null;
let waveOverlaySource = null;
let waveOverlayStream = null;
let waveOverlayAnimFrame = null;

let wavePhase       = 0;
let waveSmoothAmp   = 6;
let waveSmoothBoost = 0;
let waveSmoothScale = 1;

function showWaveformUI() {
    const overlay = document.createElement('div');
    overlay.id = 'recordOverlay';

    const loaderWrap = document.createElement('div');
    loaderWrap.className = 'rec-loader-wrap';
    loaderWrap.innerHTML = `
        <div class="rec-loader" id="recLoader">
            <svg width="100" height="100" viewBox="0 0 100 100">
                <defs>
                    <mask id="recClipping">
                        <polygon points="0,0 100,0 100,100 0,100" fill="black"></polygon>
                        <polygon points="25,25 75,25 50,75" fill="white"></polygon>
                        <polygon points="50,25 75,75 25,75" fill="white"></polygon>
                        <polygon points="35,35 65,35 50,65" fill="white"></polygon>
                    </mask>
                </defs>
            </svg>
            <div class="rec-loader-box"></div>
        </div>`;
    overlay.appendChild(loaderWrap);

    const waveWrap = document.createElement('div');
    waveWrap.className = 'rec-wave-wrap';
    const canvas = document.createElement('canvas');
    canvas.id = 'recWaveCanvas';
    waveWrap.appendChild(canvas);
    overlay.appendChild(waveWrap);

    const topBar = document.createElement('div');
    topBar.className = 'rec-top-bar';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'rec-top-btn pulse-tap';
    cancelBtn.innerHTML = `<span class="icon-mask" style="mask-image:url('assets/icons/svg/close.svg');-webkit-mask-image:url('assets/icons/svg/close.svg');width:20px;height:20px;background:#fff;"></span>`;
    cancelBtn.onclick = cancelRecording;

    const timerEl = document.createElement('span');
    timerEl.id = 'recTimer';
    timerEl.className = 'rec-timer';
    timerEl.textContent = '0:00';

    const okBtn = document.createElement('button');
    okBtn.className = 'rec-top-btn pulse-tap';
    okBtn.innerHTML = `<span class="icon-mask" style="mask-image:url('assets/icons/svg/checkmark.svg');-webkit-mask-image:url('assets/icons/svg/checkmark.svg');width:22px;height:22px;background:#fff;"></span>`;
    okBtn.onclick = stopRecording;

    topBar.appendChild(cancelBtn);
    topBar.appendChild(timerEl);
    topBar.appendChild(okBtn);
    overlay.appendChild(topBar);

    document.body.appendChild(overlay);

    let seconds = 0;
    const timerInterval = setInterval(() => {
        if (!isRecording) { clearInterval(timerInterval); return; }
        seconds++;
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        const el = document.getElementById('recTimer');
        if (el) el.textContent = `${m}:${s.toString().padStart(2, '0')}`;
    }, 1000);

    const resizeCanvas = () => {
        const c = document.getElementById('recWaveCanvas');
        if (!c) return;
        const dpr  = Math.max(1, window.devicePixelRatio || 1);
        const rect = c.getBoundingClientRect();
        c.width  = Math.floor(rect.width  * dpr);
        c.height = Math.floor(rect.height * dpr);
        c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    window.addEventListener('resize', resizeCanvas);
    overlay._resizeListener = resizeCanvas;
    requestAnimationFrame(resizeCanvas);

    wavePhase       = 0;
    waveSmoothAmp   = 6;
    waveSmoothBoost = 0;
    waveSmoothScale = 1;
    startWaveOverlayAnimation();
}

function hideWaveformUI() {
    stopWaveOverlayAnimation();
    const overlay = document.getElementById('recordOverlay');
    if (!overlay) return;
    if (overlay._resizeListener) window.removeEventListener('resize', overlay._resizeListener);
    overlay.remove();
}

function waveAvg(arr, start, end) {
    let s = 0;
    for (let i = start; i < end; i++) s += arr[i];
    return s / (end - start);
}

function drawWaveLayer(ctx2d, w, h, amp, boost, baseYRatio, opacity, phaseOffset) {
    const baseY  = h * baseYRatio - boost * 0.5;
    const points = 180;
    const step   = w / (points - 1);
    const ys     = [];

    for (let i = 0; i < points; i++) {
        const t  = i / (points - 1);
        const w1 = Math.sin(t * 5.8  + wavePhase + phaseOffset)        * amp;
        const w2 = Math.sin(t * 11.5 + wavePhase * 1.4 + phaseOffset)  * (amp * 0.35);
        const w3 = Math.sin(t * 3.2  - wavePhase * 0.7 + phaseOffset)  * (amp * 0.18);
        const w4 = Math.sin(t * 22.0 + wavePhase * 2.5 + phaseOffset)  * (boost * 0.18);
        ys.push(baseY + w1 + w2 + w3 + w4);
    }

    const topY = Math.min(...ys);
    const grad = ctx2d.createLinearGradient(0, topY, 0, h);
    grad.addColorStop(0.00, `rgba(66,165,245,0.000)`);
    grad.addColorStop(0.18, `rgba(66,165,245,${0.000 * opacity})`);
    grad.addColorStop(0.45, `rgba(55,150,235,${0.080 * opacity})`);
    grad.addColorStop(0.70, `rgba(40,130,220,${0.220 * opacity})`);
    grad.addColorStop(0.88, `rgba(30,115,210,${0.400 * opacity})`);
    grad.addColorStop(1.00, `rgba(25,100,200,${0.560 * opacity})`);

    ctx2d.beginPath();
    ctx2d.moveTo(0, h);
    ctx2d.lineTo(0, ys[0]);
    for (let i = 1; i < points; i++) {
        const px = (i - 1) * step;
        const x  = i * step;
        const cx = (px + x) / 2;
        const cy = (ys[i - 1] + ys[i]) / 2;
        ctx2d.quadraticCurveTo(px, ys[i - 1], cx, cy);
    }
    ctx2d.lineTo(w, ys[points - 1]);
    ctx2d.lineTo(w, h);
    ctx2d.closePath();
    ctx2d.fillStyle = grad;
    ctx2d.fill();
}

function updateRecLoader(totalEnergy, bass) {
    const loader = document.getElementById('recLoader');
    if (!loader) return;
    const targetScale = 1 + bass * 0.45 + totalEnergy * 0.20;
    const a = targetScale > waveSmoothScale ? 0.70 : 0.06;
    waveSmoothScale += (targetScale - waveSmoothScale) * a;
    loader.style.transform = `scale(${waveSmoothScale.toFixed(4)})`;
}

function startWaveOverlayAnimation() {
    let frequencyData = null;
    if (waveOverlayAnalyser) {
        frequencyData = new Uint8Array(waveOverlayAnalyser.frequencyBinCount);
    }

    function frame() {
        if (!document.getElementById('recordOverlay')) return;
        waveOverlayAnimFrame = requestAnimationFrame(frame);

        const canvas = document.getElementById('recWaveCanvas');
        if (!canvas) return;
        const ctx2d = canvas.getContext('2d');
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        ctx2d.clearRect(0, 0, w, h);

        let targetAmp = 6, targetBoost = 0, totalEnergy = 0, bass = 0;

        if (waveOverlayAnalyser && frequencyData) {
            waveOverlayAnalyser.getByteFrequencyData(frequencyData);
            const len     = frequencyData.length;
            const bassEnd = Math.floor(len * 0.12);
            const midEnd  = Math.floor(len * 0.50);

            const bassRaw  = waveAvg(frequencyData, 0, bassEnd) / 255;
            const midRaw   = waveAvg(frequencyData, bassEnd, midEnd) / 255;
            const totalRaw = waveAvg(frequencyData, 0, len) / 255;

            bass        = Math.pow(bassRaw,  0.4);
            const mid   = Math.pow(midRaw,   0.4);
            totalEnergy = Math.pow(totalRaw, 0.4);

            targetAmp   = 5  + bass * 80 + mid * 45 + totalEnergy * 30;
            targetBoost = bass * 75 + mid * 35 + totalEnergy * 20;
        } else {
            targetAmp   = 6 + Math.sin(wavePhase * 1.1) * 1.5;
            targetBoost = 1 + Math.cos(wavePhase * 0.9) * 0.8;
        }

        const attack = targetAmp   > waveSmoothAmp   ? 0.70 : 0.06;
        const decayB = targetBoost > waveSmoothBoost ? 0.70 : 0.06;
        waveSmoothAmp   += (targetAmp   - waveSmoothAmp)   * attack;
        waveSmoothBoost += (targetBoost - waveSmoothBoost) * decayB;

        drawWaveLayer(ctx2d, w, h, waveSmoothAmp * 0.55, waveSmoothBoost * 0.4, 0.30, 0.15, 0.0);
        drawWaveLayer(ctx2d, w, h, waveSmoothAmp * 0.70, waveSmoothBoost * 0.6, 0.42, 0.30, 1.1);
        drawWaveLayer(ctx2d, w, h, waveSmoothAmp * 0.85, waveSmoothBoost * 0.8, 0.54, 0.55, 2.3);
        drawWaveLayer(ctx2d, w, h, waveSmoothAmp * 0.95, waveSmoothBoost * 0.9, 0.64, 0.80, 3.7);
        drawWaveLayer(ctx2d, w, h, waveSmoothAmp * 1.00, waveSmoothBoost * 1.0, 0.72, 1.00, 5.2);

        updateRecLoader(totalEnergy, bass);
        wavePhase += 0.020;
    }

    frame();
}

function stopWaveOverlayAnimation() {
    if (waveOverlayAnimFrame) { cancelAnimationFrame(waveOverlayAnimFrame); waveOverlayAnimFrame = null; }
    if (waveOverlaySource)    { try { waveOverlaySource.disconnect(); } catch (e) {} waveOverlaySource = null; }
    if (waveOverlayCtx)       { try { waveOverlayCtx.close(); } catch (e) {} waveOverlayCtx = null; }
    waveOverlayAnalyser = null;
}

async function startRecording() {
    if (isRecording) return;
    try {
        waveOverlayStream = await navigator.mediaDevices.getUserMedia({ audio: true });

        waveOverlayCtx      = new (window.AudioContext || window.webkitAudioContext)();
        waveOverlayAnalyser = waveOverlayCtx.createAnalyser();
        waveOverlayAnalyser.fftSize               = 1024;
        waveOverlayAnalyser.smoothingTimeConstant = 0.25;
        waveOverlayAnalyser.minDecibels           = -110;
        waveOverlayAnalyser.maxDecibels           = -5;

        const gainNode = waveOverlayCtx.createGain();
        gainNode.gain.value = 6.0;

        waveOverlaySource = waveOverlayCtx.createMediaStreamSource(waveOverlayStream);
        waveOverlaySource.connect(gainNode);
        gainNode.connect(waveOverlayAnalyser);

        audioChunks   = [];
        mediaRecorder = new MediaRecorder(waveOverlayStream);
        mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.push(e.data); };
        mediaRecorder.onstop = handleRecordingStop;
        mediaRecorder.start();
        isRecording = true;

        showWaveformUI();
    } catch (err) {
        showToast('Sem acesso ao microfone');
    }
}

function stopRecording() {
    if (!isRecording || !mediaRecorder) return;
    isRecording = false;
    mediaRecorder.stop();
    waveOverlayStream?.getTracks().forEach(t => t.stop());
    hideWaveformUI();
}

function cancelRecording() {
    if (!isRecording || !mediaRecorder) return;
    isRecording = false;
    mediaRecorder.onstop = null;
    mediaRecorder.stop();
    waveOverlayStream?.getTracks().forEach(t => t.stop());
    audioChunks = [];
    hideWaveformUI();
}

async function handleRecordingStop() {
    if (audioChunks.length === 0) return;
    const blob = new Blob(audioChunks, { type: 'audio/webm' });
    audioChunks = [];

    showLottieLoader('A transcrever…');

    try {
        const token = authState.user?.token || '';
        const formData = new FormData();
        formData.append('file', blob, 'audio.webm');
        formData.append('language', currentLanguage || 'pt');

        const res = await fetch(`${API_BASE}/ai/transcribe`, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token },
            body: formData
        });

        hideLottieLoader();
        if (!res.ok) throw new Error('Erro na transcrição');
        const data = await res.json();
        const text = (data.text || '').trim();

        if (text) {
            const input = document.getElementById('textInput');
            if (input) {
                input.value = (input.value ? input.value + ' ' : '') + text;
                autoResizeTextarea(input);
                updateSendButton();
                input.focus();
            }
        } else {
            showToast('Nenhum texto reconhecido');
        }
    } catch (err) {
        hideLottieLoader();
        showToast('Erro ao transcrever áudio');
    }
}

/* =========================================================================
   LOTTIE LOADER (para resposta da IA e transcrição)
   ========================================================================= */

let _lottieInstance = null;

function showLottieLoader(label) {
    hideLottieLoader();
    const wrap = document.createElement('div');
    wrap.id = 'lottieLoaderWrap';
    wrap.style.cssText = `
        position: fixed; inset: 0; z-index: 9000;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        background: rgba(0,0,0,0.45); backdrop-filter: blur(4px);
        gap: 14px;
    `;

    const animDiv = document.createElement('div');
    animDiv.id = 'lottieAnimDiv';
    animDiv.style.cssText = 'width: 120px; height: 120px;';
    wrap.appendChild(animDiv);

    if (label) {
        const lbl = document.createElement('span');
        lbl.style.cssText = 'color:#fff; font-size:14px; font-weight:600; opacity:0.85;';
        lbl.textContent = label;
        wrap.appendChild(lbl);
    }

    document.body.appendChild(wrap);

    function initLottie() {
        if (typeof lottie === 'undefined') return;
        _lottieInstance = lottie.loadAnimation({
            container:     animDiv,
            renderer:      'svg',
            loop:          true,
            autoplay:      true,
            path:          'assets/icons/lottie/loader.json',
        });
    }

    if (typeof lottie !== 'undefined') {
        initLottie();
    } else {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js';
        s.onload = initLottie;
        document.head.appendChild(s);
    }
}

function hideLottieLoader() {
    if (_lottieInstance) { try { _lottieInstance.destroy(); } catch (e) {} _lottieInstance = null; }
    document.getElementById('lottieLoaderWrap')?.remove();
}

/* =========================================================================
   PÁGINA DE CHAT
   ========================================================================= */

function renderChatPage() {
    // O splash NÃO aparece aqui — só na abertura inicial do site (app.js).

    const colors = getThemeColors();
    const hasMessages = chatState.displayMessages.length > 0;

    document.getElementById('app').innerHTML = `
    <div id="chatApp" class="h-full w-full flex flex-col relative overflow-hidden">

        <div class="app-bar-gradient ${isDarkMode ? 'dark' : 'light'}"></div>

        <div class="app-bar">
            <button id="menuBtn" class="pulse-tap circular w-10 h-10 ml-2 flex items-center justify-center" style="color: ${colors.iconTint}">
                <span class="icon-mask" style="mask-image: url('assets/icons/svg/menu.svg'); -webkit-mask-image: url('assets/icons/svg/menu.svg'); width: 18px; height: 18px; background: ${colors.iconTint};"></span>
            </button>

            <button id="modelSelectorBtn" class="model-selector-btn pulse-tap" style="margin-left:6px;">
                <span id="appBarTitle" class="text-sm font-semibold truncate" style="color: ${colors.textSecondary}; max-width: 150px; letter-spacing: 0.01em;">${getCurrentModelName()}</span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="${colors.textSecondary}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><polyline points="6 9 12 15 18 9"/></svg>
            </button>

            <div class="flex-1"></div>

            <div id="incognitoPill" class="incognito-pill ${chatState.isIncognito ? '' : 'hidden'}" style="background:${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}; color:${colors.textPrimary}; margin-right:4px;">
                <span class="icon-mask" style="mask-image:url('assets/icons/svg/incognito.svg'); -webkit-mask-image:url('assets/icons/svg/incognito.svg'); width:14px; height:14px; background:${colors.textPrimary};"></span>
                <span>Privada</span>
            </div>

            <button id="incognitoStartBtn" class="pulse-tap circular w-10 h-10 px-2 ${hasMessages || chatState.isIncognito ? 'hidden' : ''}" style="color: ${colors.iconTint}" title="Iniciar conversa privada">
                <span class="icon-mask" style="mask-image: url('assets/icons/svg/incognito.svg'); -webkit-mask-image: url('assets/icons/svg/incognito.svg'); width: 18px; height: 18px; background: ${colors.iconTint};"></span>
            </button>

            <button id="newChatBtn" class="pulse-tap circular w-10 h-10 px-2 ${hasMessages ? '' : 'hidden'}" style="color: ${colors.iconTint}">
                <span class="icon-mask" style="mask-image: url('assets/icons/svg/new_chat.svg'); -webkit-mask-image: url('assets/icons/svg/new_chat.svg'); width: 17px; height: 17px; background: ${colors.iconTint};"></span>
            </button>
            <button id="moreBtn" class="pulse-tap circular w-10 h-10 px-2 ${hasMessages ? '' : 'hidden'}" style="color: ${colors.iconTint}">
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

            <div class="drawer-menu-section" id="drawerMenuSection">
                <div class="drawer-menu-item pulse-tap" id="profileTile" style="color: ${colors.drawerText}">
                    <span class="icon-mask" style="mask-image: url('assets/icons/svg/user.svg'); -webkit-mask-image: url('assets/icons/svg/user.svg'); width: 18px; height: 18px; background: ${colors.iconTint};"></span>
                    <span class="drawer-menu-label">${authState.user?.name || 'Perfil'}</span>
                </div>
                <div class="drawer-menu-item pulse-tap" id="projectsDrawerBtn" style="color: ${colors.drawerText}">
                    <span class="icon-mask" style="mask-image: url('assets/icons/svg/folder.svg'); -webkit-mask-image: url('assets/icons/svg/folder.svg'); width: 18px; height: 18px; background: ${colors.iconTint};"></span>
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
                <span class="icon-mask" style="mask-image: url('assets/icons/svg/meassage.svg'); -webkit-mask-image: url('assets/icons/svg/meassage.svg'); width: 16px; height: 16px; background: ${colors.settings_section_label};"></span>
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
            <div id="attachmentsPreview" class="hidden" style="display:flex; gap:8px; padding:10px 14px 0; flex-wrap:wrap;"></div>
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
    setupDrawerScrollCollapse();
    updateChatUI();
    if (window._refreshKeyboardLayout) window._refreshKeyboardLayout();
}

/* =========================================================================
   COLLAPSE DOS ÍCONES DO DRAWER AO SCROLL
   ========================================================================= */

function setupDrawerScrollCollapse() {
    const drawer = document.getElementById('drawer');
    const menuSection = document.getElementById('drawerMenuSection');
    if (!drawer || !menuSection) return;

    const collapseItems = ['projectsDrawerBtn', 'extrasDrawerBtn', 'settingsDrawerBtn'];

    let lastScrollY = 0;
    let collapsed = false;

    drawer.addEventListener('scroll', () => {
        const sy = drawer.scrollTop;
        const goingDown = sy > lastScrollY;
        lastScrollY = sy;

        if (goingDown && sy > 40 && !collapsed) {
            collapsed = true;
            collapseItems.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.style.transition = 'max-height 0.3s ease, opacity 0.3s ease, padding 0.3s ease';
                    el.style.maxHeight = '0px';
                    el.style.opacity = '0';
                    el.style.paddingTop = '0';
                    el.style.paddingBottom = '0';
                    el.style.overflow = 'hidden';
                    el.style.pointerEvents = 'none';
                }
            });
        } else if (!goingDown && sy < 20 && collapsed) {
            collapsed = false;
            collapseItems.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.style.maxHeight = '60px';
                    el.style.opacity = '1';
                    el.style.paddingTop = '';
                    el.style.paddingBottom = '';
                    el.style.overflow = '';
                    el.style.pointerEvents = '';
                }
            });
        }
    }, { passive: true });
}

/* =========================================================================
   EVENTOS
   ========================================================================= */

function bindChatEvents() {
    document.getElementById('menuBtn').onclick = () => toggleDrawer();
    document.getElementById('drawerOverlay').onclick = () => closeDrawer();

    document.getElementById('profileTile').onclick = () => { closeDrawer(); renderSettingsPage(); };
    document.getElementById('newChatDrawerBtn').onclick = () => {
        if (chatState.isIncognito) { showToast('Termina a conversa privada para criar uma nova'); closeDrawer(); return; }
        chatState.resetConversation();
        closeDrawer();
    };
    document.getElementById('projectsDrawerBtn').onclick = () => { closeDrawer(); showToast('Projetos em breve'); };
    document.getElementById('extrasDrawerBtn').onclick = () => { closeDrawer(); setTimeout(() => showExtrasSheet(), 300); };
    document.getElementById('settingsDrawerBtn').onclick = () => { closeDrawer(); renderSettingsPage(); };
    document.getElementById('convSectionToggle').onclick = () => toggleConversationsSection();

    document.getElementById('modelSelectorBtn').onclick = () => showModelPicker();

    document.getElementById('incognitoStartBtn').onclick = () => {
        chatState.startIncognito();
        renderChatPage();
        showToast('Conversa privada ativada');
    };

    document.getElementById('newChatBtn').onclick = () => {
        if (chatState.isIncognito) { showToast('Não é possível sair da conversa privada'); return; }
        chatState.resetConversation();
    };

    document.getElementById('moreBtn').onclick = () => showCurrentConversationOptions();

    document.getElementById('addBtn').onclick = () => showAddPopup();
    document.getElementById('editBtn').onclick = () => showEditModal();
    document.getElementById('sendBtn').onclick = () => {
        const text = document.getElementById('textInput').value;
        if ((text.trim() || chatState.pendingAttachments.length) && !chatState.isStreaming) sendMessage(text);
    };
    document.getElementById('micBtn').onclick = () => startRecording();

    const textInput = document.getElementById('textInput');
    textInput.oninput = () => {
        updateSendButton();
        autoResizeTextarea(textInput);
    };

    textInput.onkeydown = (e) => {
        if (e.key === 'Enter') {
            const isMobile = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
            if (isMobile) return;
            if (!e.shiftKey) {
                e.preventDefault();
                if ((textInput.value.trim() || chatState.pendingAttachments.length) && !chatState.isStreaming) {
                    sendMessage(textInput.value);
                }
            }
        }
    };

    document.getElementById('modalOverlay').onclick = closeAllModals;
    chatState.subscribe(() => updateChatUI());

    renderAttachmentsPreview();
}

function autoResizeTextarea(textInput) {
    textInput.style.height = 'auto';
    const newHeight = Math.min(textInput.scrollHeight, 150);
    textInput.style.height = newHeight + 'px';
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

    const newChatBtn = document.getElementById('newChatBtn');
    const moreBtn = document.getElementById('moreBtn');
    const incognitoStartBtn = document.getElementById('incognitoStartBtn');
    const incognitoPill = document.getElementById('incognitoPill');

    if (newChatBtn) newChatBtn.classList.toggle('hidden', !hasMessages);
    if (moreBtn) moreBtn.classList.toggle('hidden', !hasMessages);
    if (incognitoStartBtn) incognitoStartBtn.classList.toggle('hidden', hasMessages || chatState.isIncognito);
    if (incognitoPill) incognitoPill.classList.toggle('hidden', !chatState.isIncognito);

    document.getElementById('emptyState').style.display = hasMessages ? 'none' : 'flex';
    document.getElementById('chatMessages').classList.toggle('hidden', !hasMessages);

    renderMessages();
    renderConversationsList();
    updateSendButton();
    renderAttachmentsPreview();
    scrollToBottom();
}

function updateSendButton() {
    const hasText = document.getElementById('textInput')?.value.trim().length > 0;
    const hasAttachments = chatState.pendingAttachments.length > 0;
    document.getElementById('sendBtn')?.classList.toggle('hidden', !hasText && !hasAttachments);
    document.getElementById('micBtn')?.classList.toggle('hidden', hasText || hasAttachments);
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

function createMessageBubble(msg, idx, colors) {
    const wrapper = document.createElement('div');

    if (msg.role === 'user') {
        wrapper.className = 'px-4 py-2 flex justify-end';
        const bubble = document.createElement('div');
        bubble.className = 'max-w-[82%] rounded-2xl px-4 py-3 user-msg-bubble pulse-tap';
        bubble.style.cssText = `background-color: ${colors.userBubbleBg}; color: ${colors.textPrimary};`;

        if (msg.attachments && msg.attachments.length) {
            const attWrap = document.createElement('div');
            attWrap.style.cssText = 'display:flex; flex-wrap:wrap; gap:6px; margin-bottom:8px;';
            msg.attachments.forEach(att => {
                if (att.kind === 'image' && att.dataUrl) {
                    const img = document.createElement('img');
                    img.src = att.dataUrl;
                    img.style.cssText = 'width:84px; height:84px; object-fit:cover; border-radius:12px;';
                    attWrap.appendChild(img);
                } else {
                    const chip = document.createElement('div');
                    chip.style.cssText = `display:flex; align-items:center; gap:6px; padding:7px 10px; border-radius:10px; background:${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'};`;
                    chip.innerHTML = `<span class="icon-mask" style="mask-image:url('assets/icons/svg/upload.svg'); -webkit-mask-image:url('assets/icons/svg/upload.svg'); width:14px; height:14px; background:${colors.textPrimary};"></span><span style="font-size:12px; color:${colors.textPrimary}; max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(att.name || 'Ficheiro')}</span>`;
                    attWrap.appendChild(chip);
                }
            });
            bubble.appendChild(attWrap);
        }

        if (msg.content) {
            const p = document.createElement('p');
            p.className = 'text-sm leading-relaxed whitespace-pre-wrap';
            p.style.margin = '0';
            p.textContent = msg.content;
            bubble.appendChild(p);
        }

        let pressTimer = null;
        let didLongPress = false;
        bubble.addEventListener('pointerdown', () => {
            didLongPress = false;
            pressTimer = setTimeout(() => { didLongPress = true; showUserMessageOptions(msg, idx); }, 480);
        });
        bubble.addEventListener('pointerup', () => { if (pressTimer) clearTimeout(pressTimer); });
        bubble.addEventListener('pointercancel', () => { if (pressTimer) clearTimeout(pressTimer); });
        bubble.addEventListener('pointermove', () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } });

        wrapper.appendChild(bubble);

    } else {
        wrapper.className = 'px-4 pt-3 pb-1';
        wrapper.style.color = colors.textPrimary;
        if (msg.isStreaming) wrapper.setAttribute('data-streaming', 'true');

        if (msg.isStreaming && msg.isThinking && !msg.content && !msg.thinkingContent) {
            wrapper.appendChild(buildLottieThinkingPlaceholder(colors));
            return wrapper;
        }
        if (msg.isStreaming && msg.isThinking && msg.thinkingContent && !msg.content) {
            wrapper.appendChild(buildThinkingBadge(msg.thinkingContent, colors));
            wrapper.appendChild(buildLottieThinkingPlaceholder(colors));
            return wrapper;
        }
        if (msg.thinkingContent && !msg.isThinking) {
            wrapper.appendChild(buildThinkingBadge(msg.thinkingContent, colors));
        }

        const contentDiv = document.createElement('div');
        contentDiv.className = 'assistant-content';
        contentDiv.style.cssText = `font-size: 15px; line-height: 1.65; color: ${isDarkMode ? colors.textPrimary : '#212730'};`;
        contentDiv.innerHTML = renderMarkdown(msg.content);
        if (msg.isStreaming && msg.content) contentDiv.classList.add('cursor-blink');
        wrapper.appendChild(contentDiv);

        if (!msg.isStreaming && msg.content) {
            wrapper.appendChild(buildActionButtons(msg.content, colors));
        }
    }

    return wrapper;
}

function buildLottieThinkingPlaceholder(colors) {
    const container = document.createElement('div');
    container.className = 'lottie-thinking-wrap';
    container.style.cssText = 'display: flex; align-items: center; gap: 10px; padding: 4px 0 8px;';

    const animDiv = document.createElement('div');
    animDiv.className = 'lottie-thinking-anim';
    animDiv.style.cssText = 'width: 40px; height: 40px; flex-shrink: 0;';
    container.appendChild(animDiv);

    const lbl = document.createElement('span');
    lbl.style.cssText = `font-size: 14px; color: ${colors.textSecondary};`;
    lbl.textContent = 'A processar…';
    container.appendChild(lbl);

    requestAnimationFrame(() => {
        if (typeof lottie !== 'undefined') {
            lottie.loadAnimation({
                container:  animDiv,
                renderer:   'svg',
                loop:       true,
                autoplay:   true,
                path:       'assets/icons/lottie/loader.json',
            });
        } else {
            const s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js';
            s.onload = () => {
                lottie.loadAnimation({
                    container:  animDiv,
                    renderer:   'svg',
                    loop:       true,
                    autoplay:   true,
                    path:       'assets/icons/lottie/loader.json',
                });
            };
            document.head.appendChild(s);
        }
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
    if (chatState.isStreaming) return;
    const removed = chatState.removeLastExchange();
    if (!removed) return;
    sendMessage(removed.text, removed.attachments, true);
}

/* =========================================================================
   OPÇÕES DA MENSAGEM DO USER (long-press) — copiar / editar / eliminar
   ========================================================================= */

function showUserMessageOptions(msg, idx) {
    const colors = getThemeColors();
    const content = document.getElementById('modalSheetContent');
    content.innerHTML = '';

    content.appendChild(buildSheetHandle(
        document.getElementById('modalSheet'),
        document.getElementById('modalOverlay'),
        closeModalSheet
    ));

    const card = document.createElement('div');
    card.className = 'conv-options-card';
    card.style.background = isDarkMode ? '#1C1C1E' : '#F2F2F7';
    card.style.margin = '4px 16px 20px';

    const options = [
        {
            icon: 'copy', label: 'Copiar', danger: false,
            action: () => { closeAllModals(); copyMessageToClipboard(msg.content); }
        },
        {
            icon: 'customise', label: 'Editar', danger: false,
            action: () => { closeAllModals(); setTimeout(() => showEditUserMessageDialog(msg, idx), 200); }
        },
        {
            icon: 'trash', label: 'Eliminar mensagem', danger: true,
            action: () => { closeAllModals(); deleteUserMessage(idx); }
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
        const tint = opt.danger ? '#EF4444' : colors.textPrimary;
        iconCircle.style.background = (isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)');
        const icon = document.createElement('span');
        icon.className = 'icon-mask';
        icon.style.cssText = `mask-image:url('assets/icons/svg/${opt.icon}.svg'); -webkit-mask-image:url('assets/icons/svg/${opt.icon}.svg'); width:16px; height:16px; background:${tint};`;
        iconCircle.appendChild(icon);

        const label = document.createElement('span');
        label.className = 'conv-options-label';
        label.style.color = tint;
        label.textContent = opt.label;

        row.appendChild(iconCircle);
        row.appendChild(label);
        card.appendChild(row);
    });

    content.appendChild(card);

    const pad = document.createElement('div');
    pad.style.height = '8px';
    content.appendChild(pad);

    openModalSheet();
}

function showEditUserMessageDialog(msg, idx) {
    document.getElementById('editMsgOverlay')?.remove();

    const colors = getThemeColors();
    const dialogBg = isDarkMode ? '#1C1C1E' : '#FFFFFF';
    const inputBg  = isDarkMode ? '#2C2C2E' : '#F2F2F7';

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'editMsgOverlay';

    const dialog = document.createElement('div');
    dialog.className = 'center-dialog';
    dialog.id = 'editMsgBox';
    dialog.style.background = dialogBg;
    dialog.style.width = 'min(92vw, 380px)';

    const title = document.createElement('div');
    title.className = 'center-dialog-title';
    title.style.color = colors.textPrimary;
    title.textContent = 'Editar mensagem';
    dialog.appendChild(title);

    const textarea = document.createElement('textarea');
    textarea.className = 'center-dialog-input';
    textarea.value = msg.content;
    textarea.rows = 4;
    textarea.style.color = colors.textPrimary;
    textarea.style.background = inputBg;
    textarea.style.borderColor = colors.divider;
    textarea.style.resize = 'vertical';
    textarea.style.fontFamily = 'inherit';
    dialog.appendChild(textarea);

    const btnRow = document.createElement('div');
    btnRow.className = 'center-dialog-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'center-dialog-btn cancel pulse-tap';
    cancelBtn.style.color = colors.textPrimary;
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.onclick = closeEditMsgDialog;

    const saveBtn = document.createElement('button');
    saveBtn.className = 'center-dialog-btn confirm pulse-tap';
    saveBtn.style.background = colors.primary;
    saveBtn.style.color = '#fff';
    saveBtn.textContent = 'Guardar e reenviar';
    saveBtn.onclick = () => confirmEditUserMessage(idx, textarea.value);

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(saveBtn);
    dialog.appendChild(btnRow);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
        overlay.classList.add('open');
        dialog.classList.add('open');
    });

    overlay.onclick = (e) => { if (e.target === overlay) closeEditMsgDialog(); };
    setTimeout(() => { textarea.focus(); }, 260);
}

function closeEditMsgDialog() {
    const overlay = document.getElementById('editMsgOverlay');
    const dialog  = document.getElementById('editMsgBox');
    if (!overlay) return;
    overlay.classList.remove('open');
    dialog?.classList.remove('open');
    setTimeout(() => overlay.remove(), 240);
}

function confirmEditUserMessage(idx, newTextRaw) {
    const newText = (newTextRaw || '').trim();
    if (!newText) { showToast('A mensagem não pode estar vazia'); return; }
    closeEditMsgDialog();

    if (chatState.isStreaming) return;

    const msg = chatState.displayMessages[idx];
    if (!msg) return;
    const attachments = msg.attachments || [];

    chatState.displayMessages = chatState.displayMessages.slice(0, idx);
    chatState.chatHistory = chatState.chatHistory.slice(0, idx);
    chatState.notify();

    setTimeout(() => sendMessage(newText, attachments, true), 150);
}

function deleteUserMessage(idx) {
    const msg = chatState.displayMessages[idx];
    if (!msg) return;
    let endIdx = idx + 1;
    if (chatState.displayMessages[endIdx] && chatState.displayMessages[endIdx].role === 'assistant') {
        endIdx++;
    }
    chatState.displayMessages = [
        ...chatState.displayMessages.slice(0, idx),
        ...chatState.displayMessages.slice(endIdx)
    ];
    chatState.chatHistory = [
        ...chatState.chatHistory.slice(0, idx),
        ...chatState.chatHistory.slice(endIdx)
    ];
    chatState.notify();
    showToast('Mensagem eliminada');
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

function showConvOptionsSheet(conv) {
    closeDrawer();
    buildConvOptionsModal(conv, true);
}

function showCurrentConversationOptions() {
    if (!chatState.currentConversationId) {
        showToast('Esta conversa ainda não foi guardada');
        return;
    }
    const conv = conversations.find(c => c.id === chatState.currentConversationId) || {
        id: chatState.currentConversationId,
        title: chatState.currentConversationTitle,
        messages: chatState.chatHistory,
        updatedAt: Date.now(),
        pinned: false
    };
    buildConvOptionsModal(conv, false);
}

function buildConvOptionsModal(conv, fromDrawer) {
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
        <div class="conv-options-avatar" style="background:${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'};">
            <span class="icon-mask" style="mask-image:url('assets/icons/svg/new_chat.svg'); -webkit-mask-image:url('assets/icons/svg/new_chat.svg'); width:16px; height:16px; background:${colors.textPrimary};"></span>
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

    const neutralTint = colors.textPrimary;

    const options = [
        {
            icon: 'external', label: 'Abrir conversa', tint: neutralTint, danger: false,
            action: () => { closeAllModals(); setTimeout(() => chatState.loadConversation(conv), 200); }
        },
        {
            icon: conv.pinned ? 'pin_filled' : 'pin',
            label: conv.pinned ? 'Desafixar conversa' : 'Fixar conversa',
            tint: neutralTint, danger: false,
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
            icon: 'customise', label: 'Renomear', tint: neutralTint, danger: false,
            action: () => showRenameDialog(conv)
        },
        {
            icon: 'share', label: 'Partilhar conversa', tint: neutralTint, danger: false,
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
        iconCircle.style.background = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
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
    if (navigator.share) {
        navigator.share({ title: conv.title, text: conv.title }).catch(() => {});
    } else {
        navigator.clipboard.writeText(conv.title).catch(() => {});
        showToast('Título copiado!');
    }
}

function showRenameDialog(conv) {
    closeAllModals();
    document.getElementById('renameDialogOverlay')?.remove();

    const colors = getThemeColors();
    const dialogBg = isDarkMode ? '#1C1C1E' : '#FFFFFF';
    const inputBg  = isDarkMode ? '#2C2C2E' : '#F2F2F7';

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
    const dialog  = document.getElementById('renameDialogBox');
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
        showToast('Não foi possível renomear');
    }
}

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
        showToast('Não foi possível eliminar');
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
    if (chatState.isIncognito) { showToast('Não é possível sair da conversa privada'); return; }
    chatState.loadConversation(conv);
    closeDrawer();
}

/* =========================================================================
   SELETOR DE MODELO (sempre presente na appbar, mesmo sem conversa)
   ========================================================================= */

function showModelPicker() {
    document.getElementById('modelPickerOverlay')?.remove();

    const colors = getThemeColors();
    const dialogBg = isDarkMode ? '#1C1C1E' : '#FFFFFF';
    const dividerColor = isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

    const overlay = document.createElement('div');
    overlay.className = 'popup-card-overlay';
    overlay.id = 'modelPickerOverlay';
    overlay.style.zIndex = '230';

    const dialog = document.createElement('div');
    dialog.className = 'center-dialog';
    dialog.id = 'modelPickerBox';
    dialog.style.background = dialogBg;
    dialog.style.padding = '8px 0 12px';
    dialog.style.zIndex = '231';

    let rowsHtml = `<div style="padding:10px 20px 12px;"><span style="font-size:16px;font-weight:700;color:${colors.textPrimary};">Modelo de IA</span></div>`;

    AVAILABLE_MODELS.forEach((model) => {
        const isActive = model.id === currentModelId;
        rowsHtml += `
        <button class="pulse-tap model-pick-row" data-model-id="${model.id}" style="width:100%;display:flex;align-items:center;padding:13px 20px;background:none;border:none;cursor:pointer;border-top:1px solid ${dividerColor};text-align:left;">
            <span style="flex:1;min-width:0;">
                <span style="display:block;font-size:15px;font-weight:600;color:${isActive ? colors.primary : colors.textPrimary};">${model.name}</span>
                <span style="display:block;font-size:12.5px;color:${colors.textSecondary};margin-top:1px;">${model.description}</span>
            </span>
            ${isActive ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${colors.primary}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>` : ''}
        </button>`;
    });

    dialog.innerHTML = rowsHtml;
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
        overlay.classList.add('open');
        dialog.classList.add('open');
    });

    function close() {
        overlay.classList.remove('open');
        dialog.classList.remove('open');
        setTimeout(() => overlay.remove(), 240);
    }

    overlay.onclick = (e) => { if (e.target === overlay) close(); };
    dialog.querySelectorAll('.model-pick-row').forEach(row => {
        row.onclick = () => {
            currentModelId = row.getAttribute('data-model-id');
            close();
            const titleEl = document.getElementById('appBarTitle');
            if (titleEl) titleEl.textContent = getCurrentModelName();
            showToast(`Modelo: ${getCurrentModelName()}`);
        };
    });
}

/* =========================================================================
   ANEXOS (imagens / ficheiros) — leitura real e pré-visualização
   ========================================================================= */

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function addAttachmentFromFile(file, kind) {
    try {
        const dataUrl = await readFileAsDataUrl(file);
        chatState.pendingAttachments.push({
            kind: kind,
            name: file.name,
            size: file.size,
            mime: file.type,
            dataUrl: kind === 'image' ? dataUrl : null,
            rawDataUrl: dataUrl
        });
        updateSendButton();
        renderAttachmentsPreview();
        showToast(kind === 'image' ? `Imagem "${file.name}" anexada` : `Ficheiro "${file.name}" anexado`);
    } catch (err) {
        showToast('Não foi possível ler o ficheiro');
    }
}

function removeAttachment(index) {
    chatState.pendingAttachments.splice(index, 1);
    updateSendButton();
    renderAttachmentsPreview();
}

function renderAttachmentsPreview() {
    const wrap = document.getElementById('attachmentsPreview');
    if (!wrap) return;
    const colors = getThemeColors();

    if (chatState.pendingAttachments.length === 0) {
        wrap.classList.add('hidden');
        wrap.innerHTML = '';
        return;
    }

    wrap.classList.remove('hidden');
    wrap.innerHTML = '';

    chatState.pendingAttachments.forEach((att, idx) => {
        const item = document.createElement('div');
        item.style.cssText = 'position:relative; flex-shrink:0;';

        if (att.kind === 'image' && att.dataUrl) {
            item.innerHTML = `<img src="${att.dataUrl}" style="width:56px;height:56px;object-fit:cover;border-radius:10px;" />`;
        } else {
            item.innerHTML = `<div style="width:56px;height:56px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'};">
                <span class="icon-mask" style="mask-image:url('assets/icons/svg/upload.svg'); -webkit-mask-image:url('assets/icons/svg/upload.svg'); width:20px; height:20px; background:${colors.textPrimary};"></span>
            </div>`;
        }

        const removeBtn = document.createElement('button');
        removeBtn.className = 'pulse-tap';
        removeBtn.style.cssText = 'position:absolute; top:-6px; right:-6px; width:20px; height:20px; border-radius:50%; background:#000; color:#fff; border:none; display:flex; align-items:center; justify-content:center; cursor:pointer; padding:0;';
        removeBtn.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
        removeBtn.onclick = () => removeAttachment(idx);
        item.appendChild(removeBtn);

        wrap.appendChild(item);
    });
}

/* =========================================================================
   ENVIO DE MENSAGENS
   ========================================================================= */

async function sendMessage(text, attachmentsOverride, skipClearInput) {
    const trimmed = (text || '').trim();
    const attachments = attachmentsOverride !== undefined ? attachmentsOverride : chatState.pendingAttachments.slice();
    if (!trimmed && attachments.length === 0) return;
    if (chatState.isStreaming) return;

    const isFirstMessage = chatState.chatHistory.length === 0;
    chatState.isStreaming = true;

    chatState.addUserMessage(trimmed, attachments);

    if (!skipClearInput) {
        const input = document.getElementById('textInput');
        if (input) {
            input.value = '';
            autoResizeTextarea(input);
        }
    }
    if (attachmentsOverride === undefined) {
        chatState.pendingAttachments = [];
        renderAttachmentsPreview();
    }
    updateSendButton();
    scrollToBottom();

    const think = chatState.thinkMoreMode;
    const assistantIndex = chatState.addAssistantPlaceholder(think);
    scrollToBottom();

    const token        = authState.user?.token || '';
    const systemPrompt = GeminiApiService.buildSystemPrompt(currentLanguage, chatState.sheetsEnabled);

    try {
        const stream = GeminiApiService.streamChat({
            messages: chatState.chatHistory,
            systemPrompt,
            token,
            think,
            language: currentLanguage
        });

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
        const title = await GeminiApiService.generateTitle(trimmed, token, currentLanguage);
        chatState.currentConversationTitle = title;
    }

    if (chatState.isIncognito) return;

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
    const sheet   = document.getElementById('modalSheet');
    sheet.style.transition = '';
    sheet.style.transform  = '';
    overlay.style.opacity  = '';
    overlay.classList.add('open');
    sheet.classList.add('open');
}

function closeModalSheet() {
    const overlay = document.getElementById('modalOverlay');
    const sheet   = document.getElementById('modalSheet');
    if (!overlay || !sheet) return;
    overlay.classList.remove('open');
    sheet.classList.remove('open');
    sheet.style.transform  = '';
    sheet.style.transition = '';
    overlay.style.opacity  = '';
    sheet.style.minHeight  = '';
}

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

function showAddPopup() {
    const colors = getThemeColors();
    const content = document.getElementById('modalSheetContent');
    content.innerHTML = '';

    content.appendChild(buildSheetHandle(
        document.getElementById('modalSheet'),
        document.getElementById('modalOverlay'),
        closeModalSheet
    ));

    const fileInputImage = document.createElement('input');
    fileInputImage.type = 'file';
    fileInputImage.accept = 'image/*';
    fileInputImage.style.display = 'none';
    fileInputImage.onchange = async (e) => {
        const file = e.target.files?.[0];
        if (file) {
            closeAllModals();
            await addAttachmentFromFile(file, 'image');
        }
    };
    content.appendChild(fileInputImage);

    const fileInputUpload = document.createElement('input');
    fileInputUpload.type = 'file';
    fileInputUpload.accept = '*/*';
    fileInputUpload.style.display = 'none';
    fileInputUpload.onchange = async (e) => {
        const file = e.target.files?.[0];
        if (file) {
            closeAllModals();
            await addAttachmentFromFile(file, 'file');
        }
    };
    content.appendChild(fileInputUpload);

    function buildRow(iconName, label, onClick) {
        const row = document.createElement('div');
        row.className = 'pulse-tap';
        row.style.cssText = `display: flex; align-items: center; padding: 14px 20px; cursor: pointer;`;
        row.onclick = onClick;
        const icon = document.createElement('span');
        icon.className = 'icon-mask';
        icon.style.cssText = `mask-image: url('assets/icons/svg/${iconName}.svg'); -webkit-mask-image: url('assets/icons/svg/${iconName}.svg'); width: 22px; height: 22px; background: ${colors.iconTint}; flex-shrink: 0;`;
        row.appendChild(icon);
        const lbl = document.createElement('span');
        lbl.style.cssText = `margin-left: 14px; font-size: 15px; font-weight: 500; color: ${colors.textPrimary};`;
        lbl.textContent = label;
        row.appendChild(lbl);
        return row;
    }

    function buildSep() {
        const sep = document.createElement('div');
        sep.style.cssText = `height: 1px; margin-left: 56px; background: ${colors.divider};`;
        return sep;
    }

    content.appendChild(buildRow('image',  'Enviar Imagem',   () => fileInputImage.click()));
    content.appendChild(buildSep());
    content.appendChild(buildRow('upload',  'Enviar Ficheiro', () => fileInputUpload.click()));
    content.appendChild(buildSep());
    content.appendChild(buildRow('extras',  'Extras',          () => { closeAllModals(); setTimeout(showExtrasSheet, 180); }));

    const pad = document.createElement('div');
    pad.style.height = '16px';
    content.appendChild(pad);

    openModalSheet();
}

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

    const neutralActiveBg = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';

    const items = [
        { title: 'Flash',      iconOff: 'flash',  iconOn: 'flash_filled',  active: chatState.flashMode,     action: () => { chatState.toggleFlashMode();     closeAllModals(); } },
        { title: 'Think More', iconOff: 'brain',  iconOn: 'brain_filled',  active: chatState.thinkMoreMode, action: () => { chatState.toggleThinkMoreMode(); closeAllModals(); } },
        { title: 'Sheets',     iconOff: 'sheets', iconOn: 'sheets_filled', active: chatState.sheetsEnabled, action: () => { chatState.toggleSheets();        closeAllModals(); } }
    ];

    items.forEach((item, i) => {
        if (i > 0) {
            const div = document.createElement('div');
            div.style.cssText = `height: 1px; margin-left: 60px; background: ${colors.divider};`;
            content.appendChild(div);
        }
        const row = document.createElement('div');
        row.className = 'flex items-center px-4 py-3 pulse-tap';
        row.style.backgroundColor = item.active ? neutralActiveBg : 'transparent';
        row.style.cursor = 'pointer';
        row.onclick = item.action;

        const icon = document.createElement('span');
        icon.className = 'icon-mask';
        icon.style.cssText = `mask-image: url('assets/icons/svg/${item.active ? item.iconOn : item.iconOff}.svg'); -webkit-mask-image: url('assets/icons/svg/${item.active ? item.iconOn : item.iconOff}.svg'); width: 17px; height: 17px; background: ${colors.textPrimary}; flex-shrink: 0;`;
        row.appendChild(icon);

        const span = document.createElement('span');
        span.className = 'ml-3.5 text-sm font-medium flex-1';
        span.textContent = item.title;
        span.style.color = colors.textPrimary;
        row.appendChild(span);

        if (item.active) {
            const dot = document.createElement('div');
            dot.className = 'w-2 h-2 rounded-full';
            dot.style.background = colors.textPrimary;
            row.appendChild(dot);
        }

        content.appendChild(row);
    });

    openModalSheet();
}

function showEditModal() {
    const colors = getThemeColors();
    const content = document.getElementById('modalSheetContent');
    content.innerHTML = '';

    content.appendChild(buildSheetHandle(
        document.getElementById('modalSheet'),
        document.getElementById('modalOverlay'),
        closeModalSheet
    ));

    const titleEl = document.createElement('div');
    titleEl.style.cssText = `padding: 4px 20px 20px; font-size: 17px; font-weight: 700; color: ${colors.textPrimary};`;
    titleEl.textContent = 'Edit';
    content.appendChild(titleEl);

    const sheet = document.getElementById('modalSheet');
    if (sheet) sheet.style.minHeight = '88vh';

    openModalSheet();
}

function closeAllModals() {
    closeModalSheet();
    const overlay = document.getElementById('modalOverlay');
    if (overlay) {
        overlay.classList.remove('open');
        overlay.style.opacity = '';
    }
}