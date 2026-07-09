// Paleta do Downora — apenas preto, branco quente e cinzas derivados.
// Sem cores de destaque (nada de azul/verde). Uso: const c = getThemeColors(isDark);

const WARM_WHITE = '#FEFCF7'; // branco levemente amarelado, não puro
const WARM_WHITE_DIM = '#F3F1EA';

const LIGHT = {
  background: WARM_WHITE,
  surface: WARM_WHITE_DIM,
  dialogBackground: WARM_WHITE,
  appbarBtnBg: 'rgba(20,18,14,0.06)',
  drawerBg: WARM_WHITE,
  drawerOverlay: 'rgba(20,18,14,0.35)',
  primary: '#1A1815',
  primaryStrong: '#000000',
  textPrimary: 'rgba(20,18,14,0.92)',
  textSecondary: 'rgba(20,18,14,0.48)',
  iconTint: 'rgba(20,18,14,0.82)',
  divider: 'rgba(20,18,14,0.09)',
};

const DARK = {
  background: '#0E0D0B',
  surface: '#17160F',
  dialogBackground: '#1D1B14',
  appbarBtnBg: 'rgba(254,252,247,0.08)',
  drawerBg: '#141310',
  drawerOverlay: 'rgba(0,0,0,0.5)',
  primary: WARM_WHITE,
  primaryStrong: '#FFFFFF',
  textPrimary: 'rgba(254,252,247,0.94)',
  textSecondary: 'rgba(254,252,247,0.48)',
  iconTint: 'rgba(254,252,247,0.88)',
  divider: 'rgba(254,252,247,0.10)',
};

export function getThemeColors(isDark) {
  return isDark ? DARK : LIGHT;
}