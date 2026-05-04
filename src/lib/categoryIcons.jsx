/**
 * Icônes custom + tokens de couleur pour les 7 catégories de vœux.
 *
 * Icônes SVG trait (24×24 viewBox, stroke=currentColor) keyées par slug.
 * Tokens de couleur par catégorie : { hue, tint, deep, grad } pour donner
 * à chaque catégorie sa signature chromatique dans la page CategoryChoice.
 *
 * Issu du design "Direction B — Gradient Glyph" fait sur claude.ai/design.
 */

// ---------- Icônes ----------
const I = ({ children, size = 24, stroke = 1.85, style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
    aria-hidden="true"
  >
    {children}
  </svg>
)

// 1. Exauce mon rêve — étoile filante
const IconDream = (p) => (
  <I {...p}>
    <path d="M12 3.5l1.6 4.2 4.4.4-3.3 2.9 1 4.3L12 13l-3.7 2.3 1-4.3L6 8.1l4.4-.4L12 3.5z" />
    <path d="M5 17l-1.5 1.5" />
    <path d="M19 17l1.5 1.5" />
    <path d="M12 19v2" />
  </I>
)

// 2. Divertis-moi — confettis
const IconFun = (p) => (
  <I {...p}>
    <path d="M5 19l3-9 6 6-9 3z" />
    <path d="M13 5l.7 1.5L15 7l-1.3.5L13 9l-.7-1.5L11 7l1.3-.5z" />
    <path d="M19 11l.5 1 1 .5-1 .5-.5 1-.5-1-1-.5 1-.5z" />
    <path d="M17 16l.4.9.9.4-.9.4-.4.9-.4-.9-.9-.4.9-.4z" />
  </I>
)

// 3. Sauve-moi — bouée
const IconRescue = (p) => (
  <I {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="3.5" />
    <path d="M12 3.5v5" />
    <path d="M12 15.5v5" />
    <path d="M3.5 12h5" />
    <path d="M15.5 12h5" />
  </I>
)

// 4. Fais-le pour moi — caisse à outils
const IconDelegate = (p) => (
  <I {...p}>
    <path d="M4 9h16v10.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9z" />
    <path d="M9 9V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v3" />
    <path d="M4 13h16" />
    <path d="M10.5 13v2h3v-2" />
  </I>
)

// 5. Apprends-moi — livre ouvert
const IconLearn = (p) => (
  <I {...p}>
    <path d="M4 5.5c2.5-.5 5 0 8 2 3-2 5.5-2.5 8-2v12.5c-2.5-.5-5 0-8 2-3-2-5.5-2.5-8-2V5.5z" />
    <path d="M12 7.5v12" />
  </I>
)

// 6. Prends soin de moi — main tenant un cœur
const IconCare = (p) => (
  <I {...p}>
    <path d="M12 9.5c-1.3-2-4.5-2-5.5.5-.9 2.3 1.2 4.3 5.5 7 4.3-2.7 6.4-4.7 5.5-7-1-2.5-4.2-2.5-5.5-.5z" />
    <path d="M4 14.5c.8 2.5 3 4.5 8 6 5-1.5 7.2-3.5 8-6" />
  </I>
)

// 7. Transporte-moi — flèche + waypoints
const IconTransport = (p) => (
  <I {...p}>
    <path d="M3 17h2l1.5-5h10L18 17h3" />
    <circle cx="8" cy="17" r="2" />
    <circle cx="17" cy="17" r="2" />
    <path d="M8 12V7h6l2 2" />
  </I>
)

export const CATEGORY_ICONS = {
  exauce: IconDream,
  divertis: IconFun,
  sauve: IconRescue,
  delegue: IconDelegate,
  apprends: IconLearn,
  soin: IconCare,
  transport: IconTransport,
}

// ---------- Tokens de couleur par slug ----------
// hue : couleur principale (bordure, icône au repos)
// tint : fond tinté léger (carte sélectionnée)
// deep : couleur sombre lisible sur fond tint (titre / description sélectionnés)
// grad : gradient pour l'icône sélectionnée
export const CATEGORY_COLORS = {
  exauce: {
    hue: '#F4B53C',
    tint: '#FFF6E0',
    deep: '#8A5A00',
    grad: 'linear-gradient(135deg, #FFD36B 0%, #F59E0B 100%)',
  },
  divertis: {
    hue: '#EC4899',
    tint: '#FFE7F2',
    deep: '#9B1D5B',
    grad: 'linear-gradient(135deg, #FF8EC7 0%, #EC4899 100%)',
  },
  sauve: {
    hue: '#EF4444',
    tint: '#FFE6E4',
    deep: '#991B1B',
    grad: 'linear-gradient(135deg, #FF8A7A 0%, #EF4444 100%)',
  },
  delegue: {
    hue: '#5B6BF5',
    tint: '#EAEDFF',
    deep: '#2A337A',
    grad: 'linear-gradient(135deg, #8CA0FF 0%, #5B6BF5 100%)',
  },
  apprends: {
    hue: '#9B59F5',
    tint: '#F2E9FF',
    deep: '#4C2388',
    grad: 'linear-gradient(135deg, #C59BFF 0%, #9B59F5 100%)',
  },
  soin: {
    hue: '#14B8A6',
    tint: '#DFF7F3',
    deep: '#0C6B62',
    grad: 'linear-gradient(135deg, #6FE3D3 0%, #14B8A6 100%)',
  },
  transport: {
    hue: '#22C55E',
    tint: '#DFF7E6',
    deep: '#0F5F2D',
    grad: 'linear-gradient(135deg, #7DE39A 0%, #22C55E 100%)',
  },
}

// Fallback neutre si un slug inconnu arrive
export const DEFAULT_CATEGORY_COLOR = {
  hue: '#5B6BF5',
  tint: '#EAEDFF',
  deep: '#2A337A',
  grad: 'linear-gradient(135deg, #8CA0FF 0%, #5B6BF5 100%)',
}

// ---------- SVG paths bruts pour usage hors React (Leaflet divIcon, etc.) ----------
// Permet d'inliner un SVG dans une string HTML sans passer par JSX.
const CATEGORY_SVG_INNER = {
  exauce: '<path d="M12 3.5l1.6 4.2 4.4.4-3.3 2.9 1 4.3L12 13l-3.7 2.3 1-4.3L6 8.1l4.4-.4L12 3.5z"/><path d="M5 17l-1.5 1.5"/><path d="M19 17l1.5 1.5"/><path d="M12 19v2"/>',
  divertis: '<path d="M5 19l3-9 6 6-9 3z"/><path d="M13 5l.7 1.5L15 7l-1.3.5L13 9l-.7-1.5L11 7l1.3-.5z"/><path d="M19 11l.5 1 1 .5-1 .5-.5 1-.5-1-1-.5 1-.5z"/><path d="M17 16l.4.9.9.4-.9.4-.4.9-.4-.9-.9-.4.9-.4z"/>',
  sauve: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.5"/><path d="M12 3.5v5"/><path d="M12 15.5v5"/><path d="M3.5 12h5"/><path d="M15.5 12h5"/>',
  delegue: '<path d="M4 9h16v10.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9z"/><path d="M9 9V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v3"/><path d="M4 13h16"/><path d="M10.5 13v2h3v-2"/>',
  apprends: '<path d="M4 5.5c2.5-.5 5 0 8 2 3-2 5.5-2.5 8-2v12.5c-2.5-.5-5 0-8 2-3-2-5.5-2.5-8-2V5.5z"/><path d="M12 7.5v12"/>',
  soin: '<path d="M12 9.5c-1.3-2-4.5-2-5.5.5-.9 2.3 1.2 4.3 5.5 7 4.3-2.7 6.4-4.7 5.5-7-1-2.5-4.2-2.5-5.5-.5z"/><path d="M4 14.5c.8 2.5 3 4.5 8 6 5-1.5 7.2-3.5 8-6"/>',
  transport: '<path d="M3 17h2l1.5-5h10L18 17h3"/><circle cx="8" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M8 12V7h6l2 2"/>',
}

/**
 * Retourne une string HTML d'un SVG icône de catégorie + un fond gradient.
 * Utile pour les markers Leaflet où on doit inliner du HTML.
 */
export function getCategorySvgHtml(slug, { size = 28, stroke = '#fff', strokeWidth = 1.85 } = {}) {
  const inner = CATEGORY_SVG_INNER[slug]
  if (!inner) return ''
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`
}
