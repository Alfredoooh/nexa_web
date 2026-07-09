<script>
  export let label = '';
  export let c;
</script>

<span class="source-pill" style="color:{c.textSecondary};background:{c.surface};border-color:{c.divider}">
  {label}
</span>

<style>
  .source-pill {
    font-size: 12.5px;
    font-weight: 600;
    padding: 6px 13px;
    border-radius: 999px;
    border: 1px solid;
  }
</style>