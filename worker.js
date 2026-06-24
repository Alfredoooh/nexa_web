const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_BASE  = "https://generativelanguage.googleapis.com/v1beta/models";
const GROQ_BASE    = "https://api.groq.com/openai/v1";
const GOPAY_BASE   = "https://rouxavcvorjiwhpjhsye.supabase.co/functions/v1/api-v1";

const FREE_CREDITS = 100;
const CREDIT_PACKAGES = {
  basic:   { credits: 500,  price: 2500, name: "Básico",  productId: "SUBSTITUI_PELO_ID_BASICO"  },
  premium: { credits: 1500, price: 7500, name: "Premium", productId: "db3b0e10-d3da-439b-9c0c-06c112ba524b" },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: Object.assign({}, CORS_HEADERS, { "Content-Type": "application/json" }),
  });
}

function error(msg, status = 400) {
  return json({ error: msg }, status);
}

async function hashPassword(password) {
  const enc  = new TextEncoder().encode(password);
  const hash = await crypto.subtle.digest("SHA-256", enc);
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

async function generateToken(payload, secret) {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body   = btoa(JSON.stringify(Object.assign({}, payload, {
    iat: Date.now(),
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
  })));
  const msg = header + "." + body;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig    = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  return msg + "." + sigB64;
}

async function verifyToken(token, secret) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const msg = parts[0] + "." + parts[1];
    const key = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
    );
    const sigBytes = Uint8Array.from(
      atob(parts[2].replace(/-/g, "+").replace(/_/g, "/")),
      function(c) { return c.charCodeAt(0); }
    );
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(msg));
    if (!valid) return null;
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch (e) { return null; }
}

async function getAuthUser(request, env) {
  const auth = request.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  return verifyToken(auth.slice(7), env.JWT_SECRET);
}

async function verifyFirebaseToken(idToken, projectId) {
  try {
    const parts = idToken.split(".");
    if (parts.length !== 3) return null;
    const header  = JSON.parse(atob(parts[0].replace(/-/g, "+").replace(/_/g, "/")));
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now)            return null;
    if (payload.iat > now + 300)      return null;
    if (payload.aud !== projectId)    return null;
    if (payload.iss !== "https://securetoken.google.com/" + projectId) return null;
    if (!payload.sub || payload.sub.length === 0) return null;
    const publicKeys = await fetch("https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com").then(r => r.json());
    const certPem    = publicKeys[header.kid];
    if (!certPem) return null;
    const certCleaned = certPem
      .replace(/-----BEGIN CERTIFICATE-----/, "")
      .replace(/-----END CERTIFICATE-----/, "")
      .replace(/\n/g, "").trim();
    const certDer = Uint8Array.from(atob(certCleaned), function(c) { return c.charCodeAt(0); });
    const spkiKey = extractSpkiFromCert(certDer);
    if (!spkiKey) return null;
    const cryptoKey = await crypto.subtle.importKey(
      "spki", spkiKey,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false, ["verify"]
    );
    const signingInput = parts[0] + "." + parts[1];
    const sigBytes     = Uint8Array.from(
      atob(parts[2].replace(/-/g, "+").replace(/_/g, "/")),
      function(c) { return c.charCodeAt(0); }
    );
    const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", cryptoKey, sigBytes, new TextEncoder().encode(signingInput));
    if (!valid) return null;
    return {
      uid:      payload.sub,
      email:    payload.email   || null,
      name:     payload.name    || null,
      picture:  payload.picture || null,
      provider: (payload.firebase && payload.firebase.sign_in_provider) || "unknown",
    };
  } catch (e) {
    console.error("[FIREBASE VERIFY ERROR]", e.message);
    return null;
  }
}

function extractSpkiFromCert(certDer) {
  try {
    function readLength(buf, off) {
      if (buf[off] < 0x80) return { len: buf[off], next: off + 1 };
      const numBytes = buf[off] & 0x7f;
      let len = 0;
      for (let i = 0; i < numBytes; i++) { len = (len << 8) | buf[off + 1 + i]; }
      return { len: len, next: off + 1 + numBytes };
    }
    function skipTag(buf, off) {
      off++;
      const r = readLength(buf, off);
      return r.next + r.len;
    }
    function enterSequence(buf, off) {
      if (buf[off] !== 0x30) return null;
      off++;
      const r = readLength(buf, off);
      return r.next;
    }
    let pos = enterSequence(certDer, 0);
    if (pos === null) return null;
    pos = enterSequence(certDer, pos);
    if (pos === null) return null;
    if (certDer[pos] === 0xa0) { pos = skipTag(certDer, pos); }
    pos = skipTag(certDer, pos);
    pos = skipTag(certDer, pos);
    pos = skipTag(certDer, pos);
    pos = skipTag(certDer, pos);
    pos = skipTag(certDer, pos);
    if (certDer[pos] !== 0x30) return null;
    const spkiStart = pos;
    pos++;
    const r       = readLength(certDer, pos);
    const spkiEnd = r.next + r.len;
    return certDer.slice(spkiStart, spkiEnd).buffer;
  } catch (e) {
    console.error("[SPKI EXTRACT ERROR]", e.message);
    return null;
  }
}

function buildGeminiContents(messages) {
  return messages
    .filter(function(m) { return m.role !== "system"; })
    .map(function(m) {
      return {
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      };
    });
}

function buildSystemInstruction(language, customSystemPrompt) {
  if (customSystemPrompt && customSystemPrompt.trim().length > 0) return customSystemPrompt;
  return language === "en"
    ? "You are Nexa, a helpful AI assistant. Always respond in English. Be concise and direct. When the user asks for a table, use markdown table format. When providing code, always wrap it in fenced code blocks with the language identifier."
    : "Es Nexa, um assistente de IA util. Responde sempre em portugues. Se conciso e direto. Quando o utilizador pedir uma tabela, usa formato de tabela markdown. Quando deres codigo, coloca-o sempre em blocos com o identificador de linguagem.";
}

async function geminiGenerate(apiKey, messages, language, stream, thinkingBudget, customSystemPrompt) {
  const systemText = buildSystemInstruction(language, customSystemPrompt);
  const contents   = buildGeminiContents(messages);
  const generationConfig = { maxOutputTokens: 16384, temperature: 1, topP: 0.95 };
  const thinkingConfig = thinkingBudget > 0
    ? { thinkingConfig: { thinkingBudget: thinkingBudget } }
    : { thinkingConfig: { thinkingBudget: 0 } };
  const bodyObj = {
    system_instruction: { parts: [{ text: systemText }] },
    contents: contents,
    generationConfig: Object.assign({}, generationConfig, thinkingConfig),
  };
  const endpoint = stream
    ? GEMINI_BASE + "/" + GEMINI_MODEL + ":streamGenerateContent?alt=sse&key=" + apiKey
    : GEMINI_BASE + "/" + GEMINI_MODEL + ":generateContent?key=" + apiKey;
  return fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bodyObj),
  });
}

async function geminiGenerateTitle(apiKey, message, language) {
  const prompt = language === "en"
    ? "Generate a short title (max 5 words) for a conversation that starts with: \"" + message + "\". Reply with ONLY the title, no punctuation, no quotes."
    : "Gera um titulo curto (max 5 palavras) para uma conversa que comeca com: \"" + message + "\". Responde APENAS com o titulo, sem pontuacao, sem aspas.";
  const res = await fetch(GEMINI_BASE + "/gemini-2.0-flash-lite:generateContent?key=" + apiKey, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 20, temperature: 0.5 },
    }),
  });
  if (!res.ok) return "Nova conversa";
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "Nova conversa";
  return text.trim().slice(0, 40);
}

async function groqChat(apiKey, messages, model, systemPrompt, language) {
  const sysContent = systemPrompt && systemPrompt.trim().length > 0
    ? systemPrompt
    : buildSystemInstruction(language || "pt", "");
  const allMessages = [
    { role: "system", content: sysContent },
    ...messages.filter(function(m) { return m.role !== "system"; }),
  ];
  return fetch(GROQ_BASE + "/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + apiKey },
    body: JSON.stringify({
      model: model || "llama-3.3-70b-versatile",
      messages: allMessages,
      max_tokens: 8192,
      temperature: 0.7,
      stream: false,
    }),
  });
}

async function groqChatStream(apiKey, messages, model, systemPrompt, language) {
  const sysContent = systemPrompt && systemPrompt.trim().length > 0
    ? systemPrompt
    : buildSystemInstruction(language || "pt", "");
  const allMessages = [
    { role: "system", content: sysContent },
    ...messages.filter(function(m) { return m.role !== "system"; }),
  ];
  return fetch(GROQ_BASE + "/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + apiKey },
    body: JSON.stringify({
      model: model || "llama-3.3-70b-versatile",
      messages: allMessages,
      max_tokens: 8192,
      temperature: 0.7,
      stream: true,
    }),
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
    const url  = new URL(request.url);
    const path = url.pathname;

    if (path === "/auth/register"                        && request.method === "POST")   return handleRegister(request, env);
    if (path === "/auth/login"                           && request.method === "POST")   return handleLogin(request, env);
    if (path === "/auth/logout"                          && request.method === "POST")   return handleLogout(request, env);
    if (path === "/auth/firebase"                        && request.method === "POST")   return handleFirebaseAuth(request, env);
    if (path === "/auth/forgot-password"                 && request.method === "POST")   return handleForgotPassword(request, env);
    if (path === "/auth/reset-password"                  && request.method === "POST")   return handleResetPassword(request, env);
    if (path === "/user/me"                              && request.method === "GET")    return handleGetMe(request, env);
    if (path === "/user/me"                              && request.method === "PUT")    return handleUpdateMe(request, env);
    if (path === "/user/avatar"                          && request.method === "PUT")    return handleUpdateAvatar(request, env);
    if (path === "/ai/chat"                              && request.method === "POST")   return handleAiChat(request, env);
    if (path === "/ai/title"                             && request.method === "POST")   return handleAiTitle(request, env);
    if (path === "/ai/summarize"                         && request.method === "POST")   return handleAiSummarize(request, env);
    if (path === "/ai/transcribe"                        && request.method === "POST")   return handleAiTranscribe(request, env);
    if (path === "/credits/balance"                      && request.method === "GET")    return handleCreditsBalance(request, env);
    if (path === "/credits/checkout"                     && request.method === "POST")   return handleCreditsCheckout(request, env);
    if (path === "/credits/webhook"                      && request.method === "POST")   return handleCreditsWebhook(request, env);
    if (path === "/conversations"                        && request.method === "GET")    return handleListConversations(request, env);
    if (path === "/conversations"                        && request.method === "POST")   return handleCreateConversation(request, env);
    if (path === "/conversations/all"                    && request.method === "DELETE") return handleDeleteAllConversations(request, env);
    if (path === "/conversations/search"                 && request.method === "GET")    return handleSearchConversations(request, env);
    if (path.match(/^\/conversations\/[^\/]+$/)          && request.method === "GET")    return handleGetConversation(request, env);
    if (path.match(/^\/conversations\/[^\/]+$/)          && request.method === "PUT")    return handleUpdateConversation(request, env);
    if (path.match(/^\/conversations\/[^\/]+$/)          && request.method === "DELETE") return handleDeleteConversation(request, env);
    if (path.match(/^\/conversations\/[^\/]+\/pin$/)     && request.method === "PUT")    return handlePinConversation(request, env);
    if (path.match(/^\/conversations\/[^\/]+\/archive$/) && request.method === "PUT")    return handleArchiveConversation(request, env);

    return error("Not found", 404);
  },
};

async function handleRegister(request, env) {
  const body = await request.json().catch(function() { return null; });
  if (!body) return error("Body inválido");
  const { name, email, password } = body;
  if (!name || !email || !password) return error("Campos obrigatórios em falta");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return error("Email inválido");
  if (password.length < 6) return error("Password deve ter pelo menos 6 caracteres");
  const existing = await env.IPC_USERS.get("email:" + email.toLowerCase());
  if (existing) return error("Este email já está registado");
  const id           = crypto.randomUUID();
  const passwordHash = await hashPassword(password);
  const user = {
    id, name, email: email.toLowerCase(),
    passwordHash, avatar: null, provider: "email", firebaseUid: null,
    credits: FREE_CREDITS,
    preferences: { language: "pt", theme: "system", fontSize: "medium" },
    stats: { totalConversations: 0, totalMessages: 0 },
    createdAt: Date.now(),
  };
  await env.IPC_USERS.put("user:" + id, JSON.stringify(user));
  await env.IPC_USERS.put("email:" + email.toLowerCase(), id);
  const token = await generateToken({ id, email: user.email, name }, env.JWT_SECRET);
  return json({ token, id, name, email: user.email, credits: FREE_CREDITS }, 201);
}

async function handleLogin(request, env) {
  const body = await request.json().catch(function() { return null; });
  if (!body) return error("Body inválido");
  const { email, password } = body;
  if (!email || !password) return error("Campos obrigatórios em falta");
  const userId = await env.IPC_USERS.get("email:" + email.toLowerCase());
  if (!userId) return error("Email ou password incorretos", 401);
  const userData = await env.IPC_USERS.get("user:" + userId);
  if (!userData) return error("Email ou password incorretos", 401);
  const user = JSON.parse(userData);
  if (user.passwordHash !== await hashPassword(password)) return error("Email ou password incorretos", 401);
  const token = await generateToken({ id: user.id, email: user.email, name: user.name }, env.JWT_SECRET);
  return json({ token, id: user.id, name: user.name, email: user.email, credits: user.credits ?? FREE_CREDITS, preferences: user.preferences || {} });
}

async function handleLogout(request, env) {
  return json({ success: true });
}

async function handleFirebaseAuth(request, env) {
  const body = await request.json().catch(function() { return null; });
  if (!body || !body.idToken) return error("idToken obrigatório");
  const projectId    = env.FIREBASE_PROJECT_ID;
  const firebaseUser = await verifyFirebaseToken(body.idToken, projectId);
  if (!firebaseUser) return error("Token Firebase inválido ou expirado", 401);
  const uid = firebaseUser.uid;
  let userId = await env.IPC_USERS.get("firebase:" + uid);
  if (!userId) {
    if (firebaseUser.email) {
      userId = await env.IPC_USERS.get("email:" + firebaseUser.email.toLowerCase());
    }
    if (!userId) {
      userId = crypto.randomUUID();
      const user = {
        id: userId,
        name: firebaseUser.name || firebaseUser.email || "Utilizador Nexa",
        email: firebaseUser.email ? firebaseUser.email.toLowerCase() : null,
        passwordHash: null, avatar: firebaseUser.picture || null,
        provider: firebaseUser.provider, firebaseUid: uid,
        credits: FREE_CREDITS,
        preferences: { language: "pt", theme: "system", fontSize: "medium" },
        stats: { totalConversations: 0, totalMessages: 0 },
        createdAt: Date.now(),
      };
      await env.IPC_USERS.put("user:" + userId, JSON.stringify(user));
      if (firebaseUser.email) {
        await env.IPC_USERS.put("email:" + firebaseUser.email.toLowerCase(), userId);
      }
    } else {
      const userData = await env.IPC_USERS.get("user:" + userId);
      if (userData) {
        const user = JSON.parse(userData);
        user.firebaseUid = uid;
        user.provider    = firebaseUser.provider;
        if (!user.avatar && firebaseUser.picture) user.avatar = firebaseUser.picture;
        if (!user.name   && firebaseUser.name)    user.name   = firebaseUser.name;
        await env.IPC_USERS.put("user:" + userId, JSON.stringify(user));
      }
    }
    await env.IPC_USERS.put("firebase:" + uid, userId);
  }
  const userData = await env.IPC_USERS.get("user:" + userId);
  if (!userData) return error("Erro ao carregar utilizador", 500);
  const user  = JSON.parse(userData);
  const token = await generateToken({ id: user.id, email: user.email, name: user.name }, env.JWT_SECRET);
  return json({ token, id: user.id, name: user.name, email: user.email, avatar: user.avatar || null, provider: user.provider, credits: user.credits ?? FREE_CREDITS, preferences: user.preferences || {} });
}

async function handleForgotPassword(request, env) {
  const body = await request.json().catch(function() { return null; });
  if (!body || !body.email) return error("Email obrigatório");
  const email  = body.email.toLowerCase();
  const userId = await env.IPC_USERS.get("email:" + email);
  if (userId) {
    const resetToken = crypto.randomUUID().replace(/-/g, "");
    await env.IPC_USERS.put("reset:" + resetToken, JSON.stringify({ userId, email, createdAt: Date.now() }), { expirationTtl: 3600 });
    console.log("[NEXA RESET] Token para " + email + ": " + resetToken);
  }
  return json({ success: true, message: "Se a conta existir, receberás um email com as instruções." });
}

async function handleResetPassword(request, env) {
  const body = await request.json().catch(function() { return null; });
  if (!body || !body.token || !body.password) return error("Token e password obrigatórios");
  if (body.password.length < 6) return error("Password deve ter pelo menos 6 caracteres");
  const resetData = await env.IPC_USERS.get("reset:" + body.token);
  if (!resetData) return error("Token inválido ou expirado", 400);
  const userId   = JSON.parse(resetData).userId;
  const userData = await env.IPC_USERS.get("user:" + userId);
  if (!userData) return error("Utilizador não encontrado", 404);
  const user = JSON.parse(userData);
  user.passwordHash = await hashPassword(body.password);
  await env.IPC_USERS.put("user:" + userId, JSON.stringify(user));
  await env.IPC_USERS.delete("reset:" + body.token);
  return json({ success: true, message: "Password atualizada com sucesso." });
}

async function handleGetMe(request, env) {
  const payload = await getAuthUser(request, env);
  if (!payload) return error("Não autenticado", 401);
  const userData = await env.IPC_USERS.get("user:" + payload.id);
  if (!userData) return error("Utilizador não encontrado", 404);
  const user = JSON.parse(userData);
  return json({ id: user.id, name: user.name, email: user.email, avatar: user.avatar || null, provider: user.provider || "email", credits: user.credits ?? FREE_CREDITS, preferences: user.preferences || {}, stats: user.stats || {}, createdAt: user.createdAt });
}

async function handleUpdateMe(request, env) {
  const payload = await getAuthUser(request, env);
  if (!payload) return error("Não autenticado", 401);
  const body = await request.json().catch(function() { return null; });
  if (!body) return error("Body inválido");
  const userData = await env.IPC_USERS.get("user:" + payload.id);
  if (!userData) return error("Utilizador não encontrado", 404);
  const user = JSON.parse(userData);
  if (body.name) user.name = body.name.trim();
  if (body.password) {
    if (body.password.length < 6) return error("Password deve ter pelo menos 6 caracteres");
    user.passwordHash = await hashPassword(body.password);
  }
  if (body.preferences && typeof body.preferences === "object") {
    user.preferences = Object.assign({}, user.preferences || {}, body.preferences);
  }
  await env.IPC_USERS.put("user:" + user.id, JSON.stringify(user));
  return json({ id: user.id, name: user.name, email: user.email, avatar: user.avatar || null, provider: user.provider || "email", credits: user.credits ?? FREE_CREDITS, preferences: user.preferences || {}, createdAt: user.createdAt });
}

async function handleUpdateAvatar(request, env) {
  const payload = await getAuthUser(request, env);
  if (!payload) return error("Não autenticado", 401);
  const body = await request.json().catch(function() { return null; });
  if (!body || !body.avatar) return error("avatar obrigatório");
  if (body.avatar.length > 270000) return error("Imagem demasiado grande (máx ~200KB)");
  const userData = await env.IPC_USERS.get("user:" + payload.id);
  if (!userData) return error("Utilizador não encontrado", 404);
  const user = JSON.parse(userData);
  user.avatar = body.avatar;
  await env.IPC_USERS.put("user:" + user.id, JSON.stringify(user));
  return json({ avatar: user.avatar });
}

async function handleListConversations(request, env) {
  const payload = await getAuthUser(request, env);
  if (!payload) return error("Não autenticado", 401);
  const url      = new URL(request.url);
  const archived = url.searchParams.get("archived") === "true";
  const raw      = await env.IPC_USERS.get("convs:" + payload.id);
  const ids      = raw ? JSON.parse(raw) : [];
  const all      = await Promise.all(ids.map(async function(id) {
    const data = await env.IPC_USERS.get("conv:" + id);
    return data ? JSON.parse(data) : null;
  }));
  const conversations = all
    .filter(function(c) { return c !== null && (archived ? c.archived === true : !c.archived); })
    .sort(function(a, b) {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.updatedAt - a.updatedAt;
    });
  return json({ conversations });
}

async function handleCreateConversation(request, env) {
  const payload = await getAuthUser(request, env);
  if (!payload) return error("Não autenticado", 401);
  const body = await request.json().catch(function() { return null; });
  if (!body) return error("Body inválido");
  const id  = crypto.randomUUID();
  const now = Date.now();
  const conversation = {
    id, userId: payload.id,
    title:    body.title    || "Nova conversa",
    messages: body.messages || [],
    model:    body.model    || GEMINI_MODEL,
    pinned: false, archived: false,
    tags: body.tags || [],
    createdAt: now, updatedAt: now,
  };
  await env.IPC_USERS.put("conv:" + id, JSON.stringify(conversation));
  const raw = await env.IPC_USERS.get("convs:" + payload.id);
  const ids = raw ? JSON.parse(raw) : [];
  ids.unshift(id);
  await env.IPC_USERS.put("convs:" + payload.id, JSON.stringify(ids));
  await incrementUserStat(env, payload.id, "totalConversations", 1);
  return json(conversation, 201);
}

async function handleGetConversation(request, env) {
  const payload = await getAuthUser(request, env);
  if (!payload) return error("Não autenticado", 401);
  const id   = new URL(request.url).pathname.split("/").pop();
  const data = await env.IPC_USERS.get("conv:" + id);
  if (!data) return error("Conversa não encontrada", 404);
  const conversation = JSON.parse(data);
  if (conversation.userId !== payload.id) return error("Acesso negado", 403);
  return json(conversation);
}

async function handleUpdateConversation(request, env) {
  const payload = await getAuthUser(request, env);
  if (!payload) return error("Não autenticado", 401);
  const id   = new URL(request.url).pathname.split("/").pop();
  const data = await env.IPC_USERS.get("conv:" + id);
  if (!data) return error("Conversa não encontrada", 404);
  const conversation = JSON.parse(data);
  if (conversation.userId !== payload.id) return error("Acesso negado", 403);
  const body = await request.json().catch(function() { return null; });
  if (!body) return error("Body inválido");
  if (body.title    !== undefined) conversation.title    = body.title;
  if (body.messages !== undefined) {
    const added = body.messages.length - conversation.messages.length;
    if (added > 0) await incrementUserStat(env, payload.id, "totalMessages", added);
    conversation.messages = body.messages;
  }
  if (body.model !== undefined) conversation.model = body.model;
  if (body.tags  !== undefined) conversation.tags  = body.tags;
  conversation.updatedAt = Date.now();
  await env.IPC_USERS.put("conv:" + id, JSON.stringify(conversation));
  return json(conversation);
}

async function handleDeleteConversation(request, env) {
  const payload = await getAuthUser(request, env);
  if (!payload) return error("Não autenticado", 401);
  const id   = new URL(request.url).pathname.split("/").pop();
  const data = await env.IPC_USERS.get("conv:" + id);
  if (!data) return error("Conversa não encontrada", 404);
  const conversation = JSON.parse(data);
  if (conversation.userId !== payload.id) return error("Acesso negado", 403);
  await env.IPC_USERS.delete("conv:" + id);
  const raw     = await env.IPC_USERS.get("convs:" + payload.id);
  const ids     = raw ? JSON.parse(raw) : [];
  const updated = ids.filter(function(i) { return i !== id; });
  await env.IPC_USERS.put("convs:" + payload.id, JSON.stringify(updated));
  await incrementUserStat(env, payload.id, "totalConversations", -1);
  return json({ success: true });
}

async function handleDeleteAllConversations(request, env) {
  const payload = await getAuthUser(request, env);
  if (!payload) return error("Não autenticado", 401);
  const raw = await env.IPC_USERS.get("convs:" + payload.id);
  const ids = raw ? JSON.parse(raw) : [];
  await Promise.all(ids.map(function(id) { return env.IPC_USERS.delete("conv:" + id); }));
  await env.IPC_USERS.put("convs:" + payload.id, JSON.stringify([]));
  const userData = await env.IPC_USERS.get("user:" + payload.id);
  if (userData) {
    const user = JSON.parse(userData);
    if (user.stats) user.stats.totalConversations = 0;
    await env.IPC_USERS.put("user:" + payload.id, JSON.stringify(user));
  }
  return json({ success: true, deleted: ids.length });
}

async function handlePinConversation(request, env) {
  const payload = await getAuthUser(request, env);
  if (!payload) return error("Não autenticado", 401);
  const parts = new URL(request.url).pathname.split("/");
  const id    = parts[2];
  const data  = await env.IPC_USERS.get("conv:" + id);
  if (!data) return error("Conversa não encontrada", 404);
  const conversation = JSON.parse(data);
  if (conversation.userId !== payload.id) return error("Acesso negado", 403);
  const body = await request.json().catch(function() { return {}; });
  conversation.pinned    = body.pinned !== undefined ? body.pinned : !conversation.pinned;
  conversation.updatedAt = Date.now();
  await env.IPC_USERS.put("conv:" + id, JSON.stringify(conversation));
  return json({ id, pinned: conversation.pinned });
}

async function handleArchiveConversation(request, env) {
  const payload = await getAuthUser(request, env);
  if (!payload) return error("Não autenticado", 401);
  const parts = new URL(request.url).pathname.split("/");
  const id    = parts[2];
  const data  = await env.IPC_USERS.get("conv:" + id);
  if (!data) return error("Conversa não encontrada", 404);
  const conversation = JSON.parse(data);
  if (conversation.userId !== payload.id) return error("Acesso negado", 403);
  const body = await request.json().catch(function() { return {}; });
  conversation.archived  = body.archived !== undefined ? body.archived : !conversation.archived;
  conversation.pinned    = false;
  conversation.updatedAt = Date.now();
  await env.IPC_USERS.put("conv:" + id, JSON.stringify(conversation));
  return json({ id, archived: conversation.archived });
}

async function handleSearchConversations(request, env) {
  const payload = await getAuthUser(request, env);
  if (!payload) return error("Não autenticado", 401);
  const url   = new URL(request.url);
  const query = (url.searchParams.get("q") || "").toLowerCase().trim();
  if (!query) return json({ conversations: [] });
  const raw = await env.IPC_USERS.get("convs:" + payload.id);
  const ids = raw ? JSON.parse(raw) : [];
  const all = await Promise.all(ids.map(async function(id) {
    const data = await env.IPC_USERS.get("conv:" + id);
    return data ? JSON.parse(data) : null;
  }));
  const results = all
    .filter(function(c) {
      if (!c || c.archived) return false;
      if (c.title.toLowerCase().includes(query)) return true;
      return c.messages.some(function(m) { return m.content && m.content.toLowerCase().includes(query); });
    })
    .sort(function(a, b) { return b.updatedAt - a.updatedAt; });
  return json({ conversations: results });
}

async function handleAiTitle(request, env) {
  const payload = await getAuthUser(request, env);
  if (!payload) return error("Não autenticado", 401);
  const body = await request.json().catch(function() { return null; });
  if (!body || !body.message) return error("message obrigatório");
  const title = await geminiGenerateTitle(env.GEMINI_API_KEY, body.message, body.language || "pt");
  return json({ title });
}

async function handleAiChat(request, env) {
  const payload = await getAuthUser(request, env);
  if (!payload) return error("Não autenticado", 401);
  const body = await request.json().catch(function() { return null; });
  if (!body || !body.messages) return error("messages obrigatório");

  // Verificar e consumir crédito
  const userData = await env.IPC_USERS.get("user:" + payload.id);
  if (!userData) return error("Utilizador não encontrado", 404);
  const userObj        = JSON.parse(userData);
  const currentCredits = userObj.credits ?? 0;
  if (currentCredits <= 0) {
    return json({ error: "credits_exhausted", message: "Sem créditos. Recarrega para continuar." }, 402);
  }
  userObj.credits = currentCredits - 1;
  await env.IPC_USERS.put("user:" + payload.id, JSON.stringify(userObj));

  const messages           = body.messages;
  const stream             = body.stream !== undefined ? body.stream : false;
  const language           = body.language || "pt";
  const thinkingBudget     = body.think ? 8000 : 0;
  const customSystemPrompt = body.systemPrompt || "";
  const provider           = body.provider || "gemini";
  const groqModel          = body.model || "llama-3.3-70b-versatile";

  if (provider === "groq") {
    if (!env.GROQ_API_KEY) return error("Groq não configurado", 500);
    if (stream) {
      const groqRes = await groqChatStream(env.GROQ_API_KEY, messages, groqModel, customSystemPrompt, language);
      if (!groqRes.ok) return error("Erro Groq API: " + await groqRes.text(), groqRes.status);
      return new Response(groqRes.body, {
        headers: Object.assign({}, CORS_HEADERS, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "X-Accel-Buffering": "no" }),
      });
    }
    const groqRes = await groqChat(env.GROQ_API_KEY, messages, groqModel, customSystemPrompt, language);
    if (!groqRes.ok) return error("Erro Groq API: " + await groqRes.text(), groqRes.status);
    const data    = await groqRes.json();
    const content = data.choices?.[0]?.message?.content || "";
    return json({ content, reasoning: null, model: groqModel, usage: data.usage || null });
  }

  const gemRes = await geminiGenerate(env.GEMINI_API_KEY, messages, language, stream, thinkingBudget, customSystemPrompt);
  if (!gemRes.ok) {
    const errText = await gemRes.text();
    console.error("[NEXA CHAT ERROR]", gemRes.status, errText);
    return error("Erro Gemini API: " + errText, gemRes.status);
  }
  if (stream) {
    return new Response(gemRes.body, {
      headers: Object.assign({}, CORS_HEADERS, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "X-Accel-Buffering": "no" }),
    });
  }
  const data      = await gemRes.json();
  const candidate = data.candidates?.[0];
  const parts     = candidate?.content?.parts || [];
  let content = "", reasoning = null;
  for (const part of parts) {
    if (part.thought) { reasoning = part.text; }
    else { content += part.text || ""; }
  }
  return json({ content, reasoning, model: GEMINI_MODEL, usage: data.usageMetadata || null });
}

async function handleAiSummarize(request, env) {
  const payload = await getAuthUser(request, env);
  if (!payload) return error("Não autenticado", 401);
  const body = await request.json().catch(function() { return null; });
  if (!body || !body.messages) return error("messages obrigatório");
  const language = body.language || "pt";
  const prompt   = language === "en"
    ? "Summarize the following conversation in a few sentences:\n\n"
    : "Resume a seguinte conversa em poucas frases:\n\n";
  const text = body.messages.map(function(m) {
    return (m.role === "user" ? "User: " : "Assistant: ") + m.content;
  }).join("\n");
  const gemRes = await fetch(GEMINI_BASE + "/" + GEMINI_MODEL + ":generateContent?key=" + env.GEMINI_API_KEY, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt + text }] }],
      generationConfig: { maxOutputTokens: 512, temperature: 0.5 },
    }),
  });
  if (!gemRes.ok) return error("Erro ao resumir", gemRes.status);
  const data    = await gemRes.json();
  const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return json({ summary });
}

async function handleAiTranscribe(request, env) {
  const payload = await getAuthUser(request, env);
  if (!payload) return error("Não autenticado", 401);
  if (!env.GROQ_API_KEY) return error("Groq não configurado", 500);
  let formData;
  try { formData = await request.formData(); }
  catch (e) { return error("Esperado multipart/form-data com campo 'file'"); }
  const audioFile = formData.get("file");
  const language  = formData.get("language") || "pt";
  const prompt    = formData.get("prompt")   || "";
  if (!audioFile) return error("Campo 'file' obrigatório");
  const outForm = new FormData();
  outForm.append("file", audioFile);
  outForm.append("model", "whisper-large-v3-turbo");
  outForm.append("language", language);
  outForm.append("response_format", "json");
  if (prompt) outForm.append("prompt", prompt);
  const groqRes = await fetch(GROQ_BASE + "/audio/transcriptions", {
    method: "POST",
    headers: { "Authorization": "Bearer " + env.GROQ_API_KEY },
    body: outForm,
  });
  if (!groqRes.ok) {
    const errText = await groqRes.text();
    return error("Erro Groq Whisper: " + errText, groqRes.status);
  }
  const data = await groqRes.json();
  return json({ text: data.text || "", language: data.language || language, duration: data.duration || null });
}

async function handleCreditsBalance(request, env) {
  const payload = await getAuthUser(request, env);
  if (!payload) return error("Não autenticado", 401);
  const userData = await env.IPC_USERS.get("user:" + payload.id);
  if (!userData) return error("Utilizador não encontrado", 404);
  const user = JSON.parse(userData);
  return json({ credits: user.credits ?? 0, packages: CREDIT_PACKAGES });
}

async function handleCreditsCheckout(request, env) {
  const payload = await getAuthUser(request, env);
  if (!payload) return error("Não autenticado", 401);

  const body = await request.json().catch(() => null);
  if (!body || !body.package) return error("Campo 'package' obrigatório (basic | premium)");

  const pkg = CREDIT_PACKAGES[body.package];
  if (!pkg) return error("Pacote inválido");

  const productId = pkg.productId;

  // Gerar checkout link usando produto fixo já existente no GoPay
  const checkoutRes = await fetch(GOPAY_BASE + "/checkout-links", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.GOPAY_API_KEY,
    },
    body: JSON.stringify({ product_id: productId }),
  });

  if (!checkoutRes.ok) {
    const err = await checkoutRes.text();
    return error("Erro ao gerar checkout GoPay: " + err, 500);
  }

  const checkout = await checkoutRes.json();
  const checkoutUrl = checkout.url || checkout.checkout_url || checkout.link || checkout.checkout_link;

  if (!checkoutUrl) {
    return error("GoPay não devolveu URL de checkout: " + JSON.stringify(checkout), 500);
  }

  // Guardar pendente no KV com userId para o webhook identificar quem pagou
  // Usamos productId + userId como chave para suportar vários utilizadores simultâneos
  const pendingKey = "pending_credit:" + productId + ":" + payload.id;
  await env.IPC_USERS.put(
    pendingKey,
    JSON.stringify({
      userId:    payload.id,
      package:   body.package,
      credits:   pkg.credits,
      createdAt: Date.now(),
    }),
    { expirationTtl: 3600 }
  );

  return json({
    checkout_url: checkoutUrl,
    product_id:   productId,
    package:      body.package,
    credits:      pkg.credits,
    price:        pkg.price,
  });
}

async function handleCreditsWebhook(request, env) {
  const signature = request.headers.get("X-Webhook-Signature") || "";
  const rawBody   = await request.text();

  // Verificar assinatura HMAC-SHA256 se secret configurado
  if (env.GOPAY_WEBHOOK_SECRET && signature) {
    const key = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(env.GOPAY_WEBHOOK_SECRET),
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const sigBytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
    const expected = btoa(String.fromCharCode(...new Uint8Array(sigBytes)));
    if (expected !== signature) return error("Assinatura inválida", 401);
  }

  let event;
  try { event = JSON.parse(rawBody); } catch { return error("Body inválido"); }

  const eventType  = event.event || event.type || "";
  const isApproved = eventType === "payment.approved"
    || eventType === "Pagamento Aprovado"
    || event.status === "completed"
    || event.status === "approved";

  if (!isApproved) return json({ received: true });

  const productId = event.product_id || event.data?.product_id;
  if (!productId)  return json({ received: true, note: "Sem product_id" });

  // Procurar pendente — pode estar com ou sem userId (compatibilidade)
  // O webhook do GoPay não sabe o userId, então procuramos por prefix
  const listRes = await env.IPC_USERS.list({ prefix: "pending_credit:" + productId + ":" });
  let pending = null;
  let pendingKey = null;

  if (listRes.keys && listRes.keys.length > 0) {
    pendingKey = listRes.keys[0].name;
    const raw  = await env.IPC_USERS.get(pendingKey);
    if (raw) pending = JSON.parse(raw);
  }

  if (!pending) return json({ received: true, note: "Sem pendente para este produto" });

  // Adicionar créditos
  const userDataRaw = await env.IPC_USERS.get("user:" + pending.userId);
  if (userDataRaw) {
    const user = JSON.parse(userDataRaw);
    user.credits = (user.credits ?? 0) + pending.credits;
    await env.IPC_USERS.put("user:" + pending.userId, JSON.stringify(user));
  }

  // Limpar pendente e guardar registo
  await env.IPC_USERS.delete(pendingKey);
  await env.IPC_USERS.put(
    "purchase:" + crypto.randomUUID(),
    JSON.stringify({ userId: pending.userId, package: pending.package, credits: pending.credits, productId, paidAt: Date.now() })
  );

  return json({ success: true, credits_added: pending.credits });
}

async function incrementUserStat(env, userId, stat, delta) {
  try {
    const userData = await env.IPC_USERS.get("user:" + userId);
    if (!userData) return;
    const user = JSON.parse(userData);
    if (!user.stats) user.stats = {};
    user.stats[stat] = (user.stats[stat] || 0) + delta;
    if (user.stats[stat] < 0) user.stats[stat] = 0;
    await env.IPC_USERS.put("user:" + userId, JSON.stringify(user));
  } catch (e) {
    console.error("[NEXA STAT ERROR]", e);
  }
}