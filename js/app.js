let isDarkMode = false;
let conversations = [];

const MODEL_NAME = 'Gemini 2.5 Flash';
const MODEL_ID   = 'gemini-2.5-flash';

const AVAILABLE_MODELS = [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash',  description: 'Rápido e equilibrado' },
    { id: 'gemini-2.5-pro',   name: 'Gemini 2.5 Pro',    description: 'Mais capaz para tarefas complexas' }
];

let currentModelId = MODEL_ID;

function getCurrentModelName() {
    const m = AVAILABLE_MODELS.find(m => m.id === currentModelId);
    return m ? m.name : MODEL_NAME;
}

const lightColors = {
    background:             '#FFFFFF',
    textPrimary:            '#212730',
    textSecondary:          '#888888',
    textHint:               '#AAAAAA',
    iconTint:               '#000000',
    iconTintSecondary:      '#888888',
    divider:                '#E5E5EA',
    drawerBackground:       '#F2F2F7',
    drawerText:             '#000000',
    bottomBarSolid:         '#FFFFFF',
    dialogBackground:       '#F2F2F7',
    sendBtnColor:           '#2F7BF6',
    sendIconColor:          '#FFFFFF',
    addCircleBg:            '#E8E8E8',
    tabPreviewPillBg:       '#E0EBFE',
    extrasCardActive:       '#EEF2FF',
    extrasCardActiveText:   '#2F7BF6',
    settings_section_label: '#888888',
    userBubbleBg:           '#E0EBFE',
    assistantBubbleBg:      '#F2F2F7',
    authBtnBg:              '#2F7BF6',
    authBtnText:            '#FFFFFF',
    authInputFill:          '#F2F2F7',
    appbarBtnBg:            '#E8E8E8',
    primary:                '#2F7BF6'
};

const darkColors = {
    background:             '#121212',
    textPrimary:            '#F2F2F2',
    textSecondary:          '#939393',
    textHint:               '#6E6E6E',
    iconTint:               '#F2F2F2',
    iconTintSecondary:      '#939393',
    divider:                '#2A2A2A',
    drawerBackground:       '#1F1F1F',
    drawerText:             '#F2F2F2',
    bottomBarSolid:         '#1F1F1F',
    dialogBackground:       '#1F1F1F',
    sendBtnColor:           '#2F7BF6',
    sendIconColor:          '#FFFFFF',
    addCircleBg:            '#2C2C2E',
    tabPreviewPillBg:       '#1F2D4A',
    extrasCardActive:       '#1E2D4F',
    extrasCardActiveText:   '#A8C8FA',
    settings_section_label: '#939393',
    userBubbleBg:           '#1F2D4A',
    assistantBubbleBg:      '#1F1F1F',
    authBtnBg:              '#2F7BF6',
    authBtnText:            '#FFFFFF',
    authInputFill:          '#2C2C2E',
    appbarBtnBg:            '#2C2C2E',
    primary:                '#2F7BF6'
};

function getThemeColors() {
    return isDarkMode ? darkColors : lightColors;
}

function applyTheme() {
    document.body.classList.toggle('light', !isDarkMode);
    document.body.classList.toggle('dark', isDarkMode);
    const currentPage = window.currentPage || 'login';
    switch (currentPage) {
        case 'chat':     renderChatPage();     break;
        case 'settings': renderSettingsPage(); break;
        case 'register': renderRegisterPage(); break;
        default:         renderLoginPage();
    }
}

function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    applyTheme();
    showToast(isDarkMode ? '🌙 Modo escuro' : '☀️ Modo claro');
}

/* =========================================================================
   SPLASH SCREEN — só na abertura do site (DOMContentLoaded), nunca entre telas
   ========================================================================= */
function buildInitialSplashHTML() {
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const bg = dark
        ? 'radial-gradient(circle at 30% 20%, #1d2440 0%, #121212 55%, #0a0a0a 100%)'
        : 'radial-gradient(circle at 30% 20%, #eaf1ff 0%, #ffffff 55%, #f5f6fa 100%)';
    return `
        <div id="initialSplash" style="position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:${bg};transition:opacity 0.45s ease;">
            <div style="display:flex;flex-direction:column;align-items:center;gap:14px;">
                <img src="assets/icons/png/logo.png" style="width:80px;height:80px;border-radius:20px;box-shadow:0 8px 30px rgba(47,123,246,0.25);" />
                <div style="display:flex;gap:6px;">
                    <span class="splash-dot" style="width:7px;height:7px;border-radius:50%;background:#2F7BF6;animation:splashDotPulse 1.1s ease-in-out infinite;"></span>
                    <span class="splash-dot" style="width:7px;height:7px;border-radius:50%;background:#2F7BF6;animation:splashDotPulse 1.1s ease-in-out 0.15s infinite;"></span>
                    <span class="splash-dot" style="width:7px;height:7px;border-radius:50%;background:#2F7BF6;animation:splashDotPulse 1.1s ease-in-out 0.3s infinite;"></span>
                </div>
            </div>
        </div>
        <style>
            @keyframes splashDotPulse { 0%,100% { opacity:0.25; transform:scale(0.8);} 50% { opacity:1; transform:scale(1);} }
        </style>`;
}

function hideInitialSplash() {
    const splash = document.getElementById('initialSplash');
    if (!splash) return;
    splash.style.opacity = '0';
    setTimeout(() => splash.remove(), 460);
}

window.addEventListener('DOMContentLoaded', async () => {
    const savedTheme = localStorage.getItem('nexa_theme');
    if (savedTheme === 'dark')       isDarkMode = true;
    else if (savedTheme === 'light') isDarkMode = false;
    else isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

    document.body.classList.toggle('light', !isDarkMode);
    document.body.classList.toggle('dark', isDarkMode);

    // Splash inicial — aparece UMA vez, só ao abrir o site
    document.getElementById('app').innerHTML = buildInitialSplashHTML();

    // 1. Primeiro verifica se já há sessão guardada
    const savedUser =
        JSON.parse(localStorage.getItem('nexa_user') || 'null') ||
        JSON.parse(localStorage.getItem('ipc_user')  || 'null');

    let renderedPage = false;

    if (savedUser && savedUser.token) {
        localStorage.removeItem('ipc_user');
        authState.setUser(savedUser);
        window.currentPage = 'chat';
        renderChatPage();
        renderedPage = true;
    } else {
        // 2. Sem sessão — verifica se vem de redirect Google
        const redirectHandled = await handleGoogleRedirectResult();
        if (!redirectHandled) {
            window.currentPage = 'login';
            renderLoginPage();
        }
        renderedPage = true;
    }

    if (renderedPage) {
        setTimeout(() => hideInitialSplash(), 650);
    } else {
        hideInitialSplash();
    }

    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'd') {
            e.preventDefault();
            toggleDarkMode();
        }
    });
});

window.addEventListener('beforeunload', () => {
    localStorage.setItem('nexa_theme', isDarkMode ? 'dark' : 'light');
});