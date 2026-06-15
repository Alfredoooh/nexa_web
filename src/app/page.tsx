'use client';

import { motion } from 'framer-motion';
import InstallPrompt from '@/components/InstallPrompt';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="text-center"
      >
        <h1 className="text-5xl font-bold text-primary mb-4">Nexa</h1>
        <p className="text-gray-600 text-lg">
          Bem-vindo ao seu novo web app.
        </p>
      </motion.div>

      <InstallPrompt />
    </main>
  );
}