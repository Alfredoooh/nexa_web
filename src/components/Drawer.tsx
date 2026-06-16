import { AnimatePresence, motion } from 'framer-motion';

interface Conversation {
  id: string;
  title: string;
  pinned ? : boolean;
  updatedAt: number;
}

// Dados mock — depois substituis por fetch real
const MOCK_CONVERSATIONS: Conversation[] = [
  { id: '1', title: 'Olá', pinned: false, updatedAt: Date.now() - 1 * 24 * 3600 * 1000 },
  { id: '2', title: 'Nova conversa', pinned: false, updatedAt: Date.now() - 2 * 24 * 3600 * 1000 },
];

function groupConversations(list: Conversation[]) {
  const now = Date.now();
  const day7 = now - 7 * 24 * 3600 * 1000;
  const day30 = now - 30 * 24 * 3600 * 1000;
  
  const g7 = list.filter((c) => c.updatedAt >= day7);
  const g30 = list.filter((c) => c.updatedAt < day7 && c.updatedAt >= day30);
  const older = list.filter((c) => c.updatedAt < day30);
  
  const result: { label ? : string;items: Conversation[] } [] = [];
  if (g7.length) result.push({ label: '7 Dias', items: g7 });
  if (g30.length) result.push({ label: '30 Dias', items: g30 });
  if (older.length) result.push({ label: 'Mais antigo', items: older });
  return result;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

const APP_NAME = 'Nexa'; // muda aqui o nome da app

export default function Drawer({ open, onClose }: Props) {
  const groups = groupConversations(MOCK_CONVERSATIONS);
  const userName = 'Jonah M';
  const initial = userName[0].toUpperCase();
  
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, zIndex: 100,
              background: 'rgba(0,0,0,0.25)',
            }}
          />

          {/* Drawer */}
          <motion.div
            key="drawer"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34, mass: 0.9 }}
            style={{
              position: 'fixed', top: 0, left: 0, bottom: 0,
              width: '78%', maxWidth: 320,
              zIndex: 101,
              background: '#EBEBF5',
              display: 'flex', flexDirection: 'column',
            }}
          >
            {/* Título da app */}
            <div style={{ padding: '56px 24px 12px' }}>
              <span style={{
                fontSize: 28, fontWeight: 700,
                fontFamily: 'Georgia, serif',
                color: '#000',
              }}>
                {APP_NAME}
              </span>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: 'rgba(0,0,0,0.08)', marginBottom: 8 }} />

            {/* Label CONVERSAS */}
            <div style={{
              fontSize: 11, fontWeight: 600, letterSpacing: 0.6,
              color: '#8E8E93', padding: '8px 24px 4px',
            }}>
              CONVERSAS
            </div>

            {/* Lista scrollable */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {groups.map((group) => (
                <div key={group.label}>
                  {group.label && (
                    <div style={{
                      fontSize: 12, color: '#8E8E93',
                      padding: '10px 24px 4px',
                    }}>
                      {group.label}
                    </div>
                  )}
                  {group.items.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={onClose}
                      style={{
                        width: '100%', textAlign: 'left',
                        padding: '11px 24px',
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 15, color: '#000',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        display: 'flex', alignItems: 'center', gap: 8,
                      }}
                    >
                      {conv.pinned && (
                        <img src="/assets/icons/svg/pin_filled.svg" width={12} height={12} alt="" />
                      )}
                      {conv.title}
                    </button>
                  ))}
                </div>
              ))}
            </div>

            {/* Rodapé: avatar + nome + chevron */}
            <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }}>
              <button
                style={{
                  width: '100%', display: 'flex', alignItems: 'center',
                  padding: '14px 20px', gap: 12,
                  background: 'none', border: 'none', cursor: 'pointer',
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: '#3B82F6',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{initial}</span>
                </div>

                {/* Nome */}
                <span style={{
                  flex: 1, fontSize: 15, fontWeight: 600,
                  color: '#000', textAlign: 'left',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {userName}
                </span>

                {/* Chevron */}
                <img src="/assets/icons/svg/chevron_right.svg" width={13} height={13} alt="" style={{ opacity: 0.4 }} />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}