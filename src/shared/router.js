// Router leve baseado em History API.
// Cada app (ai, profilelens e as apps do workspace) tem uma base
// fixa (ex: '/ai/'). As sub-rotas dentro do app (ex: 'settings', 'widgets')
// mapeiam para URLs reais tipo /ai/settings/, /ai/widgets/.

function normalizeBase(base) {
  if (!base.startsWith('/')) base = '/' + base;
  return base.endsWith('/') ? base : base + '/';
}

function normalizeRoute(route) {
  if (!route) return '';
  return String(route).replace(/^\/+|\/+$|^\s+|\s+$/g, '');
}

export function createRouter(base, validRoutes, rootRoute) {
  const normalizedBase = normalizeBase(base);
  const normalizedValidRoutes = new Set((validRoutes || []).map(normalizeRoute));
  const normalizedRootRoute = normalizeRoute(rootRoute);

  function parseCurrentRoute() {
    let path = window.location.pathname || '/';
    if (!path.startsWith(normalizedBase)) return { route: normalizedRootRoute, notFound: false };

    const rest = path.slice(normalizedBase.length).replace(/^\/+|\/+$/g, '');
    if (!rest) return { route: normalizedRootRoute, notFound: false };

    const seg = normalizeRoute(rest.split('/')[0]);
    if (normalizedValidRoutes.has(seg)) return { route: seg, notFound: false };

    return { route: normalizedRootRoute, notFound: true };
  }

  function navigate(route, { replace = false } = {}) {
    const normalizedRoute = normalizeRoute(route);
    const path = normalizedRoute === normalizedRootRoute ? normalizedBase : `${normalizedBase}${normalizedRoute}/`;
    if (window.location.pathname === path) return;
    if (replace) window.history.replaceState({ route: normalizedRoute }, '', path);
    else window.history.pushState({ route: normalizedRoute }, '', path);
  }

  function bindPopState(onRoute) {
    function handler() {
      const { route, notFound } = parseCurrentRoute();
      onRoute(route, notFound);
    }
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }

  return { parseCurrentRoute, navigate, bindPopState };
}

// Redireciona a raiz do site ('/') para /home/. Chamar só na página raiz.
export function redirectRootToHome() {
  const p = window.location.pathname;
  if (p === '/' || p === '' || p === '/index.html') {
    window.location.replace('/home/');
  }
}

// Redireciona qualquer caminho desconhecido (fora das apps registadas) para
// a página de erro 404. Chamar em cada app quando a rota não é válida.
export function redirectToNotFound() {
  window.location.replace('/404/');
}
