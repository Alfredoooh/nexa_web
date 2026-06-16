// src/pages/LoginPage.tsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { apiLogin } from '../lib/api';
import { saveSession } from '../lib/auth';

interface Props {
  onLogin: () => void;
  onGoRegister: () => void;
}

export default function LoginPage({ onLogin, onGoRegister }: Props) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [err, setErr]           = useState('');

  const handleSubmit = async () => {
    if (!email || !password) { setErr('Preenche todos os campos'); return; }
    setErr(''); setLoading(true);
    try {
      const res = await apiLogin(email.trim(), password);
      saveSession(res.token, { id: res.id, name: res.name, email: res.email, avatar: null });
      onLogin();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 24px 48px',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{ width: '100%', maxWidth: 360 }}
      >
        {/* Logo + título — sempre centrados */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 40 }}>
          <motion.img
            src="/assets/icons/png/logo.png"
            width={72} height={72}
            style={{ borderRadius: 20, marginBottom: 20, boxShadow: '0 8px 24px rgba(0,0,0,0.10)' }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
            alt="Nexa"
          />
          <h1 style={{ fontSize: 28, fontWeight: 700, fontFamily: 'Georgia, serif', color: '#000', margin: 0, textAlign: 'center' }}>Bem-vindo</h1>
          <p style={{ fontSize: 15, color: '#8E8E93', marginTop: 8, textAlign: 'center' }}>Inicia sessão para continuar</p>
        </div>

        {/* Campos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={fieldWrap}>
            <img src="/assets/icons/svg/ai.svg" width={18} height={18} alt="" style={{ filter: 'invert(0.5)', flexShrink: 0 }} />
            <input
              type="email" placeholder="Email" value={email}
              onChange={e => setEmail(e.target.value)}
              style={fieldInput}
            />
          </div>

          <div style={fieldWrap}>
            <img src="/assets/icons/svg/lock.svg" width={18} height={18} alt="" style={{ filter: 'invert(0.5)', flexShrink: 0 }} />
            <input
              type={showPw ? 'text' : 'password'} placeholder="Password" value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              style={fieldInput}
            />
            <button onClick={() => setShowPw(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <img src={showPw ? '/assets/icons/svg/eye_closed.svg' : '/assets/icons/svg/eye.svg'} width={16} height={16} alt="" style={{ filter: 'invert(0.4)' }} />
            </button>
          </div>
        </div>

        {err && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            style={{ color: '#FF3B30', fontSize: 13, marginTop: 12, textAlign: 'center' }}>
            {err}
          </motion.p>
        )}

        <motion.button
          onClick={handleSubmit} disabled={loading}
          whileTap={{ scale: 0.97 }}
          style={{
            marginTop: 24, width: '100%', height: 54,
            borderRadius: 16, border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            background: loading ? '#A0AEC0' : 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
            color: '#fff', fontSize: 16, fontWeight: 700,
            boxShadow: loading ? 'none' : '0 4px 16px rgba(59,130,246,0.35)',
            transition: 'background 0.2s',
          }}
        >
          {loading ? 'A entrar...' : 'Entrar'}
        </motion.button>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: '#8E8E93' }}>
          Não tens conta?{' '}
          <button onClick={onGoRegister} style={{ background: 'none', border: 'none', color: '#3B82F6', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
            Regista-te
          </button>
        </p>
      </motion.div>
    </div>
  );
}

const fieldWrap: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12,
  height: 54, borderRadius: 16,
  border: '1.5px solid rgba(0,0,0,0.10)',
  background: '#FAFAFA', padding: '0 16px',
};
const fieldInput: React.CSSProperties = {
  flex: 1, height: '100%', background: 'transparent',
  border: 'none', outline: 'none',
  fontSize: 15, color: '#000',
};