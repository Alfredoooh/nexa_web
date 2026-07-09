<svelte:head>
  <title>Nexa Calendar</title>
  <meta name="description" content="Landing page do Nexa Calendar." />
</svelte:head>

<script>
  const features = [
    { title: 'Sem login', text: 'Aceda diretamente ao calendário.' },
    { title: 'Só calendário', text: 'O projeto foi reduzido ao essencial.' },
    { title: 'Ícones SVG', text: 'Sem PNGs no projeto.' },
  ];

  function openCalendar() {
    window.location.href = '/calendar/';
  }
</script>

<main class="page">
  <section class="hero">
    <div class="eyebrow">
      <img src="/icons/svg/calendar.svg" alt="" />
      Nexa Calendar
    </div>

    <h1>Landing page simples, limpa e focada no calendário.</h1>
    <p>
      Mantive apenas a página inicial e o calendário, removendo os restantes apps e o fluxo de login.
    </p>

    <div class="actions">
      <button class="primary" on:click={openCalendar}>Abrir calendário</button>
      <a class="secondary" href="/calendar/">Ir para a agenda</a>
    </div>
  </section>

  <section class="features">
    {#each features as feature}
      <article class="feature-card">
        <h2>{feature.title}</h2>
        <p>{feature.text}</p>
      </article>
    {/each}
  </section>
</main>

<style>
  :global(:root) {
    --bg: #0b0c10;
    --panel: rgba(255,255,255,0.06);
    --border: rgba(255,255,255,0.12);
    --text: #f5f7fb;
    --muted: rgba(245,247,251,0.74);
    --accent: #4f8cff;
  }
  :global(body) {
    margin: 0;
    background:
      radial-gradient(circle at top, rgba(79,140,255,.22), transparent 40%),
      linear-gradient(180deg, #101114 0%, var(--bg) 100%);
    color: var(--text);
  }
  .page {
    min-height: 100vh;
    display: grid;
    gap: 24px;
    align-content: center;
    padding: 28px;
  }
  .hero {
    width: min(980px, 100%);
    margin: 0 auto;
    padding: 30px;
    border-radius: 28px;
    background: var(--panel);
    border: 1px solid var(--border);
    backdrop-filter: blur(18px);
    box-shadow: 0 30px 90px rgba(0,0,0,.35);
  }
  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    color: var(--muted);
    letter-spacing: .08em;
    text-transform: uppercase;
    font-size: 13px;
  }
  .eyebrow img { width: 30px; height: 30px; }
  h1 {
    margin: 18px 0 12px;
    font-size: clamp(2.4rem, 6.5vw, 5rem);
    line-height: .95;
    letter-spacing: -0.05em;
    max-width: 12ch;
  }
  p {
    margin: 0;
    max-width: 60ch;
    color: var(--muted);
    line-height: 1.7;
    font-size: 1.02rem;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 26px;
  }
  .primary, .secondary {
    appearance: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 48px;
    padding: 0 20px;
    border-radius: 999px;
    font: inherit;
    font-weight: 700;
    border: 0;
    text-decoration: none;
    cursor: pointer;
    transition: transform .18s ease, opacity .18s ease;
  }
  .primary { background: var(--accent); color: #fff; }
  .secondary { background: rgba(255,255,255,0.08); color: var(--text); border: 1px solid var(--border); }
  .primary:hover, .secondary:hover { transform: translateY(-1px); }
  .features {
    width: min(980px, 100%);
    margin: 0 auto;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }
  .feature-card {
    padding: 18px;
    border-radius: 22px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
  }
  .feature-card h2 {
    margin: 0 0 8px;
    font-size: 1rem;
  }
  .feature-card p {
    font-size: .94rem;
  }
  @media (max-width: 800px) {
    .page { padding: 16px; }
    .hero { padding: 22px; border-radius: 22px; }
    .features { grid-template-columns: 1fr; }
    .actions { flex-direction: column; }
    .primary, .secondary { width: 100%; }
  }
</style>
