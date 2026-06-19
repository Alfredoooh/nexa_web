function renderSettingsPage() {
    const colors = getThemeColors();
    const cardBg = isDarkMode ? '#1C1C1E' : '#FFFFFF';
    const sectionLabelColor = isDarkMode ? '#6B7280' : '#9CA3AF';
    const dividerColor = isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

    document.getElementById('app').innerHTML = `
    <div style="min-height:100vh;display:flex;flex-direction:column;background:${colors.background};overflow-y:auto;">

      <!-- AppBar -->
      <div style="display:flex;align-items:center;height:56px;padding:0 8px 0 4px;flex-shrink:0;">
        <button id="backFromSettings" class="pulse-tap" style="width:44px;height:44px;display:flex;align-items:center;justify-content:center;background:none;border:none;cursor:pointer;border-radius:50%;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${colors.textPrimary}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h1 style="font-size:20px;font-weight:700;color:${colors.textPrimary};margin:0;margin-left:2px;font-family:'TimesNewRoman',serif;flex:1;">Definições</h1>
        <button id="logoutBtn" class="pulse-tap" style="width:44px;height:44px;display:flex;align-items:center;justify-content:center;background:none;border:none;cursor:pointer;border-radius:50%;color:#EF4444;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>

      <!-- Conteúdo -->
      <div style="padding:8px 16px 32px;">

        <!-- Secção CONTA -->
        <p style="font-size:11px;font-weight:600;letter-spacing:0.08em;color:${sectionLabelColor};margin:16px 4px 8px;text-transform:uppercase;">Conta</p>
        <div style="background:${cardBg};border-radius:14px;overflow:hidden;">
          ${createSettingsTileNew('customise', 'Personalização', colors, dividerColor, true)}
          ${createSettingsTileNew('database', 'Controlo de Dados', colors, dividerColor, true)}
          ${createSettingsTileNew('security', 'Segurança', colors, dividerColor, false)}
        </div>

        <!-- Secção APARÊNCIA -->
        <p style="font-size:11px;font-weight:600;letter-spacing:0.08em;color:${sectionLabelColor};margin:24px 4px 8px;text-transform:uppercase;">Aparência</p>
        <div style="background:${cardBg};border-radius:14px;overflow:hidden;">
          <button id="themeBtn" class="pulse-tap" style="width:100%;display:flex;align-items:center;padding:14px 16px;background:none;border:none;cursor:pointer;border-bottom:1px solid ${dividerColor};">
            <span class="icon-mask" style="mask-image:url('assets/icons/svg/appearance.svg');-webkit-mask-image:url('assets/icons/svg/appearance.svg');background:${colors.iconTint};width:20px;height:20px;flex-shrink:0;"></span>
            <span style="margin-left:14px;flex:1;font-size:15px;color:${colors.textPrimary};text-align:left;">Tema</span>
            <span style="font-size:14px;color:${colors.textSecondary};margin-right:6px;" id="themeLabel">${getThemeLabel()}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${colors.iconTintSecondary}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <button class="pulse-tap" style="width:100%;display:flex;align-items:center;padding:14px 16px;background:none;border:none;cursor:pointer;">
            <span class="icon-mask" style="mask-image:url('assets/icons/svg/language.svg');-webkit-mask-image:url('assets/icons/svg/language.svg');background:${colors.iconTint};width:20px;height:20px;flex-shrink:0;"></span>
            <span style="margin-left:14px;flex:1;font-size:15px;color:${colors.textPrimary};text-align:left;">Idioma</span>
            <span style="font-size:14px;color:${colors.textSecondary};margin-right:6px;">Português</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${colors.iconTintSecondary}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>

      </div>
    </div>

    <!-- Overlay -->
    <div id="settingsOverlay" class="modal-overlay"></div>

    <!-- Sheet de Tema — igual ao preview-modal: full width, sobe de baixo -->
    <div id="themeSheet" style="
      position:fixed;
      bottom:0;left:0;right:0;
      z-index:201;
      transform:translateY(100%);
      transition:transform 0.4s cubic-bezier(0.4,0,0.2,1);
      border-radius:12px 12px 0 0;
      overflow:hidden;
      background:${colors.dialogBackground};
    ">
      <!-- Handle -->
      <div style="display:flex;justify-content:center;padding-top:12px;padding-bottom:4px;">
        <div style="width:36px;height:4px;border-radius:2px;background:${dividerColor};"></div>
      </div>
      <!-- Título -->
      <div style="padding:12px 20px 8px;">
        <span style="font-size:17px;font-weight:700;color:${colors.textPrimary};">Tema</span>
      </div>
      <!-- Opções -->
      <div style="padding:0 12px 32px;">
        <button id="settingsThemeLight" class="pulse-tap" style="width:100%;display:flex;align-items:center;padding:14px 8px;background:none;border:none;cursor:pointer;border-bottom:1px solid ${dividerColor};">
          <span style="font-size:15px;color:${colors.textPrimary};flex:1;text-align:left;">Claro</span>
          ${!isDarkMode ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${colors.primary}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>` : ''}
        </button>
        <button id="settingsThemeDark" class="pulse-tap" style="width:100%;display:flex;align-items:center;padding:14px 8px;background:none;border:none;cursor:pointer;">
          <span style="font-size:15px;color:${colors.textPrimary};flex:1;text-align:left;">Escuro</span>
          ${isDarkMode ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${colors.primary}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>` : ''}
        </button>
      </div>
    </div>`;

    document.getElementById('backFromSettings').onclick = renderChatPage;
    document.getElementById('logoutBtn').onclick = async () => {
        if (authState.user) await AuthApiService.logout(authState.user.token);
        authState.clear();
        renderLoginPage();
    };
    document.getElementById('themeBtn').onclick = showThemeSheet;
}

function createSettingsTileNew(icon, label, colors, dividerColor, hasDivider) {
    const border = hasDivider ? `border-bottom:1px solid ${dividerColor};` : '';
    return `<button class="pulse-tap" style="width:100%;display:flex;align-items:center;padding:14px 16px;background:none;border:none;cursor:pointer;${border}">
        <span class="icon-mask" style="mask-image:url('assets/icons/svg/${icon}.svg');-webkit-mask-image:url('assets/icons/svg/${icon}.svg');background:${colors.iconTint};width:20px;height:20px;flex-shrink:0;"></span>
        <span style="margin-left:14px;flex:1;font-size:15px;color:${colors.textPrimary};text-align:left;">${label}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${colors.iconTintSecondary}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
    </button>`;
}

function createSettingsTile(icon, label, colors) {
    const dividerColor = isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    return createSettingsTileNew(icon, label, colors, dividerColor, true);
}

function getThemeLabel() {
    return isDarkMode ? 'Escuro' : 'Claro';
}

function showThemeSheet() {
    const overlay = document.getElementById('settingsOverlay');
    const sheet = document.getElementById('themeSheet');

    requestAnimationFrame(() => {
        overlay.classList.add('open');
        sheet.style.transform = 'translateY(0)';
    });

    overlay.onclick = closeThemeSheet;
    document.getElementById('settingsThemeLight').onclick = () => {
        closeThemeSheet();
        setTimeout(() => { isDarkMode = false; applyTheme(); renderSettingsPage(); }, 400);
    };
    document.getElementById('settingsThemeDark').onclick = () => {
        closeThemeSheet();
        setTimeout(() => { isDarkMode = true; applyTheme(); renderSettingsPage(); }, 400);
    };
}

function closeThemeSheet() {
    const overlay = document.getElementById('settingsOverlay');
    const sheet = document.getElementById('themeSheet');
    if (!overlay || !sheet) return;
    overlay.classList.remove('open');
    sheet.style.transform = 'translateY(100%)';
}