'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise < void > ;
  userChoice: Promise < { outcome: 'accepted' | 'dismissed' } > ;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
  useState < BeforeInstallPromptEvent | null > (null);
  const [showPrompt, setShowPrompt] = useState(false);
  
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };
    
    window.addEventListener('beforeinstallprompt', handler);
    
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);
  
  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };
  
  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-primary text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-3"
        >
          <span className="text-sm font-medium">Instalar o Nexa</span>
          <button
            onClick={handleInstall}
            className="bg-white text-primary text-sm font-semibold px-4 py-1.5 rounded-full active:scale-95 transition-transform"
          >
            Instalar
          </button>
          <button
            onClick={() => setShowPrompt(false)}
            className="text-white/70 text-sm"
          >
            ✕
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}