class AuthState {
  constructor() {
    this.user = null;
    this.listeners = [];
  }
  setUser(user) {
    this.user = user;
    localStorage.setItem('nexa_user', JSON.stringify(user));
    this.notify();
  }
  clear() {
    this.user = null;
    localStorage.removeItem('nexa_user');
    localStorage.removeItem('ipc_user');
    this.notify();
  }
  subscribe(fn) { this.listeners.push(fn); }
  notify() { this.listeners.forEach(fn => fn(this.user)); }
}

const authState = new AuthState();

// Retorna true se tratou um redirect com sucesso, false caso contrário
// js/auth.js
async function handleGoogleRedirectResult() {
  try {
    const result = await window._firebaseAuth.getRedirectResult();
    if (!result || !result.user) return false;
    
    showToast('A autenticar…');
    
    const idToken = await result.user.getIdToken(true);
    const res = await fetch('https://nexa.alfredopjonas.workers.dev/auth/firebase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    
    const text = await res.text();
    
    if (!res.ok) {
      console.error('[NEXA] /auth/firebase falhou:', res.status, text);
      showToast(text || 'Falha ao autenticar com Google');
      return false;
    }
    
    const user = JSON.parse(text);
    if (user && user.token) {
      authState.setUser(user);
      window.currentPage = 'chat';
      renderChatPage();
      return true;
    }
    
    showToast('Erro ao autenticar. Tenta novamente.');
    return false;
  } catch (err) {
    console.error('[NEXA] redirect result erro:', err);
    showToast('Erro: ' + (err.message || err.code || ''));
    return false;
  }
}

async function handleGoogleSignIn(btnEl) {
  const original = btnEl.innerHTML;
  btnEl.disabled = true;
  btnEl.innerHTML = `<span style="font-size:14px;font-weight:600;opacity:0.6;">A redirecionar…</span>`;

  try {
    window._googleProvider.setCustomParameters({ prompt: 'select_account' });
    await window._firebaseAuth.signInWithRedirect(window._googleProvider);
  } catch (err) {
    console.error('[NEXA] signInWithRedirect erro:', err);
    showToast('Erro: ' + (err.message || err.code || ''));
    btnEl.disabled = false;
    btnEl.innerHTML = original;
  }
}

function renderLoginPage() {
  window.currentPage = 'login';
  const colors = isDarkMode ? darkColors : lightColors;
  const bg = isDarkMode ? colors.background : 'linear-gradient(180deg, #FFFFFF 0%, #F0EEFF 100%)';

  document.getElementById('app').innerHTML = `
    <div class="min-h-screen flex items-center justify-center" style="background:${bg};">
      <div class="max-w-sm w-full p-8">

        <img src="assets/icons/png/logo.png" class="w-20 h-20 mx-auto mb-8" alt="Logo" />
        <h1 class="text-4xl font-bold text-center mb-2" style="font-family:'TimesNewRoman',serif; color:${colors.textPrimary}">Bem-vindo</h1>
        <p class="text-center text-sm mb-10" style="color:${colors.textSecondary}">Entra na tua conta para continuar</p>

        <input id="loginEmail" type="email" placeholder="Email"
          class="w-full h-14 rounded-3xl px-5 text-sm mb-4 border-none outline-none"
          style="background:${colors.authInputFill}; color:${colors.textPrimary};" />

        <div class="relative mb-2">
          <input id="loginPass" type="password" placeholder="Password"
            class="w-full h-14 rounded-3xl px-5 text-sm border-none outline-none"
            style="background:${colors.authInputFill}; color:${colors.textPrimary};" />
          <button id="togglePass" class="absolute right-4 top-4 w-5 h-5 pulse-tap" style="color:${colors.iconTintSecondary}">
            <span class="icon-mask" style="mask-image:url('assets/icons/svg/eye_closed.svg'); -webkit-mask-image:url('assets/icons/svg/eye_closed.svg'); background:currentColor; width:20px; height:20px; display:block;"></span>
          </button>
        </div>

        <p class="text-right text-sm mb-6 cursor-pointer" id="forgotPassBtn" style="color:${colors.authBtnBg}">Esqueceste a password?</p>

        <div id="loginError" class="text-red-500 text-sm text-center mb-3 hidden"></div>

        <button id="loginBtn" class="w-full h-14 rounded-3xl text-white font-bold text-base pulse-tap mb-5"
          style="background:${colors.authBtnBg};">Entrar</button>

        <div class="flex items-center mb-5">
          <hr class="flex-1" style="border-color:${colors.divider}" />
          <span class="mx-4 text-sm" style="color:${colors.textSecondary}">ou</span>
          <hr class="flex-1" style="border-color:${colors.divider}" />
        </div>

        <button id="googleLoginBtn" class="w-full h-14 rounded-3xl flex items-center justify-center gap-3 pulse-tap"
          style="background:${colors.authInputFill}; border:1px solid ${colors.divider};">
          <img src="assets/icons/png/google.png" class="w-5 h-5" alt="Google" />
          <span class="font-bold text-sm" style="color:${colors.textPrimary}">Continuar com Google</span>
        </button>

        <p class="text-center mt-8 text-sm">
          <span style="color:${colors.textSecondary}">Não tens conta? </span>
          <a id="goRegister" class="font-bold cursor-pointer" style="color:${colors.authBtnBg}">Regista-te</a>
        </p>
      </div>
    </div>`;

  let passVisible = false;
  document.getElementById('togglePass').onclick = () => {
    passVisible = !passVisible;
    document.getElementById('loginPass').type = passVisible ? 'text' : 'password';
    const icon = document.querySelector('#togglePass .icon-mask');
    icon.style.maskImage = `url('assets/icons/svg/${passVisible ? 'eye' : 'eye_closed'}.svg')`;
    icon.style.webkitMaskImage = icon.style.maskImage;
  };

  document.getElementById('forgotPassBtn').onclick = () => showToast('Recuperação em breve');
  document.getElementById('goRegister').onclick = renderRegisterPage;

  document.getElementById('googleLoginBtn').onclick = function() {
    handleGoogleSignIn(this);
  };

  document.getElementById('loginBtn').onclick = async () => {
    const email = document.getElementById('loginEmail').value.trim();
    const pass = document.getElementById('loginPass').value;
    const errEl = document.getElementById('loginError');
    const btn = document.getElementById('loginBtn');

    errEl.classList.add('hidden');
    if (!email || !pass) {
      errEl.classList.remove('hidden');
      errEl.textContent = 'Preenche todos os campos.';
      return;
    }
    btn.disabled = true;
    btn.textContent = '…';

    const user = await AuthApiService.login(email, pass);
    if (user && user.token) {
      authState.setUser(user);
      window.currentPage = 'chat';
      renderChatPage();
    } else {
      errEl.classList.remove('hidden');
      errEl.textContent = 'Email ou password incorretos.';
      btn.disabled = false;
      btn.textContent = 'Entrar';
    }
  };
}

function renderRegisterPage() {
  window.currentPage = 'register';
  const colors = isDarkMode ? darkColors : lightColors;
  const bg = isDarkMode ? colors.background : 'linear-gradient(180deg, #FFFFFF 0%, #F0EEFF 100%)';

  document.getElementById('app').innerHTML = `
    <div class="min-h-screen flex flex-col" style="background:${bg};">
      <div class="flex items-center h-14 px-4 pt-2">
        <button id="backBtn" class="w-10 h-10 rounded-full flex items-center justify-center pulse-tap" style="background:${colors.appbarBtnBg};">
          <span class="icon-mask" style="mask-image:url('assets/icons/svg/back_arrow.svg'); -webkit-mask-image:url('assets/icons/svg/back_arrow.svg'); background:${colors.iconTint}; width:18px; height:18px; display:block;"></span>
        </button>
        <h1 class="ml-3 text-xl font-bold" style="font-family:'TimesNewRoman',serif; color:${colors.textPrimary}">Criar conta</h1>
      </div>

      <div class="flex-1 px-8 pt-4 max-w-sm mx-auto w-full">
        <p class="text-sm mb-6" style="color:${colors.textSecondary}">Preenche os campos para começar</p>

        <input id="regName" placeholder="Nome completo"
          class="w-full h-14 rounded-3xl px-5 text-sm mb-4 border-none outline-none"
          style="background:${colors.authInputFill}; color:${colors.textPrimary};" />

        <input id="regEmail" type="email" placeholder="Email"
          class="w-full h-14 rounded-3xl px-5 text-sm mb-4 border-none outline-none"
          style="background:${colors.authInputFill}; color:${colors.textPrimary};" />

        <div class="relative mb-4">
          <input id="regPass" type="password" placeholder="Password"
            class="w-full h-14 rounded-3xl px-5 text-sm border-none outline-none"
            style="background:${colors.authInputFill}; color:${colors.textPrimary};" />
          <button id="toggleRegPass" class="absolute right-4 top-4 w-5 h-5 pulse-tap" style="color:${colors.iconTintSecondary}">
            <span class="icon-mask" style="mask-image:url('assets/icons/svg/eye_closed.svg'); -webkit-mask-image:url('assets/icons/svg/eye_closed.svg'); background:currentColor; width:20px; height:20px; display:block;"></span>
          </button>
        </div>

        <div class="relative mb-5">
          <input id="regPassConf" type="password" placeholder="Confirmar password"
            class="w-full h-14 rounded-3xl px-5 text-sm border-none outline-none"
            style="background:${colors.authInputFill}; color:${colors.textPrimary};" />
          <button id="toggleRegPassConf" class="absolute right-4 top-4 w-5 h-5 pulse-tap" style="color:${colors.iconTintSecondary}">
            <span class="icon-mask" style="mask-image:url('assets/icons/svg/eye_closed.svg'); -webkit-mask-image:url('assets/icons/svg/eye_closed.svg'); background:currentColor; width:20px; height:20px; display:block;"></span>
          </button>
        </div>

        <div id="regError" class="text-red-500 text-sm text-center mb-3 hidden"></div>

        <button id="regBtn" class="w-full h-14 rounded-3xl text-white font-bold text-base pulse-tap mb-5"
          style="background:${colors.authBtnBg};">Criar conta</button>

        <div class="flex items-center mb-5">
          <hr class="flex-1" style="border-color:${colors.divider}" />
          <span class="mx-4 text-sm" style="color:${colors.textSecondary}">ou</span>
          <hr class="flex-1" style="border-color:${colors.divider}" />
        </div>

        <button id="googleRegBtn" class="w-full h-14 rounded-3xl flex items-center justify-center gap-3 pulse-tap"
          style="background:${colors.authInputFill}; border:1px solid ${colors.divider};">
          <img src="assets/icons/png/google.png" class="w-5 h-5" alt="Google" />
          <span class="font-bold text-sm" style="color:${colors.textPrimary}">Continuar com Google</span>
        </button>

        <p class="text-center mt-6 text-sm">
          <span style="color:${colors.textSecondary}">Já tens conta? </span>
          <a id="goLogin" class="font-bold cursor-pointer" style="color:${colors.authBtnBg}">Inicia sessão</a>
        </p>
      </div>
    </div>`;

  let rv = false;
  document.getElementById('toggleRegPass').onclick = () => {
    rv = !rv;
    document.getElementById('regPass').type = rv ? 'text' : 'password';
    const icon = document.querySelector('#toggleRegPass .icon-mask');
    icon.style.maskImage = `url('assets/icons/svg/${rv ? 'eye' : 'eye_closed'}.svg')`;
    icon.style.webkitMaskImage = icon.style.maskImage;
  };
  let rc = false;
  document.getElementById('toggleRegPassConf').onclick = () => {
    rc = !rc;
    document.getElementById('regPassConf').type = rc ? 'text' : 'password';
    const icon = document.querySelector('#toggleRegPassConf .icon-mask');
    icon.style.maskImage = `url('assets/icons/svg/${rc ? 'eye' : 'eye_closed'}.svg')`;
    icon.style.webkitMaskImage = icon.style.maskImage;
  };

  document.getElementById('backBtn').onclick = renderLoginPage;
  document.getElementById('goLogin').onclick = renderLoginPage;

  document.getElementById('googleRegBtn').onclick = function() {
    handleGoogleSignIn(this);
  };

  document.getElementById('regBtn').onclick = async () => {
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const pass = document.getElementById('regPass').value;
    const passConf = document.getElementById('regPassConf').value;
    const errEl = document.getElementById('regError');
    const btn = document.getElementById('regBtn');

    errEl.classList.add('hidden');
    if (!name || !email || !pass || !passConf) {
      errEl.classList.remove('hidden');
      errEl.textContent = 'Preenche todos os campos.';
      return;
    }
    if (pass !== passConf) {
      errEl.classList.remove('hidden');
      errEl.textContent = 'As passwords não coincidem.';
      return;
    }
    btn.disabled = true;
    btn.textContent = '…';

    const user = await AuthApiService.register(name, email, pass);
    if (user && user.token) {
      authState.setUser(user);
      window.currentPage = 'chat';
      renderChatPage();
    } else {
      errEl.classList.remove('hidden');
      errEl.textContent = 'Não foi possível criar a conta.';
      btn.disabled = false;
      btn.textContent = 'Criar conta';
    }
  };
}