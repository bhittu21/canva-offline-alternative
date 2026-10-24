import type { FontStyle, Gradient } from '@shared/model'
import { linear, radial } from '../templateKit'

/**
 * Colour and type styles for the generated templates. Each theme is checked
 * by a unit test for readable contrast between its text and fill colours.
 */

export type Mood = 'bold' | 'elegant' | 'playful' | 'corporate' | 'calm' | 'festive' | 'dark' | 'fresh' | 'warm' | 'minimal' | 'kids' | 'luxury' | 'tech' | 'nature'

export interface FontSpec {
  family: string
  style: FontStyle
  upper?: boolean
  /** Letter spacing as a share of the font size. */
  spacing?: number
  lineHeight?: number
  boldOk?: boolean
}

export type Deco = 'blobs' | 'circles' | 'rings' | 'dots' | 'lines' | 'corners' | 'waves' | 'stripes' | 'arches' | 'sparkles' | 'confetti' | 'leaves' | 'grid' | 'none'

export interface Theme {
  id: string
  name: string
  mood: Mood[]
  bg: string
  bgGradient?: Gradient
  /** Text on the page background. */
  ink: string
  muted: string
  /** Accent-coloured text that is still readable on the background. */
  accentText: string
  accent: string
  /** Text on an accent fill. */
  onAccent: string
  accent2: string
  /** Cards and panels, with their own text colours. */
  surface: string
  surfaceInk: string
  surfaceMuted: string
  /** Soft decoration colours, close to the background. */
  soft: string
  soft2: string
  line: string
  head: FontSpec
  body: FontSpec
  accentFont?: FontSpec
  deco: Deco
  dark: boolean
}

const inter: FontSpec = { family: 'Inter', style: 'normal' }
const poppins: FontSpec = { family: 'Poppins', style: 'normal' }
const montserrat: FontSpec = { family: 'Montserrat', style: 'normal' }
const nunito: FontSpec = { family: 'Nunito', style: 'normal' }
const work: FontSpec = { family: 'Work Sans', style: 'normal' }
const raleway: FontSpec = { family: 'Raleway', style: 'normal' }
const lora: FontSpec = { family: 'Lora', style: 'normal' }
const josefin: FontSpec = { family: 'Josefin Sans', style: 'normal' }
const quicksand: FontSpec = { family: 'Quicksand', style: 'normal' }

type ThemeInput = Omit<Theme, 'surface' | 'surfaceInk' | 'surfaceMuted' | 'soft2' | 'line' | 'dark'> & Partial<Pick<Theme, 'surface' | 'surfaceInk' | 'surfaceMuted' | 'soft2' | 'line' | 'dark'>>

function theme(t: ThemeInput): Theme {
  const dark = t.dark ?? false
  return {
    surface: dark ? '#ffffff' : '#ffffff',
    surfaceInk: '#1f2329',
    surfaceMuted: '#4b5260',
    soft2: t.soft,
    line: t.soft,
    ...t,
    dark
  }
}

export const themes: Theme[] = [
  // ---- bold and bright
  theme({ id: 'citrus', name: 'Citrus', mood: ['bold', 'playful', 'warm'], bg: '#fff4e8', ink: '#1f2329', muted: '#5b4636', accentText: '#c2410c', accent: '#ff5a36', onAccent: '#1f2329', accent2: '#ffd166', soft: '#ffd9bf', soft2: '#ffe8a3', head: { family: 'Anton', style: 'normal', upper: true, lineHeight: 1.02, spacing: 0.01 }, body: montserrat, deco: 'blobs' }),
  theme({ id: 'electric', name: 'Electric', mood: ['bold', 'tech', 'dark'], bg: '#101028', bgGradient: radial('#262a6b', '#101028'), ink: '#ffffff', muted: '#c9c6ff', accentText: '#ff7ad0', accent: '#ff66c4', onAccent: '#1a0b2e', accent2: '#5ce1e6', soft: '#2a2d6e', soft2: '#3a2462', surface: '#1d1f4a', surfaceInk: '#ffffff', surfaceMuted: '#c9c6ff', head: { family: 'Bebas Neue', style: 'normal', spacing: 0.03, lineHeight: 1 }, body: inter, deco: 'rings', dark: true }),
  theme({ id: 'sunny', name: 'Sunny', mood: ['bold', 'playful', 'kids'], bg: '#ffd84d', ink: '#1f2329', muted: '#3d3420', accentText: '#1f2329', accent: '#1f2329', onAccent: '#ffd84d', accent2: '#ff6b6b', soft: '#ffe58a', soft2: '#ffc43d', head: { family: 'Archivo Black', style: 'normal', lineHeight: 1.05 }, body: poppins, deco: 'circles' }),
  theme({ id: 'cobalt', name: 'Cobalt', mood: ['bold', 'corporate', 'tech'], bg: '#1d4ed8', ink: '#ffffff', muted: '#dbe6ff', accentText: '#fde047', accent: '#fde047', onAccent: '#1e2a5a', accent2: '#60a5fa', soft: '#2f5ee6', soft2: '#173fb3', surface: '#ffffff', surfaceInk: '#0f1b3d', surfaceMuted: '#3b4a6b', head: { family: 'Montserrat', style: 'bold', lineHeight: 1.08 }, body: inter, deco: 'grid', dark: true }),
  theme({ id: 'tomato', name: 'Tomato', mood: ['bold', 'warm', 'festive'], bg: '#c8102e', ink: '#ffffff', muted: '#ffe3e5', accentText: '#ffe8a3', accent: '#fff1d6', onAccent: '#7a1520', accent2: '#ffd166', soft: '#d42a40', soft2: '#b30d27', surface: '#fff8ef', surfaceInk: '#3a1115', surfaceMuted: '#6b3a3f', head: { family: 'Archivo Black', style: 'normal', upper: true, lineHeight: 1.04 }, body: poppins, deco: 'stripes', dark: true }),
  theme({ id: 'lime', name: 'Lime pop', mood: ['bold', 'fresh', 'playful'], bg: '#d9f99d', ink: '#14290b', muted: '#36502a', accentText: '#3f6212', accent: '#14290b', onAccent: '#d9f99d', accent2: '#84cc16', soft: '#c6f06b', soft2: '#ecfccb', head: { family: 'Space Grotesk', style: 'bold', lineHeight: 1.04, spacing: -0.01 }, body: inter, deco: 'dots' }),
  theme({ id: 'magenta', name: 'Magenta', mood: ['bold', 'playful', 'festive'], bg: '#ffffff', bgGradient: linear(135, '#c81e64', '#6a3bd1'), ink: '#ffffff', muted: '#fde7f3', accentText: '#fff3a3', accent: '#ffffff', onAccent: '#7a1f5c', accent2: '#ffd166', soft: '#d83a78', soft2: '#7b4fdc', surface: '#ffffff', surfaceInk: '#2a1033', surfaceMuted: '#5e4466', head: { family: 'Poppins', style: 'bold', lineHeight: 1.06 }, body: poppins, deco: 'sparkles', dark: true }),
  theme({ id: 'mono-punch', name: 'Mono punch', mood: ['bold', 'minimal', 'dark'], bg: '#111111', ink: '#ffffff', muted: '#bdbdbd', accentText: '#ffe14d', accent: '#ffe14d', onAccent: '#111111', accent2: '#ffffff', soft: '#232323', soft2: '#2e2e2e', surface: '#1c1c1c', surfaceInk: '#ffffff', surfaceMuted: '#bdbdbd', head: { family: 'Anton', style: 'normal', upper: true, lineHeight: 1, spacing: 0.01 }, body: work, deco: 'lines', dark: true }),
  theme({ id: 'teal-wave', name: 'Teal wave', mood: ['fresh', 'calm', 'corporate'], bg: '#ecfdf5', ink: '#0f2e24', muted: '#2f4f45', accentText: '#0f7a5f', accent: '#0b7a5e', onAccent: '#ffffff', accent2: '#a7f3d0', soft: '#c9f5e2', soft2: '#d9fbe9', head: { family: 'Space Grotesk', style: 'bold', lineHeight: 1.06 }, body: inter, deco: 'waves' }),

  // ---- calm and minimal
  theme({ id: 'paper', name: 'Paper', mood: ['minimal', 'calm', 'elegant'], bg: '#f7f4ee', ink: '#1f2329', muted: '#5f564d', accentText: '#8a5a2b', accent: '#1f2329', onAccent: '#f7f4ee', accent2: '#c8a27a', soft: '#ece5d8', soft2: '#e4d9c5', head: { family: 'DM Serif Display', style: 'normal', lineHeight: 1.1 }, body: josefin, deco: 'lines' }),
  theme({ id: 'snow', name: 'Snow', mood: ['minimal', 'corporate', 'calm'], bg: '#ffffff', ink: '#111827', muted: '#4b5563', accentText: '#1d4ed8', accent: '#111827', onAccent: '#ffffff', accent2: '#3b82f6', soft: '#f1f3f6', soft2: '#e5e9f0', surface: '#f4f6f9', head: { family: 'Inter', style: 'bold', lineHeight: 1.1, spacing: -0.02 }, body: inter, deco: 'none' }),
  theme({ id: 'sage', name: 'Sage', mood: ['calm', 'nature', 'elegant'], bg: '#eef2ea', ink: '#26332a', muted: '#4b5a4f', accentText: '#4d6b4f', accent: '#5f7d61', onAccent: '#ffffff', accent2: '#c9d6bf', soft: '#dde6d6', soft2: '#d3dccb', head: { family: 'Lora', style: 'bold', lineHeight: 1.15 }, body: nunito, deco: 'leaves' }),
  theme({ id: 'blush', name: 'Blush', mood: ['calm', 'elegant', 'playful'], bg: '#fdf2f4', ink: '#4a1d36', muted: '#7a4a62', accentText: '#be185d', accent: '#be185d', onAccent: '#ffffff', accent2: '#f9a8d4', soft: '#fbd5e2', soft2: '#f3e1f5', head: { family: 'Playfair Display', style: 'bold', lineHeight: 1.12 }, body: nunito, deco: 'arches' }),
  theme({ id: 'sky', name: 'Sky', mood: ['calm', 'fresh', 'corporate'], bg: '#eff6ff', ink: '#0f2347', muted: '#3b4f72', accentText: '#1d4ed8', accent: '#2563eb', onAccent: '#ffffff', accent2: '#93c5fd', soft: '#dbeafe', soft2: '#e0ecff', head: { family: 'Poppins', style: 'bold', lineHeight: 1.1 }, body: inter, deco: 'circles' }),
  theme({ id: 'linen', name: 'Linen', mood: ['minimal', 'warm', 'elegant'], bg: '#f3ece3', ink: '#3b2f25', muted: '#6b5d52', accentText: '#9a5b2e', accent: '#b5835a', onAccent: '#2b1d12', accent2: '#e3cfb8', soft: '#e8dccd', soft2: '#efe4d6', head: { family: 'Cormorant Garamond', style: 'bold', lineHeight: 1.08 }, body: raleway, deco: 'arches' }),
  theme({ id: 'mist', name: 'Mist', mood: ['minimal', 'calm', 'tech'], bg: '#f4f5f7', ink: '#1c2230', muted: '#4c5566', accentText: '#5b47d6', accent: '#6d5dfc', onAccent: '#ffffff', accent2: '#c7c2ff', soft: '#e6e8f0', soft2: '#ebe9ff', head: { family: 'Space Grotesk', style: 'bold', lineHeight: 1.06 }, body: work, deco: 'grid' }),
  theme({ id: 'sand', name: 'Sand', mood: ['warm', 'calm', 'nature'], bg: '#f6efe2', ink: '#3a2a1a', muted: '#6a5440', accentText: '#a14f1c', accent: '#a8521b', onAccent: '#ffffff', accent2: '#e9c46a', soft: '#ecdcc0', soft2: '#f1e3c8', head: { family: 'Raleway', style: 'bold', lineHeight: 1.1 }, body: raleway, deco: 'waves' }),

  // ---- elegant and luxury
  theme({ id: 'noir-gold', name: 'Noir and gold', mood: ['luxury', 'elegant', 'dark'], bg: '#14110f', ink: '#f5ead7', muted: '#c9b9a0', accentText: '#e0b867', accent: '#c9a24a', onAccent: '#14110f', accent2: '#8a6d33', soft: '#221d19', soft2: '#2a231c', surface: '#1e1915', surfaceInk: '#f5ead7', surfaceMuted: '#c9b9a0', line: '#c9a24a', head: { family: 'Playfair Display', style: 'bold', lineHeight: 1.1 }, body: josefin, accentFont: { family: 'Great Vibes', style: 'normal', lineHeight: 1.1 }, deco: 'corners', dark: true }),
  theme({ id: 'ivory-script', name: 'Ivory script', mood: ['elegant', 'luxury', 'festive'], bg: '#fbf8f3', ink: '#3b2f25', muted: '#6b5d52', accentText: '#8f6a2e', accent: '#c9a96e', onAccent: '#2b2118', accent2: '#e8d8b8', soft: '#efe6d6', soft2: '#f3ece0', line: '#c9a96e', head: { family: 'Cormorant Garamond', style: 'bold', lineHeight: 1.08 }, body: josefin, accentFont: { family: 'Great Vibes', style: 'normal', lineHeight: 1.05 }, deco: 'corners' }),
  theme({ id: 'emerald', name: 'Emerald', mood: ['luxury', 'elegant', 'dark', 'festive'], bg: '#0d3b2e', ink: '#f6f1e3', muted: '#cfe3d8', accentText: '#e7c77a', accent: '#d4af5a', onAccent: '#0d3b2e', accent2: '#1f6b52', soft: '#134a3a', soft2: '#0f4434', surface: '#f6f1e3', surfaceInk: '#0d3b2e', surfaceMuted: '#3f5a4f', line: '#d4af5a', head: { family: 'Playfair Display', style: 'bold', lineHeight: 1.1 }, body: lora, accentFont: { family: 'Great Vibes', style: 'normal' }, deco: 'arches', dark: true }),
  theme({ id: 'navy-classic', name: 'Navy classic', mood: ['corporate', 'elegant', 'dark'], bg: '#13213c', ink: '#ffffff', muted: '#c7d2e6', accentText: '#f2c879', accent: '#e9b44c', onAccent: '#13213c', accent2: '#2c4472', soft: '#1b2c4d', soft2: '#22365d', surface: '#ffffff', surfaceInk: '#13213c', surfaceMuted: '#46557a', head: { family: 'Libre Baskerville', style: 'bold', lineHeight: 1.15 }, body: montserrat, deco: 'lines', dark: true }),
  theme({ id: 'burgundy', name: 'Burgundy', mood: ['luxury', 'warm', 'elegant', 'dark'], bg: '#4a0f1f', ink: '#fff3ec', muted: '#f0cdd2', accentText: '#f3c58e', accent: '#f3c58e', onAccent: '#4a0f1f', accent2: '#7a1f33', soft: '#5a1528', soft2: '#631a2e', surface: '#fff3ec', surfaceInk: '#4a0f1f', surfaceMuted: '#6e3a45', line: '#f3c58e', head: { family: 'DM Serif Display', style: 'normal', lineHeight: 1.08 }, body: lora, accentFont: { family: 'Dancing Script', style: 'bold' }, deco: 'corners', dark: true }),
  theme({ id: 'lavender', name: 'Lavender', mood: ['elegant', 'calm', 'playful'], bg: '#f4f0ff', ink: '#2a1f4d', muted: '#5a4f7d', accentText: '#6d28d9', accent: '#7c3aed', onAccent: '#ffffff', accent2: '#c4b5fd', soft: '#e4dcff', soft2: '#ece6ff', head: { family: 'Playfair Display', style: 'bold', lineHeight: 1.1 }, body: quicksand, accentFont: { family: 'Dancing Script', style: 'bold' }, deco: 'sparkles' }),

  // ---- corporate
  theme({ id: 'slate-pro', name: 'Slate pro', mood: ['corporate', 'minimal', 'tech'], bg: '#ffffff', ink: '#0f172a', muted: '#475569', accentText: '#0369a1', accent: '#0ea5e9', onAccent: '#082f49', accent2: '#0f172a', soft: '#e0f2fe', soft2: '#f1f5f9', surface: '#f1f5f9', head: { family: 'Montserrat', style: 'bold', lineHeight: 1.1 }, body: inter, deco: 'corners' }),
  theme({ id: 'forest-corp', name: 'Forest', mood: ['corporate', 'nature', 'calm'], bg: '#f5f7f2', ink: '#1b2e22', muted: '#46584b', accentText: '#166534', accent: '#166534', onAccent: '#ffffff', accent2: '#86efac', soft: '#e1eadb', soft2: '#d6e6d0', head: { family: 'Work Sans', style: 'bold', lineHeight: 1.1 }, body: work, deco: 'stripes' }),
  theme({ id: 'indigo-deck', name: 'Indigo', mood: ['corporate', 'tech', 'bold'], bg: '#ffffff', ink: '#1e1b4b', muted: '#4b4a72', accentText: '#4338ca', accent: '#4f46e5', onAccent: '#ffffff', accent2: '#a5b4fc', soft: '#eef0ff', soft2: '#e0e4ff', surface: '#f5f6ff', head: { family: 'Poppins', style: 'bold', lineHeight: 1.08 }, body: inter, deco: 'circles' }),
  theme({ id: 'charcoal', name: 'Charcoal', mood: ['corporate', 'dark', 'minimal', 'tech'], bg: '#1f2329', ink: '#ffffff', muted: '#c3c8d1', accentText: '#5eead4', accent: '#2dd4bf', onAccent: '#0b2a26', accent2: '#3a404a', soft: '#2a2f37', soft2: '#323843', surface: '#2a2f37', surfaceInk: '#ffffff', surfaceMuted: '#c3c8d1', head: { family: 'Space Grotesk', style: 'bold', lineHeight: 1.06 }, body: inter, deco: 'grid', dark: true }),
  theme({ id: 'terracotta', name: 'Terracotta', mood: ['warm', 'corporate', 'nature'], bg: '#fbf3ec', ink: '#3a2219', muted: '#6b4d40', accentText: '#b4441e', accent: '#c2532b', onAccent: '#ffffff', accent2: '#e9a87c', soft: '#f3dccd', soft2: '#f6e6da', head: { family: 'Roboto Slab', style: 'bold', lineHeight: 1.12 }, body: work, deco: 'arches' }),
  theme({ id: 'ocean', name: 'Ocean', mood: ['fresh', 'calm', 'corporate'], bg: '#0b3a53', bgGradient: linear(160, '#0e4d6e', '#082c40'), ink: '#ffffff', muted: '#cfe7f2', accentText: '#7dd3fc', accent: '#38bdf8', onAccent: '#082c40', accent2: '#0e6a8f', soft: '#12506f', soft2: '#0f4561', surface: '#ffffff', surfaceInk: '#082c40', surfaceMuted: '#3d5f70', head: { family: 'Montserrat', style: 'bold', lineHeight: 1.08 }, body: nunito, deco: 'waves', dark: true }),

  // ---- playful and kids
  theme({ id: 'bubblegum', name: 'Bubblegum', mood: ['playful', 'kids', 'festive'], bg: '#fff0f6', ink: '#3b1033', muted: '#6e3a63', accentText: '#c2185b', accent: '#d6246e', onAccent: '#ffffff', accent2: '#7dd3fc', soft: '#ffd6ea', soft2: '#d6f0ff', head: { family: 'Lobster', style: 'normal', lineHeight: 1.1 }, body: quicksand, deco: 'confetti' }),
  theme({ id: 'crayon', name: 'Crayon', mood: ['kids', 'playful', 'bold'], bg: '#fffbeb', ink: '#1e293b', muted: '#475569', accentText: '#c2410c', accent: '#2563eb', onAccent: '#ffffff', accent2: '#f97316', soft: '#fde68a', soft2: '#bfdbfe', head: { family: 'Quicksand', style: 'bold', lineHeight: 1.1 }, body: nunito, deco: 'confetti' }),
  theme({ id: 'mint-candy', name: 'Mint candy', mood: ['playful', 'fresh', 'kids'], bg: '#e8fff6', ink: '#123b31', muted: '#3d6158', accentText: '#0f766e', accent: '#14b8a6', onAccent: '#062e29', accent2: '#fda4af', soft: '#c3f5e4', soft2: '#ffe0e5', head: { family: 'Pacifico', style: 'normal', lineHeight: 1.25 }, body: nunito, deco: 'dots' }),
  theme({ id: 'grape', name: 'Grape soda', mood: ['playful', 'bold', 'dark'], bg: '#2e1065', ink: '#ffffff', muted: '#ddd0ff', accentText: '#fde047', accent: '#fde047', onAccent: '#2e1065', accent2: '#a78bfa', soft: '#3b1a80', soft2: '#44208f', surface: '#ffffff', surfaceInk: '#2e1065', surfaceMuted: '#5b4a85', head: { family: 'Archivo Black', style: 'normal', lineHeight: 1.04 }, body: poppins, deco: 'sparkles', dark: true }),
  theme({ id: 'peach', name: 'Peach', mood: ['playful', 'warm', 'calm'], bg: '#ffede3', ink: '#3d1f14', muted: '#6e4a3c', accentText: '#c2410c', accent: '#fb7c4a', onAccent: '#3d1f14', accent2: '#ffc6a8', soft: '#ffd8c4', soft2: '#ffe6d6', head: { family: 'Poppins', style: 'bold', lineHeight: 1.08 }, body: nunito, deco: 'blobs' }),

  // ---- festive
  theme({ id: 'festive-red', name: 'Festive red', mood: ['festive', 'warm', 'bold'], bg: '#8b1a1a', ink: '#fff7e6', muted: '#f6d7c6', accentText: '#ffd27a', accent: '#ffd27a', onAccent: '#5c0f0f', accent2: '#1f5d3a', soft: '#9c2424', soft2: '#7a1414', surface: '#fff7e6', surfaceInk: '#5c0f0f', surfaceMuted: '#7a4a3a', line: '#ffd27a', head: { family: 'Playfair Display', style: 'bold', lineHeight: 1.08 }, body: montserrat, accentFont: { family: 'Great Vibes', style: 'normal' }, deco: 'sparkles', dark: true }),
  theme({ id: 'midnight-moon', name: 'Midnight', mood: ['festive', 'dark', 'elegant'], bg: '#0f1d3a', bgGradient: radial('#1d3366', '#0b1530'), ink: '#fdf6e3', muted: '#cdd6ea', accentText: '#f5cf6b', accent: '#f5cf6b', onAccent: '#0f1d3a', accent2: '#2a4380', soft: '#1a2b52', soft2: '#22366a', surface: '#fdf6e3', surfaceInk: '#0f1d3a', surfaceMuted: '#4a5576', line: '#f5cf6b', head: { family: 'Cormorant Garamond', style: 'bold', lineHeight: 1.06 }, body: josefin, accentFont: { family: 'Great Vibes', style: 'normal' }, deco: 'sparkles', dark: true }),
  theme({ id: 'marigold', name: 'Marigold', mood: ['festive', 'warm', 'playful'], bg: '#fff3d6', ink: '#3d1d06', muted: '#6b4a2a', accentText: '#b45309', accent: '#f59e0b', onAccent: '#3d1d06', accent2: '#e11d48', soft: '#ffe2a1', soft2: '#ffd0c2', head: { family: 'Abril Fatface', style: 'normal', lineHeight: 1.08 }, body: poppins, deco: 'confetti' }),
  theme({ id: 'green-festive', name: 'Green and gold', mood: ['festive', 'nature', 'elegant'], bg: '#f3f8ef', ink: '#163b25', muted: '#3e5c48', accentText: '#166534', accent: '#1f7a45', onAccent: '#ffffff', accent2: '#d4af37', soft: '#dcebd2', soft2: '#efe3b8', line: '#b8962e', head: { family: 'DM Serif Display', style: 'normal', lineHeight: 1.08 }, body: montserrat, accentFont: { family: 'Dancing Script', style: 'bold' }, deco: 'leaves' }),

  // ---- tech and modern
  theme({ id: 'neon-mint', name: 'Neon mint', mood: ['tech', 'dark', 'bold'], bg: '#0b1120', ink: '#ffffff', muted: '#b6c2d9', accentText: '#4ade80', accent: '#22c55e', onAccent: '#04210f', accent2: '#38bdf8', soft: '#14203a', soft2: '#172645', surface: '#131c31', surfaceInk: '#ffffff', surfaceMuted: '#b6c2d9', head: { family: 'Space Grotesk', style: 'bold', lineHeight: 1.04, spacing: -0.01 }, body: inter, deco: 'grid', dark: true }),
  theme({ id: 'aurora', name: 'Aurora', mood: ['tech', 'bold', 'fresh'], bg: '#ffffff', bgGradient: linear(140, '#5b3fd6', '#11708a'), ink: '#ffffff', muted: '#eef0ff', accentText: '#fff3a3', accent: '#ffffff', onAccent: '#3b2a99', accent2: '#ffd166', soft: '#6a50e0', soft2: '#1a8099', surface: '#ffffff', surfaceInk: '#1e1b4b', surfaceMuted: '#4b4a72', head: { family: 'Poppins', style: 'bold', lineHeight: 1.06 }, body: inter, deco: 'circles', dark: true }),
  theme({ id: 'cream-tech', name: 'Cream tech', mood: ['tech', 'minimal', 'warm'], bg: '#fbf7f0', ink: '#16130f', muted: '#544c42', accentText: '#c2410c', accent: '#ff6a2b', onAccent: '#16130f', accent2: '#16130f', soft: '#efe7da', soft2: '#f4ece0', head: { family: 'Space Grotesk', style: 'bold', lineHeight: 1.02, spacing: -0.02 }, body: work, deco: 'grid' }),

  // ---- nature
  theme({ id: 'olive', name: 'Olive grove', mood: ['nature', 'calm', 'warm'], bg: '#f4f1e6', ink: '#2c2f1b', muted: '#545838', accentText: '#5b6b1f', accent: '#6b7c2a', onAccent: '#ffffff', accent2: '#d9c99a', soft: '#e6e2cc', soft2: '#ece8d6', head: { family: 'Merriweather', style: 'bold', lineHeight: 1.18 }, body: nunito, deco: 'leaves' }),
  theme({ id: 'botanical', name: 'Botanical', mood: ['nature', 'dark', 'elegant'], bg: '#1d3528', ink: '#f2efe4', muted: '#c9d6c3', accentText: '#e8c48a', accent: '#e8c48a', onAccent: '#1d3528', accent2: '#2e5a41', soft: '#244333', soft2: '#2a4b39', surface: '#f2efe4', surfaceInk: '#1d3528', surfaceMuted: '#4a5e50', line: '#e8c48a', head: { family: 'Playfair Display', style: 'bold', lineHeight: 1.1 }, body: raleway, deco: 'leaves', dark: true }),
  theme({ id: 'coral-reef', name: 'Coral', mood: ['fresh', 'warm', 'playful'], bg: '#fff5f2', ink: '#3b1d18', muted: '#6e463e', accentText: '#c2412d', accent: '#f0624d', onAccent: '#3b1d18', accent2: '#2bb5a7', soft: '#ffdcd3', soft2: '#d2f2ee', head: { family: 'Montserrat', style: 'bold', lineHeight: 1.06 }, body: nunito, deco: 'waves' }),
  theme({ id: 'chalk', name: 'Chalkboard', mood: ['kids', 'dark', 'calm'], bg: '#24382f', ink: '#f8f8f2', muted: '#d5e0d8', accentText: '#ffe08a', accent: '#ffe08a', onAccent: '#24382f', accent2: '#f4a6a6', soft: '#2d443a', soft2: '#334c41', surface: '#2d443a', surfaceInk: '#f8f8f2', surfaceMuted: '#d5e0d8', head: { family: 'Caveat', style: 'bold', lineHeight: 1.05 }, body: { family: 'Quicksand', style: 'bold' }, deco: 'dots', dark: true })
]

export function themeById(id: string): Theme {
  return themes.find((t) => t.id === id) ?? themes[0]
}

/** Themes that suit a mood, in a stable order. */
export function themesFor(moods: readonly Mood[]): Theme[] {
  const list = themes.filter((t) => moods.some((m) => t.mood.includes(m)))
  return list.length ? list : themes
}
