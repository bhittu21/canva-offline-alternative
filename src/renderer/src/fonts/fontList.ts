/** Fonts available in the editor. Bundled fonts work offline on every PC; system fonts come with Windows. */

export interface FontInfo {
  family: string
  category: string
  bold: boolean
  italic: boolean
  bundled: boolean
}

const bundled: FontInfo[] = [
  { family: 'Abril Fatface', category: 'Display', bold: false, italic: false, bundled: true },
  { family: 'Anton', category: 'Display', bold: false, italic: false, bundled: true },
  { family: 'Archivo Black', category: 'Display', bold: false, italic: false, bundled: true },
  { family: 'Bebas Neue', category: 'Display', bold: false, italic: false, bundled: true },
  { family: 'Caveat', category: 'Handwriting', bold: true, italic: false, bundled: true },
  { family: 'Cormorant Garamond', category: 'Serif', bold: true, italic: true, bundled: true },
  { family: 'Dancing Script', category: 'Script', bold: true, italic: false, bundled: true },
  { family: 'DM Serif Display', category: 'Serif', bold: false, italic: true, bundled: true },
  { family: 'Great Vibes', category: 'Script', bold: false, italic: false, bundled: true },
  { family: 'Inter', category: 'Sans serif', bold: true, italic: true, bundled: true },
  { family: 'Josefin Sans', category: 'Sans serif', bold: true, italic: true, bundled: true },
  { family: 'Libre Baskerville', category: 'Serif', bold: true, italic: true, bundled: true },
  { family: 'Lobster', category: 'Script', bold: false, italic: false, bundled: true },
  { family: 'Lora', category: 'Serif', bold: true, italic: true, bundled: true },
  { family: 'Merriweather', category: 'Serif', bold: true, italic: true, bundled: true },
  { family: 'Montserrat', category: 'Sans serif', bold: true, italic: true, bundled: true },
  { family: 'Nunito', category: 'Sans serif', bold: true, italic: true, bundled: true },
  { family: 'Oswald', category: 'Display', bold: true, italic: false, bundled: true },
  { family: 'Pacifico', category: 'Script', bold: false, italic: false, bundled: true },
  { family: 'Playfair Display', category: 'Serif', bold: true, italic: true, bundled: true },
  { family: 'Poppins', category: 'Sans serif', bold: true, italic: true, bundled: true },
  { family: 'Quicksand', category: 'Sans serif', bold: true, italic: false, bundled: true },
  { family: 'Raleway', category: 'Sans serif', bold: true, italic: true, bundled: true },
  { family: 'Roboto Slab', category: 'Serif', bold: true, italic: false, bundled: true },
  { family: 'Space Grotesk', category: 'Sans serif', bold: true, italic: false, bundled: true },
  { family: 'Work Sans', category: 'Sans serif', bold: true, italic: true, bundled: true }
]

const system: FontInfo[] = ['Arial', 'Segoe UI', 'Georgia', 'Times New Roman', 'Verdana', 'Trebuchet MS', 'Courier New', 'Impact'].map((family) => ({
  family,
  category: 'Windows',
  bold: family !== 'Impact',
  italic: family !== 'Impact',
  bundled: false
}))

export const fonts: FontInfo[] = [...bundled, ...system]

export function fontInfo(family: string): FontInfo | undefined {
  return fonts.find((f) => f.family === family)
}

/** Loads every bundled font face so the canvas measures and draws text with the right font from the start. */
export async function loadFonts(): Promise<void> {
  const faces = bundled.flatMap((f) => [
    `400 16px "${f.family}"`,
    ...(f.bold ? [`700 16px "${f.family}"`] : []),
    ...(f.italic ? [`italic 400 16px "${f.family}"`] : []),
    ...(f.italic && f.bold ? [`italic 700 16px "${f.family}"`] : [])
  ])
  await Promise.all(faces.map((face) => document.fonts.load(face).catch(() => [])))
}
