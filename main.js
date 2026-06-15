function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Bom dia';
  if (h >= 12 && h < 18) return 'Boa tarde';
  return 'Boa noite';
}

document.getElementById('app').innerHTML = `
  <div class="appbar-blur"></div>

  <div class="appbar-buttons">
    <button class="appbar-btn" id="btn-menu">
      <img src="/public/assets/icons/svg/menu.svg" width="22" height="22" alt="Menu" />
    </button>
    <button class="appbar-btn" id="btn-new-chat">
      <img src="/public/assets/icons/svg/new_chat.svg" width="22" height="22" alt="Novo chat" />
    </button>
  </div>

  <div class="center fade-up">
    <img class="logo" src="/public/assets/icons/png/logo.png" alt="Nexa" />
    <h1 class="greeting">${getGreeting()}</h1>
    <p class="subtitle">Em que estás a pensar?</p>
  </div>

  <div class="input-wrap" id="input-wrap" style="bottom:0">
    <div class="input-card">
      <textarea id="textarea" rows="1" placeholder="Pergunta algo..."></textarea>
      <div class="input-actions">
        <button class="btn-add">
          <img src="/public/assets/icons/svg/add.svg" width="18" height="18" alt="+" />
        </button>
        <div class="input-right">
          <button class="btn-preview" id="btn-preview">
            <img src="/public/assets/icons/svg/preview.svg" width="18" height="18" alt="Preview" />
            <span>Preview</span>
          </button>
          <div class="btn-circle-wrap" id="circle-wrap">
            <button class="btn-record pop-in" id="btn-record">
              <span class="pulse-ring"></span>
              <img src="/public/assets/icons/svg/record.svg" width="20" height="20" alt="Gravar"
                   style="filter:brightness(0) invert(1);position:relative;z-index:1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="install-prompt hidden" id="install-prompt">
    <img src="/public/assets/icons/png/logo.png" alt="Nexa" />
    <div class="install-prompt-text">
      <strong>Instalar Nexa</strong>
      <span>Adiciona ao ecrã inicial</span>
    </div>
    <div class="install-prompt-actions">
      <button class="btn-install" id="btn-install">Instalar</button>
      <button class="btn-dismiss" id="btn-dismiss">Agora não</button>
    </div>
  </div>
`;

const textarea = document.getElementById('textarea');
const inputWrap = document.getElementById('input-wrap');
const btnPreview = document.getElementById('btn-preview');
const circleWrap = document.getElementById('circle-wrap');

textarea.addEventListener('input', () => {
  textarea.style.height = 'auto';
  textarea.style.height = Math.min(textarea.scrollHeight, 140) + 'px';
  updateButtons();
});

textarea.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});

function updateButtons() {
  const hasText = textarea.value.trim().length > 0;
  btnPreview.classList.toggle('dimmed', hasText);
  
  const existing = circleWrap.querySelector('button');
  const isRecord = existing?.id === 'btn-record';
  const isSend = existing?.id === 'btn-send';
  
  if (hasText && isRecord) {
    existing.classList.replace('pop-in', 'pop-out');
    existing.addEventListener('animationend', () => {
      circleWrap.innerHTML = `
        <button class="btn-send pop-in" id="btn-send">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>`;
      document.getElementById('btn-send').addEventListener('click', handleSend);
    }, { once: true });
  }
  
  if (!hasText && isSend) {
    existing.classList.replace('pop-in', 'pop-out');
    existing.addEventListener('animationend', () => {
      circleWrap.innerHTML = `
        <button class="btn-record pop-in" id="btn-record">
          <span class="pulse-ring"></span>
          <img src="/public/assets/icons/svg/record.svg" width="20" height="20" alt="Gravar"
               style="filter:brightness(0) invert(1);position:relative;z-index:1" />
        </button>`;
    }, { once: true });
  }
}

function handleSend() {
  if (!textarea.value.trim()) return;
  textarea.value = '';
  textarea.style.height = 'auto';
  updateButtons();
}

if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => {
    const diff = window.screen.height - window.visualViewport.height;
    inputWrap.style.bottom = (diff > 100 ? Math.min(diff * 0.5, 180) : 0) + 'px';
  });
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
}

let deferredPrompt = null;
const installPrompt = document.getElementById('install-prompt');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installPrompt.classList.remove('hidden');
});

document.getElementById('btn-install').addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installPrompt.classList.add('hidden');
});

document.getElementById('btn-dismiss').addEventListener('click', () => {
  installPrompt.classList.add('hidden');
});