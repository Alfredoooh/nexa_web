<script>
  import { onMount } from 'svelte';
  import { getThemeColors } from '$shared/theme.js';
  import { showToast } from '$shared/utils.js';
  import DownloadCard from '../components/DownloadCard.svelte';
  import SourcePill from '../components/SourcePill.svelte';

  export let isDark = true;

  $: c = getThemeColors(isDark);

  // ── Entrada da página ────────────────────────────────────────────
  let pageVisible = false;
  onMount(() => { requestAnimationFrame(() => { pageVisible = true; }); });

  const SOURCES = ['YouTube', 'TikTok', 'Instagram', 'Facebook', '+ mais'];

  let linkValue = '';

  function handleSubmit(e) {
    const { url } = e.detail;
    console.log('Downora: link recebido para processamento ->', url);
    showToast('A processar o link...');
    linkValue = '';
  }

  function toggleTheme() {
    isDark = !isDark;
  }
</script>

<div class="home-root" class:home-in={pageVisible}
  style="background:{c.background};color:{c.textPrimary}">

  <!-- ══ APPBAR ══════════════════════════════════════════════════ -->
  <div class="home-header">
    <span class="home-brand" style="color:{c.textPrimary}">Downora</span>
    <button class="home-icon-btn" style="background:{c.appbarBtnBg}" on:click={toggleTheme} aria-label="Alternar tema">
      <span class="icon-mask" style="mask-image:url('/icons/svg/theme.svg');-webkit-mask-image:url('/icons/svg/theme.svg');background:{c.iconTint};width:18px;height:18px"></span>
    </button>
  </div>

  <!-- ══ CORPO ═══════════════════════════════════════════════════ -->
  <div class="home-body">
    <div class="home-glow" style="background:{c.primary}"></div>

    <div class="home-content">
      <div class="home-badge" style="background:{c.surface};border-color:{c.divider}">
        <span class="home-badge-dot"></span>
        <span class="home-badge-label" style="color:{c.textSecondary}">Rápido &amp; sem marca d'água</span>
      </div>

      <h1 class="home-title" style="color:{c.textPrimary}">Downora</h1>
      <p class="home-subtitle" style="color:{c.textSecondary}">
        Baixe vídeos, músicas e ficheiros de qualquer plataforma. Cole o link e receba o seu ficheiro em segundos.
      </p>

      <DownloadCard {c} bind:linkValue on:submit={handleSubmit} />

      <div class="home-sources">
        {#each SOURCES as label}
          <SourcePill {label} {c} />
        {/each}
      </div>
    </div>
  </div>

</div>

<style>
  .home-root {
    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    opacity: 0;
    transform: translateY(16px);
    transition: opacity .24s cubic-bezier(0.16,1,0.3,1), transform .24s cubic-bezier(0.16,1,0.3,1);
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
  }
  .home-root.home-in { opacity: 1; transform: translateY(0); }
  .home-root * { box-sizing: border-box; }

  .icon-mask {
    display: block;
    flex-shrink: 0;
    mask-size: contain; -webkit-mask-size: contain;
    mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
    mask-position: center; -webkit-mask-position: center;
  }

  .home-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: calc(env(safe-area-inset-top,0px) + 14px) 18px 12px;
    flex-shrink: 0;
  }
  .home-brand {
    font-size: 17px;
    font-weight: 800;
    letter-spacing: -0.3px;
  }
  .home-icon-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1), opacity .14s;
  }
  .home-icon-btn:active { transform: scale(0.86); opacity: .65; }

  .home-body {
    flex: 1;
    min-height: 0;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    padding: 24px;
  }

  .home-glow {
    position: absolute;
    top: -20%;
    left: 50%;
    transform: translateX(-50%);
    width: 640px;
    height: 640px;
    opacity: 0.16;
    filter: blur(40px);
    pointer-events: none;
    border-radius: 50%;
  }

  .home-content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    max-width: 560px;
    width: 100%;
  }

  .home-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 7px 14px;
    border-radius: 999px;
    border: 1px solid;
    margin-bottom: 22px;
  }
  .home-badge-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #34C759;
    flex-shrink: 0;
  }
  .home-badge-label {
    font-size: 12.5px;
    font-weight: 600;
    letter-spacing: 0.2px;
  }

  .home-title {
    font-size: 46px;
    font-weight: 800;
    letter-spacing: -1px;
    margin: 0 0 14px;
    line-height: 1.05;
  }

  .home-subtitle {
    font-size: 16px;
    line-height: 1.55;
    margin: 0 0 32px;
    max-width: 440px;
  }

  .home-sources {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-top: 26px;
  }

  @media (max-width: 480px) {
    .home-title { font-size: 36px; }
    .home-subtitle { font-size: 14.5px; }
  }
</style>
