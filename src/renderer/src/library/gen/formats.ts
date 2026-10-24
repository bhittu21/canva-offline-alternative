import type { TemplateCategory } from '../templates'

/** The page sizes the generated templates come in. */
export interface Format {
  id: string
  label: string
  width: number
  height: number
  category: TemplateCategory
  keywords: string
}

const f = (id: string, label: string, width: number, height: number, category: TemplateCategory, keywords: string): Format => ({ id, label, width, height, category, keywords })

export const formats = {
  post: f('post', 'Instagram post', 1080, 1080, 'social', 'instagram post square social media'),
  portrait: f('portrait', 'Portrait post', 1080, 1350, 'social', 'instagram portrait post social media 4:5'),
  story: f('story', 'Story', 1080, 1920, 'stories', 'story reel status instagram facebook whatsapp vertical'),
  wide: f('wide', 'Facebook / LinkedIn post', 1200, 630, 'social', 'facebook linkedin twitter x post landscape social media'),
  flyer: f('flyer', 'A4 flyer', 1240, 1754, 'print', 'flyer a4 print leaflet handout'),
  poster: f('poster', 'Poster', 1350, 1800, 'print', 'poster print wall 3:4'),
  card: f('card', 'Card 5x7', 1500, 2100, 'cards', 'card invitation greeting print 5x7'),
  cardWide: f('cardWide', 'Landscape card', 2100, 1500, 'cards', 'card landscape greeting print'),
  thumb: f('thumb', 'YouTube thumbnail', 1280, 720, 'video', 'youtube thumbnail video 16:9'),
  fbCover: f('fbCover', 'Facebook cover', 1640, 624, 'video', 'facebook cover banner header page'),
  xHeader: f('xHeader', 'X / Twitter header', 1500, 500, 'video', 'twitter x header banner'),
  liBanner: f('liBanner', 'LinkedIn banner', 1584, 396, 'video', 'linkedin banner background profile'),
  ytBanner: f('ytBanner', 'YouTube banner', 2560, 1440, 'video', 'youtube channel art banner'),
  slides: f('slides', 'Presentation 16:9', 1920, 1080, 'presentations', 'presentation slides deck 16:9 powerpoint'),
  a4: f('a4', 'A4 document', 1240, 1754, 'documents', 'a4 document print page'),
  a4Land: f('a4Land', 'A4 landscape', 1754, 1240, 'documents', 'a4 landscape document print'),
  bizCard: f('bizCard', 'Business card', 1050, 600, 'business', 'business card visiting card print 3.5x2'),
  letter: f('letter', 'A4 letterhead', 1240, 1754, 'business', 'letterhead a4 company letter print'),
  menu: f('menu', 'A4 menu', 1240, 1754, 'business', 'menu restaurant cafe a4 print'),
  label: f('label', 'Label / tag', 1200, 800, 'business', 'label tag sticker print')
} satisfies Record<string, Format>

export type FormatId = keyof typeof formats
