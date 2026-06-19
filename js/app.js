let isDarkMode = false;
let conversations = [];

const MODEL_NAME = 'Gemini 2.5 Flash';
const MODEL_ID   = 'gemini-2.5-flash';

const lightColors = {
    background:            '#FFFFFF',
    textPrimary:           '#212730',
    textSecondary:         '#888888',
    textHint:              '#AAAAAA',
    iconTint:              '#000000',
    iconTintSecondary:     '#888888',
    divider:               '#E5E5EA',
    drawerBackground:      '#F2F2F7',
    drawerText:            '#000000',
    bottomBarSolid:        '#FFFFFF',
    dialogBackground:      '#F2F2F7',
    sendBtnColor:          '#2F7BF6',
    sendIconColor:         '#FFFFFF',
    addCircleBg:           '#E8E8E8',
    tabPreviewPillBg:      '#E0EBFE',
    extrasCardActive:      '#EEF2FF',
    extrasCardActiveText:  '#2F7BF6',
    settings_section_label:'#888888',
    userBubbleBg:          '#E0EBFE',
    assistantBubbleBg:     '#F2F2F7',
    authBtnBg:             '#2F7BF6',
    authBtnText:           '#FFFFFF',
    authInputFill:         '#F2F2F7',
    appbarBtnBg:           '#E8E8E8',
    primary:               '#2F7BF6'
};

const darkColors = {
    background:            '#121212',
    textPrimary:           '#F2F2F2',
    textSecondary:         '#939393',
    textHint:              '#6E6E6E',
    iconTint:              '#F2F2F2',
    iconTintSecondary:     '#939393',
    divider:               '#2A2A2A',
    drawerBackground:      '#1F1F1F',
    drawerText:            '#F2F2F2',
    bottomBarSolid:        '#1F1F1F',
    dialogBackground:      '#1F1F1F',
    sendBtnColor:          '#2F7BF6',
    sendIconColor:         '#FFFFFF',
    addCircleBg:           '#2C2C2E',
    tabPreviewPillBg:      '#1F2D4A',
    extrasCardActive:      '#1E2D4F',
    extrasCardActiveText:  '#A8C8FA',
    settings_section_label:'#939393',
    userBubbleBg:          '#1F2D4A',
    assistantBubbleBg:     '#1F1F1F',
    authBtnBg:             '#2F7BF6',
    authBtnText:           '#FFFFFF',
    authInputFill:         '#2C2C2E',
    appbarBtnBg:           '#2C2C2E',
    primary:               '#2F7BF6'
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

window.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('nexa_theme');
    if (savedTheme === 'dark')       isDarkMode = true;
    else if (savedTheme === 'light') isDarkMode = false;
    else isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

    applyTheme();

    // Migração: suporta chave antiga ipc_user
    const savedUser =
        JSON.parse(localStorage.getItem('nexa_user')) ||
        JSON.parse(localStorage.getItem('ipc_user'));

    if (savedUser && savedUser.token) {
        // Move para a chave nova se estava na antiga
        localStorage.removeItem('ipc_user');
        authState.setUser(savedUser);
        window.currentPage = 'chat';
        renderChatPage();
    } else {
        window.currentPage = 'login';
        renderLoginPage();
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