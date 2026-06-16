import { AnimatePresence, motion } from 'framer-motion';
import { Conversation } from '../lib/api';

function groupConversations(list: Conversation[]) {
  const now  = Date.now();
  const day7 = now - 7  * 24 * 3600 * 1000;
  const day30= now - 30 * 24 * 3600 * 1000;
  const g7   = list.filter((c) => c.updatedAt >= day7);
  const g30  = list.filter((c) => c.updatedAt < day7 && c.updatedAt >= day30);
  const older= list.filter((c) => c.updatedAt < day30);
  const result: { label: string; items: Conversation[] }[] = [];
  if (g7.length)    result.push({ label: '7 Dias',      items: g7 });
  if (g30.length)   result.push({ label: '30 Dias',     items: g30 });
  if (older.length) result.push({ label: 'Mais antigo', items: older });
  return result;
}

interface Props {
  open: boolean;
  onClose: () => void;
  conversations: Conversation[];
  activeId: string;
  userName: string;
  onSelect: (c: Conversation) => void;
  onNewChat: () => void;
  onLongPress: (c: Conversation) => void;
}

const APP_NAME = 'Nexa';

export default function Drawer({
  open, onClose, conversations, activeId, userName,
  onSelect, onNewChat, onLongPress,
}: Props) {
  const groups  = groupConversations(conversations);
  const initial = (userName || 'U')[0].toUpperCase();

  // Long press detection
  let pressTimer: ReturnType<typeof setTimeout> | null = null;
  const startPress = (c: Conversation) => {
    pressTimer = setTimeout(() => { onLongPress(c); }, 500);
  };
  const cancelPress = () => { if (pressTimer) clearTimeout(pressTimer); };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.25)' }}
          />
          <motion.div
            key="drawer"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34, mass: 0.9 }}
            style={{
              position: 'fixed', top: 0, left: 0, bottom: 0,
              width: '78%', maxWidth: 320, zIndex: 101,
              background: '#EBEBF5',
              display: 'flex', flexDirection: 'column',
            }}
          >
            {/* Título */}
            <div style={{ padding: '56px 24px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 28, fontWeight: 700, fontFamily: 'Georgia, serif', color: '#000' }}>
                {APP_NAME}
              </span>
              <button
                onClick={() => { onNewChat(); onClose(); }}
                style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: 'rgba(0,0,0,0.07)', border: 'none',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <img src="/assets/icons/svg/new_chat.svg" width={16} height={16} alt="Novo chat" />
              </button>
            </div>

            <div style={{ height: 1, background: 'rgba(0,0,0,0.08)', marginBottom: 8 }} />

            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.6, color: '#8E8E93', padding: '8px 24px 4px' }}>
              CONVERSAS
            </div>

            {/* Lista */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {conversations.length === 0 && (
                <p style={{ color: '#8E8E93', fontSize: 14, textAlign: 'center', marginTop: 32 }}>
                  Sem conversas
                </p>
              )}
              {groups.map((group) => (
                <div key={group.label}>
                  <div style={{ fontSize: 12, color: '#8E8E93', padding: '10px 24px 4px' }}>
                    {group.label}
                  </div>
                  {group.items.map((conv) => {
                    const isActive = conv.id === activeId;
                    return (
                      <button
                        key={conv.id}
                        onClick={() => { onSelect(conv); onClose(); }}
                        onMouseDown={() => startPress(conv)}
                        onMouseUp={cancelPress}
                        onTouchStart={() => startPress(conv)}
                        onTouchEnd={cancelPress}
                        style={{
                          width: '100%', textAlign: 'left',
                          padding: '11px 24px 11px 20px',
                          background: isActive ? 'rgba(59,130,246,0.1)' : 'none',
                          border: 'none', cursor: 'pointer',
                          fontSize: 14.5,
                          color: isActive ? '#3B82F6' : '#000',
                          fontWeight: isActive ? 600 : 400,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          display: 'flex', alignItems: 'center', gap: 8,
                          borderRadius: 10, margin: '2px 8px', width: 'calc(100% - 16px)',
                        }}
                      >
                        {conv.pinned && (
                          <img src="/assets/icons/svg/pin_filled.svg" width={12} height={12} alt="" style={{ flexShrink: 0 }} />
                        )}
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{conv.title}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Rodapé */}
            <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }}>
              <button
                style={{
                  width: '100%', display: 'flex', alignItems: 'center',
                  padding: '14px 20px', gap: 12,
                  background: 'none', border: 'none', cursor: 'pointer',
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', background: '#3B82F6',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{initial}</span>
                </div>
                <span style={{
                  flex: 1, fontSize: 15, fontWeight: 600, color: '#000',
                  textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {userName}
                </span>
                <img src="/assets/icons/svg/chevron_right.svg" width={13} height={13} alt="" style={{ opacity: 0.4 }} />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
