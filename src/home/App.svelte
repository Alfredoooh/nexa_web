<svelte:head>
  <title>Downora — Baixe qualquer coisa a partir de um link</title>
  <meta name="description" content="Downora: baixe músicas, vídeos, imagens e ficheiros de qualquer link, direto e sem complicação." />
</svelte:head>

<script>
  let linkValue = '';

  const platforms = [
    'YouTube', 'Instagram', 'TikTok', 'Spotify', 'Twitter / X', 'Facebook', 'SoundCloud', 'Pinterest'
  ];

  const fileTypes = [
    {
      tag: '01 — ÁUDIO',
      title: 'Música & Podcasts',
      desc: 'Extraia áudio em alta qualidade de qualquer vídeo ou link de streaming.',
      stat: '320kbps',
      statLabel: 'qualidade máxima de áudio',
      color: '#8B5CF6'
    },
    {
      tag: '02 — VÍDEO',
      title: 'Vídeos completos',
      desc: 'Baixe vídeos inteiros em MP4, na melhor resolução disponível na fonte.',
      stat: '4K',
      statLabel: 'resolução suportada',
      color: '#3B82F6'
    },
    {
      tag: '03 — IMAGEM',
      title: 'Imagens & Galerias',
      desc: 'Fotos, stories e carrosséis completos, um por um ou em lote.',
      stat: '100+',
      statLabel: 'imagens por lote',
      color: '#EC4899'
    },
    {
      tag: '04 — FICHEIROS',
      title: 'Qualquer ficheiro',
      desc: 'PDFs, ZIPs, documentos — se tem link direto, o Downora traz.',
      stat: '500MB+',
      statLabel: 'tamanho máximo por ficheiro',
      color: '#F59E0B'
    }
  ];

  const steps = [
    {
      n: '01 — COLE',
      title: 'Cole o link',
      text: 'Copie o link de onde estiver — rede social, site de música, qualquer página com o conteúdo que quer.'
    },
    {
      n: '02 — ESCOLHA',
      title: 'Escolha o formato',
      text: 'O Downora detecta o conteúdo e mostra as opções disponíveis: áudio, vídeo ou ficheiro original.'
    },
    {
      n: '03 — BAIXE',
      title: 'Baixe na hora',
      text: 'Sem espera, sem cadastro. O ficheiro vai direto para o seu dispositivo.'
    }
  ];

  const faqs = [
    { q: 'Preciso de criar conta?', a: 'Não. O Downora funciona direto, sem login e sem cadastro.' },
    { q: 'Quais links são suportados?', a: 'YouTube, Instagram, TikTok, Spotify, Facebook, SoundCloud, Pinterest e a maioria dos links diretos de ficheiros.' },
    { q: 'Tem limite de downloads?', a: 'Não há limite diário. Alguns tipos de ficheiro grandes podem ter um teto de tamanho.' },
    { q: 'É seguro?', a: 'Sim. O Downora não guarda os seus ficheiros nem o conteúdo baixado — tudo passa direto para si.' }
  ];

  let openFaq = -1;
  function toggleFaq(i) {
    openFaq = openFaq === i ? -1 : i;
  }

  function handleDownload() {
    if (!linkValue.trim()) return;
    window.location.href = `/download/?url=${encodeURIComponent(linkValue.trim())}`;
  }
</script>

<main class="page">

  <!-- NAV -->
  <nav class="nav">
    <div class="logo">DOWNORA</div>
    <div class="nav-links">
      <a href="#tipos">Tipos</a>
      <a href="#como-funciona">Como funciona</a>
      <a href="#faq">FAQ</a>
    </div>
    <button class="nav-cta" on:click={() => document.getElementById('hero-input')?.focus()}>
      Começar
    </button>
  </nav>

  <!-- HERO -->
  <section class="hero">
    <div class="hero-top">
      <span class="pill">● Sem login · Sem espera</span>
    </div>

    <h1 class="hero-title">DOWNORA</h1>

    <p class="hero-sub">
      Cole qualquer link. Música, vídeo, imagem ou ficheiro —
      o Downora traz até si em segundos.
    </p>

    <div class="hero-input-row">
      <input
        id="hero-input"
        type="text"
        placeholder="Cole aqui o link..."
        bind:value={linkValue}
        on:keydown={(e) => e.key === 'Enter' && handleDownload()}
      />
      <button on:click={handleDownload}>Baixar →</button>
    </div>

    <div class="hero-stat">
      <span class="big-number">8+</span>
      <p>
        Plataformas suportadas de forma nativa. A maioria dos
        downloaders trava em formatos e limites — o nosso foco
        desde o início foi simplicidade: um link, um resultado, sem letras miúdas.
      </p>
    </div>
  </section>

  <!-- PLATFORMS -->
  <section class="platforms">
    <p class="platforms-label">Funciona com</p>
    <div class="platforms-grid">
      {#each platforms as p}
        <span class="platform-chip">{p}</span>
      {/each}
    </div>
  </section>

  <!-- IMPACT STATEMENT -->
  <section class="impact">
    <h2>SEM COMPLICAÇÃO</h2>
    <p>
      Nada de anúncios interrompendo, popups ou instalar programas.
      Cole o link, escolha o formato, baixe. É só isso.
    </p>
  </section>

  <!-- FILE TYPES -->
  <section class="types" id="tipos">
    <p class="section-label">✳ O que pode baixar</p>

    <div class="types-grid">
      {#each fileTypes as t}
        <article class="type-card" style="--accent: {t.color}">
          <div class="type-visual"></div>
          <div class="type-info">
            <span class="type-tag">{t.tag}</span>
            <h3>{t.title}</h3>
            <p>{t.desc}</p>
            <div class="type-stat">
              <strong>{t.stat}</strong>
              <span>{t.statLabel}</span>
            </div>
          </div>
        </article>
      {/each}
    </div>
  </section>

  <!-- HOW IT WORKS -->
  <section class="how" id="como-funciona">
    <h2 class="how-title">COMO FUNCIONA</h2>

    <div class="how-list">
      {#each steps as s, i}
        <div class="how-item">
          <span class="how-n">{s.n}</span>
          <div class="how-text">
            <h3>{s.title}</h3>
            <p>{s.text}</p>
          </div>
        </div>
      {/each}
    </div>
  </section>

  <!-- FAQ -->
  <section class="faq" id="faq">
    <div class="faq-head">
      <h2>Antes de começar,<br />tire as dúvidas.</h2>
    </div>

    <div class="faq-list">
      {#each faqs as f, i}
        <button class="faq-item" class:open={openFaq === i} on:click={() => toggleFaq(i)}>
          <div class="faq-q">
            <span>{f.q}</span>
            <span class="faq-icon">{openFaq === i ? '−' : '+'}</span>
          </div>
          {#if openFaq === i}
            <p class="faq-a">{f.a}</p>
          {/if}
        </button>
      {/each}
    </div>
  </section>

  <!-- FINAL CTA -->
  <section class="cta">
    <h2>
      COLE O LINK<br />
      E DEIXE O RESTO<br />
      → CONNOSCO
    </h2>
    <div class="cta-input-row">
      <input
        type="text"
        placeholder="Cole aqui o link..."
        bind:value={linkValue}
        on:keydown={(e) => e.key === 'Enter' && handleDownload()}
      />
      <button on:click={handleDownload}>Baixar agora →</button>
    </div>
  </section>

  <!-- FOOTER -->
  <footer class="footer">
    <div class="footer-nav">
      <div class="footer-col">
        <span class="footer-title">Navegação</span>
        <a href="#tipos">Tipos de ficheiro</a>
        <a href="#como-funciona">Como funciona</a>
        <a href="#faq">FAQ</a>
      </div>
      <div class="footer-col">
        <span class="footer-title">Downora</span>
        <p>Baixe qualquer coisa a partir de um link, sem complicação.</p>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© {new Date().getFullYear()} DOWNORA</span>
      <span>Feito para quem só quer o ficheiro.</span>
    </div>
  </footer>

</main>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700&display=swap');

  :global(:root) {
    --bg: #0a0a0a;
    --bg-alt: #101010;
    --panel: rgba(255,255,255,0.05);
    --border: rgba(255,255,255,0.1);
    --text: #f5f5f5;
    --muted: rgba(245,245,245,0.62);
    --accent: #ffffff;
  }

  :global(body) {
    margin: 0;
    background: var(--bg);
    color: var(--text);
    font-family: 'Inter', system-ui, sans-serif;
  }

  * { box-sizing: border-box; }

  .page {
    overflow-x: hidden;
  }

  h1, h2, h3 {
    font-family: 'Anton', 'Inter', sans-serif;
    font-weight: 400;
    text-transform: uppercase;
    letter-spacing: -0.01em;
    margin: 0;
  }

  a { color: inherit; text-decoration: none; }

  /* NAV */
  .nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 32px;
    max-width: 1400px;
    margin: 0 auto;
  }
  .logo {
    font-family: 'Anton', sans-serif;
    font-size: 1.3rem;
    letter-spacing: 0.02em;
  }
  .nav-links {
    display: flex;
    gap: 28px;
    font-size: 0.9rem;
    color: var(--muted);
  }
  .nav-links a:hover { color: var(--text); }
  .nav-cta {
    background: var(--text);
    color: var(--bg);
    border: 0;
    border-radius: 999px;
    padding: 10px 20px;
    font-weight: 600;
    font-size: 0.85rem;
    cursor: pointer;
  }

  /* HERO */
  .hero {
    max-width: 1400px;
    margin: 0 auto;
    padding: 60px 32px 80px;
  }
  .hero-top { margin-bottom: 18px; }
  .pill {
    display: inline-block;
    font-size: 0.78rem;
    color: var(--muted);
    letter-spacing: 0.06em;
    border: 1px solid var(--border);
    padding: 6px 14px;
    border-radius: 999px;
  }
  .hero-title {
    font-size: clamp(3.2rem, 13vw, 9rem);
    line-height: 0.88;
    margin: 0 0 24px;
  }
  .hero-sub {
    max-width: 46ch;
    font-size: clamp(1rem, 2.2vw, 1.25rem);
    color: var(--muted);
    line-height: 1.6;
    margin: 0 0 36px;
  }
  .hero-input-row {
    display: flex;
    gap: 10px;
    max-width: 620px;
    margin-bottom: 60px;
  }
  .hero-input-row input {
    flex: 1;
    min-width: 0;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 0 22px;
    height: 56px;
    color: var(--text);
    font-size: 1rem;
    font-family: inherit;
  }
  .hero-input-row input::placeholder { color: var(--muted); }
  .hero-input-row input:focus { outline: none; border-color: rgba(255,255,255,0.4); }
  .hero-input-row button {
    background: var(--text);
    color: var(--bg);
    border: 0;
    border-radius: 999px;
    padding: 0 28px;
    height: 56px;
    font-weight: 700;
    font-size: 1rem;
    cursor: pointer;
    white-space: nowrap;
    transition: transform .15s ease;
  }
  .hero-input-row button:hover { transform: translateY(-1px); }

  .hero-stat {
    display: flex;
    gap: 28px;
    align-items: flex-start;
    padding-top: 40px;
    border-top: 1px solid var(--border);
    max-width: 780px;
  }
  .big-number {
    font-family: 'Anton', sans-serif;
    font-size: 3.2rem;
    line-height: 1;
    flex-shrink: 0;
  }
  .hero-stat p {
    margin: 0;
    color: var(--muted);
    line-height: 1.7;
    font-size: 0.98rem;
  }

  /* PLATFORMS */
  .platforms {
    max-width: 1400px;
    margin: 0 auto;
    padding: 40px 32px;
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
  }
  .platforms-label {
    font-size: 0.78rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted);
    margin: 0 0 20px;
  }
  .platforms-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }
  .platform-chip {
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 10px 20px;
    font-size: 0.9rem;
    color: var(--muted);
  }

  /* IMPACT */
  .impact {
    max-width: 1400px;
    margin: 0 auto;
    padding: 100px 32px;
    text-align: center;
  }
  .impact h2 {
    font-size: clamp(2.4rem, 9vw, 6rem);
    line-height: 0.95;
    margin-bottom: 20px;
  }
  .impact p {
    max-width: 50ch;
    margin: 0 auto;
    color: var(--muted);
    font-size: 1.05rem;
    line-height: 1.7;
  }

  /* TYPES */
  .types {
    max-width: 1400px;
    margin: 0 auto;
    padding: 40px 32px 100px;
  }
  .section-label {
    font-size: 0.78rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted);
    margin: 0 0 28px;
  }
  .types-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }
  .type-card {
    display: grid;
    grid-template-columns: 140px 1fr;
    gap: 20px;
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 20px;
    background: var(--bg-alt);
  }
  .type-visual {
    border-radius: 14px;
    background: linear-gradient(135deg, var(--accent), transparent 140%);
    opacity: 0.85;
    min-height: 120px;
  }
  .type-tag {
    font-size: 0.72rem;
    letter-spacing: 0.08em;
    color: var(--accent);
    font-weight: 600;
  }
  .type-info h3 {
    font-family: 'Inter', sans-serif;
    font-weight: 700;
    text-transform: none;
    font-size: 1.3rem;
    margin: 8px 0 8px;
  }
  .type-info p {
    color: var(--muted);
    font-size: 0.92rem;
    line-height: 1.6;
    margin: 0 0 16px;
  }
  .type-stat {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }
  .type-stat strong {
    font-family: 'Anton', sans-serif;
    font-size: 1.5rem;
    color: var(--accent);
  }
  .type-stat span {
    font-size: 0.8rem;
    color: var(--muted);
  }

  /* HOW IT WORKS */
  .how {
    max-width: 1400px;
    margin: 0 auto;
    padding: 60px 32px 100px;
    border-top: 1px solid var(--border);
  }
  .how-title {
    font-size: clamp(2.2rem, 7vw, 4rem);
    margin-bottom: 50px;
  }
  .how-list {
    display: flex;
    flex-direction: column;
  }
  .how-item {
    display: grid;
    grid-template-columns: 140px 1fr;
    gap: 24px;
    padding: 32px 0;
    border-top: 1px solid var(--border);
  }
  .how-item:last-child { border-bottom: 1px solid var(--border); }
  .how-n {
    font-size: 0.85rem;
    color: var(--muted);
    letter-spacing: 0.05em;
    font-weight: 600;
  }
  .how-text h3 {
    font-family: 'Inter', sans-serif;
    font-weight: 700;
    text-transform: none;
    font-size: 1.4rem;
    margin: 0 0 10px;
  }
  .how-text p {
    color: var(--muted);
    max-width: 55ch;
    line-height: 1.7;
    margin: 0;
    font-size: 0.98rem;
  }

  /* FAQ */
  .faq {
    max-width: 1400px;
    margin: 0 auto;
    padding: 60px 32px 100px;
    display: grid;
    grid-template-columns: 1fr 1.4fr;
    gap: 40px;
  }
  .faq-head h2 {
    font-family: 'Inter', sans-serif;
    font-weight: 700;
    text-transform: none;
    font-size: clamp(1.6rem, 3.5vw, 2.4rem);
    line-height: 1.2;
  }
  .faq-list {
    display: flex;
    flex-direction: column;
  }
  .faq-item {
    all: unset;
    cursor: pointer;
    padding: 22px 0;
    border-top: 1px solid var(--border);
  }
  .faq-item:last-child { border-bottom: 1px solid var(--border); }
  .faq-q {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 600;
    font-size: 1.02rem;
    width: 100%;
  }
  .faq-icon {
    font-size: 1.4rem;
    color: var(--muted);
    flex-shrink: 0;
    margin-left: 16px;
  }
  .faq-a {
    margin: 14px 0 0;
    color: var(--muted);
    line-height: 1.7;
    font-size: 0.95rem;
    max-width: 60ch;
  }

  /* CTA */
  .cta {
    max-width: 1400px;
    margin: 0 auto;
    padding: 100px 32px;
    text-align: center;
    border-top: 1px solid var(--border);
  }
  .cta h2 {
    font-size: clamp(2rem, 8vw, 4.5rem);
    line-height: 1.05;
    margin-bottom: 40px;
  }
  .cta-input-row {
    display: flex;
    gap: 10px;
    max-width: 560px;
    margin: 0 auto;
  }
  .cta-input-row input {
    flex: 1;
    min-width: 0;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 0 22px;
    height: 56px;
    color: var(--text);
    font-size: 1rem;
    font-family: inherit;
  }
  .cta-input-row input::placeholder { color: var(--muted); }
  .cta-input-row input:focus { outline: none; border-color: rgba(255,255,255,0.4); }
  .cta-input-row button {
    background: var(--text);
    color: var(--bg);
    border: 0;
    border-radius: 999px;
    padding: 0 26px;
    height: 56px;
    font-weight: 700;
    font-size: 1rem;
    cursor: pointer;
    white-space: nowrap;
  }

  /* FOOTER */
  .footer {
    max-width: 1400px;
    margin: 0 auto;
    padding: 50px 32px 40px;
    border-top: 1px solid var(--border);
  }
  .footer-nav {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 40px;
    margin-bottom: 50px;
  }
  .footer-title {
    display: block;
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--muted);
    margin-bottom: 14px;
  }
  .footer-col a {
    display: block;
    color: var(--muted);
    font-size: 0.95rem;
    margin-bottom: 10px;
  }
  .footer-col a:hover { color: var(--text); }
  .footer-col p {
    color: var(--muted);
    font-size: 0.92rem;
    line-height: 1.6;
    margin: 0;
  }
  .footer-bottom {
    display: flex;
    justify-content: space-between;
    font-size: 0.82rem;
    color: var(--muted);
    padding-top: 24px;
    border-top: 1px solid var(--border);
  }

  /* ===== RESPONSIVE ===== */
  @media (max-width: 900px) {
    .types-grid { grid-template-columns: 1fr; }
    .faq { grid-template-columns: 1fr; }
  }

  @media (max-width: 640px) {
    .nav { padding: 16px 20px; }
    .nav-links { display: none; }

    .hero { padding: 40px 20px 60px; }
    .hero-input-row { flex-direction: column; }
    .hero-input-row button { width: 100%; }
    .hero-stat { flex-direction: column; gap: 14px; padding-top: 28px; }

    .platforms { padding: 28px 20px; }
    .impact { padding: 60px 20px; }
    .impact h2 { line-height: 1; }

    .types { padding: 30px 20px 60px; }
    .type-card { grid-template-columns: 1fr; }
    .type-visual { min-height: 90px; }

    .how { padding: 40px 20px 60px; }
    .how-item { grid-template-columns: 1fr; gap: 10px; }

    .faq { padding: 40px 20px 60px; gap: 24px; }

    .cta { padding: 60px 20px; }
    .cta-input-row { flex-direction: column; }
    .cta-input-row button { width: 100%; }

    .footer { padding: 40px 20px 30px; }
    .footer-nav { grid-template-columns: 1fr; gap: 30px; }
    .footer-bottom { flex-direction: column; gap: 8px; }
  }
</style>