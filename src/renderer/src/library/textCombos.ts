import type { DesignElement, TextElement } from '@shared/model'
import { createShape, grouped, textAt } from '@renderer/editor/elementFactory'

/**
 * Ready-made text combinations: original type pairings laid out in a
 * 100-unit box that is scaled to the page. Each combination is a group of
 * ordinary text and shape elements, so every part stays editable.
 */

type Size = { width: number; height: number }

export interface TextCombo {
  id: string
  label: string
  keywords: string
  make: (doc: Size) => DesignElement[]
}

type Part = Partial<TextElement> & { text: string; x: number; y: number; width: number; fontSize: number }

function combo(width: number, parts: (Part | { shape: 'rect' | 'ellipse'; x: number; y: number; w: number; h: number; fill: string; radius?: number })[]) {
  return (doc: Size): DesignElement[] => {
    const u = (Math.min(doc.width, doc.height) * 0.7) / width
    const ox = (doc.width - width * u) / 2
    let height = 0
    const els: DesignElement[] = []
    for (const p of parts) {
      if ('shape' in p) {
        els.push({ ...createShape(doc, p.shape, { fill: p.fill, cornerRadius: (p.radius ?? 0) * u, name: 'Highlight' }), x: ox + p.x * u, y: p.y * u, width: p.w * u, height: p.h * u })
        height = Math.max(height, p.y + p.h)
      } else {
        const el = textAt({ align: 'center', ...p, x: ox + p.x * u, y: p.y * u, width: p.width * u, fontSize: p.fontSize * u, letterSpacing: (p.letterSpacing ?? 0) * u })
        els.push(el)
        height = Math.max(height, p.y + el.height / u)
      }
    }
    const oy = (doc.height - height * u) / 2
    return grouped(els.map((el) => ({ ...el, y: el.y + oy })))
  }
}

export const textCombos: TextCombo[] = [
  {
    id: 'sale',
    label: 'Big sale',
    keywords: 'sale discount offer percent shop',
    make: combo(100, [
      { text: 'SUMMER', x: 0, y: 0, width: 100, fontSize: 9, fontFamily: 'Montserrat', fontStyle: 'bold', letterSpacing: 2.4, fill: '#1f2329' },
      { text: 'SALE', x: 0, y: 10, width: 100, fontSize: 30, fontFamily: 'Anton', fill: '#ff5a36' },
      { shape: 'rect', x: 22, y: 49, w: 56, h: 11, fill: '#1f2329', radius: 5.5 },
      { text: 'UP TO 50% OFF', x: 22, y: 51.4, width: 56, fontSize: 5.2, fontFamily: 'Montserrat', fontStyle: 'bold', letterSpacing: 0.6, fill: '#ffffff' }
    ])
  },
  {
    id: 'event',
    label: 'Event title',
    keywords: 'event invitation date party launch',
    make: combo(100, [
      { text: 'YOU ARE INVITED', x: 0, y: 0, width: 100, fontSize: 4.2, fontFamily: 'Josefin Sans', fontStyle: 'bold', letterSpacing: 1.6, fill: '#7c5cff' },
      { text: 'Garden Party', x: 0, y: 7, width: 100, fontSize: 17, fontFamily: 'Playfair Display', fontStyle: 'italic', fill: '#1f2329' },
      { text: 'SATURDAY · 14 JUNE · 4 PM', x: 0, y: 30, width: 100, fontSize: 4.2, fontFamily: 'Josefin Sans', letterSpacing: 0.8, fill: '#4a5061' }
    ])
  },
  {
    id: 'quote',
    label: 'Quote with author',
    keywords: 'quote testimonial author saying',
    make: combo(100, [
      { text: '“', x: 0, y: 0, width: 100, fontSize: 26, fontFamily: 'DM Serif Display', fill: '#7c5cff', lineHeight: 0.9 },
      { text: 'Simplicity is the soul of good design.', x: 6, y: 18, width: 88, fontSize: 9, fontFamily: 'DM Serif Display', fill: '#1f2329', lineHeight: 1.15 },
      { text: '— A. DESIGNER', x: 0, y: 43, width: 100, fontSize: 3.8, fontFamily: 'Inter', fontStyle: 'bold', letterSpacing: 1.2, fill: '#5b6170' }
    ])
  },
  {
    id: 'stat',
    label: 'Big number',
    keywords: 'stat number percent metric kpi infographic',
    make: combo(100, [
      { text: '87%', x: 0, y: 0, width: 100, fontSize: 30, fontFamily: 'Space Grotesk', fontStyle: 'bold', fill: '#12a37f' },
      { text: 'of customers would recommend us to a friend', x: 15, y: 37, width: 70, fontSize: 5, fontFamily: 'Inter', fill: '#3a3f4b', lineHeight: 1.3 }
    ])
  },
  {
    id: 'coming-soon',
    label: 'Coming soon',
    keywords: 'coming soon launch teaser',
    make: combo(100, [
      { text: 'coming', x: 0, y: 0, width: 100, fontSize: 15, fontFamily: 'Pacifico', fill: '#ff6b6b' },
      { text: 'SOON', x: 0, y: 19, width: 100, fontSize: 24, fontFamily: 'Bebas Neue', letterSpacing: 4, fill: '#1f2329' }
    ])
  },
  {
    id: 'thank-you',
    label: 'Thank you',
    keywords: 'thank you thanks card script',
    make: combo(100, [
      { text: 'Thank you', x: 0, y: 0, width: 100, fontSize: 18, fontFamily: 'Great Vibes', fill: '#1f2329' },
      { text: 'FOR YOUR ORDER', x: 0, y: 24, width: 100, fontSize: 4.4, fontFamily: 'Raleway', fontStyle: 'bold', letterSpacing: 2, fill: '#7c5cff' }
    ])
  },
  {
    id: 'headline-sub',
    label: 'Headline and subtitle',
    keywords: 'headline title subtitle hero',
    make: combo(100, [
      { text: 'Make Ideas Happen', x: 0, y: 0, width: 100, fontSize: 11, fontFamily: 'Poppins', fontStyle: 'bold', fill: '#1f2329' },
      { text: 'A short line that explains the idea in a few words.', x: 10, y: 16, width: 80, fontSize: 4.6, fontFamily: 'Inter', fill: '#5b6170', lineHeight: 1.35 }
    ])
  },
  {
    id: 'label-tag',
    label: 'Label badge',
    keywords: 'label badge tag new pill',
    make: combo(60, [
      { shape: 'rect', x: 0, y: 0, w: 60, h: 14, fill: '#ffd166', radius: 7 },
      { text: 'NEW ARRIVAL', x: 0, y: 3.6, width: 60, fontSize: 6, fontFamily: 'Archivo Black', letterSpacing: 1, fill: '#1f2329' }
    ])
  },
  {
    id: 'menu-item',
    label: 'Menu item',
    keywords: 'menu restaurant food price',
    make: combo(100, [
      { text: 'Cappuccino', x: 0, y: 0, width: 70, fontSize: 7, fontFamily: 'Cormorant Garamond', fontStyle: 'bold', fill: '#2b2118', align: 'left' },
      { text: '$4.50', x: 70, y: 0, width: 30, fontSize: 7, fontFamily: 'Cormorant Garamond', fontStyle: 'bold', fill: '#2b2118', align: 'right' },
      { text: 'Double espresso, steamed milk and a light layer of foam.', x: 0, y: 10, width: 80, fontSize: 4, fontFamily: 'Lora', fontStyle: 'italic', fill: '#6b5d52', align: 'left', lineHeight: 1.35 }
    ])
  },
  {
    id: 'retro',
    label: 'Retro headline',
    keywords: 'retro vintage bold outline',
    make: combo(100, [
      { text: 'GOOD VIBES', x: 0, y: 0, width: 100, fontSize: 17, fontFamily: 'Archivo Black', fill: '#ffd166', strokeColor: '#1f2329', strokeWidth: 0.8 },
      { text: 'ONLY', x: 0, y: 21, width: 100, fontSize: 8, fontFamily: 'Lobster', fill: '#ff6b6b' }
    ])
  },
  {
    id: 'curved-badge',
    label: 'Curved title',
    keywords: 'curved arc circle badge text',
    make: combo(100, [{ text: 'HANDMADE WITH LOVE', x: 0, y: 0, width: 100, fontSize: 8, fontFamily: 'Oswald', fontStyle: 'bold', letterSpacing: 1.2, fill: '#7c5cff', curve: 140 }])
  },
  {
    id: 'webinar',
    label: 'Webinar',
    keywords: 'webinar live online talk speaker',
    make: combo(100, [
      { shape: 'rect', x: 34, y: 0, w: 32, h: 9, fill: '#ff3b5c', radius: 4.5 },
      { text: '● LIVE', x: 34, y: 2.2, width: 32, fontSize: 4.2, fontFamily: 'Inter', fontStyle: 'bold', letterSpacing: 0.8, fill: '#ffffff' },
      { text: 'Design Systems 101', x: 0, y: 13, width: 100, fontSize: 10, fontFamily: 'Space Grotesk', fontStyle: 'bold', fill: '#1f2329' },
      { text: 'Thursday 7 PM · Free online talk', x: 0, y: 27, width: 100, fontSize: 4.4, fontFamily: 'Inter', fill: '#5b6170' }
    ])
  }
]
