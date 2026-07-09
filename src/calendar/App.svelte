<script>
  import { onMount } from 'svelte';
  import { syncTheme, getTheme } from '$shared/theme.js';
  import { requireAuth } from '$shared/auth-guard.js';
  import { createRouter } from '$shared/router.js';
  import MainPage from './pages/MainPage.svelte';
  import SettingsPage from './pages/SettingsPage.svelte';

  const APP_ID = 'calendar';
  const APP_TITLE = 'Nexa Calendar';
  const APP_ICON = '/icons/svg/calendar.svg';
  const BASE = '/calendar/';
  const VALID_ROUTES = ['settings'];
  const router = createRouter(BASE, VALID_ROUTES, 'main');

  let route = 'main';
  let resourceId = null;
  let user = null;
  let isDark = false;
  let ready = false;

  onMount(() => {
    user = requireAuth();
    if (!user) return;

    const t = getTheme();
    isDark = t === 'dark';
    syncTheme(isDark);

    const { route: initialRoute, resourceId: initialResourceId, notFound } = router.parseCurrentRoute();
    if (notFound) { window.location.replace('/404/'); return; }
    route = initialRoute;
    resourceId = initialResourceId;
    if (!resourceId) router.navigate(route, { replace: true });
    ready = true;

    const unbind = router.bindPopState((r, nf, rid) => {
      if (nf) { window.location.replace('/404/'); return; }
      route = r;
      resourceId = rid;
    });

    return unbind;
  });

  function handleNav(e) {
    const { to, data } = e.detail || {};
    if (data?.isDark !== undefined) {
      isDark = !!data.isDark;
      localStorage.setItem('nexa_theme', isDark ? 'dark' : 'light');
      syncTheme(isDark);
    }
    if (data?.logout) {
      localStorage.removeItem('nexa_user');
      window.location.href = '/auth/';
      return;
    }
    if (to === 'home') { window.location.href = '/home/'; return; }
    if (to === 'settings') { route = 'settings'; resourceId = null; router.navigate('settings'); return; }
    if (to === 'main' || to === APP_ID) { route = 'main'; resourceId = null; router.navigate('main'); return; }
    if (to === 'resource' && data?.id) {
      route = 'main';
      resourceId = data.id;
      router.navigateToResource(data.id);
      return;
    }
  }
</script>

{#if ready}
  {#if route === 'main'}
    <MainPage {isDark} {user} {resourceId} appTitle={APP_TITLE} appId={APP_ID} iconPath={APP_ICON} on:nav={handleNav} />
  {:else if route === 'settings'}
    <SettingsPage {isDark} {user} appTitle={APP_TITLE} on:nav={handleNav} />
  {/if}
{/if}

<style>
  :global(:root) { --primary: #2F7BF6; }
  :global(*, *::before, *::after) { box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
  :global(html, body) { height:100%; }
  :global(body) { margin:0; padding:0; overflow:hidden; font-family:'Inter', -apple-system, BlinkMacSystemFont, sans-serif; transition:background-color .3s ease, color .3s ease; }
  :global(#app) { width:100vw; height:100dvh; display:flex; flex-direction:column; position:relative; overflow:hidden; }
</style>