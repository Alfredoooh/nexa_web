const API_BASE = 'https://nexa.alfredopjonas.workers.dev';

const AuthApiService = {
  async login(email, password) {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (res.ok) return await res.json();
    } catch (e) { console.error(e); }
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
    } catch (e) { console.error(e); }
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
    } catch (e) { console.error(e); }
    return null;
  },
  async logout(token) {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (e) { console.error(e); }
  },
  async listConversations(token) {
    try {
      const res = await fetch(`${API_BASE}/conversations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) { const d = await res.json(); return d.conversations || []; }
    } catch (e) { console.error(e); }
    return [];
  },
  async createConversation(token, title, messages) {
    try {
      const res = await fetch(`${API_BASE}/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title, messages })
      });
      if (res.ok) { const d = await res.json(); return d.id; }
    } catch (e) { console.error(e); }
    return null;
  },
  async updateConversation(token, id, title, messages) {
    try {
      await fetch(`${API_BASE}/conversations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title, messages })
      });
    } catch (e) { console.error(e); }
  },
  async deleteConversation(token, id) {
    try {
      await fetch(`${API_BASE}/conversations/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (e) { console.error(e); }
  },
  async pinConversation(token, id, pinned) {
    try {
      await fetch(`${API_BASE}/conversations/${id}/pin`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ pinned })
      });
    } catch (e) { console.error(e); }
  }
};

const GeminiApiService = {
  buildSystemPrompt(lang, sheetsEnabled) {
    const tick = '```';
    const pt = lang !== 'en';
    const base = pt
      ? `És um assistente de IA integrado na app Nexa. Responde sempre em português europeu. Sê conciso e direto.\n\nPara tabelas, usa SEMPRE o formato widget_table:\n${tick}widget_table\n{"headers":["Coluna1","Coluna2"],"rows":[["val1","val2"]]}\n${tick}\n\nPara blocos de código, usa SEMPRE o formato widget_code:\n${tick}widget_code\n{"language":"javascript","code":"// código aqui"}\n${tick}\n\nQuando a resposta envolver uma localização geográfica concreta, usa widget_map:\n${tick}widget_map\n{"lat":38.7169,"lng":-9.1399,"zoom":13}\n${tick}\n\nNunca uses tabelas markdown (| col | col |) nem blocos de código normais (\`\`\`lang).`
      : `You are a helpful AI assistant integrated in the Nexa app. Always respond in English. Be concise and direct.\n\nFor tables, ALWAYS use widget_table:\n${tick}widget_table\n{"headers":["Column1","Column2"],"rows":[["val1","val2"]]}\n${tick}\n\nFor code blocks, ALWAYS use widget_code:\n${tick}widget_code\n{"language":"javascript","code":"// code here"}\n${tick}\n\nWhen the response involves a concrete geographic location, use widget_map:\n${tick}widget_map\n{"lat":38.7169,"lng":-9.1399,"zoom":13}\n${tick}\n\nNever use markdown tables (| col | col |) or normal code blocks (\`\`\`lang).`;
    const sheets = sheetsEnabled ? (pt
      ? `\n\nCom o Sheets ativo podes também usar estes widgets adicionais quando relevante:\n\n${tick}widget_bar\n{"data":[{"label":"Jan","value":35},{"label":"Fev","value":60}]}\n${tick}\n\n${tick}widget_pie\n{"data":[{"label":"A","value":40},{"label":"B","value":60}]}\n${tick}\n\n${tick}widget_sheet\n{"lines":[{"text":"Título","title":true},{"text":"Linha de conteúdo"}]}\n${tick}\n\n${tick}widget_market\n{"type":"crypto","symbol":"BTC","name":"Bitcoin"}\n${tick}\n\n${tick}widget_calendar\n{"events":[{"date":"2025-06-20","name":"Reunião","time":"14:00","color":"#6F5AF6"}]}\n${tick}\n\n${tick}widget_timer\n{"seconds":300,"label":"Foco"}\n${tick}\n\n${tick}widget_mindmap\n{"title":"Projeto","tree":{"id":"root","label":"Projeto","color":"#6F5AF6","children":[{"id":"1","label":"Fase 1","color":"#e74c3c","children":[]}]}}\n${tick}\n\n${tick}widget_graph\n{"expression":"sin(x)","xMin":-10,"xMax":10}\n${tick}`
      : `\n\nWith Sheets enabled you can also use these additional widgets:\n\n${tick}widget_bar\n{"data":[{"label":"Jan","value":35},{"label":"Feb","value":60}]}\n${tick}\n\n${tick}widget_pie\n{"data":[{"label":"A","value":40},{"label":"B","value":60}]}\n${tick}\n\n${tick}widget_sheet\n{"lines":[{"text":"Title","title":true},{"text":"Content line"}]}\n${tick}\n\n${tick}widget_market\n{"type":"crypto","symbol":"BTC","name":"Bitcoin"}\n${tick}\n\n${tick}widget_calendar\n{"events":[{"date":"2025-06-20","name":"Meeting","time":"14:00","color":"#6F5AF6"}]}\n${tick}\n\n${tick}widget_timer\n{"seconds":300,"label":"Focus"}\n${tick}\n\n${tick}widget_mindmap\n{"title":"Project","tree":{"id":"root","label":"Project","color":"#6F5AF6","children":[{"id":"1","label":"Phase 1","color":"#e74c3c","children":[]}]}}\n${tick}\n\n${tick}widget_graph\n{"expression":"sin(x)","xMin":-10,"xMax":10}\n${tick}`) : '';
    return base + sheets;
  },

  async * streamChat({ messages, systemPrompt, token, think }) {
    try {
      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ messages, stream: true, systemPrompt, think, language: 'pt' })
      });
      if (!res.ok) { yield { type: 'error', message: `Erro ${res.status}` }; return; }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '', fullText = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') { yield { type: 'done', fullText }; return; }
          try {
            const json = JSON.parse(data);
            const candidates = json.candidates;
            if (!candidates?.length) continue;
            const parts = candidates[0].content?.parts || [];
            for (const part of parts) {
              const text = part.text || '';
              if (!text) continue;
              if (part.thought) { yield { type: 'think', text }; }
              else { fullText += text; yield { type: 'token', text }; }
            }
            const fin = candidates[0].finishReason;
            if (fin === 'STOP' || fin === 'MAX_TOKENS') { yield { type: 'done', fullText }; return; }
          } catch (e) {}
        }
      }
      yield { type: 'done', fullText };
    } catch (e) { yield { type: 'error', message: 'Erro de rede: ' + e.message }; }
  },

  async generateTitle(message, token) {
    try {
      const res = await fetch(`${API_BASE}/ai/title`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ message, language: 'pt' })
      });
      if (res.ok) { const d = await res.json(); return d.title || message.trim().split(/\s+/).slice(0, 4).join(' ').substring(0, 40); }
    } catch (e) { console.error(e); }
    return message.trim().split(/\s+/).slice(0, 4).join(' ').substring(0, 40);
  }
};