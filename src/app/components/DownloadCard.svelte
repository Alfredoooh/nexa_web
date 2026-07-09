<script>
  import { createEventDispatcher } from 'svelte';
  
  export let c;
  export let linkValue = '';
  
  const dispatch = createEventDispatcher();
  let inputFocused = false;
  
  function submit() {
    const url = linkValue.trim();
    if (!url) return;
    dispatch('submit', { url });
  }
  
  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  }
</script>

<div class="dl-card" class:dl-card-focused={inputFocused} style="background:{c.surface};border-color:{c.divider}">
  <span class="icon-mask dl-link-ic" style="mask-image:url('/icons/svg/link.svg');-webkit-mask-image:url('/icons/svg/link.svg');background:{c.textSecondary};width:18px;height:18px"></span>
  
  <input type="text" class="dl-input" style="color:{c.textPrimary}" placeholder="Cole aqui o link..." bind:value={linkValue} on:keydown={handleKeyDown} on:focus={()=> inputFocused = true}
  on:blur={() => inputFocused = false}
  />
  
  <button class="dl-submit" style="background:{c.primary}" on:click={submit} aria-label="Baixar">
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={c.background} stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </svg>
  </button>
</div>

<style>
  .dl-card {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    border: 1.5px solid;
    border-radius: 18px;
    padding: 6px 6px 6px 18px;
    transition: box-shadow 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  }
  
  .dl-card-focused {
    box-shadow: 0 0 0 4px rgba(20, 18, 14, 0.08);
  }
  
  .icon-mask {
    display: block;
    flex-shrink: 0;
    mask-size: contain;
    -webkit-mask-size: contain;
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-position: center;
  }
  
  .dl-input {
    flex: 1;
    border: none;
    outline: none;
    background: transparent;
    font-size: 15px;
    font-family: inherit;
    padding: 12px 0;
    min-width: 0;
  }
  
  .dl-submit {
    flex-shrink: 0;
    width: 42px;
    height: 42px;
    border-radius: 13px;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.16s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  
  .dl-submit:active {
    transform: scale(0.90);
  }
</style>