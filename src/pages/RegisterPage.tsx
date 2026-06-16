import { useState } from 'react';
import { motion } from 'framer-motion';
import { apiRegister } from '../lib/api';
import { saveSession } from '../lib/auth';

interface Props {
  onLogin: () => void;
  onGoLogin: () => void;
}

export default function RegisterPage({ onLogin, onGoLogin }: Props) {
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [err, setErr]           = useState('');

  const handleSubmit = async () => {
    if (!name || !email || !password) { setErr('Preenche todos os campos'); return; }
    if (password.length < 6) { setErr('Password deve ter pelo menos 6 caracteres'); return; }
    setErr(''); setLoading(true);
    try {
      const res = await apiRegister(name.trim(), email.trim(), password);
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
      minHeight: '100vh', background: '#F0F0FF',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '24px 24px 48px',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{ width: '100%', maxWidth: 380 }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <img
            src="/assets/icons/png/logo.png"
            width={64} height={64}
            style={{ borderRadius: 16, marginBottom: 16 }}
            alt="Nexa"
          />
          <h1 style={{ fontSize: 28, fontWeight: 700, fontFamily: 'Georgia, serif', color: '#000', margin: 0 }}>
            Criar conta
          </h1>
          <p style={{ fontSize: 15, color: '#8E8E93', marginTop: 6 }}>Junta-te à Nexa</p>
        </div>

        {/* Campos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="text"
            placeholder="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Password (mín. 6 caracteres)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            style={inputStyle}
          />
        </div>

        {err && (
          <p style={{ color: '#FF3B30', fontSize: 13, marginTop: 10, textAlign: 'center' }}>{err}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            marginTop: 20, width: '100%', height: 52,
            borderRadius: 14, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            background: loading ? '#A0AEC0' : '#3B82F6',
            color: '#fff', fontSize: 16, fontWeight: 600,
            transition: 'background 0.2s',
          }}
        >
          {loading ? 'A criar conta...' : 'Criar conta'}
        </button>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#8E8E93' }}>
          Já tens conta?{' '}
          <button
            onClick={onGoLogin}
            style={{ background: 'none', border: 'none', color: '#3B82F6', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
          >
            Entrar
          </button>
        </p>
      </motion.div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', height: 52, borderRadius: 14,
  border: '1.5px solid rgba(0,0,0,0.1)', background: '#fff',
  padding: '0 16px', fontSize: 15, color: '#000', outline: 'none',
  boxSizing: 'border-box',
};
