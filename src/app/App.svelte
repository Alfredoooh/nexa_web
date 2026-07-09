<script>
  import Landing from './pages/Landing.svelte';
  import Home from './pages/Home.svelte';
  
  let isDark = true;
  let hasEnteredApp = false;
  
  function enterApp() {
    hasEnteredApp = true;
  }
</script>

{#if hasEnteredApp}
  <Home bind:isDark />
{:else}
  <Landing bind:isDark onEnterApp={enterApp} />
{/if}