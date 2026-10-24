import type { ChartElement, Page } from '@shared/model'
import { chart, ellipse, frame, group, icon, line, rect } from '../../templateKit'
import { type Box, type Ctx, E, P, R, S, T, cols, finish, inset, makeCtx, r, rows, stack, textEl } from '../core'
import { decorate } from '../deco'
import type { Mood, Theme } from '../themes'

/**
 * Presentation decks. Every deck has the same run of slide kinds (title,
 * agenda, key points, story, numbers, steps, chart or quote, closing) with its
 * own words, drawn in one of two styles.
 */

export interface Deck {
  id: string
  title: string
  kw: string
  mood: Mood[]
  label: string
  head: string
  sub: string
  agenda: string[]
  points: { head: string; items: string[]; icons: string[] }
  story: { head: string; body: string }
  stats: { head: string; items: [string, string][] }
  steps: { head: string; items: [string, string][] }
  chart?: { head: string; type: ChartElement['chartType']; labels: string[]; series: [string, number[]][]; note: string }
  quote?: [string, string]
  close: { head: string; sub: string }
}

const m = (c: Ctx) => c.u * 7

/** Background and slide title shared by content slides; returns the body box. */
function frameSlide(c: Ctx, style: number, title: string, n: number): Box {
  const M = m(c)
  if (style === 0) {
    c.els.push(rect(0, 0, r(c.u * 1.4), c.H, c.t.accent, { name: 'Side bar' }))
    const t = textEl(c, title, M, M, c.W * 0.7, { role: 'head', size: 5.6, color: c.t.ink })
    c.els.push(t)
    const y = t.y + t.height + c.u * 5
    pageNo(c, n, 'right')
    return { x: M, y, w: c.W - M * 2, h: c.H - y - M }
  }
  decorate(c, 0.3)
  const t = textEl(c, title, M, M * 0.9, c.W - M * 2, { role: 'head', size: 5.4, align: 'center', color: c.t.ink })
  c.els.push(t, rect(r(c.W / 2 - c.u * 4), r(t.y + t.height + c.u * 2), r(c.u * 8), r(c.u * 0.7), c.t.accent, { name: 'Accent line', cornerRadius: r(c.u * 0.35) }))
  const y = t.y + t.height + c.u * 7
  pageNo(c, n, 'center')
  return { x: M, y, w: c.W - M * 2, h: c.H - y - M }
}

function pageNo(c: Ctx, n: number, align: 'right' | 'center'): void {
  const w = c.u * 10
  const el = textEl(c, String(n).padStart(2, '0'), align === 'right' ? c.W - m(c) - w : (c.W - w) / 2, 0, w, { role: 'body', size: 1.7, align, color: c.t.muted, name: 'Slide number' })
  el.y = r(c.H - c.u * 3.5 - el.height)
  c.els.push(el)
}

const photo = (b: Box, name = 'Photo', mask = 'rect', radius = 0) => frame(r(b.x), r(b.y), r(b.w), r(b.h), { mask, name, ...(radius ? { cornerRadius: r(radius) } : {}) })

function titleSlide(c: Ctx, d: Deck, style: number): void {
  const M = m(c)
  if (style === 0) {
    c.els.push(photo({ x: c.W * 0.56, y: 0, w: c.W * 0.44, h: c.H }))
    c.els.push(rect(r(c.W * 0.56 - c.u * 1.4), 0, r(c.u * 1.4), c.H, c.t.accent, { name: 'Accent bar' }))
    stack(c, { x: M, y: M, w: c.W * 0.56 - M * 2, h: c.H - M * 2 }, [P(d.label, { role: 'label', size: 2, color: c.t.onAccent }, { fill: c.t.accent, padX: 2.2, padY: 1, gapAfter: 3 }), T(d.head, { role: 'head', size: 8 }), T(d.sub, { role: 'body', size: 3.4 })], { valign: 'middle', gap: 3, maxGrow: 1.2 })
    return
  }
  decorate(c, 1)
  stack(c, inset({ x: 0, y: 0, w: c.W, h: c.H }, c.W * 0.15, M), [P(d.label, { role: 'label', size: 2, color: c.t.onAccent }, { fill: c.t.accent, padX: 2.2, padY: 1, gapAfter: 3 }), T(d.head, { role: 'head', size: 9, align: 'center' }), T(d.sub, { role: 'body', size: 3.6, align: 'center' })], { valign: 'middle', align: 'center', gap: 3, maxGrow: 1.2 })
}

function agendaSlide(c: Ctx, d: Deck, style: number): void {
  const b = frameSlide(c, style, 'Agenda', 2)
  if (style === 0) {
    const [list, pic] = cols(c, b, [1.4, 1], 6)
    stack(c, list, [R(d.agenda, { spec: { role: 'body', size: 3.8, color: c.t.ink }, badge: 'number', gap: 4 })], { valign: 'middle', maxGrow: 1.4 })
    c.els.push(photo(pic, 'Photo', 'rounded', c.u * 2))
    return
  }
  const n = d.agenda.length
  const parts = cols(c, inset(b, 0, b.h * 0.08), Array(n).fill(1), 3)
  parts.forEach((p, i) => {
    const card = rect(r(p.x), r(p.y), r(p.w), r(p.h), c.t.surface, { name: 'Agenda card', cornerRadius: r(c.u * 2) })
    const num = textEl(c, String(i + 1).padStart(2, '0'), p.x + c.u * 4, p.y + c.u * 5, p.w - c.u * 8, { role: 'head', size: 9, color: c.t.surfaceInk })
    const t = textEl(c, d.agenda[i], p.x + c.u * 4, 0, p.w - c.u * 8, { role: 'body', size: 3.6, color: c.t.surfaceInk })
    t.y = r(p.y + p.h - c.u * 5 - t.height)
    c.els.push(...group([card, num, t]))
  })
}

function pointsSlide(c: Ctx, d: Deck, style: number): void {
  const b = frameSlide(c, style, d.points.head, 3)
  if (style === 0) {
    stack(c, b, [R(d.points.items, { spec: { role: 'body', size: 3.6, color: c.t.ink }, icons: d.points.icons, badgeFill: c.t.accentText, gap: 4.5, columns: d.points.items.length > 4 ? 2 : 1 })], { valign: 'middle', maxGrow: 1.4 })
    return
  }
  const grid = rows(c, b, [1, 1], 3).flatMap((row) => cols(c, row, [1, 1], 3))
  d.points.items.slice(0, 4).forEach((item, i) => {
    const p = grid[i]
    const card = rect(r(p.x), r(p.y), r(p.w), r(p.h), c.t.surface, { name: 'Point card', cornerRadius: r(c.u * 2) })
    const s = Math.min(p.h * 0.5, c.u * 7)
    const ic = icon(d.points.icons[i] ?? 'check', r(p.x + c.u * 3), r(p.y + (p.h - s) / 2), r(s), c.t.surfaceInk)
    const t = textEl(c, item, p.x + c.u * 5 + s, 0, p.w - s - c.u * 8, { role: 'body', size: 3.4, color: c.t.surfaceInk }, p.h - c.u * 2)
    t.y = r(p.y + (p.h - t.height) / 2)
    c.els.push(...group([card, ic, t]))
  })
}

function storySlide(c: Ctx, d: Deck, style: number): void {
  const M = m(c)
  if (style === 0) {
    c.els.push(photo({ x: 0, y: 0, w: c.W * 0.45, h: c.H }))
    stack(c, { x: c.W * 0.45 + M, y: M, w: c.W * 0.55 - M * 2, h: c.H - M * 2 }, [T(d.story.head, { role: 'head', size: 5.6 }), T(d.story.body, { role: 'body', size: 3.2, lineHeight: 1.5 })], { valign: 'middle', gap: 4, maxGrow: 1.3 })
    pageNo(c, 4, 'right')
    return
  }
  decorate(c, 0.3)
  const [text, pic] = cols(c, inset({ x: 0, y: 0, w: c.W, h: c.H }, M), [1, 1], 6)
  stack(c, text, [T(d.story.head, { role: 'head', size: 5.6 }), T(d.story.body, { role: 'body', size: 3.2, lineHeight: 1.5 })], { valign: 'middle', gap: 4, maxGrow: 1.3 })
  c.els.push(photo(pic, 'Photo', 'rounded', c.u * 3))
  pageNo(c, 4, 'center')
}

function statsSlide(c: Ctx, d: Deck, style: number): void {
  const b = frameSlide(c, style, d.stats.head, 5)
  const parts = cols(c, inset(b, 0, b.h * 0.1), Array(d.stats.items.length).fill(1), 3)
  parts.forEach((p, i) => {
    const [big, label] = d.stats.items[i]
    const els = []
    if (style === 1) els.push(rect(r(p.x), r(p.y), r(p.w), r(p.h), c.t.surface, { name: 'Number card', cornerRadius: r(c.u * 2) }))
    else els.push(rect(r(p.x), r(p.y), r(c.u * 0.8), r(p.h), c.t.accent, { name: 'Accent bar' }))
    const ink = style === 1 ? c.t.surfaceInk : c.t.ink
    const muted = style === 1 ? c.t.surfaceMuted : c.t.muted
    const px = p.x + c.u * 4
    const pw = p.w - c.u * 7
    const n = textEl(c, big, px, 0, pw, { role: 'head', size: 11, color: ink })
    const t = textEl(c, label, px, 0, pw, { role: 'body', size: 3.4, color: muted })
    const total = n.height + c.u * 2 + t.height
    n.y = r(p.y + (p.h - total) / 2)
    t.y = r(n.y + n.height + c.u * 2)
    els.push(n, t)
    c.els.push(...group(els))
  })
}

function stepsSlide(c: Ctx, d: Deck, style: number): void {
  const b = frameSlide(c, style, d.steps.head, 6)
  const n = d.steps.items.length
  const parts = cols(c, b, Array(n).fill(1), 3)
  const dot = c.u * 8
  const y = b.y + b.h * 0.22
  c.els.push(line(r(parts[0].x + dot / 2), r(y + dot / 2), r(parts[n - 1].x - parts[0].x), c.t.soft, r(c.u * 0.4), { name: 'Timeline' }))
  parts.forEach((p, i) => {
    const [title, text] = d.steps.items[i]
    const circle = ellipse(r(p.x), r(y), r(dot), r(dot), c.t.accent, { name: 'Step' })
    const num = textEl(c, String(i + 1), p.x, 0, dot, { role: 'body', size: 3.2, style: 'bold', align: 'center', color: c.t.onAccent })
    num.y = r(y + (dot - num.height) / 2)
    const below = y + dot + c.u * 4
    stack(c, { x: p.x, y: below, w: p.w, h: b.y + b.h - below }, [T(title, { role: 'body', size: 4.4, style: 'bold', color: c.t.ink }), T(text, { role: 'body', size: 3.4 })], { gap: 1.5, maxGrow: 1 })
    c.els.push(...group([circle, num]))
  })
}

function chartSlide(c: Ctx, d: Deck, style: number): void {
  const ch = d.chart!
  const b = frameSlide(c, style, ch.head, 7)
  const [left, right] = cols(c, b, [1.7, 1], 6)
  const palette = [c.t.accent, c.t.accent2, c.t.ink]
  c.els.push(
    chart(ch.type, r(left.x), r(left.y), r(left.w), r(left.h), {
      name: 'Chart',
      labels: ch.labels,
      series: ch.series.map(([name, values], i) => ({ name, values, color: palette[i % palette.length] })),
      fontFamily: c.t.body.family,
      textColor: c.t.ink,
      showValues: ch.type === 'pie' || ch.type === 'donut' || ch.type === 'bar',
      showLegend: ch.series.length > 1 || ch.type === 'pie' || ch.type === 'donut',
      showGrid: ch.type !== 'pie' && ch.type !== 'donut'
    })
  )
  stack(c, right, [E(0.8, (x, y) => [rect(x, y, r(c.u * 8), r(c.u * 0.8), c.t.accent, { name: 'Accent line' })], 8, 3), T(ch.note, { role: 'body', size: 3.4, color: c.t.ink, lineHeight: 1.5 })], { valign: 'middle', maxGrow: 1.2 })
}

function quoteSlide(c: Ctx, d: Deck, style: number): void {
  const [q, who] = d.quote!
  const M = m(c)
  if (style === 0) c.els.push(rect(0, 0, r(c.u * 1.4), c.H, c.t.accent, { name: 'Side bar' }))
  else decorate(c, 0.6)
  stack(c, inset({ x: 0, y: 0, w: c.W, h: c.H }, c.W * 0.14, M), [E(9, (x, y, w, h) => [icon('quote', r(x + (w - h) / 2), y, h, c.t.accentText)]), T(`“${q}”`, { role: 'head', size: 6, align: 'center', upper: false, lineHeight: 1.25 }), T(who, { role: 'body', size: 3, align: 'center' })], { valign: 'middle', align: 'center', gap: 4, maxGrow: 1.2 })
  pageNo(c, 7, style === 0 ? 'right' : 'center')
}

function closeSlide(c: Ctx, d: Deck, style: number): void {
  const M = m(c)
  const contact = ['you@email.com', '+1 234 567 890', 'yourwebsite.com']
  if (style === 0) {
    c.els.push(rect(0, 0, c.W, c.H, c.t.accent, { name: 'Background' }))
    stack(c, inset({ x: 0, y: 0, w: c.W, h: c.H }, c.W * 0.12, M), [T(d.close.head, { role: 'head', size: 9, align: 'center', color: c.t.onAccent }), T(d.close.sub, { role: 'body', size: 3, align: 'center', color: c.t.onAccent }), S(2), T(contact.join('   ·   '), { role: 'body', size: 2.8, align: 'center', color: c.t.onAccent })], { valign: 'middle', align: 'center', gap: 3, maxGrow: 1.2 })
    return
  }
  decorate(c, 1)
  const [text, pic] = cols(c, inset({ x: 0, y: 0, w: c.W, h: c.H }, M), [1.2, 1], 6)
  stack(c, text, [T(d.close.head, { role: 'head', size: 8.5 }), T(d.close.sub, { role: 'body', size: 3 }), S(2), R(contact, { spec: { role: 'body', size: 3, color: c.t.ink }, icons: ['mail', 'phone', 'globe'], badgeFill: c.t.accentText, gap: 2 })], { valign: 'middle', gap: 3, maxGrow: 1.2 })
  const d0 = Math.min(pic.w, pic.h)
  c.els.push(photo({ x: pic.x + (pic.w - d0) / 2, y: pic.y + (pic.h - d0) / 2, w: d0, h: d0 }, 'Photo', 'circle'))
}

export function buildDeck(style: number, d: Deck, W: number, H: number, theme: Theme, seed: string): Page[] {
  const slides: ((c: Ctx, d: Deck, s: number) => void)[] = [titleSlide, agendaSlide, pointsSlide, storySlide, statsSlide, stepsSlide, d.chart ? chartSlide : quoteSlide, closeSlide]
  const names = ['Title', 'Agenda', d.points.head, d.story.head, d.stats.head, d.steps.head, d.chart ? d.chart.head : 'Quote', 'Closing']
  return slides.map((fn, i) => {
    const c = makeCtx(W, H, theme, `${seed}-${i}`)
    fn(c, d, style)
    return finish(c, names[i])
  })
}

type DeckFields = Omit<Deck, 'id' | 'title' | 'kw' | 'mood'>
const deck = (id: string, title: string, kw: string, mood: Mood[], f: DeckFields): Deck => ({ id, title, kw, mood, ...f })

export const decks: Deck[] = [
  deck('pitch', 'Startup pitch deck', 'pitch deck startup investors funding business plan', ['bold', 'tech'], {
    label: 'Seed round 2027',
    head: 'Fresh groceries in 30 minutes',
    sub: 'A neighbourhood delivery service for busy families.',
    agenda: ['The problem', 'Our solution', 'Market and traction', 'The ask'],
    points: { head: 'Why now', items: ['Families shop online more than ever', 'Local shops want new customers', 'Phones and payments are everywhere', 'Delivery partners are ready'], icons: ['shopping-cart', 'store', 'smartphone', 'bike'] },
    story: { head: 'The problem', body: 'Weekly shopping takes busy parents two hours or more. Big apps are slow to deliver and leave out the local shops people trust.' },
    stats: { head: 'Traction so far', items: [['12k', 'orders delivered'], ['4.8', 'average rating'], ['38%', 'monthly growth']] },
    steps: { head: 'How it works', items: [['Order', 'Pick items in the app'], ['Pack', 'A nearby shop packs them'], ['Ride', 'A rider collects the order'], ['Enjoy', 'At your door in 30 minutes']] },
    chart: { head: 'Monthly orders', type: 'column', labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], series: [['Orders', [800, 1100, 1500, 2100, 2900, 3600]]], note: 'Orders have more than quadrupled in six months, with no paid advertising.' },
    close: { head: 'Join us', sub: 'We are raising $500k to reach five more cities.' }
  }),
  deck('marketing-plan', 'Marketing plan', 'marketing plan strategy campaign brand', ['bold', 'playful'], {
    label: 'Marketing plan',
    head: 'Growing our brand in 2027',
    sub: 'Goals, channels and budget for the year ahead.',
    agenda: ['Where we are', 'Our goals', 'Channels', 'Budget and timeline'],
    points: { head: 'Our goals', items: ['Double our social media following', 'Launch two seasonal campaigns', 'Grow email sign-ups to 10,000', 'Raise repeat sales by 20%'], icons: ['users', 'megaphone', 'mail', 'repeat'] },
    story: { head: 'Who we serve', body: 'Our customers are young professionals who value good design, fair prices and fast delivery. They find us on social media and stay for the service.' },
    stats: { head: 'Last year in numbers', items: [['25k', 'followers'], ['3.2%', 'conversion rate'], ['$84k', 'online sales']] },
    steps: { head: 'Campaign calendar', items: [['Q1', 'Brand refresh'], ['Q2', 'Summer campaign'], ['Q3', 'Partnerships'], ['Q4', 'Holiday sale']] },
    chart: { head: 'Budget by channel', type: 'donut', labels: ['Social media', 'Search', 'Email', 'Events'], series: [['Budget', [40, 25, 15, 20]]], note: 'Social media gets the largest share because it brings most of our new customers.' },
    close: { head: 'Let’s grow together', sub: 'Questions and ideas are welcome.' }
  }),
  deck('project-status', 'Project status report', 'project status update report progress team', ['corporate', 'minimal'], {
    label: 'Status update',
    head: 'Website redesign project',
    sub: 'Progress, risks and next steps.',
    agenda: ['Progress', 'Key numbers', 'Risks', 'Next steps'],
    points: { head: 'Done this month', items: ['Finished the new home page design', 'Moved 80% of pages to the new system', 'Tested with 12 customers', 'Fixed 46 reported issues'], icons: ['layout-template', 'folder-sync', 'users', 'bug'] },
    story: { head: 'What we learned', body: 'Customers found the new menu much easier to use. Search was the most requested change, so we moved it up the plan.' },
    stats: { head: 'Where we stand', items: [['78%', 'complete'], ['On', 'budget'], ['2 wks', 'to launch']] },
    steps: { head: 'Next steps', items: [['Week 1', 'Finish search'], ['Week 2', 'Content review'], ['Week 3', 'Final testing'], ['Week 4', 'Launch']] },
    chart: { head: 'Tasks by status', type: 'bar', labels: ['Done', 'In progress', 'Not started', 'Blocked'], series: [['Tasks', [64, 12, 6, 2]]], note: 'Two tasks are waiting on content from the sales team.' },
    close: { head: 'Thank you', sub: 'Next update on the first Monday of the month.' }
  }),
  deck('company-profile', 'Company profile', 'company profile about us business introduction corporate', ['corporate', 'elegant'], {
    label: 'Company profile',
    head: 'Building better spaces since 2008',
    sub: 'Design and construction for homes and offices.',
    agenda: ['Who we are', 'What we do', 'Our work', 'Contact'],
    points: { head: 'What we do', items: ['Interior design', 'Home renovation', 'Office fit-out', 'Project management'], icons: ['sofa', 'hammer', 'building', 'clipboard-list'] },
    story: { head: 'Our story', body: 'We started as a team of three with one van. Today 60 people help families and companies turn plans into places they love.' },
    stats: { head: 'At a glance', items: [['18', 'years in business'], ['650+', 'projects finished'], ['60', 'team members']] },
    steps: { head: 'Our process', items: [['Listen', 'We learn what you need'], ['Design', 'Plans and 3D views'], ['Build', 'Our own skilled team'], ['Hand over', 'Ready to move in']] },
    quote: ['They finished on time and the office looks better than we imagined.', 'A happy client'],
    close: { head: 'Let’s build together', sub: 'Book a free site visit today.' }
  }),
  deck('lesson-water', 'Science lesson: the water cycle', 'lesson science water cycle school class teaching', ['kids', 'fresh'], {
    label: 'Science · Class 5',
    head: 'The water cycle',
    sub: 'How water moves around our planet.',
    agenda: ['What is the water cycle?', 'The four stages', 'Water in our lives', 'Quiz time'],
    points: { head: 'Key words', items: ['Evaporation: water turns into vapour', 'Condensation: vapour forms clouds', 'Precipitation: rain, snow or hail', 'Collection: water gathers in rivers and seas'], icons: ['sun', 'cloud', 'cloud-rain', 'waves-horizontal'] },
    story: { head: 'Water never disappears', body: 'The water you drink today may once have been in a cloud, a glacier or the sea. The same water has been moving around the Earth for millions of years.' },
    stats: { head: 'Amazing facts', items: [['71%', 'of Earth is covered by water'], ['97%', 'of that water is salty'], ['9 days', 'water stays in the air']] },
    steps: { head: 'The four stages', items: [['Evaporation', 'The sun warms the water'], ['Condensation', 'Vapour cools into clouds'], ['Precipitation', 'Water falls as rain'], ['Collection', 'It flows back to the sea']] },
    quote: ['Water is the driving force of all nature.', 'Leonardo da Vinci'],
    close: { head: 'Quiz time!', sub: 'Draw the water cycle and label each stage.' }
  }),
  deck('product-launch', 'Product launch', 'product launch new product announcement features', ['tech', 'bold'], {
    label: 'Introducing',
    head: 'Meet the Aero smart bottle',
    sub: 'Tracks your water, keeps drinks cold for 24 hours.',
    agenda: ['Why we built it', 'Features', 'Pricing', 'Launch plan'],
    points: { head: 'Features', items: ['Reminds you to drink', 'Keeps drinks cold for 24 hours', 'Battery lasts two weeks', 'Syncs with your phone'], icons: ['bell', 'snowflake', 'battery-full', 'smartphone'] },
    story: { head: 'Why we built it', body: 'Most of us drink too little water. Aero gently reminds you and shows your progress, so healthy habits stick.' },
    stats: { head: 'Early results', items: [['+40%', 'more water each day'], ['5,000', 'pre-orders'], ['4.9', 'tester rating']] },
    steps: { head: 'Launch plan', items: [['March', 'Pre-orders open'], ['April', 'Reviews and press'], ['May', 'Shipping starts'], ['June', 'In stores']] },
    chart: { head: 'Pre-orders by week', type: 'line', labels: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'], series: [['Pre-orders', [300, 520, 760, 940, 1180, 1300]]], note: 'Pre-orders grew every week after our first video.' },
    close: { head: 'Available 1 May', sub: 'Pre-order now and save 20%.' }
  }),
  deck('quarterly-review', 'Quarterly business review', 'quarterly business review results sales report qbr', ['corporate', 'dark'], {
    label: 'Q3 review',
    head: 'Quarterly business review',
    sub: 'Results, highlights and plans for next quarter.',
    agenda: ['Results', 'Highlights', 'Challenges', 'Next quarter'],
    points: { head: 'Highlights', items: ['Best sales quarter so far', 'Opened our second branch', 'Hired eight new team members', 'Launched the loyalty programme'], icons: ['trophy', 'store', 'user-plus', 'heart'] },
    story: { head: 'Customer focus', body: 'We called 200 customers this quarter. Their feedback shaped the loyalty programme and our new opening hours.' },
    stats: { head: 'Results', items: [['$1.2M', 'revenue'], ['+18%', 'versus last quarter'], ['92%', 'customer satisfaction']] },
    steps: { head: 'Next quarter', items: [['Grow', 'Two new product lines'], ['Train', 'Customer service course'], ['Save', 'Cut delivery costs'], ['Expand', 'Plan a third branch']] },
    chart: { head: 'Revenue by quarter', type: 'column', labels: ['Q4', 'Q1', 'Q2', 'Q3'], series: [['Last year', [820, 760, 900, 1010]], ['This year', [880, 910, 1020, 1200]]], note: 'Revenue beat last year in every quarter.' },
    close: { head: 'Thank you', sub: 'Questions and discussion.' }
  }),
  deck('onboarding', 'Employee onboarding', 'onboarding new employee welcome training hr induction', ['fresh', 'calm'], {
    label: 'Welcome aboard',
    head: 'Your first week with us',
    sub: 'Everything you need to get started.',
    agenda: ['About us', 'Your first week', 'Tools we use', 'Who to ask'],
    points: { head: 'Our values', items: ['Customers come first', 'Be honest and kind', 'Keep learning', 'Own your work'], icons: ['heart-handshake', 'thumbs-up', 'graduation-cap', 'circle-check'] },
    story: { head: 'About us', body: 'We are a team of 80 people who help small businesses sell online. We work in small teams and share what we learn.' },
    stats: { head: 'Our team', items: [['80', 'people'], ['6', 'teams'], ['12', 'countries']] },
    steps: { head: 'Your first week', items: [['Day 1', 'Meet your team'], ['Day 2', 'Set up your tools'], ['Day 3', 'Shadow a colleague'], ['Day 5', 'Your first task']] },
    quote: ['Alone we can do so little; together we can do so much.', 'Helen Keller'],
    close: { head: 'Welcome to the team!', sub: 'Your buddy will meet you at 9 AM on Monday.' }
  }),
  deck('event-plan', 'Event plan', 'event plan planning conference festival programme', ['festive', 'warm'], {
    label: 'Event plan',
    head: 'Annual community fair',
    sub: 'Saturday 18 September, City Park.',
    agenda: ['The idea', 'Programme', 'Budget', 'Volunteers'],
    points: { head: 'What’s on', items: ['Food stalls from local cooks', 'Live music all afternoon', 'Games and art for kids', 'Prize draw at 6 PM'], icons: ['utensils', 'mic-vocal', 'palette', 'gift'] },
    story: { head: 'The idea', body: 'A free day out that brings neighbours together and helps small local businesses meet new customers.' },
    stats: { head: 'Our targets', items: [['3,000', 'visitors'], ['40', 'stalls'], ['100', 'volunteers']] },
    steps: { head: 'Programme', items: [['11 AM', 'Gates open'], ['1 PM', 'Kids’ games'], ['4 PM', 'Live music'], ['6 PM', 'Prize draw']] },
    chart: { head: 'Budget', type: 'pie', labels: ['Stage and sound', 'Tents', 'Safety', 'Marketing'], series: [['Budget', [35, 30, 20, 15]]], note: 'Stall fees and sponsors cover the full budget.' },
    close: { head: 'See you at the fair!', sub: 'Volunteer sign-up closes 1 September.' }
  }),
  deck('portfolio', 'Personal portfolio', 'portfolio personal designer photographer creative work showcase', ['minimal', 'elegant'], {
    label: 'Portfolio 2027',
    head: 'Hello, I’m Maya',
    sub: 'Brand and packaging designer.',
    agenda: ['About me', 'Selected work', 'How I work', 'Let’s talk'],
    points: { head: 'What I do', items: ['Logos and brand identity', 'Packaging design', 'Social media design', 'Print and signage'], icons: ['pen-tool', 'package', 'image', 'printer'] },
    story: { head: 'About me', body: 'I have spent eight years helping small brands look as good as they are. I love simple ideas, bold colour and careful details.' },
    stats: { head: 'In numbers', items: [['8', 'years of experience'], ['120+', 'brands designed'], ['15', 'design awards']] },
    steps: { head: 'How I work', items: [['Listen', 'Your story and goals'], ['Explore', 'Ideas and sketches'], ['Design', 'Refine the best one'], ['Deliver', 'All files you need']] },
    quote: ['Maya understood our brand from the first meeting.', 'Owner, Sweet Crumbs bakery'],
    close: { head: 'Let’s work together', sub: 'Available for new projects from June.' }
  }),
  deck('charity', 'Charity fundraising', 'charity fundraising donation nonprofit ngo cause', ['warm', 'nature'], {
    label: 'Help us help',
    head: 'Clean water for every village',
    sub: 'Our 2027 fundraising campaign.',
    agenda: ['The need', 'Our work', 'Impact', 'How you can help'],
    points: { head: 'How you can help', items: ['Give once or every month', 'Run a fundraising event', 'Volunteer your time', 'Share our story'], icons: ['hand-heart', 'calendar-heart', 'users', 'share-2'] },
    story: { head: 'The need', body: 'In many villages, children walk hours each day to fetch water that is not safe to drink. A single well changes that for good.' },
    stats: { head: 'Our impact', items: [['120', 'wells built'], ['48k', 'people with clean water'], ['92%', 'of donations go to projects']] },
    steps: { head: 'Where your money goes', items: [['$10', 'Water test kit'], ['$50', 'Hygiene training'], ['$250', 'Hand pump repair'], ['$2,000', 'A new well']] },
    chart: { head: 'Wells built each year', type: 'column', labels: ['2022', '2023', '2024', '2025', '2026'], series: [['Wells', [8, 14, 22, 33, 43]]], note: 'Every year more supporters help us reach more villages.' },
    close: { head: 'Thank you for caring', sub: 'Every gift brings clean water closer.' }
  }),
  deck('training', 'Training workshop', 'training workshop course seminar skills learning', ['calm', 'corporate'], {
    label: 'Workshop',
    head: 'Time management that works',
    sub: 'A practical two-hour workshop.',
    agenda: ['Why time slips away', 'Planning your week', 'Beating distractions', 'Your action plan'],
    points: { head: 'Simple habits', items: ['Plan tomorrow before you leave', 'Do the hardest task first', 'Turn off non-urgent alerts', 'Say no to low-value meetings'], icons: ['calendar-check', 'mountain', 'bell-off', 'circle-x'] },
    story: { head: 'Why time slips away', body: 'Most of us lose two hours a day to interruptions and unclear plans. Small changes in how we plan bring much of that time back.' },
    stats: { head: 'Did you know?', items: [['23 min', 'to refocus after an interruption'], ['2 hrs', 'lost each day'], ['40%', 'less output when multitasking']] },
    steps: { head: 'Plan your week', items: [['Review', 'Look at last week'], ['Choose', 'Three big goals'], ['Block', 'Time in your calendar'], ['Protect', 'Guard your focus time']] },
    quote: ['The key is not to prioritise what’s on your schedule, but to schedule your priorities.', 'Stephen Covey'],
    close: { head: 'Your action plan', sub: 'Write down one habit to start tomorrow.' }
  }),
  deck('travel', 'Travel story', 'travel story trip holiday journey photo presentation', ['nature', 'warm'], {
    label: 'Travel diary',
    head: 'Ten days in the hills',
    sub: 'A photo story from our family trip.',
    agenda: ['Getting there', 'Where we stayed', 'Best moments', 'Tips for you'],
    points: { head: 'Packing list', items: ['Warm layers for cool nights', 'Good walking shoes', 'Rain jacket', 'Power bank and torch'], icons: ['shirt', 'footprints', 'umbrella', 'flashlight'] },
    story: { head: 'Where we stayed', body: 'A small guest house with a garden full of tea plants. Every morning we woke to mist over the valley and fresh bread from the kitchen.' },
    stats: { head: 'Trip in numbers', items: [['10', 'days'], ['64 km', 'walked'], ['1,200', 'photos']] },
    steps: { head: 'Our route', items: [['Day 1', 'Train to the hills'], ['Day 3', 'Tea gardens'], ['Day 6', 'Waterfall hike'], ['Day 9', 'Local market']] },
    quote: ['The world is a book, and those who do not travel read only one page.', 'Saint Augustine'],
    close: { head: 'Where to next?', sub: 'Tell us your favourite place to visit.' }
  }),
  deck('sales-report', 'Monthly sales report', 'sales report monthly figures revenue team performance', ['corporate', 'bold'], {
    label: 'Sales report',
    head: 'June sales report',
    sub: 'Results by region, product and team.',
    agenda: ['Summary', 'By region', 'Top products', 'Next month'],
    points: { head: 'Top products', items: ['Wireless earbuds', 'Phone cases', 'Smart watches', 'Laptop stands'], icons: ['headphones', 'smartphone', 'watch', 'laptop'] },
    story: { head: 'Summary', body: 'June was our strongest month this year. Online orders grew fastest, helped by the mid-year sale and faster delivery.' },
    stats: { head: 'June at a glance', items: [['$248k', 'total sales'], ['+12%', 'versus May'], ['3,940', 'orders']] },
    steps: { head: 'Next month', items: [['Restock', 'Best sellers'], ['Promote', 'Back-to-school deals'], ['Train', 'New sales staff'], ['Review', 'Prices in July']] },
    chart: { head: 'Sales by region', type: 'bar', labels: ['North', 'South', 'East', 'West', 'Online'], series: [['Sales ($k)', [42, 38, 35, 29, 104]]], note: 'Online sales are now 42% of the total.' },
    close: { head: 'Great work, team!', sub: 'Next report on 5 August.' }
  }),
  deck('class-project', 'Class project: recycling', 'school project class presentation recycling environment students', ['kids', 'nature'], {
    label: 'Group project',
    head: 'Reduce, reuse, recycle',
    sub: 'How our school can make less waste.',
    agenda: ['The problem', 'What we found', 'Our ideas', 'What you can do'],
    points: { head: 'What you can do', items: ['Bring a reusable bottle', 'Use both sides of paper', 'Sort your rubbish', 'Fix things before buying new'], icons: ['cup-soda', 'file-text', 'recycle', 'wrench'] },
    story: { head: 'What we found', body: 'We counted the rubbish in our school for one week. Most of it was paper and plastic bottles that could have been recycled.' },
    stats: { head: 'One week at school', items: [['45 kg', 'of paper'], ['600', 'plastic bottles'], ['70%', 'could be recycled']] },
    steps: { head: 'Our plan', items: [['Week 1', 'Recycling bins'], ['Week 2', 'Posters in class'], ['Week 3', 'Bottle challenge'], ['Week 4', 'Count again']] },
    chart: { head: 'Our school’s waste', type: 'pie', labels: ['Paper', 'Plastic', 'Food', 'Other'], series: [['Waste', [45, 30, 15, 10]]], note: 'Paper and plastic make up three quarters of our waste.' },
    close: { head: 'Thank you!', sub: 'Presented by Group 3, Class 7.' }
  })
]
