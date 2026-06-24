const API_BASE = 'https://ipc.alfredopjonas.workers.dev';

const AuthApiService = {
  async login(email, password) {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao iniciar sessão');
      return data;
    } catch (e) {
      throw e;
    }
  },
  
  async register(name, email, password) {
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao criar conta');
      return data;
    } catch (e) {
      throw e;
    }
  },
  
  async loginWithGoogle(idToken) {
    try {
      const res = await fetch(`${API_BASE}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao iniciar sessão com Google');
      return data;
    } catch (e) {
      throw e;
    }
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
      if (!res.ok) return [];
      const data = await res.json();
      return data.conversations || [];
    } catch (e) {
      console.error('List conversations error:', e);
      return [];
    }
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
      if (!res.ok) return null;
      const data = await res.json();
      return data.id || null;
    } catch (e) {
      console.error('Create conversation error:', e);
      return null;
    }
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

/* =========================================================================
   CRÉDITOS
   ========================================================================= */

const CreditsApiService = {
  async getBalance(token) {
    try {
      const res = await fetch(`${API_BASE}/credits/balance`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.error('Credits balance error:', e);
      return null;
    }
  },
  
  async checkout(token, packageId) {
    try {
      const res = await fetch(`${API_BASE}/credits/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ package: packageId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao gerar checkout');
      return data;
    } catch (e) {
      throw e;
    }
  }
};

/* =========================================================================
   PROMPTS POR IDIOMA
   ========================================================================= */

const LANGUAGE_NATIVE_NAME = {
  pt: 'português europeu',
  'pt-BR': 'português do Brasil',
  en: 'English',
  es: 'español',
  fr: 'français',
  de: 'Deutsch',
  it: 'italiano',
  nl: 'Nederlands',
  ru: 'русский',
  zh: '中文（简体）',
  ja: '日本語',
  ko: '한국어',
  ar: 'العربية',
  hi: 'हिन्दी',
  tr: 'Türkçe',
  pl: 'polski',
  sv: 'svenska',
  uk: 'українська'
};

function getLangNativeName(lang) {
  return LANGUAGE_NATIVE_NAME[lang] || LANGUAGE_NATIVE_NAME.pt;
}

const GeminiApiService = {
  buildSystemPrompt(lang, sheetsEnabled) {
    const tick = '```';
    const langCode = lang || 'pt';
    const langName = getLangNativeName(langCode);
    
    const base = `És um assistente de IA integrado na app Nexa. Responde sempre em ${langName}, seja qual for a língua usada pelo utilizador, a menos que ele peça explicitamente outra língua.\n\nNão tens limite artificial de tamanho de resposta. Quando o pedido exigir um texto longo — uma história, um conto, um artigo extenso, um relatório, um guião, código extenso, ou qualquer conteúdo narrativo ou técnico de grande dimensão — escreve o texto completo, do início ao fim, sem o resumir, sem o encurtar e sem dizer que "não é capaz" de produzir textos longos. Gerar textos longos e detalhados É uma das tuas capacidades centrais. Continua a escrever até o conteúdo pedido estar completo, mesmo que isso exija várias secções ou parágrafos extensos.\n\nAdapta o tamanho da resposta ao que for pedido: respostas curtas e diretas para perguntas simples, e respostas longas, completas e bem desenvolvidas sempre que o pedido — explícita ou implicitamente — exigir profundidade, extensão ou um texto criativo longo.\n\nUsa formatação rica sempre que isso ajudar a clareza: títulos, listas, **negrito**, tabelas markdown normais quando fizer sentido, e notação matemática em LaTeX (com $...$ para expressões em linha e $$...$$ para fórmulas em destaque, incluindo \\\\sqrt{}, \\\\frac{}{}, expoentes, subscritos e símbolos gregos) sempre que a resposta envolver matemática.\n\nPara tabelas de dados que o utilizador vá querer interagir ou visualizar como widget, usa o formato widget_table:\n${tick}widget_table\n{"headers":["Coluna1","Coluna2"],"rows":[["val1","val2"]]}\n${tick}\n\nPara blocos de código simples de leitura/explicação, podes usar blocos de código markdown normais (${tick}linguagem ... ${tick}). Para blocos de código que beneficiem de um cartão interativo com botão de copiar dedicado, usa widget_code:\n${tick}widget_code\n{"language":"javascript","code":"// código aqui"}\n${tick}\n\nQuando a resposta envolver uma localização geográfica concreta, usa widget_map:\n${tick}widget_map\n{"lat":38.7169,"lng":-9.1399,"zoom":13}\n${tick}`;
    
    const sheets = sheetsEnabled ? `\n\n\nCom o Sheets ativo podes também usar estes widgets adicionais quando relevante:\n\nGráfico de barras:\n${tick}widget_bar\n{"data":[{"label":"Jan","value":35},{"label":"Fev","value":60}]}\n${tick}\n\nGráfico de pizza:\n${tick}widget_pie\n{"data":[{"label":"A","value":40},{"label":"B","value":60}]}\n${tick}\n\nFolha de notas:\n${tick}widget_sheet\n{"lines":[{"text":"Título","title":true},{"text":"Linha de conteúdo"}]}\n${tick}\n\nMercado financeiro (forex/crypto/stock):\n${tick}widget_market\n{"type":"crypto","symbol":"BTC","name":"Bitcoin"}\n${tick}\n\nCalendário:\n${tick}widget_calendar\n{"events":[{"date":"2025-06-20","name":"Reunião","time":"14:00","color":"#6F5AF6"}]}\n${tick}\n\nTemporizador:\n${tick}widget_timer\n{"seconds":300,"label":"Foco"}\n${tick}\n\nMapa mental:\n${tick}widget_mindmap\n{"title":"Projeto","tree":{"id":"root","label":"Projeto","color":"#6F5AF6","children":[{"id":"1","label":"Fase 1","color":"#e74c3c","children":[]}]}}\n${tick}\n\nGráfico matemático:\n${tick}widget_graph\n{"expression":"sin(x)","xMin":-10,"xMax":10}\n${tick}` : '';
    
    return base + sheets;
  },
  
  async * streamChat({ messages, systemPrompt, token, think, language }) {
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
          language: language || 'pt'
        })
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 402 || data.error === 'credits_exhausted') {
          yield { type: 'credits_exhausted' };
          return;
        }
        yield { type: 'error', message: `Erro ${res.status}` };
        return;
      }
      
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
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
            const json = JSON.parse(data);
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
  
  async generateTitle(message, token, language) {
    try {
      const res = await fetch(`${API_BASE}/ai/title`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message, language: language || 'pt' })
      });
      if (res.ok) {
        const data = await res.json();
        return data.title || message.trim().split(/\s+/).slice(0, 4).join(' ').substring(0, 40);
      }
    } catch (e) { console.error('Generate title error:', e); }
    return message.trim().split(/\s+/).slice(0, 4).join(' ').substring(0, 40);
  }
};