class AuthState {
  constructor() {
    this.user = null;
    this.listeners = [];
  }
  setUser(user) {
    this.user = user;
    localStorage.setItem('ipc_user', JSON.stringify(user));
    this.notify();
  }
  clear() {
    this.user = null;
    localStorage.removeItem('ipc_user');
    this.notify();
  }
  subscribe(fn) {
    this.listeners.push(fn);
  }
  notify() {
    this.listeners.forEach(fn => fn(this.user));
  }
}

const authState = new AuthState();

function renderLoginPage() {
  const colors = isDarkMode ? darkColors : lightColors;
  document.getElementById('app').innerHTML = `
    <div class="min-h-screen flex items-center justify-center" style="background: ${isDarkMode ? colors.background : 'linear-gradient(180deg, #FFFFFF 0%, #F0EEFF 100%)'};">
        <div class="max-w-sm w-full p-8">
            <img src="assets/icons/png/logo.png" class="w-20 h-20 mx-auto mb-8" alt="Logo" />
            <h1 class="text-4xl font-bold text-center mb-2" style="font-family: 'TimesNewRoman', serif; color: ${colors.textPrimary}">Bem-vindo</h1>
            <p class="text-center text-secondary mb-12" style="color: ${colors.textSecondary}">Entra na tua conta para continuar</p>
            <input id="loginEmail" type="email" placeholder="Email" class="w-full h-14 rounded-3xl px-5 text-sm mb-4 border-none outline-none" style="background: ${colors.authInputFill || '#F3F4F6'}; color: ${colors.textPrimary};" />
            <div class="relative mb-4">
                <input id="loginPass" type="password" placeholder="Password" class="w-full h-14 rounded-3xl px-5 text-sm border-none outline-none" style="background: ${colors.authInputFill || '#F3F4F6'}; color: ${colors.textPrimary};" />
                <button id="togglePass" class="absolute right-4 top-4 w-5 h-5 pulse-tap" style="color: ${colors.iconTintSecondary}">
                    <span class="icon-mask" style="mask-image: url('assets/icons/svg/eye_closed.svg'); -webkit-mask-image: url('assets/icons/svg/eye_closed.svg'); background: currentColor;"></span>
                </button>
            </div>
            <p class="text-right text-sm mb-5" style="color: ${colors.authBtnBg || '#4F46E5'}">Esqueceste a password?</p>
            <div id="loginError" class="text-red-500 text-sm text-center mb-4 hidden"></div>
            <button id="loginBtn" class="w-full h-14 rounded-3xl text-white font-bold text-lg" style="background: ${colors.authBtnBg || '#4F46E5'};">Entrar</button>
            <div class="flex items-center my-6">
                <hr class="flex-1" style="border-color: ${colors.divider}" />
                <span class="mx-4 text-sm" style="color: ${colors.textSecondary}">ou</span>
                <hr class="flex-1" style="border-color: ${colors.divider}" />
            </div>
            <button class="w-full h-14 rounded-3xl flex items-center justify-center gap-3 opacity-50" style="background: ${colors.authInputFill || '#F3F4F6'};">
                <img src="assets/icons/png/google.png" class="w-5 h-5" alt="Google" />
                <span class="font-bold text-sm" style="color: ${colors.textPrimary}">Continuar com Google</span>
            </button>
            <p class="text-center mt-6 text-sm">
                <span style="color: ${colors.textSecondary}">Não tens conta? </span>
                <a id="goRegister" class="font-bold cursor-pointer" style="color: ${colors.authBtnBg || '#4F46E5'}">Regista-te</a>
            </p>
        </div>
    </div>`;
  
  let passVisible = false;
  document.getElementById('togglePass').onclick = () => {
    passVisible = !passVisible;
    const passInput = document.getElementById('loginPass');
    passInput.type = passVisible ? 'text' : 'password';
    const icon = document.querySelector('#togglePass .icon-mask');
    icon.style.maskImage = passVisible ? "url('assets/icons/svg/eye.svg')" : "url('assets/icons/svg/eye_closed.svg')";
    icon.style.webkitMaskImage = icon.style.maskImage;
  };
  
  document.getElementById('goRegister').onclick = renderRegisterPage;
  
  document.getElementById('loginBtn').onclick = async () => {
    const email = document.getElementById('loginEmail').value.trim();
    const pass = document.getElementById('loginPass').value;
    if (!email || !pass) {
      document.getElementById('loginError').classList.remove('hidden');
      document.getElementById('loginError').textContent = 'Preenche todos os campos.';
      return;
    }
    document.getElementById('loginBtn').disabled = true;
    document.getElementById('loginBtn').textContent = '...';
    const user = await AuthApiService.login(email, pass);
    if (user) {
      authState.setUser(user);
      renderChatPage();
    } else {
      document.getElementById('loginError').classList.remove('hidden');
      document.getElementById('loginError').textContent = 'Email ou password incorretos.';
      document.getElementById('loginBtn').disabled = false;
      document.getElementById('loginBtn').textContent = 'Entrar';
    }
  };
}

function renderRegisterPage() {
  const colors = isDarkMode ? darkColors : lightColors;
  document.getElementById('app').innerHTML = `
    <div class="min-h-screen flex flex-col" style="background: ${isDarkMode ? colors.background : 'linear-gradient(180deg, #FFFFFF 0%, #F0EEFF 100%)'};">
        <div class="flex items-center h-14 px-4 pt-2">
            <button id="backBtn" class="w-10 h-10 rounded-full flex items-center justify-center pulse-tap" style="background: ${colors.appbarBtnBg || '#F3F4F6'};">
                <span class="icon-mask" style="mask-image: url('assets/icons/svg/back_arrow.svg'); -webkit-mask-image: url('assets/icons/svg/back_arrow.svg'); background: ${colors.iconTint}; width: 18px; height: 18px;"></span>
            </button>
            <h1 class="ml-3 text-xl font-bold" style="font-family: 'TimesNewRoman', serif; color: ${colors.textPrimary}">Criar conta</h1>
        </div>
        <div class="flex-1 px-8 pt-6 max-w-sm mx-auto w-full">
            <p class="text-secondary text-sm mb-8" style="color: ${colors.textSecondary}">Preenche os campos para começar</p>
            <input id="regName" placeholder="Nome completo" class="w-full h-14 rounded-3xl px-5 text-sm mb-4 border-none outline-none" style="background: ${colors.authInputFill || '#F3F4F6'}; color: ${colors.textPrimary};" />
            <input id="regEmail" type="email" placeholder="Email" class="w-full h-14 rounded-3xl px-5 text-sm mb-4 border-none outline-none" style="background: ${colors.authInputFill || '#F3F4F6'}; color: ${colors.textPrimary};" />
            <div class="relative mb-4">
                <input id="regPass" type="password" placeholder="Password" class="w-full h-14 rounded-3xl px-5 text-sm border-none outline-none" style="background: ${colors.authInputFill || '#F3F4F6'}; color: ${colors.textPrimary};" />
                <button id="toggleRegPass" class="absolute right-4 top-4 w-5 h-5 pulse-tap" style="color: ${colors.iconTintSecondary}">
                    <span class="icon-mask" style="mask-image: url('assets/icons/svg/eye_closed.svg'); -webkit-mask-image: url('assets/icons/svg/eye_closed.svg'); background: currentColor;"></span>
                </button>
            </div>
            <div class="relative mb-4">
                <input id="regPassConf" type="password" placeholder="Confirmar password" class="w-full h-14 rounded-3xl px-5 text-sm border-none outline-none" style="background: ${colors.authInputFill || '#F3F4F6'}; color: ${colors.textPrimary};" />
                <button id="toggleRegPassConf" class="absolute right-4 top-4 w-5 h-5 pulse-tap" style="color: ${colors.iconTintSecondary}">
                    <span class="icon-mask" style="mask-image: url('assets/icons/svg/eye_closed.svg'); -webkit-mask-image: url('assets/icons/svg/eye_closed.svg'); background: currentColor;"></span>
                </button>
            </div>
            <div id="regError" class="text-red-500 text-sm text-center mb-4 hidden"></div>
            <button id="regBtn" class="w-full h-14 rounded-3xl text-white font-bold text-lg" style="background: ${colors.authBtnBg || '#4F46E5'};">Criar conta</button>
            <div class="flex items-center my-6">
                <hr class="flex-1" style="border-color: ${colors.divider}" />
                <span class="mx-4 text-sm" style="color: ${colors.textSecondary}">ou</span>
                <hr class="flex-1" style="border-color: ${colors.divider}" />
            </div>
            <button class="w-full h-14 rounded-3xl flex items-center justify-center gap-3 opacity-50" style="background: ${colors.authInputFill || '#F3F4F6'};">
                <img src="assets/icons/png/google.png" class="w-5 h-5" alt="Google" />
                <span class="font-bold text-sm" style="color: ${colors.textPrimary}">Continuar com Google</span>
            </button>
            <p class="text-center mt-6 text-sm">
                <span style="color: ${colors.textSecondary}">Já tens conta? </span>
                <a id="goLogin" class="font-bold cursor-pointer" style="color: ${colors.authBtnBg || '#4F46E5'}">Inicia sessão</a>
            </p>
        </div>
    </div>`;
  
  let regPassVisible = false;
  document.getElementById('toggleRegPass').onclick = () => {
    regPassVisible = !regPassVisible;
    document.getElementById('regPass').type = regPassVisible ? 'text' : 'password';
    const icon = document.querySelector('#toggleRegPass .icon-mask');
    icon.style.maskImage = regPassVisible ? "url('assets/icons/svg/eye.svg')" : "url('assets/icons/svg/eye_closed.svg')";
    icon.style.webkitMaskImage = icon.style.maskImage;
  };
  let regPassConfVisible = false;
  document.getElementById('toggleRegPassConf').onclick = () => {
    regPassConfVisible = !regPassConfVisible;
    document.getElementById('regPassConf').type = regPassConfVisible ? 'text' : 'password';
    const icon = document.querySelector('#toggleRegPassConf .icon-mask');
    icon.style.maskImage = regPassConfVisible ? "url('assets/icons/svg/eye.svg')" : "url('assets/icons/svg/eye_closed.svg')";
    icon.style.webkitMaskImage = icon.style.maskImage;
  };
  
  document.getElementById('backBtn').onclick = renderLoginPage;
  document.getElementById('goLogin').onclick = renderLoginPage;
  
  document.getElementById('regBtn').onclick = async () => {
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const pass = document.getElementById('regPass').value;
    const passConf = document.getElementById('regPassConf').value;
    if (!name || !email || !pass || !passConf) {
      document.getElementById('regError').classList.remove('hidden');
      document.getElementById('regError').textContent = 'Preenche todos os campos.';
      return;
    }
    if (pass !== passConf) {
      document.getElementById('regError').classList.remove('hidden');
      document.getElementById('regError').textContent = 'As passwords não coincidem.';
      return;
    }
    document.getElementById('regBtn').disabled = true;
    document.getElementById('regBtn').textContent = '...';
    const user = await AuthApiService.register(name, email, pass);
    if (user) {
      authState.setUser(user);
      renderChatPage();
    } else {
      document.getElementById('regError').classList.remove('hidden');
      document.getElementById('regError').textContent = 'Não foi possível criar a conta.';
      document.getElementById('regBtn').disabled = false;
      document.getElementById('regBtn').textContent = 'Criar conta';
    }
  };
}