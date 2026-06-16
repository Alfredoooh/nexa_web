import { useState } from 'react';
import { isLoggedIn } from './lib/auth';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ChatPage from './pages/ChatPage';

type Screen = 'login' | 'register' | 'chat';

export default function App() {
  const [screen, setScreen] = useState<Screen>(isLoggedIn() ? 'chat' : 'login');

  if (screen === 'chat')    return <ChatPage />;
  if (screen === 'register') return (
    <RegisterPage
      onLogin={() => setScreen('chat')}
      onGoLogin={() => setScreen('login')}
    />
  );
  return (
    <LoginPage
      onLogin={() => setScreen('chat')}
      onGoRegister={() => setScreen('register')}
    />
  );
}
