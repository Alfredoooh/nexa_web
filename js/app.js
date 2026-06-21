let isDarkMode = false;
let conversations = [];

const MODEL_NAME = 'Gemini 2.5 Flash';
const MODEL_ID = 'gemini-2.5-flash';

const AVAILABLE_MODELS = [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Rápido e equilibrado' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Mais capaz para tarefas complexas' }
];

let currentModelId = MODEL_ID;

function getCurrentModelName() {
    const m = AVAILABLE_MODELS.find(m => m.id === currentModelId);
    return m ? m.name : MODEL_NAME;
}

/* =========================================================================
   IDIOMAS
   ========================================================================= */

const AVAILABLE_LANGUAGES = [
    { code: 'pt', name: 'Português', native: 'Português (Portugal)' },
    { code: 'pt-BR', name: 'Português (Brasil)', native: 'Português (Brasil)' },
    { code: 'en', name: 'Inglês', native: 'English' },
    { code: 'es', name: 'Espanhol', native: 'Español' },
    { code: 'fr', name: 'Francês', native: 'Français' },
    { code: 'de', name: 'Alemão', native: 'Deutsch' },
    { code: 'it', name: 'Italiano', native: 'Italiano' },
    { code: 'nl', name: 'Neerlandês', native: 'Nederlands' },
    { code: 'ru', name: 'Russo', native: 'Русский' },
    { code: 'zh', name: 'Chinês (simplificado)', native: '中文（简体）' },
    { code: 'ja', name: 'Japonês', native: '日本語' },
    { code: 'ko', name: 'Coreano', native: '한국어' },
    { code: 'ar', name: 'Árabe', native: 'العربية' },
    { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
    { code: 'tr', name: 'Turco', native: 'Türkçe' },
    { code: 'pl', name: 'Polaco', native: 'Polski' },
    { code: 'sv', name: 'Sueco', native: 'Svenska' },
    { code: 'uk', name: 'Ucraniano', native: 'Українська' }
];

const LANG_STORAGE_KEY = 'nexa_language';
let currentLanguage = localStorage.getItem(LANG_STORAGE_KEY) || 'pt';

function getCurrentLanguageLabel() {
    const l = AVAILABLE_LANGUAGES.find(l => l.code === currentLanguage);
    return l ? l.name : 'Português';
}

function setCurrentLanguage(code) {
    currentLanguage = code;
    try { localStorage.setItem(LANG_STORAGE_KEY, code); } catch (e) {}
}

const lightColors = {
    background: '#FFFFFF',
    textPrimary: '#212730',
    textSecondary: '#888888',
    textHint: '#AAAAAA',
    iconTint: '#000000',
    iconTintSecondary: '#888888',
    divider: '#E5E5EA',
    drawerBackground: '#F2F2F7',
    drawerText: '#000000',
    bottomBarSolid: '#FFFFFF',
    dialogBackground: '#F2F2F7',
    sendBtnColor: '#2F7BF6',
    sendIconColor: '#FFFFFF',
    addCircleBg: '#E8E8E8',
    tabPreviewPillBg: '#E0EBFE',
    extrasCardActive: '#EEF2FF',
    extrasCardActiveText: '#2F7BF6',
    settings_section_label: '#888888',
    userBubbleBg: '#E0EBFE',
    assistantBubbleBg: '#F2F2F7',
    authBtnBg: '#2F7BF6',
    authBtnText: '#FFFFFF',
    authInputFill: '#F2F2F7',
    appbarBtnBg: '#E8E8E8',
    primary: '#2F7BF6'
};

const darkColors = {
    background: '#121212',
    textPrimary: '#F2F2F2',
    textSecondary: '#939393',
    textHint: '#6E6E6E',
    iconTint: '#F2F2F2',
    iconTintSecondary: '#939393',
    divider: '#2A2A2A',
    drawerBackground: '#1F1F1F',
    drawerText: '#F2F2F2',
    bottomBarSolid: '#1F1F1F',
    dialogBackground: '#1F1F1F',
    sendBtnColor: '#2F7BF6',
    sendIconColor: '#FFFFFF',
    addCircleBg: '#2C2C2E',
    tabPreviewPillBg: '#1F2D4A',
    extrasCardActive: '#1E2D4F',
    extrasCardActiveText: '#A8C8FA',
    settings_section_label: '#939393',
    userBubbleBg: '#1F2D4A',
    assistantBubbleBg: '#1F1F1F',
    authBtnBg: '#2F7BF6',
    authBtnText: '#FFFFFF',
    authInputFill: '#2C2C2E',
    appbarBtnBg: '#2C2C2E',
    primary: '#2F7BF6'
};

function getThemeColors() {
    return isDarkMode ? darkColors : lightColors;
}

function applyTheme() {
    document.body.classList.toggle('light', !isDarkMode);
    document.body.classList.toggle('dark', isDarkMode);
    try { localStorage.setItem('nexa_theme', isDarkMode ? 'dark' : 'light'); } catch (e) {}
    
    const settingsWasOpen = !!document.getElementById('settingsBackdrop');
    
    if (authState.user) {
        renderChatPage();
    } else {
        const currentPage = window.currentPage || 'login';
        if (currentPage === 'register') renderRegisterPage();
        else renderLoginPage();
    }
    
    if (settingsWasOpen) {
        window.currentPage = 'settings';
        showSettingsCard();
    }
}

function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    applyTheme();
    showToast(isDarkMode ? '🌙 Modo escuro' : '☀️ Modo claro');
}

/* =========================================================================
   SPLASH SCREEN — ícone centrado, fundo sólido, fade out limpo
   ========================================================================= */
function buildInitialSplashHTML() {
    const bg = isDarkMode ? '#121212' : '#FFFFFF';
    return `
        <div id="initialSplash" style="
            position: fixed; inset: 0; z-index: 99999;
            display: flex; align-items: center; justify-content: center;
            background: ${bg};
            transition: opacity 0.4s ease;
        ">
            <img src="assets/icons/png/logo.png" style="
                width: 84px; height: 84px;
                border-radius: 20px;
            " />
        </div>`;
}

function hideInitialSplash() {
    const splash = document.getElementById('initialSplash');
    if (!splash) return;
    splash.style.opacity = '0';
    setTimeout(() => splash.remove(), 420);
}

window.addEventListener('DOMContentLoaded', async () => {
    const savedTheme = localStorage.getItem('nexa_theme');
    if (savedTheme === 'dark') isDarkMode = true;
    else if (savedTheme === 'light') isDarkMode = false;
    else isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    document.body.classList.toggle('light', !isDarkMode);
    document.body.classList.toggle('dark', isDarkMode);
    
    document.getElementById('app').innerHTML = buildInitialSplashHTML();
    
    const savedUser =
        JSON.parse(localStorage.getItem('nexa_user') || 'null') ||
        JSON.parse(localStorage.getItem('ipc_user') || 'null');
    
    let renderedPage = false;
    
    if (savedUser && savedUser.token) {
        localStorage.removeItem('ipc_user');
        authState.setUser(savedUser);
        window.currentPage = 'chat';
        renderChatPage();
        renderedPage = true;
    } else {
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