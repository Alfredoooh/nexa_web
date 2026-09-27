/* ============================================================
   Looply API — Cloudflare Worker
   ============================================================ */

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }
    const url = new URL(request.url);
    try {
      const response = await route(request, url, env, ctx);
      Object.entries(CORS_HEADERS).forEach(([k, v]) => response.headers.set(k, v));
      return response;
    } catch (err) {
      return json({ error: 'internal_error', message: String(err && err.message || err) }, 500);
    }
  }
};

async function route(request, url, env, ctx) {
  const path = url.pathname;
  const method = request.method;

  if (path === '/thumb' && method === 'GET') return handleThumb(request, url, env, ctx);

  const klipyMatch = path.match(/^\/klipy\/([^/]+)$/);
  if (klipyMatch && method === 'GET') return handleKlipyProxy(request, url, env, ctx, klipyMatch[1]);

  if (path === '/auth/register' && method === 'POST') return handleRegister(request, env);
  if (path === '/auth/login' && method === 'POST') return handleLogin(request, env);
  if (path === '/auth/logout' && method === 'POST') return handleLogout(request, env);
  if (path === '/auth/logout-all' && method === 'POST') return handleLogoutAll(request, env);
  if (path === '/me' && method === 'GET') return handleMe(request, env);

  const userMatch = path.match(/^\/users\/([^/]+)$/);
  if (userMatch && method === 'GET') return handleGetUserProfile(request, env, userMatch[1]);

  const followMatch = path.match(/^\/users\/([^/]+)\/follow$/);
  if (followMatch && method === 'POST') return handleFollow(request, env, followMatch[1], true);

  const unfollowMatch = path.match(/^\/users\/([^/]+)\/unfollow$/);
  if (unfollowMatch && method === 'POST') return handleFollow(request, env, unfollowMatch[1], false);

  const followersMatch = path.match(/^\/users\/([^/]+)\/followers$/);
  if (followersMatch && method === 'GET') return handleListFollows(request, env, followersMatch[1], 'followers');

  const followingMatch = path.match(/^\/users\/([^/]+)\/following$/);
  if (followingMatch && method === 'GET') return handleListFollows(request, env, followingMatch[1], 'following');

  const userPostsMatch = path.match(/^\/users\/([^/]+)\/posts$/);
  if (userPostsMatch && method === 'GET') return handleUserPosts(request, env, userPostsMatch[1]);

  if (path === '/posts' && method === 'POST') return handleCreatePost(request, env);
  if (path === '/posts/feed' && method === 'GET') return handleFeed(request, env, url);

  const likeMatch = path.match(/^\/posts\/([^/]+)\/like$/);
  if (likeMatch && method === 'POST') return handleLike(request, env, likeMatch[1], true);

  const unlikeMatch = path.match(/^\/posts\/([^/]+)\/unlike$/);
  if (unlikeMatch && method === 'POST') return handleLike(request, env, unlikeMatch[1], false);

  return json({ error: 'not_found' }, 404);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
function uuid() { return crypto.randomUUID(); }
function now() { return Date.now(); }

async function hashPassword(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  return bufferToHex(bits);
}
function bufferToHex(buf) { return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join(''); }
function randomSalt() { return bufferToHex(crypto.getRandomValues(new Uint8Array(16)).buffer); }
async function makeSessionToken() { return bufferToHex(crypto.getRandomValues(new Uint8Array(32)).buffer); }

function isValidEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
function isValidE164Phone(v) { return /^\+[1-9]\d{7,14}$/.test(v); }
function isValidUsername(v) { return /^[a-zA-Z0-9_.]{3,20}$/.test(v); }

async function getAuthedUser(request, env) {
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const row = await env.DB.prepare(
    `SELECT s.user_id, s.expires_at, s.revoked_at, u.* 
     FROM sessions s JOIN users u ON u.id = s.user_id 
     WHERE s.token = ?`
  ).bind(token).first();
  if (!row) return null;
  if (row.revoked_at) return null;
  if (row.expires_at < now()) return null;
  delete row.password_hash;
  return row;
}
function publicUser(row) {
  if (!row) return null;
  const { password_hash, ...rest } = row;
  return rest;
}

async function handleRegister(request, env) {
  const body = await request.json().catch(() => ({}));
  const { identifierType, identifier, password, username, display_name } = body;

  if (!identifierType || !['email', 'phone'].includes(identifierType)) return json({ error: 'invalid_identifier_type' }, 400);
  if (identifierType === 'email' && !isValidEmail(identifier)) return json({ error: 'invalid_email' }, 400);
  if (identifierType === 'phone' && !isValidE164Phone(identifier)) return json({ error: 'invalid_phone' }, 400);
  if (!password || password.length < 8) return json({ error: 'weak_password' }, 400);
  if (!isValidUsername(username)) return json({ error: 'invalid_username' }, 400);

  const existingUsername = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first();
  if (existingUsername) return json({ error: 'username_taken' }, 409);

  const column = identifierType === 'email' ? 'email' : 'phone';
  const existingIdentifier = await env.DB.prepare(`SELECT id FROM users WHERE ${column} = ?`).bind(identifier).first();
  if (existingIdentifier) return json({ error: identifierType + '_taken' }, 409);

  const salt = randomSalt();
  const hash = await hashPassword(password, salt);
  const userId = uuid();
  const createdAt = now();

  await env.DB.prepare(
    `INSERT INTO users (id, username, email, phone, password_hash, display_name, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(userId, username,
    identifierType === 'email' ? identifier : null,
    identifierType === 'phone' ? identifier : null,
    salt + ':' + hash, display_name || username, createdAt
  ).run();

  const session = await createSession(env, userId, request.headers.get('User-Agent'));
  const userRow = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();
  return json({ token: session.token, user: publicUser(userRow) }, 201);
}

async function handleLogin(request, env) {
  const body = await request.json().catch(() => ({}));
  const { identifierType, identifier, password } = body;

  if (!identifierType || !['email', 'phone'].includes(identifierType)) return json({ error: 'invalid_identifier_type' }, 400);
  const column = identifierType === 'email' ? 'email' : 'phone';
  const userRow = await env.DB.prepare(`SELECT * FROM users WHERE ${column} = ?`).bind(identifier).first();
  if (!userRow) return json({ error: 'invalid_credentials' }, 401);

  const [salt, expectedHash] = String(userRow.password_hash).split(':');
  const gotHash = await hashPassword(password, salt);
  if (gotHash !== expectedHash) return json({ error: 'invalid_credentials' }, 401);

  const session = await createSession(env, userRow.id, request.headers.get('User-Agent'));
  return json({ token: session.token, user: publicUser(userRow) });
}

async function createSession(env, userId, userAgent) {
  const token = await makeSessionToken();
  const createdAt = now();
  const expiresAt = createdAt + SESSION_DURATION_MS;
  await env.DB.prepare(
    `INSERT INTO sessions (token, user_id, device_label, created_at, expires_at) VALUES (?, ?, ?, ?, ?)`
  ).bind(token, userId, (userAgent || '').slice(0, 120), createdAt, expiresAt).run();
  return { token, expiresAt };
}

async function handleLogout(request, env) {
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return json({ error: 'missing_token' }, 400);
  await env.DB.prepare('UPDATE sessions SET revoked_at = ? WHERE token = ?').bind(now(), token).run();
  return json({ ok: true });
}

async function handleLogoutAll(request, env) {
  const user = await getAuthedUser(request, env);
  if (!user) return json({ error: 'unauthorized' }, 401);
  await env.DB.prepare('UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL')
    .bind(now(), user.id).run();
  return json({ ok: true });
}

async function handleMe(request, env) {
  const user = await getAuthedUser(request, env);
  if (!user) return json({ error: 'unauthorized' }, 401);
  return json({ user: publicUser(user) });
}

async function handleGetUserProfile(request, env, username) {
  const row = await env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(username).first();
  if (!row) return json({ error: 'user_not_found' }, 404);

  let isFollowing = false;
  const authed = await getAuthedUser(request, env);
  if (authed && authed.id !== row.id) {
    const f = await env.DB.prepare('SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?')
      .bind(authed.id, row.id).first();
    isFollowing = !!f;
  }
  return json({ user: publicUser(row), is_following: isFollowing, is_self: authed ? authed.id === row.id : false });
}

async function handleFollow(request, env, targetUsername, wantFollow) {
  const user = await getAuthedUser(request, env);
  if (!user) return json({ error: 'unauthorized' }, 401);

  const target = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(targetUsername).first();
  if (!target) return json({ error: 'user_not_found' }, 404);
  if (target.id === user.id) return json({ error: 'cannot_follow_self' }, 400);

  if (wantFollow) {
    const already = await env.DB.prepare('SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?')
      .bind(user.id, target.id).first();
    if (already) return json({ ok: true, already: true });

    await env.DB.batch([
      env.DB.prepare('INSERT INTO follows (follower_id, following_id, created_at) VALUES (?, ?, ?)')
        .bind(user.id, target.id, now()),
      env.DB.prepare('UPDATE users SET following_count = following_count + 1 WHERE id = ?').bind(user.id),
      env.DB.prepare('UPDATE users SET followers_count = followers_count + 1 WHERE id = ?').bind(target.id),
    ]);
  } else {
    const existed = await env.DB.prepare('SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?')
      .bind(user.id, target.id).first();
    if (!existed) return json({ ok: true, already: false });

    await env.DB.batch([
      env.DB.prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?').bind(user.id, target.id),
      env.DB.prepare('UPDATE users SET following_count = MAX(0, following_count - 1) WHERE id = ?').bind(user.id),
      env.DB.prepare('UPDATE users SET followers_count = MAX(0, followers_count - 1) WHERE id = ?').bind(target.id),
    ]);
  }
  return json({ ok: true });
}

async function handleListFollows(request, env, username, kind) {
  const target = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first();
  if (!target) return json({ error: 'user_not_found' }, 404);

  const sql = kind === 'followers'
    ? `SELECT u.id, u.username, u.display_name, u.avatar_url 
       FROM follows f JOIN users u ON u.id = f.follower_id 
       WHERE f.following_id = ? ORDER BY f.created_at DESC LIMIT 100`
    : `SELECT u.id, u.username, u.display_name, u.avatar_url 
       FROM follows f JOIN users u ON u.id = f.following_id 
       WHERE f.follower_id = ? ORDER BY f.created_at DESC LIMIT 100`;

  const { results } = await env.DB.prepare(sql).bind(target.id).all();
  return json({ users: results });
}

async function handleCreatePost(request, env) {
  const user = await getAuthedUser(request, env);
  if (!user) return json({ error: 'unauthorized' }, 401);

  const body = await request.json().catch(() => ({}));
  const { type, media_url, title, description, tags } = body;

  if (!['gifs', 'stickers', 'memes', 'clips'].includes(type)) return json({ error: 'invalid_type' }, 400);
  if (!media_url) return json({ error: 'missing_media_url' }, 400);
  if (!title || !title.trim()) return json({ error: 'missing_title' }, 400);

  const postId = uuid();
  const createdAt = now();

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO posts (id, user_id, type, media_url, title, description, tags, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(postId, user.id, type, media_url, title.trim(), description || '', JSON.stringify(tags || []), createdAt),
    env.DB.prepare('UPDATE users SET posts_count = posts_count + 1 WHERE id = ?').bind(user.id),
  ]);

  return json({ post: { id: postId, user_id: user.id, type, media_url, title, description, tags: tags || [], likes_count: 0, created_at: createdAt } }, 201);
}

async function handleFeed(request, env, url) {
  const cursor = url.searchParams.get('before');
  const limit = Math.min(40, parseInt(url.searchParams.get('limit') || '20', 10));

  const sql = cursor
    ? `SELECT p.*, u.username, u.display_name, u.avatar_url 
       FROM posts p JOIN users u ON u.id = p.user_id 
       WHERE p.created_at < ? ORDER BY p.created_at DESC LIMIT ?`
    : `SELECT p.*, u.username, u.display_name, u.avatar_url 
       FROM posts p JOIN users u ON u.id = p.user_id 
       ORDER BY p.created_at DESC LIMIT ?`;

  const stmt = cursor ? env.DB.prepare(sql).bind(parseInt(cursor, 10), limit) : env.DB.prepare(sql).bind(limit);
  const { results } = await stmt.all();
  const posts = results.map(r => ({ ...r, tags: JSON.parse(r.tags || '[]') }));
  return json({ posts, next_cursor: posts.length ? posts[posts.length - 1].created_at : null });
}

async function handleUserPosts(request, env, username) {
  const target = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first();
  if (!target) return json({ error: 'user_not_found' }, 404);

  const { results } = await env.DB.prepare(
    'SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC LIMIT 60'
  ).bind(target.id).all();
  const posts = results.map(r => ({ ...r, tags: JSON.parse(r.tags || '[]') }));
  return json({ posts });
}

async function handleLike(request, env, postId, wantLike) {
  const user = await getAuthedUser(request, env);
  if (!user) return json({ error: 'unauthorized' }, 401);

  const post = await env.DB.prepare('SELECT id FROM posts WHERE id = ?').bind(postId).first();
  if (!post) return json({ error: 'post_not_found' }, 404);

  if (wantLike) {
    const already = await env.DB.prepare('SELECT 1 FROM likes WHERE user_id = ? AND post_id = ?')
      .bind(user.id, postId).first();
    if (already) return json({ ok: true, already: true });

    await env.DB.batch([
      env.DB.prepare('INSERT INTO likes (user_id, post_id, created_at) VALUES (?, ?, ?)').bind(user.id, postId, now()),
      env.DB.prepare('UPDATE posts SET likes_count = likes_count + 1 WHERE id = ?').bind(postId),
    ]);
  } else {
    await env.DB.batch([
      env.DB.prepare('DELETE FROM likes WHERE user_id = ? AND post_id = ?').bind(user.id, postId),
      env.DB.prepare('UPDATE posts SET likes_count = MAX(0, likes_count - 1) WHERE id = ?').bind(postId),
    ]);
  }
  return json({ ok: true });
}

/* ============================================================
   PROXY KLIPY — endpoints corretos conforme docs oficiais
     GIFs     → /gifs/search e /gifs/trending
     Stickers → /stickers/search e /stickers/trending
     Memes    → /static-memes/search e /static-memes/trending
     Clips    → /clips/search e /clips/trending
   ============================================================ */
const KLIPY_ENDPOINTS = {
  gifs: 'gifs',
  stickers: 'stickers',
  memes: 'static-memes',
  clips: 'clips'
};

async function handleKlipyProxy(request, url, env, ctx, category) {
  const endpoint = KLIPY_ENDPOINTS[category];
  if (!endpoint) return json({ error: 'invalid_category' }, 400);
  if (!env.KLIPY_API_KEY) return json({ error: 'klipy_not_configured' }, 500);

  const q = url.searchParams.get('q') || '';
  const page = url.searchParams.get('page') || '1';

  const cache = caches.default;
  const cacheKey = new Request(url.toString(), { method: 'GET' });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const action = q ? 'search' : 'trending';
  let klipyUrl = `https://api.klipy.com/api/v1/${env.KLIPY_API_KEY}/${endpoint}/${action}`
    + `?page=${encodeURIComponent(page)}&per_page=24`;
  if (q) klipyUrl += `&q=${encodeURIComponent(q)}`;

  let resp;
  try {
    resp = await fetch(klipyUrl, { headers: { 'Accept': 'application/json' } });
  } catch (e) {
    return json({ error: 'klipy_unreachable' }, 502);
  }
  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    return json({ error: 'klipy_error', status: resp.status, detail: errText.slice(0, 200) }, 502);
  }

  const data = await resp.json();

  const response = new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=180',
    },
  });
  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

/* ============================================================
   PROXY THUMBNAIL
   ============================================================ */
async function handleThumb(request, url, env, ctx) {
  const gifUrl = url.searchParams.get('url');
  if (!gifUrl) return placeholderSvg('sem url');

  const cache = caches.default;
  const cacheKey = new Request(url.toString(), { method: 'GET' });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  let sourceResp;
  try {
    sourceResp = await fetch(gifUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LooplyBot/1.0)',
        'Accept': 'image/*,video/*,*/*;q=0.8',
      },
      cf: { cacheEverything: true, cacheTtl: 86400 },
    });
    if (!sourceResp.ok) throw new Error('status_' + sourceResp.status);
  } catch (e) {
    return placeholderSvg('media indisponível');
  }

  const ct = (sourceResp.headers.get('Content-Type') || '').toLowerCase();
  const finalUrl = (sourceResp.url || gifUrl).toLowerCase();
  const buf = await sourceResp.arrayBuffer();

  const isGif   = ct.includes('gif')  || finalUrl.endsWith('.gif');
  const isWebp  = ct.includes('webp') || finalUrl.endsWith('.webp');
  const isPng   = ct.includes('png')  || finalUrl.endsWith('.png');
  const isJpeg  = ct.includes('jpeg') || ct.includes('jpg') || finalUrl.endsWith('.jpg') || finalUrl.endsWith('.jpeg');
  const isVideo = ct.startsWith('video/') || finalUrl.endsWith('.mp4') || finalUrl.endsWith('.webm') || finalUrl.endsWith('.mov');

  if (isVideo) {
    const ph = placeholderSvg('vídeo');
    ctx.waitUntil(cache.put(cacheKey, ph.clone()));
    return ph;
  }

  if (isWebp || isPng || isJpeg) {
    const resp = new Response(buf, {
      headers: { 'Content-Type': ct || 'image/webp', 'Cache-Control': 'public, max-age=2592000' },
    });
    ctx.waitUntil(cache.put(cacheKey, resp.clone()));
    return resp;
  }

  if (isGif) {
    let pngBuffer = null;
    try { pngBuffer = decodeFirstGifFrameToPng(new Uint8Array(buf)); } catch (e) { pngBuffer = null; }
    if (pngBuffer) {
      const resp = new Response(pngBuffer, {
        headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=2592000' },
      });
      ctx.waitUntil(cache.put(cacheKey, resp.clone()));
      return resp;
    }
    const resp = new Response(buf, {
      headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'public, max-age=2592000' },
    });
    ctx.waitUntil(cache.put(cacheKey, resp.clone()));
    return resp;
  }

  if (ct.startsWith('image/')) {
    const resp = new Response(buf, {
      headers: { 'Content-Type': ct, 'Cache-Control': 'public, max-age=2592000' },
    });
    ctx.waitUntil(cache.put(cacheKey, resp.clone()));
    return resp;
  }

  return placeholderSvg('formato desconhecido');
}

function placeholderSvg(label) {
  const safe = String(label).replace(/[<>&"]/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1f1f1f"/><stop offset="1" stop-color="#2a2a2a"/></linearGradient></defs>
  <rect width="200" height="200" fill="url(#g)"/>
  <circle cx="100" cy="88" r="22" fill="none" stroke="#555" stroke-width="3"/>
  <path d="M94 82 L94 96 M106 82 L106 96" stroke="#555" stroke-width="3" stroke-linecap="round"/>
  <text x="100" y="140" text-anchor="middle" font-family="-apple-system,sans-serif" font-size="11" fill="#666">${safe}</text>
</svg>`;
  return new Response(svg, {
    headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=300' },
  });
}

function decodeFirstGifFrameToPng(bytes) {
  let p = 0;
  function u8() { return bytes[p++]; }
  function u16() { const v = bytes[p] | (bytes[p + 1] << 8); p += 2; return v; }
  if (String.fromCharCode(bytes[0], bytes[1], bytes[2]) !== 'GIF') return null;
  p = 6;
  const width = u16(), height = u16();
  const packed = u8(); p++; p++;
  const gctFlag = (packed & 0x80) !== 0, gctSize = 2 << (packed & 0x07);
  let gct = null;
  if (gctFlag) { gct = []; for (let i = 0; i < gctSize; i++) gct.push([u8(), u8(), u8()]); }
  let localCt = gct, transparentIndex = -1;

  while (p < bytes.length) {
    const block = u8();
    if (block === 0x21) {
      const label = u8();
      if (label === 0xF9) { u8(); const flags = u8(); p += 2; const ti = u8(); if (flags & 1) transparentIndex = ti; p++; }
      else { let sz; while ((sz = u8()) !== 0) p += sz; }
    } else if (block === 0x2C) {
      const ix = u16(), iy = u16(), iw = u16(), ih = u16();
      const ipacked = u8();
      const lctFlag = (ipacked & 0x80) !== 0, interlace = (ipacked & 0x40) !== 0, lctSize = 2 << (ipacked & 0x07);
      if (lctFlag) { localCt = []; for (let j = 0; j < lctSize; j++) localCt.push([u8(), u8(), u8()]); }
      const minCodeSize = u8();
      const dataBytes = [];
      let sz2;
      while ((sz2 = u8()) !== 0) for (let k = 0; k < sz2; k++) dataBytes.push(u8());

      const indices = lzwDecode(dataBytes, minCodeSize, iw * ih);
      const rgba = new Uint8ClampedArray(width * height * 4);
      const table = localCt || gct || [];
      let rowOrder = [];
      if (interlace) {
        [[0, 8], [4, 8], [2, 4], [1, 2]].forEach(([start, step]) => {
          for (let r = start; r < ih; r += step) rowOrder.push(r);
        });
      } else {
        for (let r = 0; r < ih; r++) rowOrder.push(r);
      }
      for (let rIdx = 0; rIdx < ih; rIdx++) {
        const realRow = rowOrder[rIdx];
        for (let col = 0; col < iw; col++) {
          const colorIndex = indices[rIdx * iw + col];
          if (colorIndex === undefined || colorIndex === transparentIndex) continue;
          const color = table[colorIndex]; if (!color) continue;
          const destX = ix + col, destY = iy + realRow;
          if (destX >= width || destY >= height) continue;
          const di = (destY * width + destX) * 4;
          rgba[di] = color[0]; rgba[di + 1] = color[1]; rgba[di + 2] = color[2]; rgba[di + 3] = 255;
        }
      }
      return encodePng(width, height, rgba);
    } else if (block === 0x3B) break;
    else break;
  }
  return null;
}

function lzwDecode(data, minCodeSize, pixelCount) {
  const clearCode = 1 << minCodeSize, eoiCode = clearCode + 1;
  let codeSize = minCodeSize + 1, nextCode = eoiCode + 1;
  let dict = [];
  function resetDict() {
    dict = []; for (let i = 0; i < clearCode; i++) dict[i] = [i];
    dict[clearCode] = []; dict[eoiCode] = [];
    codeSize = minCodeSize + 1; nextCode = eoiCode + 1;
  }
  resetDict();
  let out = [], bitBuf = 0, bitCount = 0, bytePos = 0, prev = null;
  function readCode() {
    while (bitCount < codeSize && bytePos < data.length) { bitBuf |= data[bytePos++] << bitCount; bitCount += 8; }
    const code = bitBuf & ((1 << codeSize) - 1);
    bitBuf >>= codeSize; bitCount -= codeSize;
    return code;
  }
  while (out.length < pixelCount && bytePos <= data.length) {
    const code = readCode();
    if (code === clearCode) { resetDict(); prev = null; continue; }
    if (code === eoiCode) break;
    let entry;
    if (dict[code]) entry = dict[code];
    else if (code === nextCode && prev) entry = prev.concat([prev[0]]);
    else break;
    out = out.concat(entry);
    if (prev) { dict[nextCode++] = prev.concat([entry[0]]); if (nextCode === (1 << codeSize) && codeSize < 12) codeSize++; }
    prev = entry;
  }
  return out;
}

function encodePng(width, height, rgba) {
  const crc32Table = makeCrc32Table();
  function crc32(buf) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) c = crc32Table[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  function makeCrc32Table() {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  }
  function chunk(type, data) {
    const typeBytes = new TextEncoder().encode(type);
    const len = data.length;
    const out = new Uint8Array(4 + 4 + len + 4);
    const dv = new DataView(out.buffer);
    dv.setUint32(0, len);
    out.set(typeBytes, 4);
    out.set(data, 8);
    const crcInput = new Uint8Array(4 + len);
    crcInput.set(typeBytes, 0); crcInput.set(data, 4);
    dv.setUint32(8 + len, crc32(crcInput));
    return out;
  }
  function adler32(buf) {
    let a = 1, b = 0;
    for (let i = 0; i < buf.length; i++) { a = (a + buf[i]) % 65521; b = (b + a) % 65521; }
    return ((b << 16) | a) >>> 0;
  }
  function deflateStore(raw) {
    const blocks = [];
    let offset = 0;
    const MAX = 65535;
    while (offset < raw.length || raw.length === 0) {
      const remaining = raw.length - offset;
      const size = Math.min(MAX, remaining);
      const final = (offset + size >= raw.length) ? 1 : 0;
      const header = new Uint8Array(5);
      header[0] = final;
      header[1] = size & 0xFF; header[2] = (size >> 8) & 0xFF;
      header[3] = (~size) & 0xFF; header[4] = ((~size) >> 8) & 0xFF;
      blocks.push(header, raw.subarray(offset, offset + size));
      offset += size;
      if (raw.length === 0) break;
    }
    const zlibHeader = new Uint8Array([0x78, 0x01]);
    const adler = adler32(raw);
    const adlerBytes = new Uint8Array([(adler >>> 24) & 0xFF, (adler >>> 16) & 0xFF, (adler >>> 8) & 0xFF, adler & 0xFF]);
    const total = [zlibHeader, ...blocks, adlerBytes];
    const totalLen = total.reduce((s, a) => s + a.length, 0);
    const out = new Uint8Array(totalLen);
    let o = 0; total.forEach(a => { out.set(a, o); o += a.length; });
    return out;
  }

  const stride = width * 4;
  const raw = new Uint8Array((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    raw.set(rgba.subarray(y * stride, y * stride + stride), y * (stride + 1) + 1);
  }
  const idatData = deflateStore(raw);

  const sig = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, width); dv.setUint32(4, height);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const ihdrChunk = chunk('IHDR', ihdr);
  const idatChunk = chunk('IDAT', idatData);
  const iendChunk = chunk('IEND', new Uint8Array(0));

  const total = sig.length + ihdrChunk.length + idatChunk.length + iendChunk.length;
  const out = new Uint8Array(total);
  let o = 0;
  [sig, ihdrChunk, idatChunk, iendChunk].forEach(part => { out.set(part, o); o += part.length; });
  return out;
}