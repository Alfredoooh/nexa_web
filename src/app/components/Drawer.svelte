<script>
  import { createEventDispatcher } from 'svelte';

  export let c;
  export let isDark = true;
  export let open = false;
  export let visible = false;

  const dispatch = createEventDispatcher();

  function close() {
    dispatch('close');
  }
  function toggleTheme() {
    dispatch('toggleTheme');
  }
</script>

{#if open}
  <button class="drawer-overlay" class:drawer-overlay-in={visible}
    style="background:{visible ? c.drawerOverlay : 'transparent'}"
    on:click={close} aria-label="Fechar menu"></button>

  <div class="drawer" class:drawer-in={visible} style="background:{c.drawerBg};border-color:{c.divider}">
    <div class="drawer-header">
      <span class="icon-mask drawer-logo" style="mask-image:url('/icons/svg/logo.svg');-webkit-mask-image:url('/icons/svg/logo.svg');background:{c.textPrimary}"></span>
    </div>

    <div class="drawer-sep" style="background:{c.divider}"></div>

    <nav class="drawer-nav">
      <button class="drawer-row" on:click={toggleTheme}>
        <span class="icon-mask" style="mask-image:url('/icons/svg/theme.svg');-webkit-mask-image:url('/icons/svg/theme.svg');background:{c.iconTint};width:19px;height:19px"></span>
        <span class="drawer-row-label" style="color:{c.textPrimary}">{isDark ? 'Modo escuro' : 'Modo claro'}</span>
        <div class="drawer-spacer"></div>
        <div class="mini-toggle" style="background:{isDark ? c.primary : c.divider}">
          <div class="mini-toggle-knob" style="transform:{isDark ? 'translateX(16px)' : 'translateX(2px)'};background:{isDark ? c.background : '#fff'}"></div>
        </div>
      </button>

      <button class="drawer-row">
        <span class="icon-mask" style="mask-image:url('/icons/svg/settings.svg');-webkit-mask-image:url('/icons/svg/settings.svg');background:{c.iconTint};width:19px;height:19px"></span>
        <span class="drawer-row-label" style="color:{c.textPrimary}">Definições</span>
      </button>

      <button class="drawer-row">
        <span class="icon-mask" style="mask-image:url('/icons/svg/help.svg');-webkit-mask-image:url('/icons/svg/help.svg');background:{c.iconTint};width:19px;height:19px"></span>
        <span class="drawer-row-label" style="color:{c.textPrimary}">Ajuda</span>
      </button>

      <button class="drawer-row">
        <span class="icon-mask" style="mask-image:url('/icons/svg/info.svg');-webkit-mask-image:url('/icons/svg/info.svg');background:{c.iconTint};width:19px;height:19px"></span>
        <span class="drawer-row-label" style="color:{c.textPrimary}">Sobre o Downora</span>
      </button>
    </nav>
  </div>
{/if}

<style>
  .drawer-overlay {
    position: fixed;
    inset: 0;
    z-index: 900;
    border: none;
    cursor: default;
    width: 100%;
    height: 100%;
    padding: 0;
    transition: background .3s cubic-bezier(0.16,1,0.3,1);
  }

  .drawer {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 901;
    width: min(280px, 78vw);
    display: flex;
    flex-direction: column;
    border-right: 1px solid;
    padding-top: env(safe-area-inset-top, 0px);
    transform: translateX(-100%);
    transition: transform .3s cubic-bezier(0.16,1,0.3,1);
    box-shadow: 4px 0 24px rgba(0,0,0,0.12);
  }
  .drawer.drawer-in { transform: translateX(0); }

  .drawer-header {
    padding: 20px 20px 14px;
  }
  .drawer-logo {
    height: 26px;
    width: 100px;
    mask-size: contain; -webkit-mask-size: contain;
    mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
    mask-position: left center; -webkit-mask-position: left center;
  }
  .drawer-sep {
    height: 1px;
    margin: 0 20px 8px;
  }

  .drawer-nav {
    display: flex;
    flex-direction: column;
    padding: 4px 8px;
  }
  .drawer-row {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 13px 12px;
    border: none;
    background: transparent;
    border-radius: 12px;
    cursor: pointer;
    text-align: left;
    transition: opacity .14s;
  }
  .drawer-row:active { opacity: .6; }
  .drawer-row-label {
    font-size: 15px;
    font-weight: 600;
  }
  .drawer-spacer { flex: 1; }

  .icon-mask {
    display: block;
    flex-shrink: 0;
    mask-size: contain; -webkit-mask-size: contain;
    mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
    mask-position: center; -webkit-mask-position: center;
  }

  .mini-toggle {
    width: 34px;
    height: 20px;
    border-radius: 10px;
    position: relative;
    flex-shrink: 0;
    transition: background .22s cubic-bezier(0.16,1,0.3,1);
  }
  .mini-toggle-knob {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    position: absolute;
    top: 2px;
    transition: transform .22s cubic-bezier(0.34,1.56,0.64,1);
  }
</style>