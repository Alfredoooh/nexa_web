<script>
  import { createEventDispatcher } from 'svelte';

  export let c;
  export let logoSrc = '/icons/svg/logo.svg';

  const dispatch = createEventDispatcher();
</script>

<div class="appbar">
  <button class="appbar-menu-btn" style="background:{c.appbarBtnBg}" on:click={() => dispatch('openDrawer')} aria-label="Abrir menu">
    <span class="icon-mask" style="mask-image:url('/icons/svg/menu.svg');-webkit-mask-image:url('/icons/svg/menu.svg');background:{c.iconTint};width:19px;height:19px"></span>
  </button>

  <span class="icon-mask appbar-logo" style="mask-image:url('{logoSrc}');-webkit-mask-image:url('{logoSrc}');background:{c.textPrimary}"></span>

  <div class="appbar-spacer"></div>
</div>

<style>
  .appbar {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: calc(env(safe-area-inset-top,0px) + 14px) 14px 12px;
    flex-shrink: 0;
  }
  .appbar-menu-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    transition: transform .16s cubic-bezier(0.34,1.56,0.64,1), opacity .14s;
  }
  .appbar-menu-btn:active { transform: scale(0.86); opacity: .65; }
  .appbar-logo {
    height: 24px;
    width: 88px;
    flex-shrink: 0;
    mask-size: contain; -webkit-mask-size: contain;
    mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
    mask-position: left center; -webkit-mask-position: left center;
  }
  .appbar-spacer { flex: 1; }
  .icon-mask {
    display: block;
    flex-shrink: 0;
    mask-size: contain; -webkit-mask-size: contain;
    mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
    mask-position: center; -webkit-mask-position: center;
  }
</style>