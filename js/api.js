const API_BASE = 'https://ipc.alfredopjonas.workers.dev';

const AuthApiService = {
  async login(email, password) {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => ({}));
      console.error('Login failed:', res.status, err);
    } catch (e) { console.error('Login error:', e); }
    return null;
  },

  async register(name, email, password) {
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => ({}));
      console.error('Register failed:', res.status, err);
    } catch (e) { console.error('Register error:', e); }
    return null;
  },

  async loginWithFirebase(idToken) {
    try {
      const res = await fetch(`${API_BASE}/auth/firebase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => ({}));
      console.error('Firebase login failed:', res.status, err);
    } catch (e) { console.error('Firebase login error:', e); }
    return null;
  },

  async logout(token) {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (e) { console.error('Logout error:', e); }
  },

  async listConversations(token) {
    try {
      const res = await fetch(`${API_BASE}/conversations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        return data.conversations || [];
      }
    } catch (e) { console.error('List conversations error:', e); }
    return [];
  },

  async createConversation(token, title, messages) {
    try {
      const res = await fetch(`${API_BASE}/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title, messages })
      });
      if (res.ok) {
        const data = await res.json();
        return data.id;
      }
    } catch (e) { console.error('Create conversation error:', e); }
    return null;
  },

  async updateConversation(token, id, title, messages) {
    try {
      await fetch(`${API_BASE}/conversations/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title, messages })
      });
    } catch (e) { console.error('Update conversation error:', e); }
  },

  async deleteConversation(token, id) {
    try {
      await fetch(`${API_BASE}/conversations/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (e) { console.error('Delete conversation error:', e); }
  },

  async pinConversation(token, id, pinned) {
    try {
      await fetch(`${API_BASE}/conversations/${id}/pin`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ pinned })
      });
    } catch (e) { console.error('Pin conversation error:', e); }
  }
};

const GeminiApiService = {
  buildSystemPrompt(lang, sheetsEnabled) {
    const tick = '```';
    const pt = lang !== 'en';

    const base = pt
      ? `És um assistente de IA integrado na app Nexa. Responde sempre em português europeu. Sê conciso e direto.

Para tabelas, usa SEMPRE o formato widget_table:
${tick}widget_table
{"headers":["Coluna1","Coluna2"],"rows":[["val1","val2"]]}
${tick}

Para blocos de código, usa SEMPRE o formato widget_code:
${tick}widget_code
{"language":"javascript","code":"// código aqui"}
${tick}

Quando a resposta envolver uma localização geográfica concreta, usa widget_map:
${tick}widget_map
{"lat":38.7169,"lng":-9.1399,"zoom":13}
${tick}

Nunca uses tabelas markdown (| col | col |) nem blocos de código normais (\`\`\`lang).`
      : `You are a helpful AI assistant integrated in the Nexa app. Always respond in English. Be concise and direct.

For tables, ALWAYS use widget_table:
${tick}widget_table
{"headers":["Column1","Column2"],"rows":[["val1","val2"]]}
${tick}

For code blocks, ALWAYS use widget_code:
${tick}widget_code
{"language":"javascript","code":"// code here"}
${tick}

When the response involves a concrete geographic location, use widget_map:
${tick}widget_map
{"lat":38.7169,"lng":-9.1399,"zoom":13}
${tick}

Never use markdown tables (| col | col |) or normal code blocks (\`\`\`lang).`;

    const sheets = sheetsEnabled ? (pt ? `


Com o Sheets ativo podes também usar estes widgets adicionais quando relevante:

Gráfico de barras:
${tick}widget_bar
{"data":[{"label":"Jan","value":35},{"label":"Fev","value":60}]}
${tick}

Gráfico de pizza:
${tick}widget_pie
{"data":[{"label":"A","value":40},{"label":"B","value":60}]}
${tick}

Folha de notas:
${tick}widget_sheet
{"lines":[{"text":"Título","title":true},{"text":"Linha de conteúdo"}]}
${tick}

Mercado financeiro (forex/crypto/stock):
${tick}widget_market
{"type":"crypto","symbol":"BTC","name":"Bitcoin"}
${tick}

Calendário:
${tick}widget_calendar
{"events":[{"date":"2025-06-20","name":"Reunião","time":"14:00","color":"#6F5AF6"}]}
${tick}

Temporizador:
${tick}widget_timer
{"seconds":300,"label":"Foco"}
${tick}

Mapa mental:
${tick}widget_mindmap
{"title":"Projeto","tree":{"id":"root","label":"Projeto","color":"#6F5AF6","children":[{"id":"1","label":"Fase 1","color":"#e74c3c","children":[]}]}}
${tick}

Gráfico matemático:
${tick}widget_graph
{"expression":"sin(x)","xMin":-10,"xMax":10}
${tick}`
      : `


With Sheets enabled you can also use these additional widgets when relevant:

Bar chart:
${tick}widget_bar
{"data":[{"label":"Jan","value":35},{"label":"Feb","value":60}]}
${tick}

Pie chart:
${tick}widget_pie
{"data":[{"label":"A","value":40},{"label":"B","value":60}]}
${tick}

Sheet notepad:
${tick}widget_sheet
{"lines":[{"text":"Title","title":true},{"text":"Content line"}]}
${tick}

Financial market (forex/crypto/stock):
${tick}widget_market
{"type":"crypto","symbol":"BTC","name":"Bitcoin"}
${tick}

Calendar:
${tick}widget_calendar
{"events":[{"date":"2025-06-20","name":"Meeting","time":"14:00","color":"#6F5AF6"}]}
${tick}

Timer:
${tick}widget_timer
{"seconds":300,"label":"Focus"}
${tick}

Mind map:
${tick}widget_mindmap
{"title":"Project","tree":{"id":"root","label":"Project","color":"#6F5AF6","children":[{"id":"1","label":"Phase 1","color":"#e74c3c","children":[]}]}}
${tick}

Math graph:
${tick}widget_graph
{"expression":"sin(x)","xMin":-10,"xMax":10}
${tick}`) : '';

    return base + sheets;
  },

  async * streamChat({ messages, systemPrompt, token, think }) {
    try {
      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          messages,
          stream: true,
          systemPrompt,
          think,
          language: 'pt'
        })
      });

      if (!res.ok) {
        yield { type: 'error', message: `Erro ${res.status}` };
        return;
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer   = '';
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') {
            yield { type: 'done', fullText };
            return;
          }
          try {
            const json       = JSON.parse(data);
            const candidates = json.candidates;
            if (!candidates || !candidates.length) continue;
            const parts = candidates[0].content?.parts || [];
            for (const part of parts) {
              const text = part.text || '';
              if (!text) continue;
              if (part.thought) {
                yield { type: 'think', text };
              } else {
                fullText += text;
                yield { type: 'token', text };
              }
            }
            const finishReason = candidates[0].finishReason;
            if (finishReason === 'STOP' || finishReason === 'MAX_TOKENS') {
              yield { type: 'done', fullText };
              return;
            }
          } catch (e) { /* ignora JSON malformado */ }
        }
      }
      yield { type: 'done', fullText };
    } catch (e) {
      yield { type: 'error', message: 'Erro de rede: ' + e.message };
    }
  },

  async generateTitle(message, token) {
    try {
      const res = await fetch(`${API_BASE}/ai/title`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message, language: 'pt' })
      });
      if (res.ok) {
        const data = await res.json();
        return data.title || message.trim().split(/\s+/).slice(0, 4).join(' ').substring(0, 40);
      }
    } catch (e) { console.error('Generate title error:', e); }
    return message.trim().split(/\s+/).slice(0, 4).join(' ').substring(0, 40);
  }
};