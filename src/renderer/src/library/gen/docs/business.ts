import type { Page } from '@shared/model'
import { ellipse, frame, group, icon, line, rect } from '../../templateKit'
import { type Box, type Ctx, E, R, S, T, TB, cols, finish, inset, makeCtx, r, stack } from '../core'
import { decorate } from '../deco'
import type { Mood, Theme } from '../themes'

/**
 * Business stationery: business cards, letterheads, invoices and other
 * business documents, and certificates. Contact details are placeholders.
 */

// ------------------------------------------------------------ business cards

export interface Person {
  id: string
  title: string
  kw: string
  mood: Mood[]
  name: string
  role: string
  company: string
  tagline: string
  phone: string
  email: string
  web: string
  address: string
  icon: string
}

const p = (id: string, title: string, kw: string, mood: Mood[], name: string, role: string, company: string, tagline: string, icon: string, web: string): Person => ({
  id,
  title,
  kw,
  mood,
  name,
  role,
  company,
  tagline,
  icon,
  web,
  phone: '+1 234 567 890',
  email: `hello@${web}`,
  address: '12 Market Street, Your City'
})

export const people: Person[] = [
  p('bc-designer', 'Graphic designer card', 'graphic designer creative', ['playful', 'bold'], 'Maya Rahman', 'Graphic designer', 'Maya Studio', 'Brands people remember', 'pen-tool', 'mayastudio.com'),
  p('bc-developer', 'Developer card', 'software developer engineer programmer', ['tech', 'dark'], 'Arif Hasan', 'Software engineer', 'Hasan Labs', 'Clean code, fast apps', 'code', 'hasanlabs.dev'),
  p('bc-doctor', 'Doctor card', 'doctor physician medical clinic', ['calm', 'fresh'], 'Dr. Sara Ahmed', 'General physician', 'City Family Clinic', 'Caring for every generation', 'stethoscope', 'cityclinic.com'),
  p('bc-dentist', 'Dentist card', 'dentist dental clinic teeth', ['fresh', 'calm'], 'Dr. Omar Faruk', 'Dental surgeon', 'Bright Smile Dental', 'Healthy smiles for life', 'smile', 'brightsmile.com'),
  p('bc-lawyer', 'Lawyer card', 'lawyer attorney advocate legal', ['corporate', 'elegant'], 'Nadia Karim', 'Advocate', 'Karim & Partners', 'Trusted legal advice', 'scale', 'karimlaw.com'),
  p('bc-accountant', 'Accountant card', 'accountant tax finance bookkeeping', ['corporate', 'minimal'], 'Rafiq Islam', 'Chartered accountant', 'Islam Accounting', 'Numbers made simple', 'calculator', 'islamaccounts.com'),
  p('bc-realtor', 'Real estate agent card', 'real estate agent realtor property', ['corporate', 'luxury'], 'James Carter', 'Property consultant', 'Skyline Realty', 'Find your place', 'house', 'skylinerealty.com'),
  p('bc-photographer', 'Photographer card', 'photographer photography studio', ['minimal', 'elegant'], 'Lena Park', 'Photographer', 'Captured by Lena', 'Weddings · portraits · events', 'camera', 'capturedbylena.com'),
  p('bc-baker', 'Baker card', 'baker bakery cakes home baker', ['warm', 'playful'], 'Amina Begum', 'Head baker', 'Sweet Crumbs', 'Cakes for every celebration', 'cake', 'sweetcrumbs.com'),
  p('bc-chef', 'Chef card', 'chef restaurant catering cook', ['warm', 'luxury'], 'Marco Rossi', 'Executive chef', 'The Olive Table', 'Seasonal, local, delicious', 'chef-hat', 'olivetable.com'),
  p('bc-cafe', 'Cafe card', 'cafe coffee shop barista', ['warm', 'calm'], 'Tom Becker', 'Owner', 'The Corner Cafe', 'Good coffee, good company', 'coffee', 'cornercafe.com'),
  p('bc-salon', 'Hair stylist card', 'hair stylist salon beauty', ['elegant', 'calm'], 'Priya Sen', 'Senior stylist', 'Glow Beauty Salon', 'Look good, feel great', 'scissors', 'glowsalon.com'),
  p('bc-makeup', 'Makeup artist card', 'makeup artist beauty bridal', ['elegant', 'luxury'], 'Riya Das', 'Makeup artist', 'Riya Beauty', 'Bridal and party makeup', 'sparkles', 'riyabeauty.com'),
  p('bc-trainer', 'Personal trainer card', 'personal trainer fitness gym coach', ['bold', 'dark'], 'Ray Johnson', 'Personal trainer', 'FitWithRay', 'Stronger every week', 'dumbbell', 'fitwithray.com'),
  p('bc-yoga', 'Yoga teacher card', 'yoga teacher instructor wellness', ['calm', 'nature'], 'Asha Patel', 'Yoga teacher', 'Still Water Yoga', 'Breathe, move, rest', 'flower-2', 'stillwateryoga.com'),
  p('bc-tutor', 'Tutor card', 'tutor teacher tuition education', ['kids', 'fresh'], 'Rahim Uddin', 'Maths and science tutor', 'Bright Future Coaching', 'Learning made easy', 'graduation-cap', 'brightfuture.edu'),
  p('bc-consultant', 'Consultant card', 'consultant business advisor strategy', ['corporate', 'minimal'], 'Elena Ruiz', 'Business consultant', 'Ruiz Advisory', 'Clear strategy, real growth', 'briefcase', 'ruizadvisory.com'),
  p('bc-marketing', 'Marketing card', 'marketing digital agency social media', ['bold', 'tech'], 'Kevin Lee', 'Marketing manager', 'Spark Agency', 'Ideas that grow brands', 'megaphone', 'sparkagency.com'),
  p('bc-architect', 'Architect card', 'architect architecture interior design', ['minimal', 'corporate'], 'Hana Sato', 'Architect', 'Line & Form Studio', 'Spaces for living', 'ruler', 'lineandform.com'),
  p('bc-interior', 'Interior designer card', 'interior designer home decor', ['elegant', 'warm'], 'Olivia Brown', 'Interior designer', 'Nest Interiors', 'Homes with heart', 'sofa', 'nestinteriors.com'),
  p('bc-builder', 'Contractor card', 'contractor builder construction renovation', ['bold', 'corporate'], 'Karim Mia', 'Building contractor', 'Solid Build Co.', 'Built right, built to last', 'hammer', 'solidbuild.com'),
  p('bc-electrician', 'Electrician card', 'electrician electrical repair service', ['bold', 'tech'], 'Sohel Rana', 'Licensed electrician', 'Spark Electric', 'Safe, fast, reliable', 'zap', 'sparkelectric.com'),
  p('bc-mechanic', 'Mechanic card', 'mechanic car repair garage auto', ['dark', 'bold'], 'Dan Miller', 'Auto mechanic', 'Miller Auto Care', 'Your car in good hands', 'wrench', 'millerauto.com'),
  p('bc-travel', 'Travel agent card', 'travel agent tours holidays', ['fresh', 'calm'], 'Sofia Lima', 'Travel advisor', 'Wander Travel Co.', 'Trips you will never forget', 'plane', 'wandertravel.com'),
  p('bc-florist', 'Florist card', 'florist flowers shop bouquets', ['elegant', 'nature'], 'Rose Hill', 'Florist', 'Petal & Stem', 'Flowers for every moment', 'flower', 'petalandstem.com'),
  p('bc-tailor', 'Tailor card', 'tailor boutique fashion alterations', ['luxury', 'elegant'], 'Jamal Hossain', 'Master tailor', 'Hossain Tailors', 'Made to measure', 'shirt', 'hossaintailors.com'),
  p('bc-writer', 'Writer card', 'writer author copywriter freelance', ['minimal', 'calm'], 'Noah Green', 'Writer and editor', 'Green Ink', 'Words that work', 'feather', 'greenink.com'),
  p('bc-musician', 'Musician card', 'musician singer band music teacher', ['dark', 'elegant'], 'Nora Sky', 'Singer and songwriter', 'Nora Sky Music', 'Live music for every event', 'music', 'noraskymusic.com'),
  p('bc-vet', 'Vet card', 'veterinarian vet pet clinic animals', ['fresh', 'playful'], 'Dr. Liam Ward', 'Veterinary surgeon', 'Happy Paws Clinic', 'Gentle care for your pets', 'paw-print', 'happypaws.com'),
  p('bc-student', 'Student card', 'student graduate personal networking', ['fresh', 'minimal'], 'Zara Khan', 'Computer science student', 'Open to internships', 'Curious, quick, hard-working', 'graduation-cap', 'zarakhan.me')
]

const contactIcons = ['phone', 'mail', 'globe', 'map-pin']
const contacts = (q: Person) => [q.phone, q.email, q.web, q.address]

function contactRows(_c: Ctx, q: Person, size: number, color: string, iconColor: string, count = 4) {
  return R(contacts(q).slice(0, count), { spec: { role: 'body', size, color }, icons: contactIcons.slice(0, count), badgeFill: iconColor, gap: 1.2 })
}

function logo(_c: Ctx, q: Person, x: number, y: number, d: number, fill: string, ink: string) {
  return group([ellipse(r(x), r(y), r(d), r(d), fill, { name: 'Logo circle' }), icon(q.icon, r(x + d * 0.24), r(y + d * 0.24), r(d * 0.52), ink, { strokeWidth: 1.75, name: 'Logo icon' })])
}

type CardLayout = (c: Ctx, q: Person, back: () => Ctx) => void

const cardLayouts: Record<string, CardLayout> = {
  classic: (c, q) => {
    decorate(c, 0.5, 'dots')
    const m = c.u * 9
    const [a, b] = cols(c, inset({ x: 0, y: 0, w: c.W, h: c.H }, m, m, m, m * 1.2), [1, 1.1], 6)
    c.els.push(...logo(c, q, a.x, a.y, c.u * 14, c.t.accent, c.t.onAccent))
    stack(c, { ...a, y: a.y + c.u * 18, h: a.h - c.u * 18 }, [T(q.name, { role: 'head', size: 8 }), T(q.role, { role: 'label', size: 3, color: c.t.accentText })], { valign: 'bottom', gap: 2 })
    stack(c, b, [contactRows(c, q, 3.2, c.t.ink, c.t.accentText)], { valign: 'bottom' })
    c.els.push(rect(0, r(c.H - c.u * 3), c.W, r(c.u * 3), c.t.accent, { name: 'Accent bar' }))
  },
  split: (c, q) => {
    const pw = c.W * 0.38
    c.els.push(rect(0, 0, r(pw), c.H, c.t.accent, { name: 'Brand panel' }))
    const d = c.u * 20
    c.els.push(...logo(c, q, (pw - d) / 2, c.H * 0.2, d, c.t.onAccent, c.t.accent))
    stack(c, { x: c.u * 5, y: c.H * 0.2 + d + c.u * 4, w: pw - c.u * 10, h: c.H * 0.8 - d - c.u * 12 }, [T(q.company, { role: 'head', size: 5.2, align: 'center', color: c.t.onAccent }), T(q.tagline, { role: 'body', size: 2.8, align: 'center', color: c.t.onAccent })], { valign: 'top', align: 'center', gap: 1.5 })
    stack(c, inset({ x: pw, y: 0, w: c.W - pw, h: c.H }, c.u * 9), [T(q.name, { role: 'head', size: 8 }), T(q.role, { role: 'label', size: 3, color: c.t.accentText, gapAfter: 5 }), contactRows(c, q, 3.1, c.t.ink, c.t.accentText)], { valign: 'middle', gap: 2 })
  },
  center: (c, q, back) => {
    c.els.push(rect(0, 0, c.W, c.H, c.t.accent, { name: 'Background' }))
    stack(c, inset({ x: 0, y: 0, w: c.W, h: c.H }, c.u * 10), [E(24, (x, y, _w, h) => logo(c, q, x, y, h, c.t.onAccent, c.t.accent), 24), T(q.company, { role: 'head', size: 8, align: 'center', color: c.t.onAccent }), T(q.tagline, { role: 'label', size: 2.8, align: 'center', color: c.t.onAccent })], { valign: 'middle', align: 'center', gap: 3, maxGrow: 1 })
    const b = back()
    decorate(b, 0.6)
    stack(b, inset({ x: 0, y: 0, w: b.W, h: b.H }, b.u * 10), [T(q.name, { role: 'head', size: 8, align: 'center' }), T(q.role, { role: 'label', size: 3, align: 'center', color: b.t.accentText }), E(0.5, (x, y, w) => [rect(r(x + w / 2 - b.u * 8), y, r(b.u * 16), r(Math.max(2, b.u * 0.5)), b.t.accent, { name: 'Divider' })]), T(`${q.phone}\n${q.email}\n${q.web}`, { role: 'body', size: 3.2, align: 'center', color: b.t.ink, lineHeight: 1.6 })], { valign: 'middle', align: 'center', gap: 3, maxGrow: 1 })
  },
  band: (c, q, back) => {
    decorate(c, 1)
    stack(c, inset({ x: 0, y: 0, w: c.W, h: c.H }, c.u * 12), [T(q.company, { role: 'head', size: 10, align: 'center' }), E(0.6, (x, y, w) => [rect(r(x + w / 2 - c.u * 6), y, r(c.u * 12), r(c.u * 0.6), c.t.accent, { name: 'Divider' })]), T(q.tagline, { role: 'body', size: 3.4, align: 'center' })], { valign: 'middle', align: 'center', gap: 3, maxGrow: 1 })
    const b = back()
    const bandH = b.H * 0.4
    b.els.push(rect(0, 0, b.W, r(bandH), b.t.accent, { name: 'Band' }))
    stack(b, inset({ x: 0, y: 0, w: b.W, h: bandH }, b.u * 9, b.u * 5), [T(q.name, { role: 'head', size: 8, color: b.t.onAccent }), T(q.role, { role: 'label', size: 2.8, color: b.t.onAccent })], { valign: 'middle', gap: 1.5, maxGrow: 1 })
    stack(b, { x: b.u * 9, y: bandH + b.u * 5, w: b.W - b.u * 18, h: b.H - bandH - b.u * 10 }, [R(contacts(q), { spec: { role: 'body', size: 3, color: b.t.ink }, icons: contactIcons, badgeFill: b.t.accentText, gap: 1, columns: 2 })], { valign: 'middle', maxGrow: 1 })
  },
  photo: (c, q) => {
    decorate(c, 0.6)
    const d = c.H * 0.56
    const x = c.u * 10
    const y = (c.H - d) / 2
    c.els.push(ellipse(r(x - c.u * 1.2), r(y - c.u * 1.2), r(d + c.u * 2.4), r(d + c.u * 2.4), c.t.accent, { name: 'Photo ring' }))
    c.els.push(frame(r(x), r(y), r(d), r(d), { mask: 'circle', name: 'Your photo' }))
    stack(c, { x: x + d + c.u * 8, y: c.u * 9, w: c.W - x - d - c.u * 16, h: c.H - c.u * 18 }, [T(q.name, { role: 'head', size: 7.5 }), T(q.role, { role: 'label', size: 2.8, color: c.t.accentText, gapAfter: 4 }), contactRows(c, q, 3, c.t.ink, c.t.accentText, 3)], { valign: 'middle', gap: 1.8, maxGrow: 1 })
  },
  minimal: (c, q) => {
    const m = c.u * 9
    c.els.push(...logo(c, q, m, m, c.u * 10, c.t.accent, c.t.onAccent))
    stack(c, { x: m + c.u * 13, y: m, w: c.W * 0.6, h: c.u * 10 }, [T(q.company, { role: 'label', size: 3, color: c.t.ink })], { valign: 'middle', maxGrow: 1 })
    const [a, b] = cols(c, { x: m, y: c.H * 0.45, w: c.W - m * 2, h: c.H * 0.55 - m }, [1, 1], 6)
    stack(c, a, [T(q.name, { role: 'head', size: 7.5 }), T(q.role, { role: 'body', size: 3.2 })], { valign: 'bottom', gap: 1.5, maxGrow: 1 })
    stack(c, b, [T(`${q.phone}\n${q.email}\n${q.web}`, { role: 'body', size: 3, align: 'right', color: c.t.ink, lineHeight: 1.6 })], { valign: 'bottom', maxGrow: 1 })
  }
}

export const cardLayoutIds = Object.keys(cardLayouts)
export const twoSidedCards = new Set(['center', 'band'])

export function buildCard(layout: string, q: Person, W: number, H: number, theme: Theme, seed: string): Page[] {
  const front = makeCtx(W, H, theme, seed)
  let back: Ctx | null = null
  cardLayouts[layout](front, q, () => (back = makeCtx(W, H, theme, seed + 'b')))
  return back ? [finish(front, 'Front'), finish(back, 'Back')] : [finish(front)]
}

// ------------------------------------------------------------ company documents

export interface Company {
  id: string
  title: string
  kw: string
  mood: Mood[]
  name: string
  tagline: string
  icon: string
  web: string
}

const co = (id: string, title: string, kw: string, mood: Mood[], name: string, tagline: string, icon: string, web: string): Company => ({ id, title, kw, mood, name, tagline, icon, web })

export const companies: Company[] = [
  co('lh-studio', 'Design studio', 'design studio creative agency', ['playful', 'minimal'], 'Maya Studio', 'Brand and web design', 'pen-tool', 'mayastudio.com'),
  co('lh-law', 'Law firm', 'law firm legal lawyers', ['corporate', 'elegant'], 'Karim & Partners', 'Advocates and legal consultants', 'scale', 'karimlaw.com'),
  co('lh-clinic', 'Clinic', 'clinic medical health doctor', ['fresh', 'calm'], 'City Family Clinic', 'Caring for every generation', 'stethoscope', 'cityclinic.com'),
  co('lh-build', 'Construction company', 'construction builder contractor', ['bold', 'corporate'], 'Solid Build Co.', 'Construction and renovation', 'hammer', 'solidbuild.com'),
  co('lh-tech', 'Tech company', 'technology software it company', ['tech', 'corporate'], 'Hasan Labs', 'Software that works', 'code', 'hasanlabs.dev'),
  co('lh-school', 'School', 'school education academy', ['kids', 'corporate'], 'Green Valley School', 'Nurturing curious minds since 1998', 'graduation-cap', 'greenvalley.edu'),
  co('lh-realty', 'Real estate agency', 'real estate property agency', ['luxury', 'corporate'], 'Skyline Realty', 'Homes and commercial property', 'house', 'skylinerealty.com'),
  co('lh-restaurant', 'Restaurant', 'restaurant catering food', ['warm', 'luxury'], 'The Olive Table', 'Seasonal kitchen and catering', 'chef-hat', 'olivetable.com'),
  co('lh-ngo', 'Charity', 'charity ngo nonprofit foundation', ['warm', 'calm'], 'Hope for Tomorrow', 'Education and food for every child', 'heart-handshake', 'hopefortomorrow.org'),
  co('lh-finance', 'Accounting firm', 'accounting finance tax firm', ['corporate', 'minimal'], 'Islam Accounting', 'Tax, audit and advisory', 'calculator', 'islamaccounts.com'),
  co('lh-shop', 'Online shop', 'online shop store ecommerce', ['fresh', 'playful'], 'Petal & Stem', 'Flowers and gifts, delivered', 'flower', 'petalandstem.com'),
  co('lh-travel', 'Travel agency', 'travel agency tours', ['fresh', 'calm'], 'Wander Travel Co.', 'Tours, flights and visas', 'plane', 'wandertravel.com')
]

const ADDRESS = '12 Market Street, Your City · +1 234 567 890'

/** The words of a letter; the default is a fill-in placeholder. */
export interface LetterText {
  to: string
  subject: string
  greeting: string
  body: string
  closing: string
  from: string
}

const placeholderLetter = (co: Company): LetterText => ({
  to: 'Recipient Name\nCompany Name\n45 Park Avenue, Your City',
  subject: 'Subject: Your subject line goes here',
  greeting: 'Dear Recipient Name,',
  body: 'Thank you for your interest in working with us. This is where the body of your letter goes. Click on this text to replace it with your own message. Keep paragraphs short and clear so your reader can find the main points quickly.\n\nUse a second paragraph for details, next steps or anything you would like the reader to do. We look forward to hearing from you.',
  closing: 'Kind regards,',
  from: `Your Name\nYour position, ${co.name}`
})

function letterBody(c: Ctx, b: Box, co: Company, text: LetterText = placeholderLetter(co)) {
  stack(
    c,
    b,
    [
      T('20 March 2027', { role: 'body', size: 1.6, color: c.t.ink, gapAfter: 4 }),
      T(text.to, { role: 'body', size: 1.6, color: c.t.ink, lineHeight: 1.5, gapAfter: 4 }),
      T(text.subject, { role: 'body', size: 1.6, style: 'bold', color: c.t.ink, gapAfter: 3 }),
      T(text.greeting, { role: 'body', size: 1.6, color: c.t.ink }),
      T(text.body, { role: 'body', size: 1.6, color: c.t.ink, lineHeight: 1.6, gapAfter: 4 }),
      T(text.closing, { role: 'body', size: 1.6, color: c.t.ink, gapAfter: 6 }),
      T(text.from, { role: 'body', size: 1.6, color: c.t.ink, lineHeight: 1.5 })
    ],
    { valign: 'top', gap: 2, fill: 0.75, maxGrow: 1.3 }
  )
}

function letterhead(c: Ctx, co: Company, style: number, text?: LetterText) {
  const m = c.u * 9
  const contact = `${ADDRESS} · ${co.web}`
  if (style === 0) {
    const hh = c.u * 16
    c.els.push(rect(0, 0, c.W, r(hh), c.t.accent, { name: 'Header' }))
    c.els.push(...logo(c, { icon: co.icon } as Person, m, (hh - c.u * 9) / 2, c.u * 9, c.t.onAccent, c.t.accent))
    stack(c, { x: m + c.u * 12, y: 0, w: c.W - m * 2 - c.u * 12, h: hh }, [T(co.name, { role: 'head', size: 3.6, color: c.t.onAccent }), T(co.tagline, { role: 'body', size: 1.6, color: c.t.onAccent })], { valign: 'middle', gap: 0.6, maxGrow: 1 })
    letterBody(c, { x: m, y: hh + m, w: c.W - m * 2, h: c.H - hh - m * 2 - c.u * 8 }, co, text)
    c.els.push(rect(m, r(c.H - c.u * 9), c.W - m * 2, r(Math.max(2, c.u * 0.15)), c.t.accent, { name: 'Footer line' }))
    stack(c, { x: m, y: c.H - c.u * 8, w: c.W - m * 2, h: c.u * 5 }, [T(contact, { role: 'body', size: 1.6, align: 'center' })], { valign: 'middle', maxGrow: 1 })
  } else if (style === 1) {
    const sw = c.u * 4
    c.els.push(rect(0, 0, r(sw), c.H, c.t.accent, { name: 'Side strip' }))
    const x = sw + m
    c.els.push(...logo(c, { icon: co.icon } as Person, x, m, c.u * 9, c.t.accent, c.t.onAccent))
    stack(c, { x: x + c.u * 12, y: m, w: c.W * 0.6 - x - c.u * 14, h: c.u * 9 }, [T(co.name, { role: 'head', size: 3.2 }), T(co.tagline, { role: 'body', size: 1.6 })], { valign: 'middle', gap: 0.5, maxGrow: 1 })
    stack(c, { x: c.W * 0.62, y: m, w: c.W * 0.38 - m, h: c.u * 9 }, [T(`+1 234 567 890\nhello@${co.web}\n${co.web}`, { role: 'body', size: 1.6, align: 'right', lineHeight: 1.45 })], { valign: 'middle', maxGrow: 1 })
    c.els.push(rect(x, r(m + c.u * 13), c.W - x - m, r(Math.max(2, c.u * 0.15)), c.t.soft, { name: 'Divider' }))
    letterBody(c, { x, y: m + c.u * 18, w: c.W - x - m, h: c.H - m * 2 - c.u * 26 }, co, text)
    stack(c, { x, y: c.H - m - c.u * 4, w: c.W - x - m, h: c.u * 4 }, [T('12 Market Street, Your City', { role: 'body', size: 1.6 })], { valign: 'middle', maxGrow: 1 })
  } else if (style === 2) {
    decorate(c, 0.4, 'corners')
    stack(c, { x: m, y: m, w: c.W - m * 2, h: c.u * 20 }, [E(8, (x, y, _w, h) => logo(c, { icon: co.icon } as Person, x, y, h, c.t.accent, c.t.onAccent), 8), T(co.name, { role: 'head', size: 3.4, align: 'center' }), T(co.tagline, { role: 'label', size: 1.6, align: 'center', color: c.t.accentText })], { valign: 'top', align: 'center', gap: 1.2, maxGrow: 1 })
    letterBody(c, { x: m * 1.3, y: m + c.u * 26, w: c.W - m * 2.6, h: c.H - m * 2 - c.u * 36 }, co, text)
    c.els.push(rect(0, r(c.H - c.u * 8), c.W, r(c.u * 8), c.t.accent, { name: 'Footer band' }))
    stack(c, { x: m, y: c.H - c.u * 8, w: c.W - m * 2, h: c.u * 8 }, [T(contact, { role: 'body', size: 1.6, align: 'center', color: c.t.onAccent })], { valign: 'middle', maxGrow: 1 })
  } else {
    stack(c, { x: m, y: m, w: c.W - m * 2, h: c.u * 10 }, [T(co.name, { role: 'head', size: 4 }), T(co.tagline, { role: 'body', size: 1.6 })], { valign: 'top', gap: 0.6, maxGrow: 1 })
    c.els.push(rect(m, r(m + c.u * 12), r(c.u * 10), r(c.u * 0.6), c.t.accent, { name: 'Accent rule' }))
    letterBody(c, { x: m, y: m + c.u * 18, w: c.W - m * 2, h: c.H - m * 2 - c.u * 28 }, co, text)
    c.els.push(rect(m, r(c.H - m - c.u * 6), c.W - m * 2, r(Math.max(2, c.u * 0.12)), c.t.ink, { name: 'Footer line', opacity: 0.4 }))
    const [a, b] = cols(c, { x: m, y: c.H - m - c.u * 5, w: c.W - m * 2, h: c.u * 5 }, [1, 1], 2)
    stack(c, a, [T('12 Market Street, Your City', { role: 'body', size: 1.6 })], { valign: 'middle', maxGrow: 1 })
    stack(c, b, [T(`+1 234 567 890 · ${co.web}`, { role: 'body', size: 1.6, align: 'right' })], { valign: 'middle', maxGrow: 1 })
  }
}

export function buildLetterhead(style: number, co: Company, W: number, H: number, theme: Theme, seed: string, text?: LetterText): Page[] {
  const c = makeCtx(W, H, theme, seed)
  letterhead(c, co, style, text)
  return [finish(c)]
}

// ------------------------------------------------------------ invoices and similar

export interface BillDoc {
  kind: string
  number: string
  items: string[][]
  note: string
}

export const billKinds: BillDoc[] = [
  { kind: 'Invoice', number: 'INV-0042', items: [['Logo design', '1', '$400', '$400'], ['Business cards', '2', '$60', '$120'], ['Social media kit', '1', '$250', '$250'], ['Letterhead design', '1', '$80', '$80'], ['Brand guidelines', '1', '$300', '$300'], ['Revisions', '3', '$40', '$120']], note: 'Payment due within 14 days. Bank: Your Bank · Account 0123 4567 8901' },
  { kind: 'Quotation', number: 'QT-0108', items: [['Website design', '1', '$1,200', '$1,200'], ['Online shop setup', '1', '$450', '$450'], ['Hosting (1 year)', '1', '$120', '$120'], ['Content writing', '5', '$50', '$250'], ['Training session', '2', '$60', '$120']], note: 'This quotation is valid for 30 days. Prices exclude tax.' },
  { kind: 'Receipt', number: 'RC-2291', items: [['Monthly membership', '1', '$45', '$45'], ['Personal training', '4', '$25', '$100'], ['Locker rental', '1', '$8', '$8'], ['Protein shake', '2', '$5', '$10']], note: 'Paid in full by card. Thank you for your business!' },
  { kind: 'Estimate', number: 'EST-017', items: [['Kitchen repaint', '1', '$650', '$650'], ['Cabinet repair', '2', '$90', '$180'], ['New light fittings', '4', '$35', '$140'], ['Materials', '1', '$220', '$220'], ['Clean-up', '1', '$60', '$60']], note: 'Final cost may change if the work required changes.' },
  { kind: 'Purchase order', number: 'PO-5530', items: [['Printer paper (box)', '10', '$28', '$280'], ['Toner cartridge', '4', '$65', '$260'], ['Desk chairs', '2', '$120', '$240'], ['Whiteboard', '1', '$90', '$90'], ['Stapler set', '5', '$12', '$60']], note: 'Please deliver to the main office by 30 April.' },
  { kind: 'Bill', number: 'B-1204', items: [['Room charge (2 nights)', '2', '$90', '$180'], ['Breakfast', '4', '$12', '$48'], ['Airport pickup', '1', '$25', '$25'], ['Laundry', '1', '$15', '$15']], note: 'Thank you for staying with us.' }
]

function total(items: string[][]): { sub: string; tax: string; sum: string } {
  const n = items.reduce((s, it) => s + Number(it[3].replace(/[$,]/g, '')), 0)
  const fmt = (v: number) => `$${v.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
  return { sub: fmt(n), tax: fmt(Math.round(n * 0.05)), sum: fmt(n + Math.round(n * 0.05)) }
}

export function buildBill(style: number, doc: BillDoc, co: Company, W: number, H: number, theme: Theme, seed: string): Page[] {
  const c = makeCtx(W, H, theme, seed)
  const m = c.u * 8
  const t = total(doc.items)
  const head = style === 1
  let top = m
  if (head) {
    const hh = c.u * 20
    c.els.push(rect(0, 0, c.W, r(hh), c.t.accent, { name: 'Header' }))
    const [a, b] = cols(c, inset({ x: 0, y: 0, w: c.W, h: hh }, m, c.u * 4), [1, 1], 4)
    stack(c, a, [T(co.name, { role: 'head', size: 3.4, color: c.t.onAccent }), T(co.tagline, { role: 'body', size: 1.9, color: c.t.onAccent })], { valign: 'middle', gap: 0.6, maxGrow: 1 })
    stack(c, b, [T(doc.kind, { role: 'head', size: 5, align: 'right', color: c.t.onAccent, upper: true })], { valign: 'middle', maxGrow: 1 })
    top = hh + c.u * 6
  } else {
    const [a, b] = cols(c, { x: m, y: m, w: c.W - m * 2, h: c.u * 14 }, [1, 1], 4)
    c.els.push(...logo(c, { icon: 'sparkles' } as Person, a.x, a.y + c.u * 2, c.u * 9, c.t.accent, c.t.onAccent))
    stack(c, { ...a, x: a.x + c.u * 12, w: a.w - c.u * 12 }, [T(co.name, { role: 'head', size: 3.2 }), T(co.tagline, { role: 'body', size: 1.9 })], { valign: 'middle', gap: 0.5, maxGrow: 1 })
    stack(c, b, [T(doc.kind, { role: 'head', size: style === 2 ? 4.4 : 5.4, align: 'right', upper: style !== 2, color: c.t.accentText })], { valign: 'middle', maxGrow: 1 })
    c.els.push(rect(m, r(m + c.u * 17), c.W - m * 2, r(Math.max(2, c.u * 0.2)), c.t.accent, { name: 'Divider' }))
    top = m + c.u * 22
  }
  const [from, to, meta] = cols(c, { x: m, y: top, w: c.W - m * 2, h: c.u * 19 }, [1, 1, 0.9], 4)
  stack(c, from, [T('From', { role: 'label', size: 1.8, color: c.t.accentText }), T(`${co.name}\n12 Market Street\nYour City\nhello@${co.web}`, { role: 'body', size: 1.9, color: c.t.ink, lineHeight: 1.5 })], { gap: 1, maxGrow: 1 })
  stack(c, to, [T('Bill to', { role: 'label', size: 1.8, color: c.t.accentText }), T('Client Name\nClient Company\n45 Park Avenue\nclient@email.com', { role: 'body', size: 1.9, color: c.t.ink, lineHeight: 1.5 })], { gap: 1, maxGrow: 1 })
  stack(c, meta, [T('Details', { role: 'label', size: 1.8, color: c.t.accentText }), T(`Number: ${doc.number}\nDate: 20 March 2027\nDue: 3 April 2027`, { role: 'body', size: 1.9, color: c.t.ink, lineHeight: 1.5 })], { gap: 1, maxGrow: 1 })
  const tableTop = top + c.u * 26
  const used = stack(
    c,
    { x: m, y: tableTop, w: c.W - m * 2, h: c.H - tableTop - m - c.u * 30 },
    [TB([['Description', 'Qty', 'Price', 'Amount'], ...doc.items], { size: 1.9, name: 'Items' })],
    { maxGrow: 1 }
  )
  const tw = (c.W - m * 2) * 0.42
  const sums = stack(
    c,
    { x: c.W - m - tw, y: used.y + used.h + c.u * 3, w: tw, h: c.u * 20 },
    [TB([['Subtotal', t.sub], ['Tax (5%)', t.tax], ['Total', t.sum]], { size: 2, header: false, align: 'right', stripe: null, name: 'Totals' })],
    { maxGrow: 1 }
  )
  const noteTop = sums.y + sums.h + c.u * 5
  stack(c, { x: m, y: noteTop, w: c.W - m * 2, h: c.H - noteTop - m - c.u * 6 }, [T('Notes', { role: 'label', size: 1.8, color: c.t.accentText }), T(doc.note, { role: 'body', size: 1.9, color: c.t.ink })], { gap: 1, maxGrow: 1 })
  stack(c, { x: m, y: c.H - m - c.u * 4, w: c.W - m * 2, h: c.u * 4 }, [T(`Thank you for your business · ${co.web}`, { role: 'body', size: 1.9, align: 'center' })], { valign: 'middle', maxGrow: 1 })
  return [finish(c)]
}

// ------------------------------------------------------------ certificates

export interface CertContent {
  id: string
  title: string
  kw: string
  mood: Mood[]
  heading: string
  kind: string
  line: string
  body: string
  org: string
  icon: string
}

const cert = (id: string, title: string, kw: string, mood: Mood[], heading: string, kind: string, body: string, org: string, icon: string, line = 'This certificate is proudly presented to'): CertContent => ({ id, title, kw, mood, heading, kind, line, body, org, icon })

export const certificates: CertContent[] = [
  cert('c-achievement', 'Certificate of achievement', 'certificate achievement award', ['luxury', 'elegant'], 'Certificate', 'of Achievement', 'In recognition of outstanding performance and dedication throughout the year.', 'Green Valley School', 'award'),
  cert('c-appreciation', 'Certificate of appreciation', 'certificate appreciation thank you', ['elegant', 'calm'], 'Certificate', 'of Appreciation', 'With sincere thanks for your generous support and valuable contribution.', 'Hope for Tomorrow', 'heart-handshake'),
  cert('c-completion', 'Certificate of completion', 'certificate completion course training', ['corporate', 'minimal'], 'Certificate', 'of Completion', 'For successfully completing the 8-week Digital Marketing course.', 'Your Academy', 'graduation-cap'),
  cert('c-participation', 'Certificate of participation', 'certificate participation event competition', ['fresh', 'playful'], 'Certificate', 'of Participation', 'For taking part in the Annual Science Fair 2027.', 'Green Valley School', 'flask-conical'),
  cert('c-excellence', 'Certificate of excellence', 'certificate excellence award best', ['luxury', 'dark'], 'Certificate', 'of Excellence', 'Awarded for excellence in leadership and teamwork.', 'Your Company', 'trophy'),
  cert('c-employee', 'Employee of the month certificate', 'employee of the month award certificate work', ['corporate', 'festive'], 'Award', 'Employee of the Month', 'For going above and beyond for our customers in March 2027.', 'Your Company', 'star'),
  cert('c-honor', 'Honour roll certificate', 'honour roll school student academic', ['kids', 'elegant'], 'Certificate', 'of Honour', 'For outstanding academic results in the first term.', 'Green Valley School', 'medal'),
  cert('c-merit', 'Certificate of merit', 'merit certificate student award', ['elegant', 'kids'], 'Certificate', 'of Merit', 'For hard work, good conduct and a positive attitude in class.', 'Green Valley School', 'badge-check'),
  cert('c-training', 'Training certificate', 'training certificate workshop professional', ['corporate', 'tech'], 'Certificate', 'of Training', 'Has completed 20 hours of First Aid and Workplace Safety training.', 'Safety Training Centre', 'shield-check'),
  cert('c-volunteer', 'Volunteer certificate', 'volunteer certificate community service', ['warm', 'nature'], 'Certificate', 'of Service', 'With gratitude for 100 hours of volunteer service to our community.', 'Riverside Community', 'hand-heart'),
  cert('c-sports', 'Sports award', 'sports certificate winner first place', ['bold', 'festive'], 'Certificate', 'First Place', 'Winner of the 100 m race at the Annual Sports Day 2027.', 'Green Valley School', 'trophy'),
  cert('c-art', 'Art competition certificate', 'art competition drawing certificate winner', ['playful', 'kids'], 'Certificate', 'of Creativity', 'For an outstanding entry in the Young Artists Competition.', 'City Art Gallery', 'palette'),
  cert('c-quran', 'Quran completion certificate', 'quran completion certificate islamic hifz', ['elegant', 'luxury'], 'Certificate', 'of Completion', 'For completing the recitation of the Holy Quran with excellence.', 'Al-Noor Islamic Centre', 'book-open'),
  cert('c-graduation', 'Graduation certificate', 'graduation diploma certificate kindergarten', ['kids', 'festive'], 'Diploma', 'Kindergarten Graduate', 'Has successfully completed kindergarten and is ready for Class One.', 'Little Stars School', 'graduation-cap'),
  cert('c-attendance', 'Perfect attendance certificate', 'attendance certificate school perfect', ['kids', 'fresh'], 'Award', 'Perfect Attendance', 'For attending every school day this year. Well done!', 'Green Valley School', 'calendar-check'),
  cert('c-membership', 'Membership certificate', 'membership certificate club member', ['corporate', 'elegant'], 'Certificate', 'of Membership', 'Is a registered member of the Hill Trails Club for 2027.', 'Hill Trails Club', 'id-card'),
  cert('c-gift', 'Gift certificate', 'gift certificate voucher present', ['luxury', 'festive'], 'Gift', 'Certificate', 'This certificate entitles the bearer to one full day spa package.', 'Glow Beauty Salon', 'gift', 'This gift is for'),
  cert('c-recognition', 'Certificate of recognition', 'recognition certificate award staff', ['corporate', 'luxury'], 'Certificate', 'of Recognition', 'In recognition of 10 years of loyal and dedicated service.', 'Your Company', 'award'),
  cert('c-reading', 'Reading challenge certificate', 'reading challenge certificate books kids', ['kids', 'playful'], 'Certificate', 'Super Reader', 'For reading 50 books in the Summer Reading Challenge!', 'City Library', 'book-open'),
  cert('c-best-teacher', 'Best teacher award', 'best teacher award certificate', ['elegant', 'calm'], 'Award', 'Best Teacher of the Year', 'With thanks for inspiring every student, every day.', 'Green Valley School', 'apple')
]

export function buildCertificate(style: number, k: CertContent, W: number, H: number, theme: Theme, seed: string): Page[] {
  const c = makeCtx(W, H, theme, seed)
  const m = c.u * 5
  if (style === 0 || style === 4) {
    c.els.push(rect(m, m, c.W - m * 2, c.H - m * 2, 'transparent', { name: 'Outer border', stroke: c.t.line === c.t.soft ? c.t.accent : c.t.line, strokeWidth: r(c.u * 0.8) }))
    c.els.push(rect(m + c.u * 2, m + c.u * 2, c.W - m * 2 - c.u * 4, c.H - m * 2 - c.u * 4, 'transparent', { name: 'Inner border', stroke: c.t.line === c.t.soft ? c.t.accent : c.t.line, strokeWidth: r(Math.max(2, c.u * 0.2)) }))
    decorate(c, 0.9, 'corners')
  } else if (style === 1) {
    c.els.push(rect(0, 0, r(c.W * 0.07), c.H, c.t.accent, { name: 'Side band' }))
    c.els.push(rect(r(c.W * 0.07 + c.u * 1.2), 0, r(c.u * 0.8), c.H, c.t.accent2, { name: 'Side line' }))
  } else if (style === 2) {
    decorate(c, 1, c.t.deco === 'none' ? 'circles' : c.t.deco)
    c.els.push(rect(m, m, c.W - m * 2, c.H - m * 2, c.t.surface, { name: 'Panel', cornerRadius: r(c.u * 2), shadow: { color: '#000000', blur: r(c.u * 3), offsetX: 0, offsetY: r(c.u * 0.5), opacity: 0.12 } }))
  } else {
    c.els.push(rect(0, 0, c.W, r(c.u * 3), c.t.accent, { name: 'Top bar' }), rect(0, r(c.H - c.u * 3), c.W, r(c.u * 3), c.t.accent, { name: 'Bottom bar' }))
  }
  const onPanel = style === 2
  const ink = onPanel ? c.t.surfaceInk : c.t.ink
  const muted = onPanel ? c.t.surfaceMuted : c.t.muted
  const accentInk = onPanel ? c.t.surfaceInk : c.t.accentText
  const seal = c.u * 15
  const box = inset({ x: 0, y: 0, w: c.W, h: c.H }, c.W * (style === 1 ? 0.14 : 0.1), c.u * 11, c.W * 0.1, c.u * 30)
  stack(
    c,
    box,
    [
      T(k.heading, { role: 'head', size: 9, align: 'center', color: ink, upper: true, spacing: 0.12 }),
      T(k.kind, { role: style === 4 ? 'accent' : 'label', size: style === 4 ? 6 : 2.8, align: 'center', color: accentInk, spacing: style === 4 ? 0 : 0.3 }),
      S(2),
      T(k.line, { role: 'body', size: 2.2, align: 'center', color: muted }),
      T('Your Name Here', { role: 'accent', size: 9, align: 'center', color: ink }),
      E(0.3, (x, y, w) => [rect(r(x + w * 0.25), y, r(w * 0.5), r(Math.max(2, c.u * 0.25)), onPanel ? c.t.surfaceMuted : c.t.line === c.t.soft ? c.t.accent : c.t.line, { name: 'Name line' })]),
      T(k.body, { role: 'body', size: 2.2, align: 'center', color: muted, widthShare: 0.8 })
    ],
    { valign: 'middle', align: 'center', gap: 2.2, maxGrow: 1.1 }
  )
  const sigY = c.H - c.u * 26
  const sigW = c.W * 0.22
  const sigs: [number, string][] = [
    [c.W * 0.14, 'Name Surname\nDirector'],
    [c.W * 0.86 - sigW, `20 March 2027\n${k.org}`]
  ]
  for (const [x, label] of sigs) {
    c.els.push(line(r(x), r(sigY + c.u * 6), r(sigW), ink, r(Math.max(2, c.u * 0.2)), { name: 'Signature line' }))
    stack(c, { x, y: sigY + c.u * 8, w: sigW, h: c.u * 10 }, [T(label, { role: 'body', size: 2, align: 'center', color: muted, lineHeight: 1.4 })], { maxGrow: 1 })
  }
  const sx = (c.W - seal) / 2
  const sy = sigY - c.u * 1
  c.els.push(
    ...group([
      ellipse(r(sx), r(sy), r(seal), r(seal), c.t.accent, { name: 'Seal', stroke: c.t.accent2, strokeWidth: r(c.u * 0.6) }),
      icon(k.icon, r(sx + seal * 0.27), r(sy + seal * 0.27), r(seal * 0.46), c.t.onAccent, { strokeWidth: 1.5, name: 'Seal icon' })
    ])
  )
  return [finish(c)]
}

