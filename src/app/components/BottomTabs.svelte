<script>
  import { onMount, tick } from 'svelte';

  export let isDark = true;
  export let activeTab = 'videos';

  const TABS = [
    { id: 'videos', label: 'Vídeos' },
    { id: 'audio',  label: 'Áudio' },
    { id: 'random', label: 'Aleatório' },
    { id: 'tools',  label: 'Ferramentas' },
  ];

  let tabsWrapEl, tabRefs = {}, indicatorX = 0, indicatorW = 0, indicatorReady = false;

  function updateIndicator() {
    const btn = tabRefs[activeTab];
    if (!btn || !tabsWrapEl) return;
    const wr = tabsWrapEl.getBoundingClientRect(), br = btn.getBoundingClientRect();
    indicatorX = br.left - wr.left; indicatorW = br.width; indicatorReady = true;
  }
  $: if (activeTab && tabsWrapEl) tick().then(updateIndicator);
  onMount(() => {
    tick().then(updateIndicator);
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  });

  // Cores nativas monocromáticas (preto/branco)
  $: bgColor = isDark ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.85)';
  $: borderColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)';
  $: indicatorBg = isDark ? '#ffffff' : '#000000';
  $: indicatorBorder = isDark ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.1)';
  $: activeColor = isDark ? '#000000' : '#ffffff';
  $: inactiveColor = isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.55)';
</script>

<div class="cal-tabs" bind:this={tabsWrapEl}
  style="background:{bgColor};border-color:{borderColor}">
  <div class="cal-tab-indicator"
    style="transform:translateX({indicatorX}px);width:{indicatorW}px;opacity:{indicatorReady?1:0};background:{indicatorBg};border-color:{indicatorBorder}">
  </div>
  {#each TABS as t}
    <button bind:this={tabRefs[t.id]} class="cal-tab"
      class:cal-tab-active={activeTab===t.id}
      style="color:{activeTab===t.id ? activeColor : inactiveColor}"
      on:click={()=>activeTab=t.id}>
      {t.label}
    </button>
  {/each}
</div>

<style>
  .cal-tabs {
    position: fixed; left: 14px; right: 14px;
    bottom: calc(env(safe-area-inset-bottom,0px) + 18px);
    z-index: 200; display: flex; gap: 4px;
    border: 1px solid; backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    padding: 4px; border-radius: 999px;
    box-shadow: 0 8px 28px rgba(0,0,0,.14);
  }
  .cal-tab-indicator {
    position: absolute; top: 4px; bottom: 4px; left: 0;
    border-radius: 999px; border: 1px solid;
    box-shadow: 0 2px 8px rgba(0,0,0,.1);
    transition: transform .32s cubic-bezier(0.34,1.2,0.4,1), width .32s cubic-bezier(0.34,1.2,0.4,1), opacity .2s ease;
    will-change: transform, width; pointer-events: none;
  }
  .cal-tab {
    position: relative; z-index: 1; flex: 1;
    border: none; background: transparent; padding: 11px 4px; border-radius: 999px;
    font: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer;
    transition: color .22s cubic-bezier(0.16,1,0.3,1), transform .18s cubic-bezier(0.34,1.56,0.64,1);

    /* Remove o retângulo azul ao tocar (iOS/Android) */
    -webkit-tap-highlight-color: transparent;
    /* Remove contorno de foco padrão (substituído por foco-visible) */
    outline: none;
  }
  .cal-tab:active { transform: scale(0.94); }

  /* Foco acessível sem azul: usa uma borda branca/preto suave */
  .cal-tab:focus-visible {
    box-shadow: 0 0 0 2px var(--focus-ring, light-dark(rgba(0,0,0,0.5), rgba(255,255,255,0.5)));
  }
</style>