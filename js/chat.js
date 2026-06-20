/* =========================================================================
   FIX DE ALTURA DINÂMICA
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
   SPLASH SCREEN — animado, varia por tema, só na abertura do site
   ========================================================================= */
function showSplashScreen() {
    if (document.getElementById('splashScreen')) return;
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    const splash = document.createElement('div');
    splash.id = 'splashScreen';

    // Gradiente que varia por tema
    const bg = dark
        ? 'linear-gradient(135deg, #0d0d0d 0%, #1a1040 50%, #0d1a2e 100%)'
        : 'linear-gradient(135deg, #ffffff 0%, #ede9ff 50%, #dceeff 100%)';

    splash.style.cssText = `
        position: fixed; inset: 0; z-index: 99999;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        background: ${bg};
        transition: opacity 0.5s ease;
        gap: 20px;
    `;

    // Logo com animação de escala
    const logoWrap = document.createElement('div');
    logoWrap.style.cssText = `
        transform: scale(0.7); opacity: 0;
        transition: transform 0.5s cubic-bezier(0.34,1.56,0.64,1), opacity 0.4s ease;
    `;
    logoWrap.innerHTML = `<img src="assets/icons/png/logo.png" style="width:80px;height:80px;border-radius:20px;" alt="Nexa" />`;
    splash.appendChild(logoWrap);

    // Nome da app
    const nameEl = document.createElement('div');
    nameEl.style.cssText = `
        font-size: 22px; font-weight: 700; letter-spacing: 0.04em;
        color: ${dark ? '#ffffff' : '#212730'}; opacity: 0;
        font-family: 'TimesNewRoman', serif;
        transition: opacity 0.4s ease 0.2s;
    `;
    nameEl.textContent = 'Nexa';
    splash.appendChild(nameEl);

    document.body.appendChild(splash);

    // Animação de entrada
    requestAnimationFrame(() => {
        setTimeout(() => {
            logoWrap.style.transform = 'scale(1)';
            logoWrap.style.opacity = '1';
            nameEl.style.opacity = '1';
        }, 60);
    });

    return splash;
}

function hideSplashScreen() {
    const splash = document.getElementById('splashScreen');
    if (!splash) return;
    splash.style.opacity = '0';
    setTimeout(() => splash.remove(), 520);
}

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
        this.incognitoMode = false;
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
        this.incognitoMode = false;
        this.notify();
    }

    loadConversation(conv) {
        this.currentConversationId = conv.id;
        this.currentConversationTitle = conv.title;
        this.titleGenerated = true;
        this.chatHistory = [...conv.messages];
        this.displayMessages = conv.messages.map(m => new DisplayMessage(m.role, m.content));
        this.incognitoMode = false;
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

    activateIncognito() {
        this.incognitoMode = true;
        this.currentConversationId = '';
        this.currentConversationTitle = 'Conversa privada';
        this.titleGenerated = true;
        this.chatHistory = [];
        this.displayMessages = [];
        this.notify();
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

function renderMarkdown(rawText) {
    if (!rawText) return '';

    const codeBlocks = [];
    let text = rawText.replace(/```([\w_]*?)[\r\n]+([\s\S]*?)```/g, (match, lang, code) => {
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
            flushList(); flushOrdered(); flushBlockquote(); flushPara();
            continue;
        }
        if (raw.trim().startsWith('\u0000CODEBLOCK')) {
            flushList(); flushOrdered(); flushBlockquote(); flushPara();
            resultParts.push(raw.trim());
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
            if (h2) { resultParts.push(`<h2 class="md-h2">${applyInline(escapeHtml(h2[1]))}</h2>`); continue; }
            if (h1) { resultParts.push(`<h1 class="md-h1">${applyInline(escapeHtml(h1[1]))}</h1>`); continue; }
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
        return `<div class="code-block-wrapper">${langLabel}<pre class="code-block"><code>${safeCode}</code></pre></div>`;
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
    text = text.replace(/(?<!["'>])(https?:\/\/[^\s<>"']+)/g,
        '<a class="md-link" href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
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
        formData.append('language', 'pt');

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
                autoResizeInput(input);
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
   LOTTIE LOADER
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
        background: rgba(0,0,0,0.35); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
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
            container:  animDiv,
            renderer:   'svg',
            loop:       true,
            autoplay:   true,
            path:       'assets/icons/lottie/loader.json',
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
    // NÃO mostra splash ao navegar entre telas — só app.js faz isso na abertura
    const colors = getThemeColors();
    document.getElementById('app').innerHTML = `
    <div id="chatApp" class="h-full w-full flex flex-col relative overflow-hidden">

        <div class="app-bar-gradient ${isDarkMode ? 'dark' : 'light'}"></div>

        <!-- AppBar fixo — sempre visível -->
        <div class="app-bar" style="position:sticky;top:0;z-index:50;flex-shrink:0;">
            <button id="menuBtn" class="pulse-tap circular w-10 h-10 ml-2 flex items-center justify-center" style="color:${colors.iconTint}">
                <span class="icon-mask" style="mask-image:url('assets/icons/svg/menu.svg');-webkit-mask-image:url('assets/icons/svg/menu.svg');width:18px;height:18px;background:${colors.iconTint};"></span>
            </button>
            <!-- Modelo sempre visível no centro/esquerda -->
            <button id="modelPillBtn" class="flex items-center gap-1.5 px-3 py-1.5 rounded-full ml-2 pulse-tap" style="background:${colors.appbarBtnBg};max-width:180px;">
                <span class="icon-mask" style="mask-image:url('assets/icons/svg/ai.svg');-webkit-mask-image:url('assets/icons/svg/ai.svg');width:13px;height:13px;background:${colors.iconTint};flex-shrink:0;"></span>
                <span id="modelPillLabel" class="text-xs font-semibold truncate" style="color:${colors.textPrimary};max-width:130px;">${MODEL_NAME}</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="${colors.iconTintSecondary}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div class="flex-1"></div>
            <!-- Incógnito: só visível sem chat -->
            <button id="incognitoBtn" class="pulse-tap circular w-10 h-10 flex items-center justify-center" style="color:${colors.iconTint};display:flex;">
                <span class="icon-mask" style="mask-image:url('assets/icons/svg/incognito.svg');-webkit-mask-image:url('assets/icons/svg/incognito.svg');width:18px;height:18px;background:${colors.iconTint};"></span>
            </button>
            <button id="newChatBtn" class="pulse-tap circular w-10 h-10 px-2" style="color:${colors.iconTint};display:none;">
                <span class="icon-mask" style="mask-image:url('assets/icons/svg/new_chat.svg');-webkit-mask-image:url('assets/icons/svg/new_chat.svg');width:17px;height:17px;background:${colors.iconTint};"></span>
            </button>
            <button id="moreBtn" class="pulse-tap circular w-10 h-10 px-2" style="color:${colors.iconTint};display:none;">
                <span class="icon-mask" style="mask-image:url('assets/icons/svg/more_vertical.svg');-webkit-mask-image:url('assets/icons/svg/more_vertical.svg');width:16px;height:16px;background:${colors.iconTint};"></span>
            </button>
        </div>

        <div class="drawer-overlay" id="drawerOverlay"></div>

        <div class="drawer ${isDarkMode ? 'dark' : 'light'}" id="drawer">
            <div class="drawer-header">
                <div class="drawer-header-left">
                    <img src="assets/icons/png/logo.png" class="drawer-logo" alt="Logo" />
                    <div class="drawer-app-name" style="color:${colors.drawerText}">Nexa</div>
                </div>
                <button id="newChatDrawerBtn" class="pulse-tap circular w-9 h-9 flex items-center justify-center" style="color:${colors.iconTint}" title="Nova conversa">
                    <span class="icon-mask" style="mask-image:url('assets/icons/svg/new_chat.svg');-webkit-mask-image:url('assets/icons/svg/new_chat.svg');width:17px;height:17px;background:${colors.iconTint};"></span>
                </button>
            </div>

            <div class="drawer-menu-section" id="drawerMenuSection">
                <div class="drawer-menu-item pulse-tap" id="profileTile" style="color:${colors.drawerText}">
                    <span class="icon-mask" style="mask-image:url('assets/icons/svg/user.svg');-webkit-mask-image:url('assets/icons/svg/user.svg');width:18px;height:18px;background:${colors.iconTint};"></span>
                    <span class="drawer-menu-label">${authState.user?.name || 'Perfil'}</span>
                </div>
                <div class="drawer-menu-item pulse-tap" id="projectsDrawerBtn" style="color:${colors.drawerText}">
                    <span class="icon-mask" style="mask-image:url('assets/icons/svg/folder.svg');-webkit-mask-image:url('assets/icons/svg/folder.svg');width:18px;height:18px;background:${colors.iconTint};"></span>
                    <span class="drawer-menu-label">Projetos</span>
                </div>
                <div class="drawer-menu-item pulse-tap" id="extrasDrawerBtn" style="color:${colors.drawerText}">
                    <span class="icon-mask" style="mask-image:url('assets/icons/svg/extras.svg');-webkit-mask-image:url('assets/icons/svg/extras.svg');width:18px;height:18px;background:${colors.iconTint};"></span>
                    <span class="drawer-menu-label">Extras</span>
                </div>
                <div class="drawer-menu-item pulse-tap" id="settingsDrawerBtn" style="color:${colors.drawerText}">
                    <span class="icon-mask" style="mask-image:url('assets/icons/svg/settings.svg');-webkit-mask-image:url('assets/icons/svg/settings.svg');width:18px;height:18px;background:${colors.iconTint};"></span>
                    <span class="drawer-menu-label">Definições</span>
                </div>
            </div>

            <div class="drawer-section-divider" style="background:${colors.divider}"></div>

            <div class="drawer-conv-section-header pulse-tap" id="convSectionToggle">
                <span class="icon-mask" style="mask-image:url('assets/icons/svg/meassage.svg');-webkit-mask-image:url('assets/icons/svg/meassage.svg');width:16px;height:16px;background:${colors.settings_section_label};"></span>
                <span class="drawer-conv-section-label" style="color:${colors.settings_section_label}">CONVERSAS</span>
                <span class="icon-mask drawer-conv-chevron" id="convSectionChevron" style="mask-image:url('assets/icons/svg/chevron_right.svg');-webkit-mask-image:url('assets/icons/svg/chevron_right.svg');width:11px;height:11px;background:${colors.settings_section_label};transform:rotate(90deg);"></span>
            </div>

            <div class="drawer-conv-list-outer" id="conversationsListOuter">
                <div class="drawer-conv-list" id="conversationsList"></div>
            </div>
        </div>

        <div class="messages-container" id="messagesContainer">
            <div id="emptyState" class="flex flex-col items-center justify-start pt-20 min-h-full">
                <img src="assets/icons/png/logo.png" class="w-[72px] h-[72px] mb-4" alt="Logo" />
                <h1 id="greetingText" class="text-5xl font-bold text-center mb-2" style="font-family:'TimesNewRoman',serif;color:${colors.textPrimary}"></h1>
                <p class="text-base text-center" style="color:${colors.textSecondary}">Em que estás a pensar?</p>
            </div>
            <div id="chatMessages" class="hidden"></div>
        </div>

        <div class="bottom-bar ${isDarkMode ? 'dark' : 'light'}" id="bottomBar">
            <textarea id="textInput" class="chat-input ${isDarkMode ? 'dark' : 'light'}" placeholder="Escreve aqui..." rows="1"></textarea>
            <div class="flex items-center h-[52px] px-[10px]">
                <button id="addBtn" class="pulse-tap circular w-10 h-10 ml-1 flex items-center justify-center rounded-full" style="background:${colors.addCircleBg};color:${colors.iconTint}">
                    <span class="icon-mask" style="mask-image:url('assets/icons/svg/add.svg');-webkit-mask-image:url('assets/icons/svg/add.svg');width:18px;height:18px;background:${colors.iconTint};"></span>
                </button>
                <div class="flex-1"></div>
                <button id="editBtn" class="flex items-center gap-1.5 px-3.5 py-2 rounded-full pulse-tap" style="background:${colors.tabPreviewPillBg};color:${colors.textPrimary}">
                    <span class="icon-mask" style="mask-image:url('assets/icons/svg/preview_filled.svg');-webkit-mask-image:url('assets/icons/svg/preview_filled.svg');width:20px;height:20px;background:${colors.textPrimary};"></span>
                    <span class="text-sm font-bold" style="color:${colors.textPrimary}">Edit</span>
                </button>
                <div class="w-2"></div>
                <button id="sendBtn" class="pulse-tap circular w-10 h-10 flex items-center justify-center rounded-full" style="background:${colors.sendBtnColor};color:${colors.sendIconColor};display:none;">
                    <span class="icon-mask" style="mask-image:url('assets/icons/svg/ic_send_arrow.svg');-webkit-mask-image:url('assets/icons/svg/ic_send_arrow.svg');width:15px;height:15px;background:${colors.sendIconColor};"></span>
                </button>
                <button id="micBtn" class="pulse-tap circular w-10 h-10 flex items-center justify-center rounded-full" style="background:${colors.sendBtnColor};color:${colors.sendIconColor};">
                    <span class="icon-mask" style="mask-image:url('assets/icons/svg/record.svg');-webkit-mask-image:url('assets/icons/svg/record.svg');width:18px;height:18px;background:${colors.sendIconColor};"></span>
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
    document.getElementById('newChatDrawerBtn').onclick = () => { chatState.resetConversation(); closeDrawer(); };
    document.getElementById('projectsDrawerBtn').onclick = () => { closeDrawer(); showToast('Projetos em breve'); };
    document.getElementById('extrasDrawerBtn').onclick = () => { closeDrawer(); setTimeout(() => showExtrasSheet(), 300); };
    document.getElementById('settingsDrawerBtn').onclick = () => { closeDrawer(); renderSettingsPage(); };
    document.getElementById('convSectionToggle').onclick = () => toggleConversationsSection();

    document.getElementById('modelPillBtn').onclick = () => showModelPickerSheet();

    // Incógnito — ativar conversa privada
    document.getElementById('incognitoBtn').onclick = () => {
        if (chatState.incognitoMode) return; // já ativo, não faz nada
        showIncognitoConfirmSheet();
    };

    document.getElementById('newChatBtn').onclick = () => chatState.resetConversation();

    // moreBtn agora mostra opções da conversa atual
    document.getElementById('moreBtn').onclick = () => {
        const conv = conversations.find(c => c.id === chatState.currentConversationId);
        if (conv) {
            showConvOptionsSheet(conv);
        } else {
            showToast('Sem conversa ativa');
        }
    };

    document.getElementById('addBtn').onclick = () => showAddPopup();
    document.getElementById('editBtn').onclick = () => showEditModal();

    document.getElementById('sendBtn').onclick = () => {
        const input = document.getElementById('textInput');
        const text = input.value;
        if (text.trim() && !chatState.isStreaming) sendMessage(text);
    };
    document.getElementById('micBtn').onclick = () => startRecording();

    const textInput = document.getElementById('textInput');

    // Keyboard padding — visualViewport
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', () => {
            const bottomBar = document.getElementById('bottomBar');
            if (!bottomBar) return;
            const keyboardHeight = window.innerHeight - window.visualViewport.height - window.visualViewport.offsetTop;
            bottomBar.style.paddingBottom = keyboardHeight > 0 ? keyboardHeight + 'px' : '';
        });
    }

    textInput.oninput = () => {
        updateSendButton();
        autoResizeInput(textInput);
    };

    textInput.onkeydown = (e) => {
        if (e.key === 'Enter') {
            const isMobile = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
            if (isMobile) return;
            if (!e.shiftKey) {
                e.preventDefault();
                if (textInput.value.trim() && !chatState.isStreaming) sendMessage(textInput.value);
            }
        }
    };

    document.getElementById('modalOverlay').onclick = closeAllModals;
    chatState.subscribe(() => updateChatUI());
}

function autoResizeInput(input) {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 150) + 'px';
}

function resetInputHeight(input) {
    input.style.height = 'auto';
    input.style.height = '';
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
    const isIncognito = chatState.incognitoMode;

    // Incógnito só aparece quando não há conversa ativa
    const incognitoBtn = document.getElementById('incognitoBtn');
    if (incognitoBtn) incognitoBtn.style.display = hasMessages ? 'none' : 'flex';

    // newChatBtn e moreBtn só com mensagens e fora de incógnito
    const newChatBtn = document.getElementById('newChatBtn');
    const moreBtn = document.getElementById('moreBtn');
    if (newChatBtn) newChatBtn.style.display = hasMessages ? 'flex' : 'none';
    // moreBtn não aparece em incógnito (sem opções de conversa)
    if (moreBtn) moreBtn.style.display = (hasMessages && !isIncognito) ? 'flex' : 'none';

    document.getElementById('emptyState').style.display = hasMessages ? 'none' : 'flex';
    document.getElementById('chatMessages').classList.toggle('hidden', !hasMessages);

    // Badge incógnito no model pill
    const modelPillLabel = document.getElementById('modelPillLabel');
    if (modelPillLabel) {
        modelPillLabel.textContent = isIncognito ? '🕵️ ' + MODEL_NAME : MODEL_NAME;
    }

    renderMessages();
    renderConversationsList();
    updateSendButton();
    scrollToBottom();
}

function updateSendButton() {
    const hasText = document.getElementById('textInput')?.value.trim().length > 0;
    const sendBtn = document.getElementById('sendBtn');
    const micBtn = document.getElementById('micBtn');
    if (sendBtn) sendBtn.style.display = hasText ? 'flex' : 'none';
    if (micBtn) micBtn.style.display = hasText ? 'none' : 'flex';
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
        wrapper.setAttribute('data-msg-idx', idx);

        const bubble = document.createElement('div');
        // Todas as bordas curvas na mensagem do utilizador
        bubble.className = 'max-w-[82%] px-4 py-3';
        bubble.style.cssText = `
            background-color: ${colors.userBubbleBg};
            color: ${colors.textPrimary};
            border-radius: 20px;
            cursor: pointer;
        `;
        const p = document.createElement('p');
        p.className = 'text-sm leading-relaxed whitespace-pre-wrap';
        p.style.margin = '0';
        p.textContent = msg.content;
        bubble.appendChild(p);

        // Long-press / click-hold para mostrar opções
        let pressTimer = null;
        let didLongPress = false;

        bubble.addEventListener('pointerdown', () => {
            didLongPress = false;
            pressTimer = setTimeout(() => {
                didLongPress = true;
                showUserMessageOptions(msg.content, idx);
            }, 500);
        });
        bubble.addEventListener('pointerup', () => { if (pressTimer) clearTimeout(pressTimer); });
        bubble.addEventListener('pointercancel', () => { if (pressTimer) clearTimeout(pressTimer); });
        bubble.addEventListener('pointermove', () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } });
        bubble.addEventListener('click', (e) => {
            if (didLongPress) { e.stopImmediatePropagation(); didLongPress = false; }
        }, true);

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
        contentDiv.style.cssText = `font-size:15px;line-height:1.65;color:${isDarkMode ? colors.textPrimary : '#212730'};`;
        contentDiv.innerHTML = renderMarkdown(msg.content);
        if (msg.isStreaming && msg.content) contentDiv.classList.add('cursor-blink');
        wrapper.appendChild(contentDiv);

        if (!msg.isStreaming && msg.content) {
            wrapper.appendChild(buildActionButtons(msg.content, colors));
        }
    }

    return wrapper;
}

/* =========================================================================
   MODAL DE OPÇÕES DA MENSAGEM DO UTILIZADOR
   ========================================================================= */

function showUserMessageOptions(content, idx) {
    const colors = getThemeColors();
    const sheet = document.getElementById('modalSheet');
    const sheetContent = document.getElementById('modalSheetContent');
    const overlay = document.getElementById('modalOverlay');
    sheetContent.innerHTML = '';

    sheetContent.appendChild(buildSheetHandle(sheet, overlay, closeModalSheet));

    const card = document.createElement('div');
    card.style.cssText = `
        margin: 8px 12px 4px;
        border-radius: 16px;
        overflow: hidden;
        background: ${isDarkMode ? '#1C1C1E' : '#F2F2F7'};
    `;

    const opts = [
        {
            icon: 'copy', label: 'Copiar mensagem',
            action: () => {
                navigator.clipboard.writeText(content).then(() => showToast('Copiado!')).catch(() => {});
                closeModalSheet();
            }
        },
        {
            icon: 'pen', label: 'Editar e reenviar',
            action: () => {
                closeModalSheet();
                const input = document.getElementById('textInput');
                if (input) {
                    input.value = content;
                    autoResizeInput(input);
                    updateSendButton();
                    input.focus();
                }
            }
        },
        {
            icon: 'trash', label: 'Eliminar mensagem', danger: true,
            action: () => {
                closeModalSheet();
                // Remove a mensagem do utilizador e a resposta do assistente seguinte
                const msgs = chatState.displayMessages;
                const hist = chatState.chatHistory;
                // Encontra o índice real
                const displayIdx = idx;
                if (displayIdx >= 0 && displayIdx < msgs.length) {
                    msgs.splice(displayIdx, msgs.length - displayIdx); // remove essa e todas seguintes
                    hist.splice(displayIdx, hist.length - displayIdx);
                    chatState.notify();
                }
            }
        }
    ];

    opts.forEach((opt, i) => {
        if (i > 0) {
            const sep = document.createElement('div');
            sep.style.cssText = `height:1px;margin-left:52px;background:${colors.divider};`;
            card.appendChild(sep);
        }
        const row = document.createElement('div');
        row.className = 'pulse-tap';
        row.style.cssText = `display:flex;align-items:center;padding:14px 16px;cursor:pointer;`;
        row.onclick = opt.action;

        const icon = document.createElement('span');
        icon.className = 'icon-mask';
        const tint = opt.danger ? '#EF4444' : colors.iconTint;
        icon.style.cssText = `mask-image:url('assets/icons/svg/${opt.icon}.svg');-webkit-mask-image:url('assets/icons/svg/${opt.icon}.svg');width:18px;height:18px;background:${tint};flex-shrink:0;`;
        row.appendChild(icon);

        const lbl = document.createElement('span');
        lbl.style.cssText = `margin-left:14px;font-size:15px;font-weight:500;color:${opt.danger ? '#EF4444' : colors.textPrimary};`;
        lbl.textContent = opt.label;
        row.appendChild(lbl);

        card.appendChild(row);
    });

    sheetContent.appendChild(card);

    const pad = document.createElement('div');
    pad.style.height = '20px';
    sheetContent.appendChild(pad);

    openModalSheet();
}

/* Lottie inline como placeholder de "a pensar" */
function buildLottieThinkingPlaceholder(colors) {
    const container = document.createElement('div');
    container.className = 'lottie-thinking-wrap';
    container.style.cssText = 'display:flex;align-items:center;gap:10px;padding:4px 0 8px;';

    const animDiv = document.createElement('div');
    animDiv.className = 'lottie-thinking-anim';
    animDiv.style.cssText = 'width:40px;height:40px;flex-shrink:0;';
    container.appendChild(animDiv);

    const lbl = document.createElement('span');
    lbl.style.cssText = `font-size:14px;color:${colors.textSecondary};`;
    lbl.textContent = 'A processar…';
    container.appendChild(lbl);

    requestAnimationFrame(() => {
        if (typeof lottie !== 'undefined') {
            lottie.loadAnimation({ container: animDiv, renderer: 'svg', loop: true, autoplay: true, path: 'assets/icons/lottie/loader.json' });
        } else {
            const s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js';
            s.onload = () => lottie.loadAnimation({ container: animDiv, renderer: 'svg', loop: true, autoplay: true, path: 'assets/icons/lottie/loader.json' });
            document.head.appendChild(s);
        }
    });

    return container;
}

function buildThinkingBadge(thinkingContent, colors) {
    const div = document.createElement('div');
    div.className = 'thinking-badge';
    div.style.cssText = `font-size:12px;font-style:italic;opacity:0.6;margin-bottom:8px;padding-bottom:8px;border-bottom:1px dashed ${colors.divider};color:${colors.textSecondary};`;
    div.textContent = '💭 ' + thinkingContent;
    return div;
}

function buildActionButtons(content, colors) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:2px;margin-top:8px;padding-top:2px;';

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
        btn.style.cssText = `width:34px;height:34px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:transparent;border:none;cursor:pointer;color:${colors.iconTintSecondary};opacity:0.65;padding:0;flex-shrink:0;`;
        btn.innerHTML = `<span class="icon-mask" style="mask-image:url('assets/icons/svg/${icon}.svg');-webkit-mask-image:url('assets/icons/svg/${icon}.svg');width:17px;height:17px;background:${colors.iconTintSecondary};"></span>`;
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
    // Reenvia a última mensagem do utilizador exatamente como estava
    const lastUserMsg = [...chatState.chatHistory].reverse().find(m => m.role === 'user');
    if (!lastUserMsg) return;

    // Remove a última resposta do assistente do display e do histórico
    const msgs = chatState.displayMessages;
    const hist = chatState.chatHistory;

    // Remove última mensagem do assistente
    if (msgs.length > 0 && msgs[msgs.length - 1].role === 'assistant') {
        msgs.pop();
        if (hist.length > 0 && hist[hist.length - 1].role === 'assistant') hist.pop();
    }
    // Remove última mensagem do utilizador
    if (msgs.length > 0 && msgs[msgs.length - 1].role === 'user') {
        msgs.pop();
        if (hist.length > 0 && hist[hist.length - 1].role === 'user') hist.pop();
    }

    chatState.notify();

    // Reenvia a mesma mensagem
    setTimeout(() => sendMessage(lastUserMsg.content), 100);
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
        empty.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 24px;gap:10px;opacity:0.45;';
        empty.innerHTML = `
            <span class="icon-mask" style="mask-image:url('assets/icons/svg/new_chat.svg');-webkit-mask-image:url('assets/icons/svg/new_chat.svg');width:28px;height:28px;background:${colors.textHint};"></span>
            <span style="font-size:13px;color:${colors.textHint};text-align:center;">Ainda não há conversas</span>`;
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
            pinIcon.style.cssText = `mask-image:url('assets/icons/svg/pin_filled.svg');-webkit-mask-image:url('assets/icons/svg/pin_filled.svg');background:${pinColor};`;
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

/* =========================================================================
   OPÇÕES DA CONVERSA — cores neutras, sem azul
   ========================================================================= */

function showConvOptionsSheet(conv) {
    closeDrawer();
    const colors = getThemeColors();
    const content = document.getElementById('modalSheetContent');
    const sheet = document.getElementById('modalSheet');
    const overlay = document.getElementById('modalOverlay');
    content.innerHTML = '';

    content.appendChild(buildSheetHandle(sheet, overlay, closeModalSheet));

    const dt = new Date(conv.updatedAt);
    const dateStr = dt.toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' });
    const timeStr = dt.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

    // Cabeçalho sem cores azuis
    const header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;padding:4px 16px 16px;gap:12px;';
    header.innerHTML = `
        <div style="width:40px;height:40px;border-radius:12px;background:${isDarkMode ? '#2C2C2E' : '#E5E5EA'};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <span class="icon-mask" style="mask-image:url('assets/icons/svg/new_chat.svg');-webkit-mask-image:url('assets/icons/svg/new_chat.svg');width:16px;height:16px;background:${colors.iconTint};"></span>
        </div>
        <div>
            <div style="font-size:15px;font-weight:600;color:${colors.textPrimary};line-height:1.3;">${escapeHtml(conv.title)}</div>
            <div style="font-size:12px;color:${colors.textSecondary};margin-top:2px;">${dateStr} · ${timeStr}</div>
        </div>`;
    content.appendChild(header);

    const card = document.createElement('div');
    card.style.cssText = `margin:0 12px;border-radius:16px;overflow:hidden;background:${isDarkMode ? '#1C1C1E' : '#F2F2F7'};`;
    content.appendChild(card);

    const options = [
        {
            icon: 'external', label: 'Abrir conversa', danger: false,
            action: () => { closeAllModals(); setTimeout(() => chatState.loadConversation(conv), 200); }
        },
        {
            icon: conv.pinned ? 'pin_filled' : 'pin',
            label: conv.pinned ? 'Desafixar conversa' : 'Fixar conversa',
            danger: false,
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
            icon: 'pen', label: 'Renomear', danger: false,
            action: () => showRenameDialog(conv)
        },
        {
            icon: 'share', label: 'Partilhar conversa', danger: false,
            action: () => { closeAllModals(); shareConversationText(conv); }
        },
        {
            icon: 'trash', label: 'Eliminar conversa', danger: true,
            action: () => { closeAllModals(); deleteConversation(conv); }
        }
    ];

    options.forEach((opt, i) => {
        if (i > 0) {
            const div = document.createElement('div');
            div.style.cssText = `height:1px;margin-left:52px;background:${colors.divider};`;
            card.appendChild(div);
        }
        const row = document.createElement('div');
        row.className = 'pulse-tap';
        row.style.cssText = 'display:flex;align-items:center;padding:14px 16px;cursor:pointer;';
        row.onclick = opt.action;

        const iconEl = document.createElement('span');
        iconEl.className = 'icon-mask';
        const tint = opt.danger ? '#EF4444' : colors.iconTint;
        iconEl.style.cssText = `mask-image:url('assets/icons/svg/${opt.icon}.svg');-webkit-mask-image:url('assets/icons/svg/${opt.icon}.svg');width:18px;height:18px;background:${tint};flex-shrink:0;`;
        row.appendChild(iconEl);

        const label = document.createElement('span');
        label.style.cssText = `margin-left:14px;font-size:15px;font-weight:500;color:${opt.danger ? '#EF4444' : colors.textPrimary};`;
        label.textContent = opt.label;
        row.appendChild(label);

        card.appendChild(row);
    });

    const pad = document.createElement('div');
    pad.style.height = '24px';
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
   INCÓGNITO
   ========================================================================= */

function showIncognitoConfirmSheet() {
    const colors = getThemeColors();
    const content = document.getElementById('modalSheetContent');
    const sheet = document.getElementById('modalSheet');
    const overlay = document.getElementById('modalOverlay');
    content.innerHTML = '';

    content.appendChild(buildSheetHandle(sheet, overlay, closeModalSheet));

    const body = document.createElement('div');
    body.style.cssText = 'padding:8px 20px 8px;text-align:center;';
    body.innerHTML = `
        <span class="icon-mask" style="mask-image:url('assets/icons/svg/incognito.svg');-webkit-mask-image:url('assets/icons/svg/incognito.svg');width:36px;height:36px;background:${colors.iconTint};display:block;margin:0 auto 12px;"></span>
        <div style="font-size:17px;font-weight:700;color:${colors.textPrimary};margin-bottom:8px;">Conversa Privada</div>
        <div style="font-size:14px;color:${colors.textSecondary};line-height:1.5;margin-bottom:20px;">Esta conversa não será guardada.<br>Não será possível desativar o modo incógnito durante a conversa.</div>
    `;
    content.appendChild(body);

    const btnWrap = document.createElement('div');
    btnWrap.style.cssText = 'padding:0 16px 8px;display:flex;flex-direction:column;gap:10px;';

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'pulse-tap';
    confirmBtn.style.cssText = `width:100%;height:50px;border-radius:25px;border:none;cursor:pointer;font-size:15px;font-weight:700;background:${colors.textPrimary};color:${colors.background};`;
    confirmBtn.textContent = 'Ativar modo incógnito';
    confirmBtn.onclick = () => {
        closeModalSheet();
        chatState.activateIncognito();
    };

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'pulse-tap';
    cancelBtn.style.cssText = `width:100%;height:50px;border-radius:25px;border:none;cursor:pointer;font-size:15px;font-weight:500;background:${isDarkMode ? '#2C2C2E' : '#E5E5EA'};color:${colors.textPrimary};`;
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.onclick = () => closeModalSheet();

    btnWrap.appendChild(confirmBtn);
    btnWrap.appendChild(cancelBtn);
    content.appendChild(btnWrap);

    const pad = document.createElement('div');
    pad.style.height = '16px';
    content.appendChild(pad);

    openModalSheet();
}

/* =========================================================================
   MODEL PICKER
   ========================================================================= */

const AVAILABLE_MODELS = [
    { name: 'Gemini 2.5 Flash', id: 'gemini-2.5-flash' },
    { name: 'Gemini 2.5 Pro',   id: 'gemini-2.5-pro' },
    { name: 'Gemini 2.0 Flash', id: 'gemini-2.0-flash' },
];

function showModelPickerSheet() {
    const colors = getThemeColors();
    const content = document.getElementById('modalSheetContent');
    const sheet = document.getElementById('modalSheet');
    const overlay = document.getElementById('modalOverlay');
    content.innerHTML = '';

    content.appendChild(buildSheetHandle(sheet, overlay, closeModalSheet));

    const titleEl = document.createElement('div');
    titleEl.style.cssText = `padding:4px 20px 12px;font-size:17px;font-weight:700;color:${colors.textPrimary};`;
    titleEl.textContent = 'Modelo';
    content.appendChild(titleEl);

    const card = document.createElement('div');
    card.style.cssText = `margin:0 12px;border-radius:16px;overflow:hidden;background:${isDarkMode ? '#1C1C1E' : '#F2F2F7'};`;

    AVAILABLE_MODELS.forEach((model, i) => {
        if (i > 0) {
            const sep = document.createElement('div');
            sep.style.cssText = `height:1px;margin-left:52px;background:${colors.divider};`;
            card.appendChild(sep);
        }
        const row = document.createElement('div');
        row.className = 'pulse-tap';
        row.style.cssText = 'display:flex;align-items:center;padding:14px 16px;cursor:pointer;';
        row.onclick = () => {
            // Atualiza o modelo (apenas visual por agora — adaptar ao worker se necessário)
            window.MODEL_NAME = model.name;
            window.MODEL_ID = model.id;
            const label = document.getElementById('modelPillLabel');
            if (label) label.textContent = chatState.incognitoMode ? '🕵️ ' + model.name : model.name;
            closeModalSheet();
            showToast('Modelo: ' + model.name);
        };

        const iconEl = document.createElement('span');
        iconEl.className = 'icon-mask';
        iconEl.style.cssText = `mask-image:url('assets/icons/svg/ai.svg');-webkit-mask-image:url('assets/icons/svg/ai.svg');width:18px;height:18px;background:${colors.iconTint};flex-shrink:0;`;
        row.appendChild(iconEl);

        const lbl = document.createElement('span');
        lbl.style.cssText = `margin-left:14px;font-size:15px;font-weight:500;color:${colors.textPrimary};flex:1;`;
        lbl.textContent = model.name;
        row.appendChild(lbl);

        const isActive = (window.MODEL_ID || MODEL_ID) === model.id;
        if (isActive) {
            const check = document.createElement('span');
            check.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${colors.primary}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
            row.appendChild(check);
        }

        card.appendChild(row);
    });

    content.appendChild(card);

    const pad = document.createElement('div');
    pad.style.height = '24px';
    content.appendChild(pad);

    openModalSheet();
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

    const input = document.getElementById('textInput');
    if (input) {
        input.value = '';
        resetInputHeight(input);
        updateSendButton();
    }
    scrollToBottom();

    const think = chatState.thinkMoreMode;
    const assistantIndex = chatState.addAssistantPlaceholder(think);
    scrollToBottom();

    const token        = authState.user?.token || '';
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

    // Em modo incógnito não guarda a conversa
    if (chatState.incognitoMode) return;

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

/* =========================================================================
   ADD POPUP — upload de imagens e ficheiros
   ========================================================================= */

function showAddPopup() {
    const colors = getThemeColors();
    const content = document.getElementById('modalSheetContent');
    const sheet = document.getElementById('modalSheet');
    const overlay = document.getElementById('modalOverlay');
    content.innerHTML = '';

    content.appendChild(buildSheetHandle(sheet, overlay, closeModalSheet));

    const fileInputImage = document.createElement('input');
    fileInputImage.type = 'file';
    fileInputImage.accept = 'image/*';
    fileInputImage.style.display = 'none';
    fileInputImage.onchange = (e) => {
        const file = e.target.files?.[0];
        if (file) { closeAllModals(); showToast(`Imagem "${file.name}" selecionada`); }
    };
    content.appendChild(fileInputImage);

    const fileInputDoc = document.createElement('input');
    fileInputDoc.type = 'file';
    fileInputDoc.accept = '.pdf,.doc,.docx,.txt,.csv,.xlsx,.pptx';
    fileInputDoc.style.display = 'none';
    fileInputDoc.onchange = (e) => {
        const file = e.target.files?.[0];
        if (file) { closeAllModals(); showToast(`Ficheiro "${file.name}" selecionado`); }
    };
    content.appendChild(fileInputDoc);

    const fileInputAny = document.createElement('input');
    fileInputAny.type = 'file';
    fileInputAny.accept = '*/*';
    fileInputAny.style.display = 'none';
    fileInputAny.onchange = (e) => {
        const file = e.target.files?.[0];
        if (file) { closeAllModals(); showToast(`Ficheiro "${file.name}" selecionado`); }
    };
    content.appendChild(fileInputAny);

    const card = document.createElement('div');
    card.style.cssText = `margin:0 12px;border-radius:16px;overflow:hidden;background:${isDarkMode ? '#1C1C1E' : '#F2F2F7'};`;

    function buildRow(iconName, label, onClick) {
        const row = document.createElement('div');
        row.className = 'pulse-tap';
        row.style.cssText = 'display:flex;align-items:center;padding:14px 16px;cursor:pointer;';
        row.onclick = onClick;
        const icon = document.createElement('span');
        icon.className = 'icon-mask';
        icon.style.cssText = `mask-image:url('assets/icons/svg/${iconName}.svg');-webkit-mask-image:url('assets/icons/svg/${iconName}.svg');width:20px;height:20px;background:${colors.iconTint};flex-shrink:0;`;
        row.appendChild(icon);
        const lbl = document.createElement('span');
        lbl.style.cssText = `margin-left:14px;font-size:15px;font-weight:500;color:${colors.textPrimary};`;
        lbl.textContent = label;
        row.appendChild(lbl);
        return row;
    }

    function buildSep() {
        const sep = document.createElement('div');
        sep.style.cssText = `height:1px;margin-left:54px;background:${colors.divider};`;
        return sep;
    }

    card.appendChild(buildRow('image',  'Enviar Imagem',    () => fileInputImage.click()));
    card.appendChild(buildSep());
    card.appendChild(buildRow('folder', 'Enviar Documento', () => fileInputDoc.click()));
    card.appendChild(buildSep());
    card.appendChild(buildRow('upload', 'Enviar Ficheiro',  () => fileInputAny.click()));
    card.appendChild(buildSep());
    card.appendChild(buildRow('extras', 'Extras',           () => { closeAllModals(); setTimeout(showExtrasSheet, 180); }));

    content.appendChild(card);

    const pad = document.createElement('div');
    pad.style.height = '20px';
    content.appendChild(pad);

    openModalSheet();
}

/* =========================================================================
   EXTRAS SHEET — ícones -15%
   ========================================================================= */

function showExtrasSheet() {
    const colors = getThemeColors();
    const content = document.getElementById('modalSheetContent');
    const sheet = document.getElementById('modalSheet');
    const overlay = document.getElementById('modalOverlay');
    content.innerHTML = '';

    content.appendChild(buildSheetHandle(sheet, overlay, closeModalSheet));

    const titleEl = document.createElement('div');
    titleEl.style.cssText = `padding:4px 20px 12px;font-size:17px;font-weight:700;color:${colors.textPrimary};`;
    titleEl.textContent = 'Extras';
    content.appendChild(titleEl);

    const card = document.createElement('div');
    card.style.cssText = `margin:0 12px;border-radius:16px;overflow:hidden;background:${isDarkMode ? '#1C1C1E' : '#F2F2F7'};`;

    const items = [
        { title: 'Flash',      iconOff: 'flash',  iconOn: 'flash_filled',  active: chatState.flashMode,     action: () => { chatState.toggleFlashMode();     closeAllModals(); } },
        { title: 'Think More', iconOff: 'brain',  iconOn: 'brain_filled',  active: chatState.thinkMoreMode, action: () => { chatState.toggleThinkMoreMode(); closeAllModals(); } },
        { title: 'Sheets',     iconOff: 'sheets', iconOn: 'sheets_filled', active: chatState.sheetsEnabled, action: () => { chatState.toggleSheets();        closeAllModals(); } }
    ];

    items.forEach((item, i) => {
        if (i > 0) {
            const div = document.createElement('div');
            div.style.cssText = `height:1px;margin-left:54px;background:${colors.divider};`;
            card.appendChild(div);
        }
        const row = document.createElement('div');
        row.className = 'pulse-tap';
        row.style.cssText = `display:flex;align-items:center;padding:14px 16px;cursor:pointer;background:${item.active ? (colors.extrasCardActiveText + '14') : 'transparent'};`;
        row.onclick = item.action;

        // Ícone -15% (17px em vez de 20px)
        const icon = document.createElement('span');
        icon.className = 'icon-mask';
        icon.style.cssText = `mask-image:url('assets/icons/svg/${item.active ? item.iconOn : item.iconOff}.svg');-webkit-mask-image:url('assets/icons/svg/${item.active ? item.iconOn : item.iconOff}.svg');width:17px;height:17px;background:${item.active ? colors.extrasCardActiveText : colors.iconTint};flex-shrink:0;`;
        row.appendChild(icon);

        const span = document.createElement('span');
        span.style.cssText = `margin-left:14px;font-size:15px;font-weight:500;flex:1;color:${item.active ? colors.extrasCardActiveText : colors.textPrimary};`;
        span.textContent = item.title;
        row.appendChild(span);

        if (item.active) {
            const dot = document.createElement('div');
            dot.style.cssText = `width:8px;height:8px;border-radius:50%;background:${colors.extrasCardActiveText};`;
            row.appendChild(dot);
        }

        card.appendChild(row);
    });

    content.appendChild(card);

    const pad = document.createElement('div');
    pad.style.height = '24px';
    content.appendChild(pad);

    openModalSheet();
}

function showEditModal() {
    const colors = getThemeColors();
    const content = document.getElementById('modalSheetContent');
    const sheet = document.getElementById('modalSheet');
    const overlay = document.getElementById('modalOverlay');
    content.innerHTML = '';

    content.appendChild(buildSheetHandle(sheet, overlay, closeModalSheet));

    const titleEl = document.createElement('div');
    titleEl.style.cssText = `padding:4px 20px 20px;font-size:17px;font-weight:700;color:${colors.textPrimary};`;
    titleEl.textContent = 'Edit';
    content.appendChild(titleEl);

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