/* =========================================================================
   DEFINIÇÕES — popup card flutuante centrado (estilo ChatGPT), nunca tela
   cheia tocando as bordas, nunca como modal/sheet a subir do fundo.
   ========================================================================= */

function renderSettingsPage() {
    window.currentPage = 'settings';
    showSettingsCard();
}

function showSettingsCard() {
    document.getElementById('settingsBackdrop')?.remove();

    const colors = getThemeColors();
    const cardBg = isDarkMode ? '#1C1C1E' : '#FFFFFF';
    const sectionLabelColor = isDarkMode ? '#6B7280' : '#9CA3AF';
    const dividerColor = isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    const cardShellBg = isDarkMode ? '#161616' : '#F5F5F7';

    const backdrop = document.createElement('div');
    backdrop.id = 'settingsBackdrop';
    backdrop.className = 'settings-backdrop';

    const card = document.createElement('div');
    card.className = 'settings-card';
    card.style.background = cardShellBg;

    card.innerHTML = `
      <!-- Cabeçalho -->
      <div style="display:flex;align-items:center;height:56px;padding:0 8px 0 18px;flex-shrink:0;background:${cardShellBg};">
        <h1 style="font-size:17px;font-weight:700;color:${colors.textPrimary};margin:0;flex:1;">Definições</h1>
        <button id="logoutBtn" class="pulse-tap" style="width:38px;height:38px;display:flex;align-items:center;justify-content:center;background:none;border:none;cursor:pointer;border-radius:50%;color:#EF4444;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
        <button id="closeSettingsBtn" class="pulse-tap" style="width:38px;height:38px;display:flex;align-items:center;justify-content:center;background:none;border:none;cursor:pointer;border-radius:50%;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${colors.textPrimary}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <!-- Conteúdo com scroll interno -->
      <div class="settings-card-scroll" style="padding:4px 16px 24px;">

        <!-- Secção CONTA -->
        <p style="font-size:11px;font-weight:600;letter-spacing:0.08em;color:${sectionLabelColor};margin:14px 4px 8px;text-transform:uppercase;">Conta</p>
        <div style="background:${cardBg};border-radius:14px;overflow:hidden;">
          ${createSettingsTileNew('customise', 'Personalização', colors, dividerColor, true)}
          ${createSettingsTileNew('database', 'Controlo de Dados', colors, dividerColor, true)}
          ${createSettingsTileNew('security', 'Segurança', colors, dividerColor, false)}
        </div>

        <!-- Secção MODELO DE IA -->
        <p style="font-size:11px;font-weight:600;letter-spacing:0.08em;color:${sectionLabelColor};margin:20px 4px 8px;text-transform:uppercase;">Modelo de IA</p>
        <div style="background:${cardBg};border-radius:14px;overflow:hidden;" id="settingsModelList"></div>

        <!-- Secção APARÊNCIA -->
        <p style="font-size:11px;font-weight:600;letter-spacing:0.08em;color:${sectionLabelColor};margin:20px 4px 8px;text-transform:uppercase;">Aparência</p>
        <div style="background:${cardBg};border-radius:14px;overflow:hidden;">
          <button id="themeBtn" class="pulse-tap" style="width:100%;display:flex;align-items:center;padding:14px 16px;background:none;border:none;cursor:pointer;border-bottom:1px solid ${dividerColor};">
            <span class="icon-mask" style="mask-image:url('assets/icons/svg/appearance.svg');-webkit-mask-image:url('assets/icons/svg/appearance.svg');background:${colors.iconTint};width:20px;height:20px;flex-shrink:0;"></span>
            <span style="margin-left:14px;flex:1;font-size:15px;color:${colors.textPrimary};text-align:left;">Tema</span>
            <span style="font-size:14px;color:${colors.textSecondary};margin-right:6px;" id="themeLabel">${getThemeLabel()}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${colors.iconTintSecondary}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <button id="languageBtn" class="pulse-tap" style="width:100%;display:flex;align-items:center;padding:14px 16px;background:none;border:none;cursor:pointer;">
            <span class="icon-mask" style="mask-image:url('assets/icons/svg/language.svg');-webkit-mask-image:url('assets/icons/svg/language.svg');background:${colors.iconTint};width:20px;height:20px;flex-shrink:0;"></span>
            <span style="margin-left:14px;flex:1;font-size:15px;color:${colors.textPrimary};text-align:left;">Idioma</span>
            <span style="font-size:14px;color:${colors.textSecondary};margin-right:6px;" id="languageLabel">${getCurrentLanguageLabel()}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${colors.iconTintSecondary}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>

      </div>`;

    backdrop.appendChild(card);
    document.body.appendChild(backdrop);

    // Lista de modelos — sem ícones, igual ao estilo do aviso de incógnito
    const modelList = card.querySelector('#settingsModelList');
    AVAILABLE_MODELS.forEach((model, i) => {
        if (i > 0) {
            const sep = document.createElement('div');
            sep.style.cssText = `height:1px;background:${dividerColor};`;
            modelList.appendChild(sep);
        }
        const row = document.createElement('button');
        row.className = 'pulse-tap';
        row.style.cssText = `width:100%;display:flex;align-items:center;padding:13px 16px;background:none;border:none;cursor:pointer;text-align:left;`;
        const isActive = model.id === currentModelId;
        row.innerHTML = `
            <span style="flex:1;min-width:0;">
                <span style="display:block;font-size:15px;font-weight:600;color:${isActive ? colors.primary : colors.textPrimary};">${model.name}</span>
                <span style="display:block;font-size:12.5px;color:${colors.textSecondary};margin-top:1px;">${model.description}</span>
            </span>
            ${isActive ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${colors.primary}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>` : ''}
        `;
        row.onclick = () => {
            currentModelId = model.id;
            showSettingsCard();
            showToast(`Modelo: ${model.name}`);
        };
        modelList.appendChild(row);
    });

    requestAnimationFrame(() => backdrop.classList.add('open'));

    backdrop.onclick = (e) => { if (e.target === backdrop) closeSettingsCard(); };
    card.querySelector('#closeSettingsBtn').onclick = closeSettingsCard;
    card.querySelector('#logoutBtn').onclick = async () => {
        if (authState.user) await AuthApiService.logout(authState.user.token);
        authState.clear();
        closeSettingsCard(true);
        renderLoginPage();
    };
    card.querySelector('#themeBtn').onclick = showThemeSheet;
    card.querySelector('#languageBtn').onclick = showLanguageSheet;
}

function closeSettingsCard(skipRenderChat) {
    const backdrop = document.getElementById('settingsBackdrop');
    if (!backdrop) {
        if (!skipRenderChat) { window.currentPage = 'chat'; renderChatPage(); }
        return;
    }
    backdrop.classList.remove('open');
    setTimeout(() => {
        backdrop.remove();
        if (!skipRenderChat) {
            window.currentPage = 'chat';
            // A tela de chat por baixo já reflete o tema/idioma atuais,
            // porque applyTheme() e a troca de idioma sempre re-renderizam
            // o chat mesmo com as Definições abertas por cima. Não é
            // necessário recriar tudo de novo aqui — evita um flash extra.
            if (!document.getElementById('chatApp')) {
                renderChatPage();
            }
        }
    }, 280);
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

/* ── Sheet de Tema — popup card centrado, igual ao estilo do aviso incógnito ── */
function showThemeSheet() {
    document.getElementById('themePopupOverlay')?.remove();

    const colors = getThemeColors();
    const dialogBg = isDarkMode ? '#1C1C1E' : '#FFFFFF';
    const dividerColor = isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

    const overlay = document.createElement('div');
    overlay.className = 'popup-card-overlay';
    overlay.id = 'themePopupOverlay';
    overlay.style.zIndex = '230';

    const dialog = document.createElement('div');
    dialog.className = 'center-dialog';
    dialog.id = 'themePopupBox';
    dialog.style.background = dialogBg;
    dialog.style.padding = '8px 0 12px';
    dialog.style.zIndex = '231';

    dialog.innerHTML = `
        <div style="padding:10px 20px 12px;">
            <span style="font-size:16px;font-weight:700;color:${colors.textPrimary};">Tema</span>
        </div>
        <button id="settingsThemeLight" class="pulse-tap" style="width:100%;display:flex;align-items:center;padding:13px 20px;background:none;border:none;cursor:pointer;border-top:1px solid ${dividerColor};text-align:left;">
            <span style="font-size:15px;color:${colors.textPrimary};flex:1;">Claro</span>
            ${!isDarkMode ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${colors.primary}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>` : ''}
        </button>
        <button id="settingsThemeDark" class="pulse-tap" style="width:100%;display:flex;align-items:center;padding:13px 20px;background:none;border:none;cursor:pointer;border-top:1px solid ${dividerColor};text-align:left;">
            <span style="font-size:15px;color:${colors.textPrimary};flex:1;">Escuro</span>
            ${isDarkMode ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${colors.primary}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>` : ''}
        </button>`;

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

    // Troca de tema: muda o estado, fecha o popup, aplica o tema (que já
    // re-renderiza o chat por baixo) e só depois redesenha o card de
    // Definições com as cores novas — tudo no mesmo ciclo, sem reload.
    dialog.querySelector('#settingsThemeLight').onclick = () => {
        close();
        isDarkMode = false;
        applyTheme();
    };
    dialog.querySelector('#settingsThemeDark').onclick = () => {
        close();
        isDarkMode = true;
        applyTheme();
    };
}

/* ── Sheet de Idioma — todos os idiomas disponíveis, com pesquisa simples ── */
function showLanguageSheet() {
    document.getElementById('languagePopupOverlay')?.remove();

    const colors = getThemeColors();
    const dialogBg = isDarkMode ? '#1C1C1E' : '#FFFFFF';
    const dividerColor = isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    const inputBg = isDarkMode ? '#2C2C2E' : '#F2F2F7';

    const overlay = document.createElement('div');
    overlay.className = 'popup-card-overlay';
    overlay.id = 'languagePopupOverlay';
    overlay.style.zIndex = '230';

    const dialog = document.createElement('div');
    dialog.className = 'center-dialog';
    dialog.id = 'languagePopupBox';
    dialog.style.background = dialogBg;
    dialog.style.padding = '8px 0 4px';
    dialog.style.zIndex = '231';
    dialog.style.maxHeight = '70vh';
    dialog.style.display = 'flex';
    dialog.style.flexDirection = 'column';
    dialog.style.transformOrigin = 'center';

    dialog.innerHTML = `
        <div style="padding:10px 20px 10px;flex-shrink:0;">
            <span style="font-size:16px;font-weight:700;color:${colors.textPrimary};">Idioma</span>
        </div>
        <div style="padding:0 16px 10px;flex-shrink:0;">
            <input id="languageSearchInput" type="text" placeholder="Pesquisar idioma..."
                style="width:100%;border:none;outline:none;border-radius:10px;padding:10px 13px;font-size:14px;font-family:inherit;background:${inputBg};color:${colors.textPrimary};" />
        </div>
        <div id="languageListScroll" style="overflow-y:auto;flex:1;-webkit-overflow-scrolling:touch;border-top:1px solid ${dividerColor};"></div>`;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const listEl = dialog.querySelector('#languageListScroll');
    const searchInput = dialog.querySelector('#languageSearchInput');

    function renderList(filter) {
        const f = (filter || '').trim().toLowerCase();
        const filtered = AVAILABLE_LANGUAGES.filter(l =>
            !f || l.name.toLowerCase().includes(f) || l.native.toLowerCase().includes(f)
        );
        listEl.innerHTML = '';
        if (filtered.length === 0) {
            const empty = document.createElement('div');
            empty.style.cssText = `padding:24px 20px;text-align:center;font-size:13px;color:${colors.textSecondary};`;
            empty.textContent = 'Nenhum idioma encontrado';
            listEl.appendChild(empty);
            return;
        }
        filtered.forEach((lang, i) => {
            if (i > 0) {
                const sep = document.createElement('div');
                sep.style.cssText = `height:1px;background:${dividerColor};`;
                listEl.appendChild(sep);
            }
            const isActive = lang.code === currentLanguage;
            const row = document.createElement('button');
            row.className = 'pulse-tap';
            row.style.cssText = `width:100%;display:flex;align-items:center;padding:13px 20px;background:none;border:none;cursor:pointer;text-align:left;`;
            row.innerHTML = `
                <span style="flex:1;min-width:0;">
                    <span style="display:block;font-size:15px;font-weight:600;color:${isActive ? colors.primary : colors.textPrimary};">${lang.name}</span>
                    <span style="display:block;font-size:12.5px;color:${colors.textSecondary};margin-top:1px;">${lang.native}</span>
                </span>
                ${isActive ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${colors.primary}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>` : ''}`;
            row.onclick = () => {
                setCurrentLanguage(lang.code);
                close();
                showSettingsCard();
                showToast(`Idioma: ${lang.name}`);
            };
            listEl.appendChild(row);
        });
    }

    renderList('');
    searchInput.oninput = () => renderList(searchInput.value);

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
}