import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect, useCallback } from 'react';
import Drawer from '../components/Drawer';
import InstallPrompt from '../components/InstallPrompt';
import {
  Conversation, Message,
  apiListConversations, apiCreateConversation,
  apiUpdateConversation, apiGenerateTitle, apiChatStream,
  apiDeleteConversation, apiPinConversation, apiArchiveConversation,
} from '../lib/api';
import { getToken, getStoredUser } from '../lib/auth';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Bom dia';
  if (hour >= 12 && hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export default function ChatPage() {
  const token    = getToken()!;
  const user     = getStoredUser()!;

  const [conversations, setConversations]     = useState<Conversation[]>([]);
  const [activeConv, setActiveConv]           = useState<Conversation | null>(null);
  const [messages, setMessages]               = useState<Message[]>([]);
  const [inputValue, setInputValue]           = useState('');
  const [bottomOffset, setBottomOffset]       = useState(0);
  const [drawerOpen, setDrawerOpen]           = useState(false);
  const [streaming, setStreaming]             = useState(false);
  const [optionsConv, setOptionsConv]         = useState<Conversation | null>(null);

  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef= useRef<HTMLDivElement>(null);

  // ── keyboard offset ───────────────────────────────────────────────────────
  useEffect(() => {
    const update = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      setBottomOffset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
    };
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    return () => {
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
    };
  }, []);

  // ── auto-resize textarea ──────────────────────────────────────────────────
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`;
  }, [inputValue]);

  // ── scroll to bottom ──────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── load conversations ────────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    try {
      const res = await apiListConversations(token);
      setConversations(res.conversations);
    } catch { /* silent */ }
  }, [token]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // ── select conversation ───────────────────────────────────────────────────
  const selectConversation = (conv: Conversation) => {
    setActiveConv(conv);
    setMessages(conv.messages);
  };

  // ── new chat ──────────────────────────────────────────────────────────────
  const newChat = () => {
    setActiveConv(null);
    setMessages([]);
    setInputValue('');
  };

  // ── send ──────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || streaming) return;
    setInputValue('');

    const userMsg: Message = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setStreaming(true);

    // placeholder assistente
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    let fullReply = '';
    await apiChatStream(
      token, newMessages,
      (chunk) => {
        fullReply += chunk;
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: fullReply };
          return updated;
        });
      },
      async () => {
        setStreaming(false);
        const finalMessages: Message[] = [...newMessages, { role: 'assistant', content: fullReply }];

        // Guardar/actualizar conversa
        try {
          if (!activeConv) {
            // Nova conversa
            const titleRes = await apiGenerateTitle(token, text);
            const created  = await apiCreateConversation(token, titleRes.title, finalMessages);
            setActiveConv(created);
            loadConversations();
          } else {
            const updated = await apiUpdateConversation(token, activeConv.id, { messages: finalMessages });
            setActiveConv(updated);
            loadConversations();
          }
        } catch { /* silent */ }
      },
      (e) => { console.error(e); setStreaming(false); },
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const hasText  = inputValue.trim().length > 0;
  const hasChat  = messages.length > 0;

  // ── options modal ─────────────────────────────────────────────────────────
  const handlePin = async (conv: Conversation) => {
    await apiPinConversation(token, conv.id, !conv.pinned);
    setOptionsConv(null);
    loadConversations();
  };

  const handleArchive = async (conv: Conversation) => {
    await apiArchiveConversation(token, conv.id, true);
    setOptionsConv(null);
    if (activeConv?.id === conv.id) newChat();
    loadConversations();
  };

  const handleDelete = async (conv: Conversation) => {
    await apiDeleteConversation(token, conv.id);
    setOptionsConv(null);
    if (activeConv?.id === conv.id) newChat();
    loadConversations();
  };

  return (
    <>
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        conversations={conversations}
        activeId={activeConv?.id || ''}
        userName={user.name}
        onSelect={selectConversation}
        onNewChat={newChat}
        onLongPress={(c) => setOptionsConv(c)}
      />

      {/* Options bottom sheet */}
      <AnimatePresence>
        {optionsConv && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOptionsConv(null)}
              style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.3)' }}
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 34 }}
              style={{
                position: 'fixed', left: 0, right: 0, bottom: 0,
                zIndex: 201, background: '#fff',
                borderRadius: '14px 14px 0 0', padding: '8px 0 32px',
              }}
            >
              {/* Handle */}
              <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E0E0E0', margin: '8px auto 12px' }} />
              {/* Título */}
              <p style={{
                fontSize: 15, fontWeight: 700, color: '#000',
                padding: '0 20px 12px', margin: 0,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {optionsConv.title}
              </p>
              {/* Opções */}
              {[
                { icon: optionsConv.pinned ? 'pin_filled' : 'pin', label: optionsConv.pinned ? 'Desafixar' : 'Fixar conversa', color: '#000', action: () => handlePin(optionsConv) },
                { icon: 'bookmark', label: 'Arquivar conversa', color: '#000', action: () => handleArchive(optionsConv) },
                { icon: 'trash', label: 'Eliminar conversa', color: '#FF3B30', action: () => handleDelete(optionsConv) },
              ].map((opt) => (
                <button
                  key={opt.label}
                  onClick={opt.action}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center',
                    gap: 16, padding: '0 20px', height: 54,
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 15, color: opt.color,
                  }}
                >
                  <img src={`/assets/icons/svg/${opt.icon}.svg`} width={20} height={20} alt=""
                    style={{ filter: opt.color === '#FF3B30' ? 'invert(27%) sepia(97%) saturate(7484%) hue-rotate(355deg) brightness(97%) contrast(106%)' : 'none' }}
                  />
                  {opt.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#F0F0FF' }}>

        {/* AppBar blur */}
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40, height: 80, pointerEvents: 'none' }}>
          <div style={{
            position: 'absolute', inset: 0,
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
            background: 'linear-gradient(to bottom, rgba(240,240,255,0.95) 0%, rgba(240,240,255,0.7) 70%, rgba(240,240,255,0) 100%)',
          }} />
        </div>

        {/* AppBar buttons */}
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px 8px',
        }}>
          <button
            onClick={() => setDrawerOpen(true)}
            style={appbarBtn}
          >
            <img src="/assets/icons/svg/menu.svg" width={16} height={16} alt="Menu" />
          </button>
          <button onClick={newChat} style={appbarBtn}>
            <img src="/assets/icons/svg/new_chat.svg" width={16} height={16} alt="Novo chat" />
          </button>
        </div>

        {/* Conteúdo */}
        {!hasChat ? (
          // ── Ecrã inicial ──
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            paddingTop: 80, paddingBottom: 160,
          }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}
            >
              <motion.img
                src="/assets/icons/png/logo.png"
                width={72} height={72}
                style={{ borderRadius: 18 }}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                alt="Nexa"
              />
              <h1 style={{ fontSize: '2.4rem', fontWeight: 700, fontFamily: 'Georgia, serif', color: '#000', margin: 0 }}>
                {getGreeting()}
              </h1>
              <p style={{ color: '#8E8E93', fontSize: 15, margin: 0 }}>Em que estás a pensar?</p>
            </motion.div>
          </div>
        ) : (
          // ── Mensagens ──
          <div style={{
            flex: 1, overflowY: 'auto',
            paddingTop: 88, paddingBottom: 140,
            display: 'flex', flexDirection: 'column', gap: 12,
            padding: '88px 16px 140px',
          }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '80%', padding: '10px 14px',
                  borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: msg.role === 'user' ? '#3B82F6' : '#fff',
                  color: msg.role === 'user' ? '#fff' : '#000',
                  fontSize: 15, lineHeight: 1.5,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {msg.content || (msg.role === 'assistant' && streaming && i === messages.length - 1
                    ? <span style={{ opacity: 0.4 }}>●●●</span>
                    : null
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input */}
        <div style={{
          position: 'fixed', left: 0, right: 0,
          bottom: bottomOffset, padding: '8px 12px 24px',
          transition: 'bottom 0.2s ease',
        }}>
          <div style={{
            background: '#fff', borderRadius: 24,
            boxShadow: '0 2px 16px rgba(0,0,0,0.1)',
            padding: '12px 16px 12px',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pergunta algo..."
              rows={1}
              style={{
                width: '100%', resize: 'none', background: 'transparent',
                border: 'none', outline: 'none', fontSize: 15,
                color: '#000', lineHeight: 1.5, maxHeight: 140,
                fontFamily: 'inherit', boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button style={iconBtn}>
                <img src="/assets/icons/svg/add.svg" width={16} height={16} alt="+" />
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <motion.button
                  animate={{ opacity: hasText ? 0.3 : 1, scale: hasText ? 0.92 : 1 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: '#F3F3F3', border: 'none', cursor: 'pointer',
                    borderRadius: 20, padding: '6px 12px',
                    pointerEvents: hasText ? 'none' : 'auto',
                  }}
                >
                  <img src="/assets/icons/svg/preview.svg" width={16} height={16} alt="Preview" />
                  <span style={{ fontSize: 14, fontWeight: 500, color: '#333' }}>Preview</span>
                </motion.button>

                <div style={{ position: 'relative', width: 36, height: 36 }}>
                  <AnimatePresence mode="wait">
                    {!hasText ? (
                      <motion.button
                        key="record"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ duration: 0.12 }}
                        style={sendBtn}
                      >
                        <img src="/assets/icons/svg/record.svg" width={16} height={16} alt="Gravar"
                          style={{ filter: 'brightness(0) invert(1)' }} />
                      </motion.button>
                    ) : (
                      <motion.button
                        key="send"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ duration: 0.12 }}
                        onClick={handleSend}
                        style={{ ...sendBtn, cursor: streaming ? 'not-allowed' : 'pointer', opacity: streaming ? 0.6 : 1 }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </div>

        <InstallPrompt />
      </main>
    </>
  );
}

const appbarBtn: React.CSSProperties = {
  width: 32, height: 32, borderRadius: '50%',
  background: 'rgba(255,255,255,0.8)', border: 'none', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
};

const iconBtn: React.CSSProperties = {
  width: 32, height: 32, borderRadius: '50%',
  background: '#F3F3F3', border: 'none', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const sendBtn: React.CSSProperties = {
  position: 'absolute', inset: 0, borderRadius: '50%',
  background: '#3B82F6', border: 'none', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  boxShadow: '0 2px 10px rgba(59,130,246,0.35)',
};
