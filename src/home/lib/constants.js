// src/routes/home/lib/constants.js

export const THEME_OPTIONS = [
  { id: 'dark', label: 'Escuro' },
  { id: 'light', label: 'Claro' },
  { id: 'system', label: 'Predefinição do sistema' },
];

export const DRAWER_ITEMS = [
  { icon: 'settings', label: 'Definições', action: () => {} },
  { icon: 'help', label: 'Ajuda', action: () => {} },
];

export const HERO_PHRASE = 'Em que estás a pensar hoje?';

export const SUGGESTION_TOGGLES = [
  { id: 'image', label: 'Cria uma imagem', prompt: 'Cria uma imagem de ', icon: '/icons/svg/bw/image.svg' },
  { id: 'story', label: 'Conta uma história', prompt: 'Conta-me uma história sobre ', icon: '/icons/svg/bw/open_book.svg' },
  { id: 'math', label: 'Resolve um problema', prompt: 'Resolve este problema matemático: ', icon: '/icons/svg/bw/math.svg' },
  { id: 'search', label: 'Procure na web', prompt: 'Procura por ', icon: '/icons/svg/bw/browser.svg' },
  { id: 'slides', label: 'Cria slides', prompt: 'Cria uma apresentação de slides sobre ', icon: '/icons/svg/bw/slides.svg' },
  { id: 'pdf', label: 'Analisa um PDF', prompt: 'Analisa este PDF: ', icon: '/icons/svg/bw/pdf.svg' },
];

// Tabs do popup "Apps & Utilitários"
export const MODELS_TABS = [
  { id: 'docs', label: 'Documentos' },
  { id: 'images', label: 'Imagens' },
  { id: 'apps', label: 'Apps' },
];

// Modelos de documentos apresentados no tab "Documentos".
// Cada modelo pré-preenche o prompt do chat com um pedido de documento específico.
export const DOC_MODELS = [
  { id: 'doc-cv', label: 'Currículo', icon: '/icons/svg/bw/pdf.svg', prompt: 'Cria um currículo profissional para ' },
  { id: 'doc-carta', label: 'Carta de Apresentação', icon: '/icons/svg/bw/pdf.svg', prompt: 'Escreve uma carta de apresentação para ' },
  { id: 'doc-relatorio', label: 'Relatório', icon: '/icons/svg/bw/pdf.svg', prompt: 'Cria um relatório sobre ' },
  { id: 'doc-contrato', label: 'Contrato', icon: '/icons/svg/bw/pdf.svg', prompt: 'Redige um modelo de contrato de ' },
  { id: 'doc-ata', label: 'Ata de Reunião', icon: '/icons/svg/bw/pdf.svg', prompt: 'Cria uma ata de reunião sobre ' },
];

// Modelos de imagem apresentados no tab "Imagens".
// As miniaturas são importadas a partir de /images/img_models/ — troca img1.jpg...img6.jpg
// pelos nomes de ficheiro reais quando estiverem disponíveis nessa pasta.
export const IMAGE_MODELS = [
  { id: 'img-1', label: 'Retrato Realista', thumb: '/images/img_models/img1.jpg', prompt: 'Cria uma imagem em estilo retrato realista de ' },
  { id: 'img-2', label: 'Anime', thumb: '/images/img_models/img2.jpg', prompt: 'Cria uma imagem em estilo anime de ' },
  { id: 'img-3', label: '3D Render', thumb: '/images/img_models/img3.jpg', prompt: 'Cria uma imagem em render 3D de ' },
  { id: 'img-4', label: 'Aguarela', thumb: '/images/img_models/img4.jpg', prompt: 'Cria uma imagem em estilo aguarela de ' },
  { id: 'img-5', label: 'Cyberpunk', thumb: '/images/img_models/img5.jpg', prompt: 'Cria uma imagem em estilo cyberpunk de ' },
  { id: 'img-6', label: 'Minimalista', thumb: '/images/img_models/img6.jpg', prompt: 'Cria uma imagem em estilo minimalista de ' },
];

export const AVATAR_COLORS = ['#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#00C7BE', '#007AFF', '#5856D6', '#AF52DE'];

export function getAvatarColor(str) {
  if (!str) return AVATAR_COLORS[0];
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}