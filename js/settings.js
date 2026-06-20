function renderSettingsPage() {
    window.currentPage = 'settings';
    const colors = getThemeColors();
    const cardBg = isDarkMode ? '#1C1C1E' : '#FFFFFF';
    const sectionLabelColor = isDarkMode ? '#6B7280' : '#9CA3AF';
    const dividerColor = isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    const overlayBg = isDarkMode ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.3)';

    // Remove qualquer settings anterior
    document.getElementById('settingsModal')?.remove();
    document.getElementById('settingsModalOverlay')?.remove();

    // Overlay com blur suave
    const backdrop = document.createElement('div');
    backdrop.id = 'settingsModalOverlay';
    backdrop.style.cssText = `
        position: fixed; inset: 0; z-index: 300;
        background: ${overlayBg};
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        opacity: 0;
        transition: opacity 0.3s ease;
    `;
    backdrop.onclick = () => closeSettingsModal();
    document.body.appendChild(backdrop);

    // Modal flutuante — não toca nas bordas
    const modal = document.createElement('div');
    modal.id = 'settingsModal';
    modal.style.cssText = `
        position: fixed;
        top: 50%; left: 50%;
        transform: translate(-50%, -48%) scale(0.96);
        z-index: 301;
        width: calc(100% - 32px);
        max-width: 420px;
        max-height: 86vh;
        background: ${isDarkMode ? '#1A1A1A' : '#F2F2F7'};
        border-radius: 20px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        box-shadow: 0 24px 60px rgba(0,0,0,0.35), 0 4px 12px rgba(0,0,0,0.15);
        opacity: 0;
        transition: transform 0.35s cubic-bezier(0.34,1.2,0.64,1), opacity 0.3s ease;
    `;

    modal.innerHTML = `
        <!-- Header -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding:18px 20px 14px;flex-shrink:0;border-bottom:1px solid ${dividerColor};">
            <h1 style="font-size:18px;font-weight:700;color:${colors.textPrimary};margin:0;font-family:'TimesNewRoman',serif;">Definições</h1>
            <button id="closeSettingsBtn" class="pulse-tap" style="width:32px;height:32px;border-radius:50%;background:${isDarkMode ? '#2C2C2E' : '#E5E5EA'};border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${colors.iconTint}" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
        </div>

        <!-- Scroll content -->
        <div style="overflow-y:auto;flex:1;padding:16px 16px 24px;">

            <!-- Perfil -->
            <div style="display:flex;align-items:center;gap:14px;padding:14px 16px;background:${cardBg};border-radius:16px;margin-bottom:16px;">
                <div style="width:48px;height:48px;border-radius:50%;background:${isDarkMode ? '#2C2C2E' : '#E5E5EA'};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <span class="icon-mask" style="mask-image:url('assets/icons/svg/user.svg');-webkit-mask-image:url('assets/icons/svg/user.svg');background:${colors.iconTint};width:22px;height:22px;display:block;"></span>
                </div>
                <div style="flex:1;min-width:0;">
                    <div style="font-size:15px;font-weight:600;color:${colors.textPrimary};truncate;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">${escapeHtml(authState.user?.name || 'Utilizador')}</div>
                    <div style="font-size:12px;color:${colors.textSecondary};margin-top:2px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">${escapeHtml(authState.user?.email || '')}</div>
                </div>
            </div>

            <!-- Secção CONTA -->
            <p style="font-size:11px;font-weight:600;letter-spacing:0.08em;color:${sectionLabelColor};margin:0 4px 8px;text-transform:uppercase;">Conta</p>
            <div style="background:${cardBg};border-radius:16px;overflow:hidden;margin-bottom:16px;">
                ${buildSettingsTile('customise', 'Personalização', colors, dividerColor, true)}
                ${buildSettingsTile('database',  'Controlo de Dados', colors, dividerColor, true)}
                ${buildSettingsTile('security',  'Segurança', colors, dividerColor, false)}
            </div>

            <!-- Secção APARÊNCIA -->
            <p style="font-size:11px;font-weight:600;letter-spacing:0.08em;color:${sectionLabelColor};margin:0 4px 8px;text-transform:uppercase;">Aparência</p>
            <div style="background:${cardBg};border-radius:16px;overflow:hidden;margin-bottom:16px;">
                <button id="themeBtn" class="pulse-tap" style="width:100%;display:flex;align-items:center;padding:14px 16px;background:none;border:none;cursor:pointer;border-bottom:1px solid ${dividerColor};">
                    <span class="icon-mask" style="mask-image:url('assets/icons/svg/appearance.svg');-webkit-mask-image:url('assets/icons/svg/appearance.svg');background:${colors.iconTint};width:20px;height:20px;flex-shrink:0;display:block;"></span>
                    <span style="margin-left:14px;flex:1;font-size:15px;color:${colors.textPrimary};text-align:left;">Tema</span>
                    <span style="font-size:14px;color:${colors.textSecondary};margin-right:6px;" id="themeLabelEl">${isDarkMode ? 'Escuro' : 'Claro'}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${colors.iconTintSecondary}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
                <button class="pulse-tap" style="width:100%;display:flex;align-items:center;padding:14px 16px;background:none;border:none;cursor:pointer;">
                    <span class="icon-mask" style="mask-image:url('assets/icons/svg/language.svg');-webkit-mask-image:url('assets/icons/svg/language.svg');background:${colors.iconTint};width:20px;height:20px;flex-shrink:0;display:block;"></span>
                    <span style="margin-left:14px;flex:1;font-size:15px;color:${colors.textPrimary};text-align:left;">Idioma</span>
                    <span style="font-size:14px;color:${colors.textSecondary};margin-right:6px;">Português</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${colors.iconTintSecondary}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
            </div>

            <!-- Logout -->
            <div style="background:${cardBg};border-radius:16px;overflow:hidden;">
                <button id="logoutBtn" class="pulse-tap" style="width:100%;display:flex;align-items:center;padding:14px 16px;background:none;border:none;cursor:pointer;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
                        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                        <polyline points="16 17 21 12 16 7"/>
                        <line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    <span style="margin-left:14px;font-size:15px;color:#EF4444;font-weight:500;">Terminar sessão</span>
                </button>
            </div>

        </div>
    `;

    document.body.appendChild(modal);

    // Anima entrada
    requestAnimationFrame(() => {
        backdrop.style.opacity = '1';
        modal.style.opacity = '1';
        modal.style.transform = 'translate(-50%, -50%) scale(1)';
    });

    // Themesheet dentro do modal — reutiliza o sheet global
    modal.querySelector('#themeBtn').onclick = () => showThemeSheetInSettings();
    modal.querySelector('#closeSettingsBtn').onclick = () => closeSettingsModal();
    modal.querySelector('#logoutBtn').onclick = async () => {
        if (authState.user) await AuthApiService.logout(authState.user.token);
        authState.clear();
        closeSettingsModal();
        renderLoginPage();
    };
}

function buildSettingsTile(icon, label, colors, dividerColor, hasDivider) {
    const border = hasDivider ? `border-bottom:1px solid ${dividerColor};` : '';
    return `<button class="pulse-tap" style="width:100%;display:flex;align-items:center;padding:14px 16px;background:none;border:none;cursor:pointer;${border}">
        <span class="icon-mask" style="mask-image:url('assets/icons/svg/${icon}.svg');-webkit-mask-image:url('assets/icons/svg/${icon}.svg');background:${colors.iconTint};width:20px;height:20px;flex-shrink:0;display:block;"></span>
        <span style="margin-left:14px;flex:1;font-size:15px;color:${colors.textPrimary};text-align:left;">${label}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${colors.iconTintSecondary}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
    </button>`;
}

function closeSettingsModal() {
    const modal = document.getElementById('settingsModal');
    const backdrop = document.getElementById('settingsModalOverlay');
    if (!modal) return;

    modal.style.opacity = '0';
    modal.style.transform = 'translate(-50%, -48%) scale(0.96)';
    if (backdrop) backdrop.style.opacity = '0';

    setTimeout(() => {
        modal.remove();
        backdrop?.remove();
        // Fecha também o themesheet se estiver aberto
        document.getElementById('settingsThemeSheet')?.remove();
        document.getElementById('settingsThemeOverlay')?.remove();
    }, 320);
}

function showThemeSheetInSettings() {
    const colors = getThemeColors();
    const dividerColor = isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

    // Reutiliza o modal sheet global
    const content = document.getElementById('modalSheetContent');
    const sheet = document.getElementById('modalSheet');
    const overlay = document.getElementById('modalOverlay');
    if (!content || !sheet || !overlay) return;
    content.innerHTML = '';

    content.appendChild(buildSheetHandle(sheet, overlay, closeModalSheet));

    const titleEl = document.createElement('div');
    titleEl.style.cssText = `padding:4px 20px 8px;font-size:17px;font-weight:700;color:${colors.textPrimary};`;
    titleEl.textContent = 'Tema';
    content.appendChild(titleEl);

    const card = document.createElement('div');
    card.style.cssText = `margin:0 12px;border-radius:16px;overflow:hidden;background:${isDarkMode ? '#1C1C1E' : '#F2F2F7'};`;

    [['Claro', false], ['Escuro', true]].forEach(([label, dark], i) => {
        if (i > 0) {
            const sep = document.createElement('div');
            sep.style.cssText = `height:1px;margin-left:16px;background:${dividerColor};`;
            card.appendChild(sep);
        }
        const row = document.createElement('div');
        row.className = 'pulse-tap';
        row.style.cssText = 'display:flex;align-items:center;padding:14px 16px;cursor:pointer;';
        row.onclick = () => {
            closeModalSheet();
            setTimeout(() => {
                isDarkMode = dark;
                document.body.classList.toggle('light', !isDarkMode);
                document.body.classList.toggle('dark', isDarkMode);
                closeSettingsModal();
                setTimeout(() => renderSettingsPage(), 100);
            }, 350);
        };

        const lbl = document.createElement('span');
        lbl.style.cssText = `font-size:15px;color:${colors.textPrimary};flex:1;`;
        lbl.textContent = label;
        row.appendChild(lbl);

        if (isDarkMode === dark) {
            row.innerHTML += `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${colors.primary}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
        }
        card.appendChild(row);
    });

    content.appendChild(card);

    const pad = document.createElement('div');
    pad.style.height = '24px';
    content.appendChild(pad);

    openModalSheet();
}

// Mantém compatibilidade com chamadas antigas
function createSettingsTileNew(icon, label, colors, dividerColor, hasDivider) {
    return buildSettingsTile(icon, label, colors, dividerColor, hasDivider);
}

function createSettingsTile(icon, label, colors) {
    const dividerColor = isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    return buildSettingsTile(icon, label, colors, dividerColor, true);
}

function getThemeLabel() {
    return isDarkMode ? 'Escuro' : 'Claro';
}