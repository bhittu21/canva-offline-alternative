import type { Page } from '@shared/model'
import { frame, rect } from '../../templateKit'
import { type Ctx, R, S, T, TB, cols, finish, hash, inset, makeCtx, r, rows, stack } from '../core'
import { decorate } from '../deco'
import type { PostContent } from '../postLayouts'
import type { Mood, Theme } from '../themes'
import { type Company, type LetterText, buildLetterhead, companies } from './business'

/** Everyday letters on a letterhead, other office and home documents, and printable signs. */

export interface Letter extends LetterText {
  id: string
  title: string
  kw: string
  mood: Mood[]
  /** Written by a person rather than a company: the header shows their name. */
  personal?: boolean
}

const you: Company = { id: 'you', title: 'Your Name', kw: '', mood: ['minimal'], name: 'Your Name', tagline: '12 Market Street, Your City', icon: 'user', web: 'yourname.com' }

export function buildLetter(style: number, l: Letter, W: number, H: number, theme: Theme, seed: string): Page[] {
  const co = l.personal ? you : companies[hash(seed) % companies.length]
  return buildLetterhead(style, co, W, H, theme, seed, l)
}

const letter = (id: string, title: string, kw: string, mood: Mood[], f: Omit<Letter, 'id' | 'title' | 'kw' | 'mood'>): Letter => ({ id, title, kw, mood, ...f })

export const letters: Letter[] = [
  letter('leave', 'Leave application', 'leave application letter office holiday absence', ['minimal', 'calm'], {
    personal: true,
    to: 'The Manager\nHuman Resources\nCompany Name',
    subject: 'Subject: Application for leave from 5 to 9 April',
    greeting: 'Dear Sir or Madam,',
    body: 'I would like to request five days of annual leave from 5 April to 9 April 2027 to attend a family wedding in my home town.\n\nI have finished my urgent tasks and my colleague, Name, has agreed to handle any questions while I am away. I will be reachable by phone if needed.\n\nThank you for considering my request.',
    closing: 'Yours faithfully,',
    from: 'Your Name\nYour position, Department'
  }),
  letter('sick-leave', 'Sick leave application', 'sick leave application letter illness medical', ['calm', 'minimal'], {
    personal: true,
    to: 'The Principal\nSchool Name\nYour City',
    subject: 'Subject: Application for sick leave',
    greeting: 'Dear Sir or Madam,',
    body: 'I respectfully state that I was unable to attend school from 12 to 14 March because I had a high fever. The doctor advised me to rest at home.\n\nI kindly request you to grant me leave for these three days. I will complete all the work I missed.',
    closing: 'Yours obediently,',
    from: 'Your Name\nClass 8, Section A, Roll 15'
  }),
  letter('resignation', 'Resignation letter', 'resignation letter job quit notice', ['minimal', 'corporate'], {
    personal: true,
    to: 'Manager Name\nDepartment\nCompany Name',
    subject: 'Subject: Resignation from my position',
    greeting: 'Dear Manager Name,',
    body: 'Please accept this letter as formal notice of my resignation from my position as Your position. My last working day will be 30 April 2027, one month from today.\n\nThank you for the support and the chances to learn during my time here. I will do everything I can to hand over my work smoothly.',
    closing: 'With best wishes,',
    from: 'Your Name'
  }),
  letter('experience', 'Experience certificate', 'experience certificate letter employment proof', ['corporate', 'minimal'], {
    to: 'To whom it may concern',
    subject: 'Subject: Experience certificate',
    greeting: '',
    body: 'This is to certify that Employee Name worked with our company as Job title from 1 January 2023 to 31 March 2027.\n\nDuring this time we found them hard-working, honest and a valued member of the team. Their duties included Main duties.\n\nWe wish them every success in the future.',
    closing: 'For Company Name,',
    from: 'Name\nHead of Human Resources'
  }),
  letter('offer', 'Job offer letter', 'job offer letter appointment hiring employment', ['corporate', 'fresh'], {
    to: 'Candidate Name\n45 Park Avenue\nYour City',
    subject: 'Subject: Offer of employment',
    greeting: 'Dear Candidate Name,',
    body: 'We are pleased to offer you the position of Job title, starting on 1 May 2027. Your monthly salary will be Amount, and you will report to Manager Name.\n\nPlease sign and return a copy of this letter by 20 April to accept the offer. We look forward to welcoming you to the team.',
    closing: 'Kind regards,',
    from: 'Name\nHead of Human Resources'
  }),
  letter('recommendation', 'Recommendation letter', 'recommendation reference letter student employee', ['elegant', 'corporate'], {
    to: 'Admissions Committee\nUniversity Name',
    subject: 'Subject: Letter of recommendation for Student Name',
    greeting: 'Dear Members of the Committee,',
    body: 'I am pleased to recommend Student Name, whom I have taught for two years. They are curious, hard-working and one of the most thoughtful students in the class.\n\nThey led our science club and helped younger students with their projects. I am confident they will do very well in your programme.',
    closing: 'Sincerely,',
    from: 'Teacher Name\nHead of Science, School Name'
  }),
  letter('salary-cert', 'Salary certificate', 'salary certificate letter income bank visa', ['corporate', 'minimal'], {
    to: 'To whom it may concern',
    subject: 'Subject: Salary certificate',
    greeting: '',
    body: 'This is to certify that Employee Name has been working with us as Job title since 1 January 2023. Their current gross monthly salary is Amount.\n\nThis certificate is issued at their request for bank purposes.',
    closing: 'For Company Name,',
    from: 'Name\nAccounts Manager'
  }),
  letter('noc', 'No objection certificate', 'noc no objection certificate letter travel visa', ['corporate', 'calm'], {
    to: 'The Visa Officer\nEmbassy Name',
    subject: 'Subject: No objection certificate',
    greeting: 'Dear Sir or Madam,',
    body: 'This is to confirm that Employee Name is a permanent employee of our company. We have no objection to their travel abroad from 1 to 15 June 2027 for a holiday.\n\nThey will return to work on 16 June 2027.',
    closing: 'Yours faithfully,',
    from: 'Name\nHead of Human Resources'
  }),
  letter('complaint', 'Complaint letter', 'complaint letter customer service problem', ['minimal', 'calm'], {
    personal: true,
    to: 'Customer Service Manager\nCompany Name\nYour City',
    subject: 'Subject: Complaint about order number 12345',
    greeting: 'Dear Customer Service Manager,',
    body: 'On 2 March I bought a washing machine from your shop. It stopped working after one week, and it has not been repaired although I called twice.\n\nI would like the machine to be repaired or replaced within seven days. Copies of my receipt and warranty card are attached.',
    closing: 'Yours sincerely,',
    from: 'Your Name\n+1 234 567 890'
  }),
  letter('thank-you-letter', 'Thank-you letter', 'thank you letter appreciation business client', ['warm', 'elegant'], {
    to: 'Client Name\nCompany Name',
    subject: 'Subject: Thank you for your business',
    greeting: 'Dear Client Name,',
    body: 'Thank you for choosing us for your recent project. It was a pleasure working with your team, and we are proud of what we built together.\n\nIf there is anything else we can help with, please let us know. We look forward to working with you again.',
    closing: 'With warm regards,',
    from: 'Your Name\nYour position'
  })
]

// ------------------------------------------------------------ other documents

export interface OfficeDoc {
  id: string
  title: string
  kw: string
  mood: Mood[]
  build: (c: Ctx, style: number) => void
}

const doc = (id: string, title: string, kw: string, mood: Mood[], build: (c: Ctx, style: number) => void): OfficeDoc => ({ id, title, kw, mood, build })

/** Title block shared by documents; returns the y below it. */
function docHead(c: Ctx, style: number, label: string, title: string, sub?: string): number {
  const m = c.u * 8
  if (style === 1) {
    const hh = c.u * 26
    c.els.push(rect(0, 0, c.W, r(hh), c.t.accent, { name: 'Header' }))
    stack(c, inset({ x: 0, y: 0, w: c.W, h: hh }, m, c.u * 4), [T(label, { role: 'label', size: 1.8, color: c.t.onAccent }), T(title, { role: 'head', size: 5.4, color: c.t.onAccent }), T(sub, { role: 'body', size: 1.9, color: c.t.onAccent })], { valign: 'middle', gap: 1.2, maxGrow: 1 })
    return hh + c.u * 6
  }
  decorate(c, 0.3)
  const used = stack(c, { x: m, y: m, w: c.W - m * 2, h: c.u * 24 }, [T(label, { role: 'label', size: 1.8 }), T(title, { role: 'head', size: 5.4 }), T(sub, { role: 'body', size: 1.9, color: c.t.ink })], { gap: 1.2, maxGrow: 1 })
  c.els.push(rect(m, r(used.y + used.h + c.u * 2.5), r(c.u * 10), r(c.u * 0.6), c.t.accent, { name: 'Accent rule' }))
  return used.y + used.h + c.u * 7
}

const body = (c: Ctx, y: number) => ({ x: c.u * 8, y, w: c.W - c.u * 16, h: c.H - y - c.u * 8 })
const para = (c: Ctx, text: string, gapAfter?: number) => T(text, { role: 'body', size: 1.9, color: c.t.ink, lineHeight: 1.6, gapAfter })
const sub = (c: Ctx, text: string) => T(text, { role: 'body', size: 2.3, style: 'bold', color: c.t.ink, gapAfter: 1.2 })

function cover(c: Ctx, style: number, label: string, title: string, subText: string, who: string): void {
  const m = c.u * 9
  if (style === 0) {
    c.els.push(frame(0, 0, c.W, r(c.H * 0.5), { name: 'Cover photo' }))
    c.els.push(rect(0, r(c.H * 0.5), c.W, r(c.u * 1.2), c.t.accent, { name: 'Accent band' }))
    stack(c, { x: m, y: c.H * 0.5 + m, w: c.W - m * 2, h: c.H * 0.5 - m * 2 }, [T(label, { role: 'label', size: 2.2 }), T(title, { role: 'head', size: 8 }), T(subText, { role: 'body', size: 2.6 }), S(4), T(who, { role: 'body', size: 2, color: c.t.ink, lineHeight: 1.5 })], { gap: 2, valign: 'middle', maxGrow: 1.2 })
    return
  }
  c.els.push(rect(0, 0, r(c.W * 0.42), c.H, c.t.accent, { name: 'Side panel' }))
  decorate(c, 0.3)
  c.els.push(frame(r(c.W * 0.42 + m), r(m), r(c.W * 0.58 - m * 2), r(c.H * 0.42), { name: 'Cover photo', mask: 'rounded', cornerRadius: r(c.u * 2) }))
  stack(c, { x: m, y: m, w: c.W * 0.42 - m * 1.6, h: c.H - m * 2 }, [T(label, { role: 'label', size: 2, color: c.t.onAccent }), T(title, { role: 'head', size: 6.4, color: c.t.onAccent }), T(subText, { role: 'body', size: 2.3, color: c.t.onAccent })], { gap: 2.5, valign: 'bottom', maxGrow: 1.1 })
  stack(c, { x: c.W * 0.42 + m, y: c.H * 0.42 + m * 2, w: c.W * 0.58 - m * 2, h: c.H * 0.58 - m * 3 }, [T(who, { role: 'body', size: 2.2, color: c.t.ink, lineHeight: 1.6 })], { valign: 'bottom', maxGrow: 1 })
}

export const officeDocs: OfficeDoc[] = [
  doc('annual-report', 'Annual report cover', 'annual report cover company business', ['corporate', 'elegant'], (c, s) => cover(c, s, 'Annual report', 'Growing together in 2026', 'Results, highlights and the year ahead.', 'Company Name\nPublished March 2027')),
  doc('project-report', 'Project report cover', 'project report cover university assignment', ['minimal', 'corporate'], (c, s) => cover(c, s, 'Project report', 'Solar power for rural schools', 'A study of cost, benefits and set-up.', 'Prepared by Your Name\nDepartment of Engineering\nSubmitted 15 May 2027')),
  doc('assignment-cover', 'Assignment cover page', 'assignment cover page school college university front page', ['kids', 'fresh'], (c, s) => cover(c, s, 'Assignment', 'The water cycle', 'Science · Class 7', 'Submitted by: Your Name, Roll 15\nSubmitted to: Teacher Name\nDate: 10 April 2027')),
  doc('proposal-cover', 'Business proposal cover', 'business proposal cover client project plan', ['bold', 'corporate'], (c, s) => cover(c, s, 'Proposal', 'New website for Your Client', 'Design, build and support.', 'Prepared by Company Name\nValid until 30 June 2027')),
  doc('meeting-agenda', 'Meeting agenda', 'meeting agenda office team schedule', ['corporate', 'minimal'], (c, s) => {
    const y = docHead(c, s, 'Meeting agenda', 'Monthly team meeting', 'Tuesday 6 April 2027 · 10:00 AM · Meeting room 2')
    stack(c, body(c, y), [TB([['Time', 'Topic', 'Led by'], ['10:00', 'Welcome and last month’s actions', 'Chair'], ['10:10', 'Sales update', 'Sales lead'], ['10:30', 'New product timeline', 'Product team'], ['10:50', 'Customer feedback', 'Support lead'], ['11:10', 'Any other business', 'All'], ['11:20', 'Actions and close', 'Chair']], { size: 1.9, name: 'Agenda' }), S(2), sub(c, 'Please bring'), R(['Your team’s numbers for March', 'One idea to improve our service'], { spec: { role: 'body', size: 1.9, color: c.t.ink }, badge: 'dot', gap: 1.2 })], { gap: 2, fill: 0.85, maxGrow: 1.4 })
  }),
  doc('minutes', 'Meeting minutes', 'meeting minutes notes record office', ['minimal', 'calm'], (c, s) => {
    const y = docHead(c, s, 'Minutes', 'Monthly team meeting', 'Date: 6 April 2027 · Present: 8 · Apologies: 1')
    stack(c, body(c, y), [sub(c, '1. Sales update'), para(c, 'Sales were 12% above target. The team will focus on repeat customers next month.', 2.5), sub(c, '2. New product timeline'), para(c, 'Testing will finish on 30 April. Launch moved to 15 May so the guide can be finished.', 2.5), sub(c, '3. Customer feedback'), para(c, 'Customers asked for faster replies. Support will add an evening shift.', 3), sub(c, 'Actions'), TB([['Action', 'Owner', 'Due'], ['Share repeat-customer plan', 'Sales lead', '15 April'], ['Finish user guide', 'Product team', '30 April'], ['Set up evening shift', 'Support lead', '1 May']], { size: 1.9, name: 'Actions' })], { gap: 1, fill: 0.85, maxGrow: 1.4 })
  }),
  doc('memo', 'Office memo', 'memo office internal notice staff', ['corporate', 'minimal'], (c, s) => {
    const y = docHead(c, s, 'Memo', 'New office hours from 1 May')
    stack(c, body(c, y), [TB([['To', 'All staff'], ['From', 'Office manager'], ['Date', '20 April 2027'], ['Subject', 'New office hours']], { size: 1.9, header: false, name: 'Memo details' }), S(3), para(c, 'From 1 May, the office will open at 8:30 AM and close at 5:30 PM, Sunday to Thursday. The front desk will be staffed from 8:15 AM.', 2.5), para(c, 'Please update your calendars and let your team leader know if the new hours cause any problems. Thank you for your understanding.')], { gap: 1, fill: 0.6, maxGrow: 1.4 })
  }),
  doc('press-release', 'Press release', 'press release news media announcement', ['corporate', 'bold'], (c, s) => {
    const y = docHead(c, s, 'For immediate release', 'Local bakery opens its third shop', 'Your City, 12 May 2027')
    stack(c, body(c, y), [para(c, 'Sweet Crumbs, the family bakery known for its fresh bread and birthday cakes, will open its third shop on Park Road on 1 June.', 2.5), para(c, 'The new shop will create 12 local jobs and include a small cafe with seating for 30 people.', 2.5), T('“We started baking in our home kitchen. Opening a third shop shows how much our neighbours have supported us,” said the founder.', { role: 'body', size: 2.1, style: 'italic', color: c.t.ink, lineHeight: 1.6, gapAfter: 2.5 }), para(c, 'The opening day will include free tastings and activities for children.', 4), sub(c, 'Media contact'), para(c, 'Name · press@sweetcrumbs.com · +1 234 567 890')], { gap: 1, fill: 0.75, maxGrow: 1.4 })
  }),
  doc('newsletter', 'Newsletter', 'newsletter monthly news community school office', ['fresh', 'playful'], (c, s) => {
    const y = docHead(c, s, 'Newsletter · May 2027', 'News from our community')
    const b = body(c, y)
    const [top, bottom] = rows(c, b, [1, 1.2], 4)
    const [pic, text] = cols(c, top, [1, 1.1], 4)
    c.els.push(frame(r(pic.x), r(pic.y), r(pic.w), r(pic.h), { name: 'Photo', mask: 'rounded', cornerRadius: r(c.u * 1.5) }))
    stack(c, text, [sub(c, 'Spring fair raises $4,000'), para(c, 'Thank you to everyone who baked, sold and bought at this year’s spring fair. The money will pay for new books for the library.')], { valign: 'middle', gap: 1, maxGrow: 1.3 })
    const [a, b2] = cols(c, bottom, [1, 1], 5)
    stack(c, a, [sub(c, 'Dates for your diary'), R(['3 June: Sports day', '12 June: Parents’ evening', '20 June: Summer concert', '28 June: Last day of term'], { spec: { role: 'body', size: 1.9, color: c.t.ink }, badge: 'dot', gap: 1.2 })], { gap: 1, maxGrow: 1.3 })
    c.els.push(rect(r(b2.x), r(b2.y), r(b2.w), r(b2.h), c.t.surface, { name: 'Box', cornerRadius: r(c.u * 1.5) }))
    stack(c, inset(b2, c.u * 3), [T('Spotlight', { role: 'label', size: 1.8, color: c.t.surfaceMuted }), T('Meet our new librarian', { role: 'body', size: 2.3, style: 'bold', color: c.t.surfaceInk }), T('Ms Rahman joins us from the city library and has big plans for a reading club.', { role: 'body', size: 1.9, color: c.t.surfaceInk, lineHeight: 1.6 })], { gap: 1.2, maxGrow: 1.3 })
  }),
  doc('event-programme', 'Event programme', 'event programme schedule order of events ceremony', ['festive', 'elegant'], (c, s) => {
    const y = docHead(c, s, 'Programme', 'Annual prize-giving ceremony', 'Friday 25 June 2027 · School hall · 3:00 PM')
    stack(c, body(c, y), [TB([['Time', 'Programme'], ['3:00 PM', 'Welcome and recitation'], ['3:15 PM', 'Welcome speech by the Principal'], ['3:30 PM', 'Cultural performance by students'], ['4:00 PM', 'Prize-giving'], ['4:45 PM', 'Speech by the chief guest'], ['5:00 PM', 'Vote of thanks'], ['5:10 PM', 'Refreshments']], { size: 2, name: 'Programme' }), S(2), para(c, 'Chief guest: Guest Name')], { gap: 2, fill: 0.85, maxGrow: 1.5 })
  }),
  doc('recipe-biryani', 'Recipe card: chicken biryani', 'recipe card cooking biryani food kitchen', ['warm', 'festive'], (c, s) => recipe(c, s, 'Chicken biryani', 'Serves 4 · 1 hour 30 minutes', ['500 g chicken', '2 cups basmati rice', '2 onions, sliced', '1 cup yoghurt', '2 tbsp biryani spice', 'Ghee, salt and saffron milk'], ['Marinate the chicken in yoghurt and spice for one hour.', 'Fry the onions in ghee until golden; set half aside.', 'Cook the chicken with the onions until tender.', 'Boil the rice until half cooked and drain.', 'Layer rice over the chicken, add saffron milk and fried onions.', 'Cover tightly and cook on low heat for 25 minutes.'])),
  doc('recipe-cookies', 'Recipe card: chocolate chip cookies', 'recipe card baking cookies dessert kitchen', ['playful', 'warm'], (c, s) => recipe(c, s, 'Chocolate chip cookies', 'Makes 20 · 30 minutes', ['125 g butter, soft', '100 g brown sugar', '1 egg', '200 g flour', '1 tsp baking powder', '150 g chocolate chips'], ['Heat the oven to 180 °C.', 'Beat the butter and sugar until creamy.', 'Mix in the egg, then the flour and baking powder.', 'Stir in the chocolate chips.', 'Roll into balls and bake for 10 to 12 minutes.'])),
  doc('recipe-salad', 'Recipe card: summer salad', 'recipe card salad healthy food kitchen', ['fresh', 'nature'], (c, s) => recipe(c, s, 'Summer salad', 'Serves 2 · 15 minutes', ['2 handfuls of salad leaves', '1 cucumber', '10 cherry tomatoes', '1 avocado', 'Juice of 1 lemon', 'Olive oil, salt and pepper'], ['Wash and dry the leaves.', 'Slice the cucumber, tomatoes and avocado.', 'Whisk the lemon juice, oil, salt and pepper.', 'Toss everything together just before serving.'])),
  doc('office-notice', 'Office notice', 'notice circular office announcement staff', ['corporate', 'minimal'], (c, s) => {
    const y = docHead(c, s, 'Notice', 'Office closed for Eid holidays', 'Ref: ADM/2027/014 · Date: 2 March 2027')
    stack(c, body(c, y), [para(c, 'All staff are informed that the office will remain closed from 29 March to 3 April 2027 for the Eid holidays. Regular work will resume on Sunday 4 April.', 2.5), para(c, 'Teams on duty during the holidays will receive their schedules from their managers. For emergencies, please call +1 234 567 890.', 6), T('Name\nAdmin Manager', { role: 'body', size: 1.9, color: c.t.ink, lineHeight: 1.5 })], { gap: 1, fill: 0.5, maxGrow: 1.5 })
  })
]

function recipe(c: Ctx, style: number, title: string, meta: string, ingredients: string[], steps: string[]): void {
  const y = docHead(c, style, 'Recipe', title, meta)
  const b = body(c, y)
  const [top, bottom] = rows(c, b, [0.9, 1.3], 4)
  const [list, pic] = cols(c, top, [1, 1], 5)
  stack(c, list, [sub(c, 'Ingredients'), R(ingredients, { spec: { role: 'body', size: 2, color: c.t.ink }, badge: 'dot', gap: 1.2 })], { gap: 1, maxGrow: 1.3 })
  c.els.push(frame(r(pic.x), r(pic.y), r(pic.w), r(pic.h), { name: 'Food photo', mask: 'rounded', cornerRadius: r(c.u * 2) }))
  stack(c, bottom, [sub(c, 'Method'), R(steps, { spec: { role: 'body', size: 2, color: c.t.ink }, badge: 'number', gap: 1.6 })], { gap: 1, maxGrow: 1.3 })
}

export function buildOfficeDoc(style: number, d: OfficeDoc, W: number, H: number, theme: Theme, seed: string): Page[] {
  const c = makeCtx(W, H, theme, seed)
  d.build(c, style)
  return [finish(c)]
}

// ------------------------------------------------------------ signs

type Fields = Omit<PostContent, 'id' | 'title' | 'kw' | 'mood'>
const sign = (id: string, title: string, kw: string, mood: Mood[], f: Fields): PostContent => ({ id, title, kw, mood, ...f })

/** Printable signs for shops, offices and homes. */
export const signs: PostContent[] = [
  sign('to-let', 'To-let sign', 'to let house flat for rent sign apartment', ['bold', 'minimal'], { label: 'Available now', head: 'To let', sub: 'Two-bedroom flat with balcony, 3rd floor. Family only.', cta: 'Call +1 234 567 890', icon: 'house' }),
  sign('room-rent', 'Room for rent', 'room for rent sublet bachelor sign', ['fresh', 'minimal'], { label: 'For rent', head: 'Room available', items: ['Furnished room with attached bath', 'Gas, water and Wi-Fi included', 'Near the bus stop'], cta: 'Call +1 234 567 890', icon: 'bed-double' }),
  sign('wifi', 'Wi-Fi password sign', 'wifi password sign cafe guest network', ['minimal', 'calm'], { label: 'Free Wi-Fi', head: 'Network: YourCafe', sub: 'Password: welcome2027', icon: 'wifi' }),
  sign('no-parking', 'No parking sign', 'no parking sign gate garage', ['bold', 'minimal'], { label: 'Please', head: 'No parking in front of the gate', foot: 'Vehicles will be towed', icon: 'circle-parking-off' }),
  sign('no-smoking', 'No smoking sign', 'no smoking sign office shop', ['bold', 'minimal'], { label: 'Notice', head: 'No smoking', sub: 'Smoking is not allowed anywhere inside this building.', icon: 'cigarette-off' }),
  sign('shoes-off', 'Shoes off sign', 'remove shoes sign home mosque clinic', ['calm', 'warm'], { label: 'Welcome', head: 'Please remove your shoes', foot: 'Thank you', icon: 'footprints' }),
  sign('staff-only', 'Staff only sign', 'staff only private sign door office', ['corporate', 'minimal'], { label: 'Private', head: 'Staff only', foot: 'Please ask at the front desk', icon: 'lock' }),
  sign('open-sign', 'We are open sign', 'open sign shop door hours', ['fresh', 'bold'], { label: 'Come in', head: 'We’re open', items: ['Saturday to Thursday: 10 AM to 9 PM', 'Friday: 3 PM to 9 PM'], icon: 'door-open' }),
  sign('queue', 'Please queue here sign', 'queue line wait sign counter', ['minimal', 'calm'], { label: 'Please', head: 'Queue here', sub: 'Keep a little space between you and the next person.', icon: 'users' }),
  sign('keep-clean', 'Keep clean sign', 'keep clean sign toilet kitchen office', ['fresh', 'calm'], { label: 'Help us', head: 'Please keep this place clean', items: ['Put rubbish in the bin', 'Wipe the table after use', 'Wash your cup'], icon: 'sparkles' }),
  sign('cash-only', 'Payment sign', 'payment methods sign cash card mobile shop', ['minimal', 'bold'], { label: 'We accept', head: 'Cash, card and mobile payments', foot: 'Ask for a receipt', icon: 'wallet' }),
  sign('thank-visit', 'Thank you for visiting sign', 'thank you visit sign shop exit', ['warm', 'elegant'], { label: 'See you soon', head: 'Thank you for visiting', sub: 'Follow us for new arrivals and offers.', icon: 'heart' }),
  sign('quiet', 'Quiet please sign', 'quiet please sign library hospital office', ['calm', 'minimal'], { label: 'Please', head: 'Quiet please', sub: 'People are working or resting nearby.', icon: 'volume-x' }),
  sign('wash-hands', 'Wash hands sign', 'wash hands sign bathroom restaurant hygiene', ['fresh', 'calm'], { label: 'Stay healthy', head: 'Wash your hands before eating', icon: 'hand' })
]
