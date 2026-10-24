import type { Page } from '@shared/model'
import type { BuiltInTemplate, TemplateCategory } from '../templates'
import { type Ctx, finish, hash, makeCtx } from './core'
import { type Format, type FormatId, formats } from './formats'
import { type MediaContent, mediaLayouts } from './mediaLayouts'
import { type PostContent, postLayouts } from './postLayouts'
import { type Mood, type Theme, themes, themesFor } from './themes'
import { banners, thumbnails } from './content/media'
import { type CalendarItem, type PlannerType, buildCalendar, buildPlanner, calendarItems, planners } from './docs/planners'
import { type ResumeContent, buildCoverLetter, buildResume, resumes } from './docs/resume'
import { type BillDoc, type CertContent, type Company, type Person, billKinds, buildBill, buildCard, buildCertificate, buildLetterhead, cardLayoutIds, certificates, companies, people, twoSidedCards } from './docs/business'
import { type EduSheet, buildEduSheet, eduPosts, eduSheets } from './docs/education'
import { type Deck, buildDeck, decks } from './docs/slides'
import { type Menu, buildMenu, menuLayoutIds, menus } from './docs/menus'
import { type Letter, type OfficeDoc, buildLetter, buildOfficeDoc, letters, officeDocs, signs } from './docs/letters'
import { promos } from './content/promo'
import { announcements, business, events, greetings, quotes } from './content/social'

/**
 * The generated template library. Each family pairs written content with the
 * layouts and page sizes that suit it. A content item appears in a few sizes,
 * each time with a different layout and style, so every template differs in
 * layout, content or both. Pages are built only when a template is used.
 */

export interface GeneratedTemplate extends BuiltInTemplate {
  family: string
  layout: string
  theme: string
  format: FormatId
}

interface Item {
  id: string
  title: string
  kw: string
  mood: Mood[]
}

interface Family<C extends Item = Item> {
  id: string
  label: string
  items: C[]
  layouts: string[]
  formats: FormatId[]
  /** How many sizes each item comes in. */
  perItem: number
  category?: TemplateCategory
  keywords: string
  fits: (layout: string, item: C) => boolean
  build: (layout: string, item: C, format: Format, theme: Theme, seed: string) => Page[]
  /** Print documents use light styles only. */
  light?: boolean
  /** Pages per template, when it is not one. */
  pages?: (item: C, layout: string) => number
}

const postFits = (layout: string, p: PostContent): boolean => {
  if (layout === 'bigNumber' || layout === 'coupon') return !!p.big
  if (layout === 'list') return !!p.items && p.items.length >= 3
  if (layout === 'quoteMark') return !!p.quote
  return true
}

const mediaFits = (layout: string, p: MediaContent): boolean => {
  if (layout === 'thumbVersus') return !!p.versus
  if (layout === 'thumbNumber') return !!p.big
  return true
}

function single(layouts: Record<string, (c: Ctx, item: never) => void>) {
  return (layout: string, item: Item, format: Format, theme: Theme, seed: string): Page[] => {
    const c: Ctx = makeCtx(format.width, format.height, theme, seed)
    layouts[layout](c, item as never)
    return [finish(c)]
  }
}

/** Families hold different content types; the catalog only needs the shared shape. */
const family = <C extends Item>(f: Family<C>): Family => f as unknown as Family
const post = (f: Omit<Family<PostContent>, 'fits' | 'build'>): Family => family<PostContent>({ ...f, fits: postFits, build: single(postLayouts) })

interface Bill extends Item {
  doc: BillDoc
  company: Company
}

const bills: Bill[] = billKinds.flatMap((doc, i) =>
  [0, 1, 2].map((k) => {
    const company = companies[(i * 3 + k) % companies.length]
    return { id: `${doc.kind.toLowerCase().replace(/\s+/g, '-')}-${company.id}`, title: `${doc.kind} · ${company.title}`, kw: `${doc.kind.toLowerCase()} ${company.kw}`, mood: company.mood, doc, company }
  })
)

const families: Family[] = [
  post({
    id: 'promo',
    label: 'Sale',
    items: promos,
    layouts: ['bigNumber', 'splitPhoto', 'centered', 'photoTop', 'coupon', 'band', 'card', 'photoGrid', 'iconHero', 'editorial', 'list'],
    formats: ['post', 'story', 'portrait', 'wide', 'flyer'],
    perItem: 3,
    keywords: 'sale offer promotion discount marketing business'
  }),
  post({
    id: 'news',
    label: 'Announcement',
    items: announcements,
    layouts: ['centered', 'splitPhoto', 'photoTop', 'card', 'editorial', 'band', 'iconHero', 'circlePhoto', 'list', 'bigNumber'],
    formats: ['post', 'story', 'portrait', 'wide', 'flyer'],
    perItem: 3,
    keywords: 'announcement news update notice business'
  }),
  post({
    id: 'quote',
    label: 'Quote',
    items: quotes,
    layouts: ['quoteMark', 'bordered', 'editorial', 'centered', 'card', 'band'],
    formats: ['post', 'story', 'portrait', 'wide'],
    perItem: 2,
    keywords: 'quote saying motivation inspiration words'
  }),
  post({
    id: 'greet',
    label: 'Greeting',
    items: greetings,
    layouts: ['celebrate', 'bordered', 'centered', 'iconHero', 'card', 'circlePhoto', 'band', 'photoTop'],
    formats: ['post', 'card', 'story', 'portrait'],
    perItem: 3,
    keywords: 'greeting wishes card celebration holiday occasion'
  }),
  post({
    id: 'event',
    label: 'Event',
    items: events,
    layouts: ['bordered', 'splitPhoto', 'photoTop', 'editorial', 'centered', 'band', 'circlePhoto', 'bigNumber', 'list', 'card'],
    formats: ['card', 'post', 'story', 'flyer', 'poster'],
    perItem: 3,
    keywords: 'event invitation invite party celebration'
  }),
  post({
    id: 'biz',
    label: 'Business post',
    items: business,
    layouts: ['list', 'quoteMark', 'card', 'splitPhoto', 'centered', 'bigNumber', 'iconHero', 'circlePhoto', 'photoGrid', 'editorial'],
    formats: ['post', 'portrait', 'story', 'wide'],
    perItem: 2,
    keywords: 'business marketing small business social media'
  }),
  family<MediaContent>({
    id: 'thumb',
    label: 'Thumbnail',
    items: thumbnails,
    layouts: ['thumbSplit', 'thumbHighlight', 'thumbPanel', 'thumbNumber', 'thumbVersus'],
    formats: ['thumb'],
    perItem: 1,
    keywords: 'youtube thumbnail video channel',
    fits: mediaFits,
    build: single(mediaLayouts)
  }),
  family<MediaContent>({
    id: 'banner',
    label: 'Banner',
    items: banners,
    layouts: ['bannerSplit', 'bannerCenter', 'bannerBlock'],
    formats: ['fbCover', 'xHeader', 'liBanner', 'ytBanner'],
    perItem: 2,
    keywords: 'banner cover header channel art profile',
    fits: () => true,
    build: single(mediaLayouts)
  }),
  family<Person>({
    id: 'bizcard',
    label: 'Business card',
    items: people,
    layouts: cardLayoutIds,
    formats: ['bizCard'],
    perItem: 1,
    keywords: 'business card visiting card contact professional',
    fits: () => true,
    build: (layout, item, f, theme, seed) => buildCard(layout, item, f.width, f.height, theme, seed),
    pages: (_item, layout) => (twoSidedCards.has(layout) ? 2 : 1)
  }),
  family<Company>({
    id: 'letterhead',
    light: true,
    label: 'Letterhead',
    items: companies,
    layouts: ['0', '1', '2', '3'],
    formats: ['letter'],
    perItem: 1,
    keywords: 'letterhead letter company stationery official',
    fits: () => true,
    build: (layout, item, f, theme, seed) => buildLetterhead(Number(layout), item, f.width, f.height, theme, seed)
  }),
  family<Bill>({
    id: 'bill',
    light: true,
    label: 'Business document',
    items: bills,
    layouts: ['0', '1', '2'],
    formats: ['a4'],
    perItem: 1,
    category: 'business',
    keywords: 'invoice bill quotation receipt estimate business document accounts',
    fits: () => true,
    build: (layout, item, f, theme, seed) => buildBill(Number(layout), item.doc, item.company, f.width, f.height, theme, seed)
  }),
  family<CertContent>({
    id: 'cert',
    label: 'Certificate',
    items: certificates,
    layouts: ['0', '1', '2', '3', '4'],
    formats: ['a4Land'],
    perItem: 1,
    keywords: 'certificate award diploma recognition print',
    fits: () => true,
    build: (layout, item, f, theme, seed) => buildCertificate(Number(layout), item, f.width, f.height, theme, seed)
  }),
  family<ResumeContent>({
    id: 'resume',
    label: 'Résumé',
    items: resumes,
    layouts: ['0', '1', '2', '3'],
    formats: ['a4'],
    perItem: 1,
    category: 'documents',
    light: true,
    keywords: 'resume cv curriculum vitae job application career',
    fits: () => true,
    build: (layout, item, f, theme, seed) => buildResume(Number(layout), item, f.width, f.height, theme, seed)
  }),
  family<ResumeContent>({
    id: 'cover',
    label: 'Cover letter',
    items: resumes.slice(0, 6).map((q) => ({ ...q, title: q.title.replace('résumé', 'cover letter') })),
    layouts: ['0', '1'],
    formats: ['a4'],
    perItem: 1,
    category: 'documents',
    light: true,
    keywords: 'cover letter job application letter career',
    fits: () => true,
    build: (layout, item, f, theme, seed) => buildCoverLetter(Number(layout), item, f.width, f.height, theme, seed)
  }),
  family<PlannerType>({
    id: 'planner',
    label: 'Planner',
    items: planners,
    layouts: ['p'],
    formats: ['a4'],
    perItem: 2,
    category: 'planners',
    light: true,
    keywords: 'planner printable organiser tracker journal',
    fits: () => true,
    build: (_layout, item, f, theme, seed) => buildPlanner(item, f.width, f.height, theme, seed)
  }),
  family<CalendarItem>({
    id: 'calendar',
    label: 'Calendar',
    items: calendarItems,
    layouts: ['0', '2'],
    formats: ['a4'],
    perItem: 2,
    category: 'planners',
    keywords: 'calendar 2027 printable planner',
    fits: () => true,
    build: (layout, item, f, theme, seed) => buildCalendar(Number(layout), item, f.width, f.height, theme, seed),
    pages: (item) => (item.month === 'all' ? 12 : 1)
  }),
  family<Deck>({
    id: 'deck',
    label: 'Presentation',
    items: decks,
    layouts: ['0', '1'],
    formats: ['slides'],
    perItem: 2,
    category: 'presentations',
    keywords: 'presentation slides deck powerpoint',
    fits: () => true,
    build: (layout, item, f, theme, seed) => buildDeck(Number(layout), item, f.width, f.height, theme, seed),
    pages: () => 8
  }),
  family<Menu>({
    id: 'menu',
    label: 'Menu',
    items: menus,
    layouts: menuLayoutIds,
    formats: ['menu'],
    perItem: 2,
    category: 'print',
    light: false,
    keywords: 'menu price list printable',
    fits: () => true,
    build: (layout, item, f, theme, seed) => buildMenu(layout, item, f.width, f.height, theme, seed)
  }),
  family<Letter>({
    id: 'letter',
    label: 'Letter',
    items: letters,
    layouts: ['0', '1', '2', '3'],
    formats: ['letter'],
    perItem: 2,
    category: 'documents',
    light: true,
    keywords: 'letter application formal office printable',
    fits: () => true,
    build: (layout, item, f, theme, seed) => buildLetter(Number(layout), item, f.width, f.height, theme, seed)
  }),
  family<OfficeDoc>({
    id: 'doc',
    label: 'Document',
    items: officeDocs,
    layouts: ['0', '1'],
    formats: ['a4'],
    perItem: 2,
    category: 'documents',
    light: true,
    keywords: 'document a4 printable office',
    fits: () => true,
    build: (layout, item, f, theme, seed) => buildOfficeDoc(Number(layout), item, f.width, f.height, theme, seed)
  }),
  post({
    id: 'sign',
    label: 'Sign',
    items: signs,
    layouts: ['iconHero', 'bordered', 'centered', 'list', 'card'],
    formats: ['flyer', 'a4Land'],
    perItem: 2,
    category: 'print',
    keywords: 'sign printable notice shop office door'
  }),
  family<EduSheet>({
    id: 'edu',
    label: 'Worksheet',
    items: eduSheets,
    layouts: ['s'],
    formats: ['a4'],
    perItem: 2,
    category: 'education',
    light: true,
    keywords: 'worksheet school classroom teacher student kids printable education',
    fits: () => true,
    build: (_layout, item, f, theme, seed) => buildEduSheet(item, f.width, f.height, theme, seed)
  }),
  post({
    id: 'school',
    label: 'School poster',
    items: eduPosts,
    layouts: ['list', 'centered', 'editorial', 'iconHero', 'card', 'bigNumber'],
    formats: ['poster', 'flyer', 'post'],
    perItem: 3,
    category: 'education',
    keywords: 'school classroom education notice poster teacher student'
  }),
  family<CalendarItem>({
    id: 'calendar-wide',
    label: 'Calendar',
    items: calendarItems.filter((x) => x.month !== 'year'),
    layouts: ['1'],
    formats: ['a4Land'],
    perItem: 1,
    category: 'planners',
    light: true,
    keywords: 'calendar 2027 printable landscape desk',
    fits: () => true,
    build: (layout, item, f, theme, seed) => buildCalendar(Number(layout), item, f.width, f.height, theme, seed),
    pages: (item) => (item.month === 'all' ? 12 : 1)
  })
]

function generate(): GeneratedTemplate[] {
  const out: GeneratedTemplate[] = []
  const used = new Set<string>()
  for (const fam of families) {
    fam.items.forEach((item, i) => {
      const layouts = fam.layouts.filter((l) => fam.fits(l, item))
      const pool = themesFor(item.mood).filter((t) => !fam.light || !t.dark)
      const themeList = pool.length ? pool : themes.filter((t) => !t.dark)
      for (let k = 0; k < fam.perItem; k++) {
        const format = formats[fam.formats[(i + k * 2) % fam.formats.length]]
        const layout = layouts[(i * fam.perItem + k) % layouts.length]
        const theme = themeList[(hash(item.id) + k * 7) % themeList.length]
        let id = `g-${fam.id}-${item.id}-${format.id}`
        if (used.has(id)) id += `-${theme.id}`
        used.add(id)
        out.push({
          id,
          title: item.title,
          category: format.id === 'story' ? 'stories' : (fam.category ?? format.category),
          keywords: `${item.kw} ${fam.keywords} ${format.keywords} ${format.label} ${theme.name} ${layout}`.toLowerCase(),
          width: format.width,
          height: format.height,
          pageCount: fam.pages?.(item, layout) ?? 1,
          pages: () => fam.build(layout, item, format, theme, id),
          family: fam.id,
          layout,
          theme: theme.id,
          format: format.id as FormatId
        })
      }
    })
  }
  return out
}

let cached: GeneratedTemplate[] | null = null

export function generatedTemplates(): GeneratedTemplate[] {
  cached ??= generate()
  return cached
}
