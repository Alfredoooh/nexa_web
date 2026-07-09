<script>
  import { onMount, tick } from 'svelte';

  export let c;
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
</script>

<div class="cal-tabs" bind:this={tabsWrapEl}
  style="background:{isDark?'rgba(20,18,14,0.88)':'rgba(254,252,247,0.88)'};border-color:{c.divider}">
  <div class="cal-tab-indicator"
    style="transform:translateX({indicatorX}px);width:{indicatorW}px;opacity:{indicatorReady?1:0};background:{c.dialogBackground};border-color:{c.divider}">
  </div>
  {#each TABS as t}
    <button bind:this={tabRefs[t.id]} class="cal-tab"
      class:cal-tab-active={activeTab===t.id}
      style="color:{activeTab===t.id?c.textPrimary:c.textSecondary}"
      on:click={()=>activeTab=t.id}>
      {t.label}
    </button>
  {/each}
</div>

<style>
  /* ── Tab bar (idêntico ao cal-tabs do Calendar.svelte) ───────────────── */
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
  }
  .cal-tab:active { transform: scale(0.94); }
</style>