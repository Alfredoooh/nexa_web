// Cache de ícones SVG
const iconCache = {};

async function loadIcon(path) {
  if (iconCache[path]) return iconCache[path];
  try {
    const res = await fetch(path);
    const svg = await res.text();
    iconCache[path] = svg;
    return svg;
  } catch (e) {
    console.warn('Erro ao carregar ícone:', path);
    return '';
  }
}

function createIconElement(path, size, color) {
  const wrapper = document.createElement('div');
  wrapper.style.width = size + 'px';
  wrapper.style.height = size + 'px';
  wrapper.style.color = color;
  wrapper.style.flexShrink = '0';
  loadIcon(path).then(svg => {
    wrapper.innerHTML = svg;
    const svgEl = wrapper.querySelector('svg');
    if (svgEl) {
      svgEl.setAttribute('width', size);
      svgEl.setAttribute('height', size);
      svgEl.style.color = 'inherit';
      svgEl.removeAttribute('fill');
    }
  });
  return wrapper;
}

function createPulseTap(child, onClick, circular = false) {
  const el = document.createElement('div');
  el.className = 'pulse-tap';
  if (circular) el.classList.add('circular');
  el.appendChild(child);
  if (onClick) el.addEventListener('click', onClick);
  return el;
}

function parseColor(str) {
  if (!str) return '#4F46E5';
  const hex = str.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgb(${r},${g},${b})`;
}

function evaluateExpression(expr, x) {
  try {
    const sanitized = expr
      .replace(/\^/g, '**')
      .replace(/sin/gi, 'Math.sin')
      .replace(/cos/gi, 'Math.cos')
      .replace(/tan/gi, 'Math.tan')
      .replace(/abs/gi, 'Math.abs')
      .replace(/sqrt/gi, 'Math.sqrt')
      .replace(/pi/gi, 'Math.PI')
      .replace(/euler/gi, 'Math.E')
      .replace(/log/gi, 'Math.log')
      .replace(/exp/gi, 'Math.exp');
    const fn = new Function('x', `return ${sanitized};`);
    return fn(x);
  } catch (e) {
    return NaN;
  }
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(100px)';
  }, 1500);
}

function formatTimestamp(millis) {
  const dt = new Date(millis);
  const now = new Date();
  if (dt.getFullYear() === now.getFullYear() &&
    dt.getMonth() === now.getMonth() &&
    dt.getDate() === now.getDate()) {
    return 'Hoje';
  }
  return `${dt.getDate()}/${dt.getMonth()+1}/${dt.getFullYear()}`;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}