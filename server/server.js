const express = require('express');

const app = express();
const PORT = Number(process.env.PORT || 3000);

const GDELT_URL = 'https://api.gdeltproject.org/api/v2/doc/doc';
const DEFAULT_TIMESPAN = process.env.GDELT_TIMESPAN || '15min';
const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS || 12 * 60 * 1000);
const MAX_RECORDS = Math.min(Number(process.env.GDELT_MAX_RECORDS || 250), 250);
const FETCH_TIMEOUT_MS = Number(process.env.GDELT_TIMEOUT_MS || 15000);

const CATEGORY_QUERIES = {
  geral: '(Angola OR Luanda OR angolano OR angolana) sourcecountry:angola',
  politica: '(Angola OR Luanda OR governo OR parlamento OR presidente) sourcecountry:angola',
  economia: '(Angola OR Luanda OR economia OR kwanza OR petróleo OR banco OR inflação OR investimento) sourcecountry:angola',
  desporto: '(Angola OR Luanda OR futebol OR basquetebol OR esporte OR desporto) sourcecountry:angola',
  tecnologia: '(Angola OR Luanda OR tecnologia OR internet OR software OR digital OR inteligência artificial) sourcecountry:angola',
  sociedade: '(Angola OR Luanda OR sociedade OR educação OR saúde OR emprego OR segurança) sourcecountry:angola',
  entretenimento: '(Angola OR Luanda OR música OR artista OR cinema OR televisão OR cultura) sourcecountry:angola'
};

const cache = new Map();
let refreshInProgress = new Map();

app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

function normalizeLimit(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 50;
  return Math.max(1, Math.min(parsed, MAX_RECORDS));
}

function normalizeTimespan(value) {
  const raw = String(value || DEFAULT_TIMESPAN).trim().toLowerCase();

  if (/^\d+(min|h|d|w|m)$/.test(raw)) {
    return raw;
  }

  return DEFAULT_TIMESPAN;
}

function normalizeCategory(value) {
  const category = String(value || 'geral').trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(CATEGORY_QUERIES, category)
    ? category
    : 'geral';
}

function stripHtml(value) {
  if (!value) return null;

  return String(value)
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function normalizeDate(value) {
  if (!value) return null;

  const text = String(value).trim();

  if (/^\d{8}T\d{6}Z$/.test(text)) {
    const year = text.slice(0, 4);
    const month = text.slice(4, 6);
    const day = text.slice(6, 8);
    const hour = text.slice(9, 11);
    const minute = text.slice(11, 13);
    const second = text.slice(13, 15);

    return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
  }

  const timestamp = Date.parse(text);
  return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString();
}

function normalizeArticle(article, index) {
  return {
    id: `${article.domain || 'source'}-${article.seendate || index}-${index}`,
    title: stripHtml(article.title) || 'Sem título',
    url: article.url || null,
    mobileUrl: article.mobileurl || null,
    source: article.domain || null,
    sourceCountry: article.sourcecountry || null,
    language: article.language || null,
    publishedAt: normalizeDate(article.seendate),
    image: article.socialimage || null
  };
}

function buildQuery(category, customQuery) {
  if (customQuery && customQuery.trim()) {
    return customQuery.trim();
  }

  return CATEGORY_QUERIES[category];
}

async function fetchGdelt(query, timespan, limit) {
  const params = new URLSearchParams({
    query,
    mode: 'artlist',
    format: 'json',
    timespan,
    maxrecords: String(limit),
    sort: 'datedesc'
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(`${GDELT_URL}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'AngolaNewsAPI/1.0'
      },
      signal: controller.signal
    });

    const text = await response.text();

    if (!response.ok) {
      throw new Error(`GDELT respondeu HTTP ${response.status}: ${text.slice(0, 300)}`);
    }

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`GDELT não retornou JSON válido: ${text.slice(0, 300)}`);
    }

    if (!Array.isArray(data.articles)) {
      throw new Error('Resposta do GDELT sem o campo articles.');
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}

async function getNews({ category, timespan, limit, query }) {
  const cacheKey = JSON.stringify({ category, timespan, limit, query: query || null });
  const now = Date.now();
  const cached = cache.get(cacheKey);

  if (cached && now - cached.cachedAt < CACHE_TTL_MS) {
    return {
      ...cached.payload,
      cached: true,
      cacheAgeMs: now - cached.cachedAt
    };
  }

  if (refreshInProgress.has(cacheKey)) {
    return refreshInProgress.get(cacheKey);
  }

  const operation = (async () => {
    const gdelt = await fetchGdelt(buildQuery(category, query), timespan, limit);
    const articles = gdelt.articles.map(normalizeArticle);

    const payload = {
      success: true,
      source: 'GDELT DOC 2.0',
      category,
      timespan,
      count: articles.length,
      fetchedAt: new Date().toISOString(),
      cached: false,
      articles
    };

    cache.set(cacheKey, {
      cachedAt: Date.now(),
      payload
    });

    return payload;
  })();

  refreshInProgress.set(cacheKey, operation);

  try {
    return await operation;
  } finally {
    refreshInProgress.delete(cacheKey);
  }
}

app.get('/', (req, res) => {
  res.json({
    name: 'Angola News API',
    status: 'online',
    provider: 'GDELT DOC 2.0',
    endpoints: {
      health: '/health',
      news: '/api/news?category=geral&limit=50&timespan=15min',
      categories: '/api/categories'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    uptimeSeconds: Math.floor(process.uptime()),
    cacheEntries: cache.size,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/categories', (req, res) => {
  res.json({
    success: true,
    categories: Object.keys(CATEGORY_QUERIES)
  });
});

app.get('/api/news', async (req, res) => {
  try {
    const category = normalizeCategory(req.query.category);
    const timespan = normalizeTimespan(req.query.timespan);
    const limit = normalizeLimit(req.query.limit);
    const customQuery = typeof req.query.query === 'string' ? req.query.query : '';

    const result = await getNews({
      category,
      timespan,
      limit,
      query: customQuery
    });

    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json(result);
  } catch (error) {
    console.error('Erro /api/news:', error);

    res.status(502).json({
      success: false,
      error: 'Não foi possível obter notícias do GDELT.',
      details: process.env.NODE_ENV === 'production' ? undefined : error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint não encontrado.'
  });
});

app.listen(PORT, () => {
  console.log(`Angola News API rodando na porta ${PORT}`);
  console.log(`GDELT timespan padrão: ${DEFAULT_TIMESPAN}`);
  console.log(`Cache TTL: ${CACHE_TTL_MS} ms`);
});

// O Free Web Service pode permanecer ativo por algum tempo.
// Enquanto estiver acordado, tentamos atualizar a categoria geral a cada 15 minutos.
const REFRESH_INTERVAL_MS = 15 * 60 * 1000;

setInterval(async () => {
  try {
    await getNews({
      category: 'geral',
      timespan: DEFAULT_TIMESPAN,
      limit: MAX_RECORDS,
      query: ''
    });
    console.log('Cache GDELT atualizado automaticamente.');
  } catch (error) {
    console.error('Atualização automática falhou:', error.message);
  }
}, REFRESH_INTERVAL_MS).unref();
