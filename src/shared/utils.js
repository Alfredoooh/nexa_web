// Toast simples, sem dependências externas.
// Cria um elemento na base do ecrã, mostra-o e remove-o sozinho.

let toastTimer = null;
let toastEl = null;

export function showToast(message, durationMs = 2200) {
  if (typeof document === 'undefined') return;
  
  if (toastEl) {
    toastEl.remove();
    toastEl = null;
  }
  clearTimeout(toastTimer);
  
  toastEl = document.createElement('div');
  toastEl.textContent = message;
  Object.assign(toastEl.style, {
    position: 'fixed',
    left: '50%',
    bottom: 'calc(env(safe-area-inset-bottom, 0px) + 100px)',
    transform: 'translateX(-50%) translateY(12px)',
    background: 'rgba(28,28,26,0.92)',
    color: '#FEFCF7',
    padding: '11px 18px',
    borderRadius: '999px',
    fontSize: '14px',
    fontWeight: '600',
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
    zIndex: '9999',
    opacity: '0',
    transition: 'opacity .22s cubic-bezier(0.16,1,0.3,1), transform .22s cubic-bezier(0.16,1,0.3,1)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
    pointerEvents: 'none',
    maxWidth: '86vw',
    textAlign: 'center',
  });
  document.body.appendChild(toastEl);
  
  requestAnimationFrame(() => {
    toastEl.style.opacity = '1';
    toastEl.style.transform = 'translateX(-50%) translateY(0)';
  });
  
  toastTimer = setTimeout(() => {
    if (!toastEl) return;
    toastEl.style.opacity = '0';
    toastEl.style.transform = 'translateX(-50%) translateY(12px)';
    setTimeout(() => {
      toastEl?.remove();
      toastEl = null;
    }, 240);
  }, durationMs);
}

export function noop() {}