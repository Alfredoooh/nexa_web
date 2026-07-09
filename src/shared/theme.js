// Paleta de cores do Downora, com suporte a modo claro/escuro.
// Uso: const c = getThemeColors(isDark);  ->  style="color:{c.textPrimary}"

const LIGHT = {
  background: '#FFFFFF',
  surface: '#F5F6F8',
  dialogBackground: '#FFFFFF',
  appbarBtnBg: 'rgba(0,0,0,0.05)',
  primary: '#3D8BFF',
  primaryStrong: '#2E6FE0',
  textPrimary: 'rgba(20,20,20,0.90)',
  textSecondary: 'rgba(20,20,20,0.46)',
  iconTint: 'rgba(20,20,20,0.82)',
  divider: 'rgba(0,0,0,0.08)',
};

const DARK = {
  background: '#0B0D10',
  surface: '#14171C',
  dialogBackground: '#1B1F26',
  appbarBtnBg: 'rgba(255,255,255,0.08)',
  primary: '#3D8BFF',
  primaryStrong: '#5EA1FF',
  textPrimary: 'rgba(255,255,255,0.94)',
  textSecondary: 'rgba(255,255,255,0.50)',
  iconTint: 'rgba(255,255,255,0.88)',
  divider: 'rgba(255,255,255,0.10)',
};

export function getThemeColors(isDark) {
  return isDark ? DARK : LIGHT;
}
