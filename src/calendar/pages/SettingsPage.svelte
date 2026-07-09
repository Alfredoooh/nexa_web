<script>
  import { createEventDispatcher } from 'svelte';
  import { getThemeColors, getTheme } from '$shared/theme.js';

  export let isDark = false;
  export let user = null;
  export let appTitle = 'Nexa Calendar';

  const dispatch = createEventDispatcher();
  $: c = getThemeColors(isDark);

  let themeValue = getTheme();
  $: userName = user?.name || user?.displayName || user?.email || 'Utilizador';
  $: userEmail = user?.email || '';
  $: userInitial = userName.trim()[0]?.toUpperCase() || 'U';

  function setThemeValue(v) {
    themeValue = v;
    localStorage.setItem('nexa_theme', v);
    const dark = v === 'dark' || (v === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    dispatch('nav', { to: 'main', data: { isDark: dark } });
  }
</script>

<div class="settings-root" style="background:{c.background}">
  <div class="topbar">
    <button class="back-btn" style="background:{c.appbarBtnBg}" on:click={()=> dispatch('nav', { to: 'main' })}>
      <span class="icon-mask" style="mask-image:url('/icons/svg/back_arrow.svg');-webkit-mask-image:url('/icons/svg/back_arrow.svg');background:{c.iconTint};width:20px;height:20px;display:block;mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;mask-position:center;-webkit-mask-position:center;"></span>
    </button>
    <span class="topbar-title" style="color:{c.textPrimary}">{appTitle} • Definições</span>
    <div style="width:36px"></div>
  </div>
  <div class="content">
    <div class="profile-card" style="background:{c.dialogBackground}">
      <div class="avatar" style="background:{c.primary}">{userInitial}</div>
      <div class="profile-info">
        <div class="profile-name" style="color:{c.textPrimary}">{userName}</div>
        {#if userEmail}<div class="profile-email" style="color:{c.textSecondary}">{userEmail}</div>{/if}
      </div>
    </div>

    <div class="section-label" style="color:{c.settings_section_label}">Aparência</div>
    <div class="section" style="background:{c.dialogBackground}">
      {#each [['light','Claro'],['dark','Escuro'],['system','Sistema']] as [v, label], i}
        <button class="row" on:click={() => setThemeValue(v)}>
          <span class="row-label" style="color:{c.textPrimary}">{label}</span>
          {#if themeValue === v}<span class="check" style="color:{c.primary}">✓</span>{/if}
        </button>
        {#if i < 2}<div class="divider" style="background:{c.divider}"></div>{/if}
      {/each}
    </div>
  </div>
</div>

<style>
  .settings-root { position:fixed; inset:0; display:flex; flex-direction:column; overflow:hidden; }
  .topbar { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:52px 16px 12px; flex-shrink:0; }
  .back-btn { width:36px; height:36px; border-radius:10px; border:none; display:flex; align-items:center; justify-content:center; cursor:pointer; }
  .back-btn:active { opacity:.7; }
  .topbar-title { font-size:16px; font-weight:700; text-align:center; flex:1; }
  .content { flex:1; overflow-y:auto; padding:8px 16px 16px; }
  .profile-card { display:flex; align-items:center; gap:14px; padding:16px; border-radius:18px; margin-bottom:24px; }
  .avatar { width:48px; height:48px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:700; color:#fff; flex-shrink:0; }
  .profile-name { font-size:16px; font-weight:700; }
  .profile-email { font-size:13px; margin-top:2px; }
  .section-label { font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; padding:0 2px 10px; }
  .section { border-radius:18px; overflow:hidden; }
  .row { width:100%; display:flex; align-items:center; justify-content:space-between; gap:12px; padding:15px 16px; background:none; border:none; text-align:left; cursor:pointer; }
  .row:active { opacity:.8; }
  .row-label { font-size:15px; font-weight:600; }
  .check { font-size:15px; font-weight:800; }
  .divider { height:1px; margin:0 16px; opacity:.9; }
</style>
