<script>
  import { onMount, tick } from 'svelte';

  export let c;
  export let activeTab = 'videos';

  const TABS = [
    { id: 'videos', label: 'Vídeos', icon: '/icons/svg/video.svg' },
    { id: 'audio',  label: 'Áudio',  icon: '/icons/svg/audio.svg' },
    { id: 'random', label: 'Aleatório', icon: '/icons/svg/shuffle.svg' },
    { id: 'tools',  label: 'Ferramentas', icon: '/icons/svg/tools.svg' },
  ];

  let tabsWrapEl;
  let tabRefs = {};
  let indicatorX = 0;
  let indicatorW = 0;
  let indicatorReady = false;

  function updateIndicator() {
    const btn = tabRefs[activeTab];
    if (!btn || !tabsWrapEl) return;
    const wr = tabsWrapEl.getBoundingClientRect();
    const br = btn.getBoundingClientRect();
    indicatorX = br.left - wr.left;
    indicatorW = br.width;
    indicatorReady = true;
  }

  $: if (activeTab && tabsWrapEl) tick().then(updateIndicator);

  onMount(() => {
    tick().then(updateIndicator);
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  });
</script>

<div class="bottom-tabs" bind:this={tabsWrapEl}
  style="background:{c.dialogBackground};border-color:{c.divider}">
  <div class="tab-indicator"
    style="transform:translateX({indicatorX}px);width:{indicatorW}px;opacity:{indicatorReady?1:0};background:{c.surface};border-color:{c.divider}">
  </div>
  {#each TABS as t}
    <button bind:this={tabRefs[t.id]} class="tab-btn"
      class:tab-btn-active={activeTab === t.id}
      style="color:{activeTab === t.id ? c.textPrimary : c.textSecondary}"
      on:click={() => activeTab = t.id}>
      <span class="icon-mask" style="mask-image:url('{t.icon}');-webkit-mask-image:url('{t.icon}');background:{activeTab === t.id ? c.textPrimary : c.textSecondary};width:19px;height:19px"></span>
      <span class="tab-label">{t.label}</span>
    </button>
  {/each}
</div>

<style>
  .bottom-tabs {
    position: fixed;
    left: 14px;
    right: 14px;
    bottom: calc(env(safe-area-inset-bottom,0px) + 18px);
    z-index: 200;
    display: flex;
    gap: 2px;
    border: 1px solid;
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    padding: 4px;
    border-radius: 22px;
    box-shadow: 0 8px 28px rgba(0,0,0,.14);
  }
  .tab-indicator {
    position: absolute;
    top: 4px;
    bottom: 4px;
    left: 0;
    border-radius: 18px;
    border: 1px solid;
    transition: transform .32s cubic-bezier(0.34,1.2,0.4,1), width .32s cubic-bezier(0.34,1.2,0.4,1), opacity .2s ease;
    will-change: transform, width;
    pointer-events: none;
  }
  .tab-btn {
    position: relative;
    z-index: 1;
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    border: none;
    background: transparent;
    padding: 9px 4px;
    border-radius: 18px;
    cursor: pointer;
    transition: transform .18s cubic-bezier(0.34,1.56,0.64,1);
  }
  .tab-btn:active { transform: scale(0.94); }
  .tab-label {
    font-size: 10.5px;
    font-weight: 700;
  }
  .icon-mask {
    display: block;
    mask-size: contain; -webkit-mask-size: contain;
    mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
    mask-position: center; -webkit-mask-position: center;
  }
</style>