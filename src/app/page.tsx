'use client';

import { motion } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import InstallPrompt from '@/components/InstallPrompt';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Bom dia';
  if (hour >= 12 && hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export default function Home() {
  const [inputValue, setInputValue] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [mounted, setMounted] = useState(false);
  const textareaRef = useRef < HTMLTextAreaElement > (null);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => {
      const visualHeight = window.visualViewport?.height ?? window.innerHeight;
      const windowHeight = window.screen.height;
      const diff = windowHeight - visualHeight;
      setKeyboardHeight(diff > 100 ? Math.min(diff * 0.5, 180) : 0);
    };
    window.visualViewport?.addEventListener('resize', onResize);
    return () => window.visualViewport?.removeEventListener('resize', onResize);
  }, []);
  
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`;
  }, [inputValue]);
  
  const handleSend = () => {
    if (!inputValue.trim()) return;
    setInputValue('');
  };
  
  const handleKeyDown = (e: React.KeyboardEvent < HTMLTextAreaElement > ) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  const hasText = inputValue.trim().length > 0;
  
  return (
    <main className="min-h-screen flex flex-col bg-[#F0F0FF]">

      {/* Progressive blur AppBar */}
      <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none" style={{ height: 90 }}>
        <div style={{
          position: 'absolute', inset: 0,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
          background: 'linear-gradient(to bottom, rgba(240,240,255,0.95) 0%, rgba(240,240,255,0.7) 70%, rgba(240,240,255,0) 100%)',
        }} />
      </div>

      {/* Botões AppBar fixos */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 pt-4 pb-2 pointer-events-none">
        <button className="w-11 h-11 rounded-full bg-white/80 flex items-center justify-center shadow-sm pointer-events-auto">
          <img src="/assets/icons/svg/menu.svg" alt="Menu" width={22} height={22} />
        </button>
        <button className="w-11 h-11 rounded-full bg-white/80 flex items-center justify-center shadow-sm pointer-events-auto">
          <img src="/assets/icons/svg/new_chat.svg" alt="Novo chat" width={22} height={22} />
        </button>
      </div>

      {/* Centro */}
      <div className="flex-1 flex flex-col items-center justify-center px-6" style={{ paddingTop: 80, paddingBottom: 160 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="flex flex-col items-center gap-4"
        >
          <img src="/assets/icons/png/logo.png" alt="Nexa logo" width={72} height={72} style={{ borderRadius: 18 }} />
          <h1 className="text-[2.6rem] font-bold text-black leading-tight text-center" style={{ fontFamily: 'Georgia, serif' }}>
            {mounted ? getGreeting() : 'Olá'}
          </h1>
          <p className="text-gray-400 text-base text-center">Em que estás a pensar?</p>
        </motion.div>
      </div>

      {/* Input */}
      <motion.div
        className="fixed left-0 right-0 px-3 pb-6 pt-2"
        animate={{ bottom: keyboardHeight }}
        transition={{ type: 'spring', stiffness: 120, damping: 28, mass: 0.8 }}
      >
        <div className="bg-white rounded-3xl shadow-lg px-4 pt-3 pb-3 flex flex-col gap-3">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pergunta algo..."
            rows={1}
            className="w-full resize-none bg-transparent text-gray-800 placeholder-gray-400 text-base outline-none leading-relaxed"
            style={{ maxHeight: 140 }}
          />
          <div className="flex items-center justify-between">
            <button className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
              <img src="/assets/icons/svg/add.svg" alt="Adicionar" width={18} height={18} />
            </button>
            <div className="flex items-center gap-2">
              {!hasText && (
                <button className="flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-2">
                  <img src="/assets/icons/svg/preview.svg" alt="Preview" width={18} height={18} />
                  <span className="text-sm font-medium text-gray-700">Preview</span>
                </button>
              )}
              {hasText ? (
                <motion.button
                  key="send"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.15 }}
                  onClick={handleSend}
                  className="w-11 h-11 rounded-full bg-blue-500 flex items-center justify-center shadow-md"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </motion.button>
              ) : (
                <button className="w-11 h-11 rounded-full bg-blue-500 flex items-center justify-center shadow-md">
                  <img src="/assets/icons/svg/record.svg" alt="Gravar" width={20} height={20} style={{ filter: 'brightness(0) invert(1)' }} />
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <InstallPrompt />
    </main>
  );
}