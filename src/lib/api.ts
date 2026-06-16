const BASE = 'https://ipc.alfredopjonas.workers.dev';

function authHeaders(token: string) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function req<T>(url: string, options: RequestInit): Promise<T> {
  const res = await fetch(BASE + url, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro desconhecido');
  return data as T;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AuthResponse {
  token: string;
  id: string;
  name: string;
  email: string;
  preferences?: Record<string, string>;
}

export function apiRegister(name: string, email: string, password: string) {
  return req<AuthResponse>('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
}

export function apiLogin(email: string, password: string) {
  return req<AuthResponse>('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

// ─── User ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  preferences: Record<string, string>;
  stats: Record<string, number>;
}

export function apiGetMe(token: string) {
  return req<User>('/user/me', { headers: authHeaders(token) });
}

// ─── Conversations ────────────────────────────────────────────────────────────

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  pinned: boolean;
  archived: boolean;
  updatedAt: number;
  createdAt: number;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function apiListConversations(token: string) {
  return req<{ conversations: Conversation[] }>('/conversations', {
    headers: authHeaders(token),
  });
}

export function apiCreateConversation(token: string, title: string, messages: Message[]) {
  return req<Conversation>('/conversations', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ title, messages }),
  });
}

export function apiUpdateConversation(token: string, id: string, data: Partial<Conversation>) {
  return req<Conversation>(`/conversations/${id}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
}

export function apiDeleteConversation(token: string, id: string) {
  return req<{ success: boolean }>(`/conversations/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
}

export function apiPinConversation(token: string, id: string, pinned: boolean) {
  return req<{ id: string; pinned: boolean }>(`/conversations/${id}/pin`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({ pinned }),
  });
}

export function apiArchiveConversation(token: string, id: string, archived: boolean) {
  return req<{ id: string; archived: boolean }>(`/conversations/${id}/archive`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({ archived }),
  });
}

// ─── AI ──────────────────────────────────────────────────────────────────────

export function apiGenerateTitle(token: string, message: string) {
  return req<{ title: string }>('/ai/title', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ message, language: 'pt' }),
  });
}

export async function apiChatStream(
  token: string,
  messages: Message[],
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (e: string) => void,
  think = false,
) {
  try {
    const res = await fetch(BASE + '/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ messages, stream: true, language: 'pt', think }),
    });
    if (!res.ok) { onError('Erro na API'); return; }
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') { onDone(); return; }
        try {
          const parsed = JSON.parse(raw);
          const parts = parsed.candidates?.[0]?.content?.parts || [];
          for (const part of parts) {
            if (!part.thought && part.text) onChunk(part.text);
          }
        } catch { /* ignore */ }
      }
    }
    onDone();
  } catch (e) {
    onError(String(e));
  }
}
