// Paleta do Downora — inspirada no M3 Expressive Design (Google)
// Mantém apenas preto, branco e cinzas derivados, sem cores de destaque.
// Uso: const c = getThemeColors(isDark);

const LIGHT = {
  background: '#FFFBFE', // M3 surface
  surface: '#F5F5F5', // M3 surface container lowest
  dialogBackground: '#FFFFFF', // M3 surface container
  appbarBtnBg: 'rgba(0,0,0,0.05)',
  drawerBg: '#FFFBFE',
  drawerOverlay: 'rgba(0,0,0,0.35)',
  primary: '#1C1B1F', // on surface
  primaryStrong: '#000000',
  textPrimary: 'rgba(0,0,0,0.87)',
  textSecondary: 'rgba(0,0,0,0.60)',
  iconTint: 'rgba(0,0,0,0.70)',
  divider: 'rgba(0,0,0,0.12)',
};

const DARK = {
  background: '#1C1B1F', // M3 surface
  surface: '#2B2B2B', // M3 surface container lowest
  dialogBackground: '#2B2B2B', // M3 surface container
  appbarBtnBg: 'rgba(255,255,255,0.08)',
  drawerBg: '#1C1B1F',
  drawerOverlay: 'rgba(0,0,0,0.5)',
  primary: '#E6E1E5', // on surface
  primaryStrong: '#FFFFFF',
  textPrimary: 'rgba(255,255,255,0.87)',
  textSecondary: 'rgba(255,255,255,0.60)',
  iconTint: 'rgba(255,255,255,0.80)',
  divider: 'rgba(255,255,255,0.12)',
};

export function getThemeColors(isDark) {
  return isDark ? DARK : LIGHT;
}