const iconCache = {};

export async function loadIcon(path) {
  if (iconCache[path]) return iconCache[path];
  try { const res = await fetch(path); const svg = await res.text(); iconCache[path] = svg; return svg; }
  catch (e) { return ''; }
}

export function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(100px)';
  }, 1500);
}

export function evaluateExpression(expr, x) {
  try {
    const s = expr.replace(/\^/g,'**').replace(/sin/gi,'Math.sin').replace(/cos/gi,'Math.cos')
      .replace(/tan/gi,'Math.tan').replace(/abs/gi,'Math.abs').replace(/sqrt/gi,'Math.sqrt')
      .replace(/pi/gi,'Math.PI').replace(/euler/gi,'Math.E').replace(/log/gi,'Math.log').replace(/exp/gi,'Math.exp');
    return new Function('x', `return ${s};`)(x);
  } catch (e) { return NaN; }
}

export function formatTimestamp(millis) {
  const dt = new Date(millis), now = new Date();
  if (dt.toDateString() === now.toDateString()) return 'Hoje';
  return `${dt.getDate()}/${dt.getMonth()+1}/${dt.getFullYear()}`;
}

export function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }