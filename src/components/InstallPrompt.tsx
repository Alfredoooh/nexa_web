import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShow(false);
    setDeferredPrompt(null);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-32 left-4 right-4 bg-white rounded-2xl shadow-xl px-5 py-4 flex items-center justify-between z-50"
        >
          <div className="flex items-center gap-3">
            <img src="/assets/icons/png/logo.png" width={40} height={40} style={{ borderRadius: 10 }} alt="Nexa" />
            <div>
              <p className="font-semibold text-gray-900 text-sm">Instalar Nexa</p>
              <p className="text-gray-400 text-xs">Adicionar ao ecrã inicial</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShow(false)}
              className="text-sm text-gray-400 px-3 py-1.5 rounded-xl"
            >
              Agora não
            </button>
            <button
              onClick={handleInstall}
              className="text-sm text-white bg-blue-500 px-4 py-1.5 rounded-xl font-medium"
            >
              Instalar
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
