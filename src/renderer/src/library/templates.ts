import type { DesignDocument, Page } from '@shared/model'
import { SCHEMA_VERSION } from '@shared/model'
import { generatedTemplates } from './gen/catalog'
import { chart, ellipse, frame, group, icon, line, linear, page, path, radial, rect, table, text } from './templateKit'

/**
 * The built-in template library. Every template is original work written as
 * code from editable elements: text, shapes, icons, charts, tables and empty
 * photo frames (drop a photo on a frame to fill it). Nothing here uses
 * third-party artwork, so the templates are free to use for anything.
 */

export interface BuiltInTemplate {
  id: string
  title: string
  category: TemplateCategory
  keywords: string
  width: number
  height: number
  pages: () => Page[]
  /** Number of pages, when known without building them. */
  pageCount?: number
}

export type TemplateCategory = 'social' | 'stories' | 'presentations' | 'video' | 'print' | 'cards' | 'business' | 'documents' | 'planners' | 'education'

export const templateCategories: { id: TemplateCategory; label: string }[] = [
  { id: 'social', label: 'Social posts' },
  { id: 'stories', label: 'Stories' },
  { id: 'presentations', label: 'Presentations' },
  { id: 'video', label: 'Thumbnails and banners' },
  { id: 'print', label: 'Flyers and posters' },
  { id: 'cards', label: 'Invitations and cards' },
  { id: 'business', label: 'Business' },
  { id: 'documents', label: 'Documents' },
  { id: 'planners', label: 'Planners and calendars' },
  { id: 'education', label: 'Education' }
]

const INK = '#1f2329'
const BLOB = 'M51 3C71 1 93 15 97 37C101 59 89 79 68 91C47 103 20 96 8 77C-3 59 2 35 16 20C26 9 37 4 51 3Z'
const WAVE = 'M0 30C25 8 50 8 75 30S125 52 150 30S200 8 200 8V60H0Z'
const SPARKLE = 'M50 0C54 34 66 46 100 50C66 54 54 66 50 100C46 66 34 54 0 50C34 46 46 34 50 0Z'

const handmadeTemplates: BuiltInTemplate[] = [
  // ------------------------------------------------------------ Social posts (1080 x 1080)
  {
    id: 'sale-bold',
    title: 'Bold summer sale',
    category: 'social',
    keywords: 'sale discount offer shop instagram post orange',
    width: 1080,
    height: 1080,
    pages: () => [
      page('#fff4e8', [
        ellipse(620, -180, 640, 640, '#ffb37a', { name: 'Sun' }),
        path(BLOB, [100, 100], -160, 640, 560, 560, '#ffd166', { name: 'Blob' }),
        text('SUMMER', 90, 250, 900, 70, { fontFamily: 'Montserrat', fontStyle: 'bold', letterSpacing: 18, fill: INK }),
        text('SALE', 70, 340, 940, 330, { fontFamily: 'Anton', fill: '#d63a17', lineHeight: 1 }),
        rect(270, 720, 540, 104, INK, { cornerRadius: 52, name: 'Pill' }),
        text('UP TO 50% OFF', 270, 750, 540, 44, { fontFamily: 'Montserrat', fontStyle: 'bold', fill: '#ffffff', align: 'center', letterSpacing: 4 }),
        text('This weekend only · yourshop.com', 90, 900, 900, 34, { fontFamily: 'Inter', fill: '#5b4636', align: 'center' })
      ].map((el) => (el.type === 'text' && el.fontSize > 80 ? { ...el, align: 'center' as const } : el)))
    ]
  },
  {
    id: 'quote-minimal',
    title: 'Minimal quote',
    category: 'social',
    keywords: 'quote motivation inspiration minimal serif cream',
    width: 1080,
    height: 1080,
    pages: () => [
      page('#f7f4ee', [
        rect(60, 60, 960, 960, 'transparent', { stroke: '#1f2329', strokeWidth: 3, name: 'Border' }),
        text('“', 90, 170, 900, 260, { fontFamily: 'DM Serif Display', fill: '#9a6b3f', align: 'center', lineHeight: 0.8 }),
        text('Do the work.\nTrust the process.', 120, 400, 840, 96, { fontFamily: 'DM Serif Display', fill: INK, align: 'center', lineHeight: 1.12 }),
        line(440, 700, 200, '#c8a27a', 4),
        text('YOUR NAME', 120, 740, 840, 30, { fontFamily: 'Josefin Sans', fontStyle: 'bold', letterSpacing: 8, fill: '#6b5d52', align: 'center' })
      ])
    ]
  },
  {
    id: 'product-launch',
    title: 'Product launch',
    category: 'social',
    keywords: 'product new launch announcement photo purple',
    width: 1080,
    height: 1080,
    pages: () => [
      page('#ffffff', [
        rect(0, 0, 1080, 1080, '#ffffff', { gradient: linear(140, '#5b3fd9', '#14708a'), name: 'Background' }),
        frame(120, 120, 840, 560, { mask: 'rounded', cornerRadius: 48, name: 'Product photo' }),
        rect(120, 640, 220, 70, '#ffd166', { cornerRadius: 35, name: 'Badge' }),
        text('NEW', 120, 656, 220, 34, { fontFamily: 'Archivo Black', fill: INK, align: 'center', letterSpacing: 4 }),
        text('Meet the all-new Aurora', 120, 740, 840, 72, { fontFamily: 'Poppins', fontStyle: 'bold', fill: '#ffffff' }),
        text('Lighter, faster and made to last. Available today.', 120, 930, 840, 36, { fontFamily: 'Inter', fill: '#ffffff' })
      ])
    ]
  },
  {
    id: 'tips-carousel',
    title: 'Tips carousel (3 slides)',
    category: 'social',
    keywords: 'carousel tips list education how to swipe green',
    width: 1080,
    height: 1080,
    pages: () => {
      const slide = (n: string, title: string, body: string) =>
        page('#ecfdf5', [
          text(n, 90, 110, 300, 200, { fontFamily: 'Space Grotesk', fontStyle: 'bold', fill: '#12a37f' }),
          text(title, 90, 380, 900, 84, { fontFamily: 'Space Grotesk', fontStyle: 'bold', fill: '#0f2e24', lineHeight: 1.1 }),
          text(body, 90, 620, 820, 40, { fontFamily: 'Inter', fill: '#2f4f45', lineHeight: 1.45 }),
          text('swipe →', 760, 960, 230, 32, { fontFamily: 'Inter', fontStyle: 'bold', fill: '#0b7a5e', align: 'right' })
        ])
      return [
        page('#0b7a5e', [
          path(SPARKLE, [100, 100], 820, 110, 150, 150, '#d9fbe9', { name: 'Sparkle' }),
          text('5 habits for a calmer week', 90, 330, 900, 120, { fontFamily: 'Space Grotesk', fontStyle: 'bold', fill: '#ffffff', lineHeight: 1.05 }),
          text('A quick guide · swipe →', 90, 820, 900, 40, { fontFamily: 'Inter', fill: '#ffffff' })
        ]),
        slide('01', 'Plan tomorrow tonight', 'Write down three things that matter most. Starting the day with a plan beats starting with your inbox.'),
        slide('02', 'Batch the small stuff', 'Group emails, calls and errands into one block, so they stop interrupting your focus time.')
      ]
    }
  },
  {
    id: 'event-dark',
    title: 'Night event',
    category: 'social',
    keywords: 'event party music concert night dark neon',
    width: 1080,
    height: 1350,
    pages: () => [
      page('#11132b', [
        rect(0, 0, 1080, 1350, '#11132b', { gradient: radial('#3a3f73', '#11132b'), name: 'Glow' }),
        ellipse(140, 140, 800, 800, 'transparent', { stroke: '#ff66c4', strokeWidth: 6, name: 'Ring' }),
        frame(240, 240, 600, 600, { mask: 'circle', name: 'Artist photo' }),
        text('FRIDAY NIGHT', 90, 950, 900, 46, { fontFamily: 'Josefin Sans', fontStyle: 'bold', letterSpacing: 14, fill: '#ff66c4', align: 'center' }),
        text('LIVE SESSIONS', 60, 1010, 960, 130, { fontFamily: 'Bebas Neue', fill: '#ffffff', align: 'center', letterSpacing: 6 }),
        text('12 JULY · 9 PM · THE WAREHOUSE', 90, 1170, 900, 34, { fontFamily: 'Inter', fill: '#c9c6ff', align: 'center', letterSpacing: 3 })
      ])
    ]
  },
  {
    id: 'announcement-pastel',
    title: 'Soft announcement',
    category: 'social',
    keywords: 'announcement news update pastel pink friendly',
    width: 1080,
    height: 1080,
    pages: () => [
      page('#fdf2f8', [
        path(BLOB, [100, 100], 560, -120, 640, 640, '#fbcfe8', { name: 'Blob' }),
        path(BLOB, [100, 100], -200, 700, 520, 520, '#e9d5ff', { name: 'Blob', rotation: 40 }),
        icon('megaphone', 110, 150, 120, '#be185d'),
        text('Big news!', 110, 330, 860, 130, { fontFamily: 'Pacifico', fill: '#be185d' }),
        text('We’re opening a second studio this autumn, right in the city centre.', 110, 560, 820, 50, { fontFamily: 'Nunito', fontStyle: 'bold', fill: '#4a1d36', lineHeight: 1.3 }),
        text('More details soon · @yourstudio', 110, 900, 860, 32, { fontFamily: 'Nunito', fill: '#9d4b78' })
      ])
    ]
  },

  // ------------------------------------------------------------ Stories (1080 x 1920)
  {
    id: 'story-travel',
    title: 'Travel story',
    category: 'stories',
    keywords: 'story travel trip photo vacation adventure',
    width: 1080,
    height: 1920,
    pages: () => [
      page('#0f172a', [
        frame(0, 0, 1080, 1920, { name: 'Background photo' }),
        rect(0, 1000, 1080, 260, '#000000', { gradient: linear(90, '#0f172a00', '#0f172ad9'), name: 'Shade fade' }),
        rect(0, 1250, 1080, 670, '#0f172a', { opacity: 0.85, name: 'Shade' }),
        text('weekend in', 90, 1300, 900, 80, { fontFamily: 'Dancing Script', fontStyle: 'bold', fill: '#ffd166' }),
        text('LISBON', 80, 1410, 920, 250, { fontFamily: 'Anton', fill: '#ffffff', lineHeight: 1 }),
        icon('map-pin', 90, 1720, 56, '#ffffff'),
        text('Tap for my top 10 spots', 170, 1726, 800, 40, { fontFamily: 'Inter', fontStyle: 'bold', fill: '#ffffff' })
      ])
    ]
  },
  {
    id: 'story-poll',
    title: 'This or that story',
    category: 'stories',
    keywords: 'story poll question this or that interactive yellow',
    width: 1080,
    height: 1920,
    pages: () => [
      page('#ffd166', [
        text('THIS OR THAT?', 80, 180, 920, 84, { fontFamily: 'Archivo Black', fill: INK, align: 'center' }),
        frame(90, 420, 420, 620, { mask: 'rounded', cornerRadius: 40, name: 'Option A' }),
        frame(570, 420, 420, 620, { mask: 'rounded', cornerRadius: 40, name: 'Option B' }),
        text('Coffee', 90, 1080, 420, 64, { fontFamily: 'Poppins', fontStyle: 'bold', fill: INK, align: 'center' }),
        text('Tea', 570, 1080, 420, 64, { fontFamily: 'Poppins', fontStyle: 'bold', fill: INK, align: 'center' }),
        ellipse(450, 640, 180, 180, INK, { name: 'VS circle' }),
        text('VS', 450, 690, 180, 70, { fontFamily: 'Archivo Black', fill: '#ffd166', align: 'center' }),
        text('Vote in the poll below ↓', 80, 1500, 920, 48, { fontFamily: 'Inter', fontStyle: 'bold', fill: INK, align: 'center' })
      ])
    ]
  },

  // ------------------------------------------------------------ Presentations (1920 x 1080)
  {
    id: 'pitch-deck',
    title: 'Startup pitch deck (5 slides)',
    category: 'presentations',
    keywords: 'pitch deck presentation startup business slides investor',
    width: 1920,
    height: 1080,
    pages: () => {
      const header = (title: string, n: string) => [
        text(n, 140, 110, 200, 30, { fontFamily: 'Inter', fontStyle: 'bold', fill: '#6440f0', letterSpacing: 4 }),
        text(title, 140, 160, 1640, 76, { fontFamily: 'Poppins', fontStyle: 'bold', fill: INK })
      ]
      return [
        page('#0f0b1f', [
          rect(0, 0, 1920, 1080, '#0f0b1f', { gradient: linear(135, '#0f0b1f', '#2b1d6b'), name: 'Background' }),
          ellipse(1300, -260, 900, 900, '#6440f0', { opacity: 0.35, name: 'Glow' }),
          text('NORTHWIND', 140, 300, 1200, 40, { fontFamily: 'Space Grotesk', fontStyle: 'bold', fill: '#b9a6ff', letterSpacing: 12 }),
          text('Smarter planning for small teams', 140, 380, 1200, 110, { fontFamily: 'Poppins', fontStyle: 'bold', fill: '#ffffff', lineHeight: 1.08 }),
          text('Investor presentation · 2026', 140, 760, 1200, 38, { fontFamily: 'Inter', fill: '#c9c2ec' })
        ]),
        page('#ffffff', [
          ...header('The problem', '01'),
          ...[
            ['clock', 'Hours lost every week', 'Teams spend 6+ hours a week chasing updates across tools.'],
            ['layers', 'Too many tools', 'The average small team juggles 9 apps to plan its work.'],
            ['trending-down', 'Missed deadlines', '4 in 10 projects finish late because plans go stale.']
          ].flatMap(([ic, t, b], i) => [
            rect(140 + i * 560, 420, 500, 460, '#f5f3ff', { cornerRadius: 28, name: 'Card' }),
            icon(ic, 200 + i * 560, 480, 80, '#6440f0'),
            text(t, 200 + i * 560, 610, 400, 40, { fontFamily: 'Poppins', fontStyle: 'bold', fill: INK }),
            text(b, 200 + i * 560, 730, 400, 28, { fontFamily: 'Inter', fill: '#4a5061', lineHeight: 1.45 })
          ])
        ]),
        page('#ffffff', [
          ...header('Traction', '02'),
          chart('column', 140, 360, 1040, 600, {
            labels: ['Q1', 'Q2', 'Q3', 'Q4'],
            series: [{ name: 'Active teams', color: '#6440f0', values: [120, 340, 760, 1480] }],
            showLegend: false,
            showValues: true
          }),
          text('12×', 1300, 420, 480, 160, { fontFamily: 'Space Grotesk', fontStyle: 'bold', fill: '#6440f0' }),
          text('growth in active teams this year, with 94% monthly retention.', 1300, 640, 480, 36, { fontFamily: 'Inter', fill: '#4a5061', lineHeight: 1.4 })
        ]),
        page('#ffffff', [
          ...header('Plans', '03'),
          table(
            [
              ['', 'Starter', 'Team', 'Business'],
              ['Price per month', '$0', '$12', '$29'],
              ['Projects', '3', 'Unlimited', 'Unlimited'],
              ['Guests', '—', '10', 'Unlimited'],
              ['Support', 'Community', 'Email', 'Priority']
            ],
            140,
            380,
            1640,
            { fontSize: 34, headerFill: '#6440f0', stripeFill: '#f5f3ff', borderColor: '#e2dcff', align: 'center', fontFamily: 'Inter' }
          )
        ]),
        page('#6440f0', [
          text('Thank you', 140, 380, 1640, 150, { fontFamily: 'Poppins', fontStyle: 'bold', fill: '#ffffff', align: 'center' }),
          text('hello@northwind.example · northwind.example', 140, 600, 1640, 40, { fontFamily: 'Inter', fill: '#ebe5ff', align: 'center' })
        ])
      ]
    }
  },
  {
    id: 'lesson-slides',
    title: 'Lesson slides (3 slides)',
    category: 'presentations',
    keywords: 'lesson education school class teacher slides presentation',
    width: 1920,
    height: 1080,
    pages: () => [
      page('#fff8e7', [
        path(WAVE, [200, 60], 0, 820, 1920, 260, '#ffd166', { name: 'Wave' }),
        icon('graduation-cap', 140, 160, 120, '#e07a00'),
        text('The Water Cycle', 140, 330, 1640, 150, { fontFamily: 'Nunito', fontStyle: 'bold', fill: '#3a2a00' }),
        text('Science · Year 5 · Lesson 3', 140, 540, 1640, 44, { fontFamily: 'Nunito', fill: '#7a5a1f' })
      ]),
      page('#ffffff', [
        text('Today we will learn', 140, 130, 1640, 72, { fontFamily: 'Nunito', fontStyle: 'bold', fill: '#3a2a00' }),
        ...['How water evaporates', 'Why clouds form', 'Where rain goes next'].flatMap((t, i) => [
          ellipse(140, 330 + i * 190, 90, 90, '#ffd166', { name: 'Bullet' }),
          text(String(i + 1), 140, 348 + i * 190, 90, 44, { fontFamily: 'Nunito', fontStyle: 'bold', fill: '#3a2a00', align: 'center' }),
          text(t, 280, 348 + i * 190, 920, 48, { fontFamily: 'Nunito', fill: '#3a2a00' })
        ]),
        frame(1260, 300, 520, 600, { mask: 'rounded', cornerRadius: 36, name: 'Picture' })
      ]),
      page('#ffffff', [
        text('Quick quiz', 140, 130, 1640, 72, { fontFamily: 'Nunito', fontStyle: 'bold', fill: '#3a2a00' }),
        rect(140, 300, 1640, 600, '#fff8e7', { cornerRadius: 36, name: 'Card' }),
        text('What makes water evaporate?\n\nA. The moon     B. The sun     C. The wind', 220, 380, 1480, 52, { fontFamily: 'Nunito', fill: '#3a2a00', lineHeight: 1.4 })
      ])
    ]
  },

  // ------------------------------------------------------------ Thumbnails and banners
  {
    id: 'youtube-bold',
    title: 'Bold video thumbnail',
    category: 'video',
    keywords: 'youtube thumbnail video bold red tutorial',
    width: 1280,
    height: 720,
    pages: () => [
      page('#111111', [
        frame(560, 0, 720, 720, { name: 'Your photo' }),
        rect(0, 0, 700, 720, '#111111', { name: 'Panel' }),
        path('M0 0H100L70 100H0Z', [100, 100], 600, 0, 200, 720, '#111111', { name: 'Slant' }),
        text('I TRIED IT', 60, 150, 700, 70, { fontFamily: 'Anton', fill: '#ffd166' }),
        text('FOR 30 DAYS', 60, 240, 700, 150, { fontFamily: 'Anton', fill: '#ffffff', lineHeight: 0.95 }),
        rect(60, 540, 330, 86, '#ff3b30', { cornerRadius: 12, name: 'Tag' }),
        text('HONEST REVIEW', 60, 562, 330, 36, { fontFamily: 'Montserrat', fontStyle: 'bold', fill: '#ffffff', align: 'center' })
      ])
    ]
  },
  {
    id: 'facebook-cover',
    title: 'Clean social banner',
    category: 'video',
    keywords: 'facebook banner cover link post business blue',
    width: 1200,
    height: 630,
    pages: () => [
      page('#eef4ff', [
        path(BLOB, [100, 100], 760, -160, 600, 600, '#c7d8ff', { name: 'Blob' }),
        frame(780, 90, 360, 450, { mask: 'arch', name: 'Photo' }),
        text('Free workshop', 80, 150, 640, 40, { fontFamily: 'Inter', fontStyle: 'bold', fill: '#2856d8', letterSpacing: 2 }),
        text('Grow your small business online', 80, 210, 660, 64, { fontFamily: 'Poppins', fontStyle: 'bold', fill: '#0f1b3d', lineHeight: 1.1 }),
        rect(80, 440, 260, 70, '#2856d8', { cornerRadius: 35, name: 'Button' }),
        text('Save your seat', 80, 462, 260, 26, { fontFamily: 'Inter', fontStyle: 'bold', fill: '#ffffff', align: 'center' })
      ])
    ]
  },

  // ------------------------------------------------------------ Flyers and posters (A4 at 150 DPI: 1240 x 1754)
  {
    id: 'flyer-cafe',
    title: 'Café opening flyer',
    category: 'print',
    keywords: 'flyer cafe coffee opening restaurant print a4 brown',
    width: 1240,
    height: 1754,
    pages: () => [
      page('#f5ece1', [
        frame(0, 0, 1240, 860, { name: 'Café photo' }),
        path(WAVE, [200, 60], 0, 760, 1240, 200, '#f5ece1', { name: 'Wave' }),
        text('Grand opening', 100, 960, 1040, 90, { fontFamily: 'Dancing Script', fontStyle: 'bold', fill: '#9a5b2d', align: 'center' }),
        text('THE CORNER CAFÉ', 100, 1080, 1040, 110, { fontFamily: 'Oswald', fontStyle: 'bold', fill: '#2b1d14', align: 'center', letterSpacing: 6 }),
        text('Free coffee for the first 100 guests', 100, 1250, 1040, 44, { fontFamily: 'Lora', fontStyle: 'italic', fill: '#5a4130', align: 'center' }),
        line(420, 1360, 400, '#9a5b2d', 3),
        text('SATURDAY 3 MAY · 8 AM\n12 Market Street', 100, 1410, 1040, 40, { fontFamily: 'Josefin Sans', fontStyle: 'bold', fill: '#2b1d14', align: 'center', lineHeight: 1.5, letterSpacing: 3 }),
        icon('coffee', 580, 1600, 80, '#9a5b2d')
      ])
    ]
  },
  {
    id: 'poster-gig',
    title: 'Gig poster',
    category: 'print',
    keywords: 'poster music gig concert band festival retro',
    width: 1240,
    height: 1754,
    pages: () => [
      page('#ff5a36', [
        ellipse(170, 230, 900, 900, '#ffd166', { name: 'Sun' }),
        ...Array.from({ length: 6 }, (_, i) => rect(0, 760 + i * 70, 1240, 34, '#ff5a36', { name: 'Stripe' })),
        text('SUNSET', 60, 1180, 1120, 230, { fontFamily: 'Anton', fill: '#1f1300', align: 'center', lineHeight: 1 }),
        text('SESSIONS', 60, 1440, 1120, 110, { fontFamily: 'Anton', fill: '#ffffff', align: 'center', letterSpacing: 24 }),
        text('LIVE MUSIC · 21 AUGUST · CITY PARK', 60, 1620, 1120, 38, { fontFamily: 'Montserrat', fontStyle: 'bold', fill: '#1f1300', align: 'center', letterSpacing: 4 })
      ])
    ]
  },
  {
    id: 'infographic',
    title: 'Simple infographic',
    category: 'print',
    keywords: 'infographic statistics data chart facts report',
    width: 1240,
    height: 1754,
    pages: () => [
      page('#ffffff', [
        rect(0, 0, 1240, 380, '#0f172a', { name: 'Header' }),
        text('How we spend our day', 90, 110, 1060, 84, { fontFamily: 'Space Grotesk', fontStyle: 'bold', fill: '#ffffff' }),
        text('A survey of 2,000 adults', 90, 240, 1060, 36, { fontFamily: 'Inter', fill: '#a5b4cf' }),
        chart('donut', 90, 460, 520, 470, {
          labels: ['Sleep', 'Work', 'Leisure', 'Other'],
          series: [{ name: 'Hours', color: '#12a37f', values: [8, 8, 5, 3] }],
          showLegend: true
        }),
        ...[
          ['8h', 'of sleep on average'],
          ['47 min', 'commuting each day'],
          ['3h', 'spent on screens for fun']
        ].flatMap(([n, t], i) => [
          text(n, 680, 470 + i * 160, 470, 76, { fontFamily: 'Space Grotesk', fontStyle: 'bold', fill: '#12a37f' }),
          text(t, 680, 560 + i * 160, 470, 30, { fontFamily: 'Inter', fill: '#3a3f4b' })
        ]),
        chart('bar', 90, 1040, 1060, 520, {
          labels: ['Reading', 'Exercise', 'Cooking', 'Gaming'],
          series: [{ name: 'Minutes per day', color: '#0f172a', values: [24, 31, 42, 55] }],
          showValues: true
        }),
        text('Source: example data for illustration', 90, 1630, 1060, 24, { fontFamily: 'Inter', fill: '#5f6577' })
      ])
    ]
  },

  // ------------------------------------------------------------ Business
  {
    id: 'business-card',
    title: 'Business card (front and back)',
    category: 'business',
    keywords: 'business card contact print name professional',
    width: 1050,
    height: 600,
    pages: () => [
      page('#1f2329', [
        ellipse(-160, 360, 420, 420, '#6440f0', { name: 'Circle' }),
        text('Alex Morgan', 80, 200, 900, 70, { fontFamily: 'Poppins', fontStyle: 'bold', fill: '#ffffff' }),
        text('PRODUCT DESIGNER', 80, 290, 900, 26, { fontFamily: 'Inter', fontStyle: 'bold', fill: '#b9a6ff', letterSpacing: 6 })
      ]),
      page('#ffffff', [
        rect(0, 0, 18, 600, '#6440f0', { name: 'Accent bar' }),
        ...[
          ['phone', '+1 555 0100'],
          ['mail', 'alex@example.com'],
          ['globe', 'alexmorgan.example'],
          ['map-pin', 'Portland, Oregon']
        ].flatMap(([ic, t], i) =>
          group([icon(ic, 100, 130 + i * 90, 40, '#6440f0'), text(t, 170, 134 + i * 90, 760, 30, { fontFamily: 'Inter', fill: INK })])
        )
      ])
    ]
  },
  {
    id: 'certificate',
    title: 'Certificate of achievement',
    category: 'business',
    keywords: 'certificate award achievement diploma course completion',
    width: 1754,
    height: 1240,
    pages: () => [
      page('#fffdf7', [
        rect(50, 50, 1654, 1140, 'transparent', { stroke: '#b08d3c', strokeWidth: 8, name: 'Outer border' }),
        rect(80, 80, 1594, 1080, 'transparent', { stroke: '#b08d3c', strokeWidth: 2, name: 'Inner border' }),
        icon('award', 817, 140, 120, '#b08d3c'),
        text('CERTIFICATE', 100, 300, 1554, 96, { fontFamily: 'Cormorant Garamond', fontStyle: 'bold', fill: '#2b2418', align: 'center', letterSpacing: 18 }),
        text('OF ACHIEVEMENT', 100, 420, 1554, 36, { fontFamily: 'Josefin Sans', fill: '#6b5a33', align: 'center', letterSpacing: 12 }),
        text('This certificate is proudly presented to', 100, 530, 1554, 34, { fontFamily: 'Lora', fontStyle: 'italic', fill: '#5a5040', align: 'center' }),
        text('Jordan Lee', 100, 600, 1554, 140, { fontFamily: 'Great Vibes', fill: '#2b2418', align: 'center' }),
        line(477, 790, 800, '#b08d3c', 2),
        text('for completing the Advanced Design course with distinction.', 100, 830, 1554, 34, { fontFamily: 'Lora', fill: '#5a5040', align: 'center' }),
        line(260, 1030, 380, '#2b2418', 2),
        text('Date', 260, 1050, 380, 26, { fontFamily: 'Josefin Sans', fill: '#6b5a33', align: 'center', letterSpacing: 4 }),
        line(1114, 1030, 380, '#2b2418', 2),
        text('Signature', 1114, 1050, 380, 26, { fontFamily: 'Josefin Sans', fill: '#6b5a33', align: 'center', letterSpacing: 4 })
      ])
    ]
  },
  {
    id: 'menu',
    title: 'Restaurant menu',
    category: 'business',
    keywords: 'menu restaurant food cafe prices print',
    width: 1240,
    height: 1754,
    pages: () => [
      page('#14281d', [
        text('Menu', 100, 120, 1040, 140, { fontFamily: 'Playfair Display', fontStyle: 'italic', fill: '#f2e8cf', align: 'center' }),
        text('SEASONAL KITCHEN', 100, 300, 1040, 30, { fontFamily: 'Josefin Sans', fontStyle: 'bold', fill: '#c9b77a', align: 'center', letterSpacing: 10 }),
        ...[
          ['STARTERS', [['Tomato soup', 'Basil oil, sourdough', '7'], ['Burrata', 'Peach, mint, olive oil', '11']]],
          ['MAINS', [['Mushroom risotto', 'Parmesan, thyme', '16'], ['Grilled salmon', 'Greens, lemon butter', '21'], ['Garden burger', 'Smoked cheddar, fries', '15']]],
          ['DESSERTS', [['Lemon tart', 'Crème fraîche', '8'], ['Chocolate mousse', 'Sea salt, hazelnut', '8']]]
        ].flatMap(([heading, items], s) => {
          const top = 430 + [0, 380, 900][s]
          return [
            text(heading as string, 120, top, 1000, 34, { fontFamily: 'Josefin Sans', fontStyle: 'bold', fill: '#c9b77a', letterSpacing: 8 }),
            ...(items as string[][]).flatMap(([n, d, p], i) => [
              text(n, 120, top + 70 + i * 130, 800, 44, { fontFamily: 'Playfair Display', fill: '#f2e8cf' }),
              text(p, 920, top + 70 + i * 130, 200, 44, { fontFamily: 'Playfair Display', fill: '#f2e8cf', align: 'right' }),
              text(d, 120, top + 126 + i * 130, 800, 28, { fontFamily: 'Lora', fontStyle: 'italic', fill: '#a9b8a0' })
            ])
          ]
        })
      ])
    ]
  },

  // ------------------------------------------------------------ Documents
  {
    id: 'resume',
    title: 'Clean résumé',
    category: 'documents',
    keywords: 'resume cv job career profile a4 document',
    width: 1240,
    height: 1754,
    pages: () => [
      page('#ffffff', [
        rect(0, 0, 420, 1754, '#f3f0ff', { name: 'Sidebar' }),
        frame(90, 100, 240, 240, { mask: 'circle', name: 'Profile photo' }),
        text('CONTACT', 90, 420, 260, 24, { fontFamily: 'Inter', fontStyle: 'bold', fill: '#6440f0', letterSpacing: 4 }),
        text('sam@example.com\n+1 555 0142\nsamrivera.example\nAustin, Texas', 90, 470, 290, 24, { fontFamily: 'Inter', fill: '#3a3f4b', lineHeight: 1.7 }),
        text('SKILLS', 90, 720, 260, 24, { fontFamily: 'Inter', fontStyle: 'bold', fill: '#6440f0', letterSpacing: 4 }),
        text('Brand design\nTypography\nMotion graphics\nIllustration\nWorkshop facilitation', 90, 770, 290, 24, { fontFamily: 'Inter', fill: '#3a3f4b', lineHeight: 1.7 }),
        text('Sam Rivera', 500, 110, 650, 80, { fontFamily: 'Poppins', fontStyle: 'bold', fill: INK }),
        text('Graphic designer', 500, 210, 650, 34, { fontFamily: 'Inter', fill: '#6440f0' }),
        text('Designer with eight years of experience creating brands, campaigns and packaging for independent businesses.', 500, 290, 650, 26, { fontFamily: 'Inter', fill: '#4a5061', lineHeight: 1.55 }),
        text('EXPERIENCE', 500, 470, 650, 24, { fontFamily: 'Inter', fontStyle: 'bold', fill: '#6440f0', letterSpacing: 4 }),
        ...[
          ['Senior Designer · Bright Studio', '2021 – now', 'Led rebrands for 20+ clients and mentored a team of four.'],
          ['Designer · Northwind Agency', '2018 – 2021', 'Designed campaigns across print, social and web.'],
          ['Junior Designer · Paper & Co.', '2016 – 2018', 'Packaging and in-store graphics for a stationery brand.']
        ].flatMap(([role, when, what], i) => [
          text(role, 500, 520 + i * 200, 650, 30, { fontFamily: 'Poppins', fontStyle: 'bold', fill: INK }),
          text(when, 500, 562 + i * 200, 650, 22, { fontFamily: 'Inter', fill: '#5f6577' }),
          text(what, 500, 600 + i * 200, 650, 24, { fontFamily: 'Inter', fill: '#4a5061', lineHeight: 1.5 })
        ]),
        text('EDUCATION', 500, 1150, 650, 24, { fontFamily: 'Inter', fontStyle: 'bold', fill: '#6440f0', letterSpacing: 4 }),
        text('BA Graphic Design · State University · 2016', 500, 1200, 650, 26, { fontFamily: 'Inter', fill: '#3a3f4b' })
      ])
    ]
  },
  {
    id: 'weekly-planner',
    title: 'Weekly planner',
    category: 'documents',
    keywords: 'planner weekly schedule organiser todo printable',
    width: 1240,
    height: 1754,
    pages: () => [
      page('#fffdf8', [
        text('This week', 90, 90, 620, 96, { fontFamily: 'Caveat', fontStyle: 'bold', fill: INK }),
        text('Week of ____________', 760, 130, 390, 30, { fontFamily: 'Inter', fill: '#5f6577', align: 'right' }),
        ...['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Weekend'].flatMap((day, i) => {
          const x = 90 + (i % 2) * 545
          const y = 260 + Math.floor(i / 2) * 400
          return [
            rect(x, y, 515, 370, '#ffffff', { stroke: '#e3e5ea', strokeWidth: 2, cornerRadius: 20, name: 'Box' }),
            text(day.toUpperCase(), x + 30, y + 26, 455, 24, { fontFamily: 'Inter', fontStyle: 'bold', fill: '#d93a3a', letterSpacing: 4 }),
            ...[0, 1, 2, 3, 4].map((r) => line(x + 30, y + 110 + r * 54, 455, '#eceef2', 2))
          ]
        }),
        text('Notes', 90, 1480, 400, 40, { fontFamily: 'Caveat', fontStyle: 'bold', fill: INK }),
        line(90, 1580, 1060, '#eceef2', 2),
        line(90, 1640, 1060, '#eceef2', 2)
      ])
    ]
  },
  {
    id: 'invitation',
    title: 'Wedding invitation',
    category: 'documents',
    keywords: 'invitation wedding save the date elegant card floral',
    width: 1080,
    height: 1350,
    pages: () => [
      page('#fbf8f3', [
        rect(50, 50, 980, 1250, 'transparent', { stroke: '#c9a96e', strokeWidth: 3, name: 'Border' }),
        icon('flower-2', 480, 130, 120, '#c9a96e', { strokeWidth: 1.5 }),
        text('Together with their families', 100, 300, 880, 32, { fontFamily: 'Lora', fontStyle: 'italic', fill: '#6b5d52', align: 'center' }),
        text('Emma\n&\nDaniel', 100, 390, 880, 130, { fontFamily: 'Great Vibes', fill: '#3b2f25', align: 'center', lineHeight: 1 }),
        text('INVITE YOU TO CELEBRATE THEIR WEDDING', 100, 840, 880, 26, { fontFamily: 'Josefin Sans', fontStyle: 'bold', fill: '#6b5d52', align: 'center', letterSpacing: 5 }),
        line(390, 920, 300, '#c9a96e', 2),
        text('Saturday, 20 September 2026\nat four o’clock\nRose Garden Estate', 100, 960, 880, 34, { fontFamily: 'Cormorant Garamond', fontStyle: 'bold', fill: '#3b2f25', align: 'center', lineHeight: 1.45 })
      ])
    ]
  }
]

/** Every built-in template: the hand-made ones first, then the generated library. */
export const builtInTemplates: BuiltInTemplate[] = [...handmadeTemplates.map((t) => ({ ...t, pageCount: t.pageCount ?? t.pages().length })), ...generatedTemplates()]

/** A complete document for a built-in template, ready to open or to copy pages from. */
export function templateDocument(t: BuiltInTemplate): DesignDocument {
  return { schemaVersion: SCHEMA_VERSION, title: t.title, width: t.width, height: t.height, pages: t.pages(), assets: [] }
}

export function searchTemplates(query: string, category: TemplateCategory | 'all' = 'all'): BuiltInTemplate[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  return builtInTemplates.filter((t) => {
    if (category !== 'all' && t.category !== category) return false
    const hay = `${t.title} ${t.keywords} ${t.category}`.toLowerCase()
    return words.every((w) => hay.includes(w))
  })
}
