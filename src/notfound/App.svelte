<script>
  import { onMount } from 'svelte';

  function goHome() {
    window.location.href = '/';
  }

  let themeValue = 'system';
  let mediaQuery;

  function resolveIsDark(v) {
    return v === 'dark' || (v === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }

  function applyThemeValue(v) {
    themeValue = v;
    const isDark = resolveIsDark(v);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }

  function handleSystemChange() {
    if (themeValue === 'system') applyThemeValue('system');
  }

  function onStorage(e) {
    if (e.key === 'nexa_theme' && e.newValue) applyThemeValue(e.newValue);
  }

  onMount(() => {
    applyThemeValue(localStorage.getItem('nexa_theme') || 'system');

    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', handleSystemChange);
    window.addEventListener('storage', onStorage);

    return () => {
      mediaQuery?.removeEventListener('change', handleSystemChange);
      window.removeEventListener('storage', onStorage);
    };
  });
</script>

<div class="root">
  <div class="code">404</div>
  <h1>Página não encontrada</h1>
  <p>O link que tentaste aceder não existe ou foi movido.</p>
  <button class="btn pulse-tap" on:click={goHome}>Voltar à página inicial</button>
</div>

<style>
  :global(html), :global(body) { height:100%; margin:0; padding:0; }

  :global([data-theme="dark"]) {
    --nf-bg: #0b0b0d;
    --nf-card: rgba(255,255,255,0.04);
    --nf-border: rgba(255,255,255,0.08);
    --nf-text: #f5f5f7;
    --nf-muted: rgba(245,245,247,0.72);
    --nf-btn: #2f7bf6;
  }
  :global([data-theme="light"]) {
    --nf-bg: #f5f7fb;
    --nf-card: rgba(255,255,255,0.92);
    --nf-border: rgba(0,0,0,0.08);
    --nf-text: #101114;
    --nf-muted: rgba(16,17,20,0.72);
    --nf-btn: #2f7bf6;
  }

  .root {
    min-height:100dvh;
    display:grid;
    place-content:center;
    text-align:center;
    gap:12px;
    padding:24px;
    background:var(--nf-bg);
    color:var(--nf-text);
  }
  .code { font-size: clamp(4rem, 12vw, 7rem); font-weight:800; letter-spacing:-0.08em; }
  h1 { margin:0; font-size: clamp(1.8rem, 4vw, 3rem); letter-spacing:-0.04em; }
  p { margin:0 auto; max-width:32ch; color:var(--nf-muted); line-height:1.6; }
  .btn {
    margin: 10px auto 0;
    border: none;
    border-radius: 999px;
    padding: 14px 20px;
    font: inherit;
    font-weight: 700;
    color: #fff;
    background: var(--nf-btn);
    cursor: pointer;
  }
</style>
