<script>
  import { onMount } from 'svelte';
  import { getThemeColors } from '$shared/theme.js';

  export let isDark = true;
  export let onEnterApp = () => {};

  $: c = getThemeColors(isDark);

  let pageVisible = false;
  onMount(() => { requestAnimationFrame(() => { pageVisible = true; }); });

  const FEATURES = [
    { title: 'Vídeos', desc: 'YouTube, TikTok, Instagram, Facebook e mais.' },
    { title: 'Áudio', desc: 'Extraia música e som de qualquer link.' },
    { title: 'Ficheiro Aleatório', desc: 'Baixe qualquer tipo de ficheiro, sem restrições.' },
    { title: 'Outras Ferramentas', desc: 'Utilitários extra para o teu dia a dia.' },
  ];
</script>

<div class="landing-root" class:landing-in={pageVisible}
  style="background:{c.background};color:{c.textPrimary}">

  <div class="landing-hero">
    <span class="icon-mask landing-logo" style="mask-image:url('/icons/svg/logo.svg');-webkit-mask-image:url('/icons/svg/logo.svg');background:{c.textPrimary}"></span>
    <h1 class="landing-title" style="color:{c.textPrimary}">Downora</h1>
    <p class="landing-tagline" style="color:{c.textSecondary}">
      Baixe vídeos, áudio e qualquer ficheiro de qualquer plataforma — rápido, simples, sem complicações.
    </p>
    <button class="landing-cta" style="background:{c.primary};color:{c.background}" on:click={onEnterApp}>
      Começar a usar
    </button>
  </div>

  <div class="landing-features">
    {#each FEATURES as f}
      <div class="feature-card" style="background:{c.surface};border-color:{c.divider}">
        <span class="feature-title" style="color:{c.textPrimary}">{f.title}</span>
        <span class="feature-desc" style="color:{c.textSecondary}">{f.desc}</span>
      </div>
    {/each}
  </div>

  <div class="landing-footer">
    <span class="landing-footer-text" style="color:{c.textSecondary}">Downora — 2026</span>
  </div>

</div>

<style>
  .landing-root {
    position: fixed;
    inset: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    opacity: 0;
    transform: translateY(16px);
    transition: opacity .24s cubic-bezier(0.16,1,0.3,1), transform .24s cubic-bezier(0.16,1,0.3,1);
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
    padding: calc(env(safe-area-inset-top,0px) + 40px) 24px calc(env(safe-area-inset-bottom,0px) + 32px);
  }
  .landing-root.landing-in { opacity: 1; transform: translateY(0); }
  .landing-root * { box-sizing: border-box; }

  .icon-mask {
    display: block;
    flex-shrink: 0;
    mask-size: contain; -webkit-mask-size: contain;
    mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
    mask-position: center; -webkit-mask-position: center;
  }

  .landing-hero {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    max-width: 480px;
    width: 100%;
    margin-bottom: 48px;
  }
  .landing-logo {
    width: 140px;
    height: 56px;
    margin-bottom: 20px;
  }
  .landing-title {
    font-size: 40px;
    font-weight: 800;
    letter-spacing: -1px;
    margin: 0 0 12px;
  }
  .landing-tagline {
    font-size: 15.5px;
    line-height: 1.55;
    margin: 0 0 28px;
  }
  .landing-cta {
    border: none;
    border-radius: 999px;
    padding: 14px 32px;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1);
  }
  .landing-cta:active { transform: scale(0.95); }

  .landing-features {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    max-width: 480px;
    width: 100%;
    margin-bottom: 40px;
  }
  .feature-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 18px;
    border-radius: 16px;
    border: 1px solid;
  }
  .feature-title {
    font-size: 14.5px;
    font-weight: 700;
  }
  .feature-desc {
    font-size: 12.5px;
    line-height: 1.4;
  }

  .landing-footer {
    margin-top: auto;
    padding-top: 20px;
  }
  .landing-footer-text {
    font-size: 12px;
    font-weight: 500;
  }

  @media (max-width: 420px) {
    .landing-title { font-size: 32px; }
    .landing-features { grid-template-columns: 1fr; }
  }
</style>