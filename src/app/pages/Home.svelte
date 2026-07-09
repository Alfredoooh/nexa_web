<script>
  import { onMount } from 'svelte';
  import { getThemeColors } from '$shared/theme.js';
  import { showToast } from '$shared/utils.js';
  import AppBar from '../components/AppBar.svelte';
  import Drawer from '../components/Drawer.svelte';
  import BottomTabs from '../components/BottomTabs.svelte';
  import DownloadCard from '../components/DownloadCard.svelte';
  import SourcePill from '../components/SourcePill.svelte';

  export let isDark = true;

  $: c = getThemeColors(isDark);

  let pageVisible = false;
  onMount(() => { requestAnimationFrame(() => { pageVisible = true; }); });

  let activeTab = 'videos';
  let linkValue = '';

  // ── Drawer ───────────────────────────────────────────────────────
  let drawerOpen = false;
  let drawerVisible = false;

  function openDrawer() {
    drawerOpen = true;
    requestAnimationFrame(() => { drawerVisible = true; });
  }
  function closeDrawer() {
    drawerVisible = false;
    setTimeout(() => { drawerOpen = false; }, 300);
  }
  function toggleTheme() {
    isDark = !isDark;
  }

  const TAB_CONTENT = {
    videos: {
      title: 'Baixar Vídeo',
      subtitle: 'Cole o link do vídeo que queres guardar.',
      placeholder: 'Cole aqui o link do vídeo...',
      sources: ['YouTube', 'TikTok', 'Instagram', 'Facebook'],
    },
    audio: {
      title: 'Baixar Áudio',
      subtitle: 'Extrai apenas o som de qualquer vídeo ou link.',
      placeholder: 'Cole aqui o link para extrair áudio...',
      sources: ['YouTube Music', 'SoundCloud', 'Spotify'],
    },
    random: {
      title: 'Ficheiro Aleatório',
      subtitle: 'Baixa qualquer tipo de ficheiro a partir de um link direto.',
      placeholder: 'Cole aqui o link do ficheiro...',
      sources: ['PDF', 'ZIP', 'Imagens', 'Documentos'],
    },
    tools: {
      title: 'Outras Ferramentas',
      subtitle: 'Utilitários extra para o teu fluxo de trabalho.',
      placeholder: 'Cole aqui um link para analisar...',
      sources: ['Conversor', 'Compressor', 'Encurtador'],
    },
  };

  $: current = TAB_CONTENT[activeTab];

  function handleSubmit(e) {
    const { url } = e.detail;
    console.log(`Downora [${activeTab}]: link recebido ->`, url);
    showToast('A processar o link...');
    linkValue = '';
  }
</script>

<div class="home-root" class:home-in={pageVisible}
  style="background:{c.background};color:{c.textPrimary}">

  <AppBar {c} on:openDrawer={openDrawer} />

  <div class="home-body">
    <div class="home-content">
      <h1 class="home-title" style="color:{c.textPrimary}">{current.title}</h1>
      <p class="home-subtitle" style="color:{c.textSecondary}">{current.subtitle}</p>

      <DownloadCard {c} bind:linkValue on:submit={handleSubmit} />

      <div class="home-sources">
        {#each current.sources as label}
          <SourcePill {label} {c} />
        {/each}
      </div>
    </div>
  </div>

  <BottomTabs {c} bind:activeTab />

  <Drawer {c} {isDark} open={drawerOpen} visible={drawerVisible}
    on:close={closeDrawer} on:toggleTheme={toggleTheme} />

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

  .home-body {
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow-y: auto;
    padding: 24px 24px calc(env(safe-area-inset-bottom,0px) + 100px);
  }

  .home-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    max-width: 480px;
    width: 100%;
  }

  .home-title {
    font-size: 32px;
    font-weight: 800;
    letter-spacing: -0.6px;
    margin: 0 0 10px;
  }
  .home-subtitle {
    font-size: 15px;
    line-height: 1.5;
    margin: 0 0 26px;
  }

  .home-sources {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-top: 22px;
  }

  @media (max-width: 420px) {
    .home-title { font-size: 26px; }
  }
</style>