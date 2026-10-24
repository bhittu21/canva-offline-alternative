import type { DesignElement, Page } from '@shared/model'
import { group, line, rect } from '../../templateKit'
import { type Box, type Ctx, T, TB, finish, hash, makeCtx, r, rng, rows, stack, textEl } from '../core'
import { decorate } from '../deco'
import type { PostContent } from '../postLayouts'
import type { Mood, Theme } from '../themes'

/** Worksheets, charts and classroom documents for teachers, parents and students. */

export interface EduSheet {
  id: string
  title: string
  kw: string
  mood: Mood[]
  build: (c: Ctx, seed: string) => void
}

const sheet = (id: string, title: string, kw: string, mood: Mood[], build: (c: Ctx, seed: string) => void): EduSheet => ({ id, title, kw, mood, build })

function head(c: Ctx, title: string, sub = 'Name: ______________________   Class: ________   Date: ____________'): Box {
  const m = c.u * 7
  decorate(c, 0.35)
  const used = stack(c, { x: m, y: m, w: c.W - m * 2, h: c.u * 16 }, [T(title, { role: 'head', size: 4.8 }), T(sub, { role: 'body', size: 1.8, color: c.t.ink })], { gap: 1.2, maxGrow: 1 })
  const y = used.y + used.h + c.u * 4
  return { x: m, y, w: c.W - m * 2, h: c.H - y - m }
}

function writingLines(c: Ctx, b: Box, gap = 4.4): DesignElement[] {
  const n = Math.max(1, Math.floor(b.h / (gap * c.u)))
  return group(Array.from({ length: n }, (_, i) => line(r(b.x), r(b.y + (i + 1) * gap * c.u - c.u), r(b.w), c.t.soft, r(Math.max(2, c.u * 0.15)), { name: 'Writing line' })))
}

/** A grid of maths problems, different for each seed. */
function problems(c: Ctx, b: Box, seed: string, op: '+' | '−' | '×'): void {
  const rand = rng(seed)
  const n = 20
  const colsN = 2
  const perCol = n / colsN
  const cw = b.w / colsN
  const rh = b.h / perCol
  for (let i = 0; i < n; i++) {
    let a = 2 + Math.floor(rand() * (op === '×' ? 10 : 40))
    let d = 1 + Math.floor(rand() * (op === '×' ? 10 : 30))
    if (op === '−' && d > a) [a, d] = [d, a]
    const x = b.x + Math.floor(i / perCol) * cw
    const y = b.y + (i % perCol) * rh
    const t = textEl(c, `${i + 1}.   ${a} ${op} ${d} = ______`, x, y, cw - c.u * 2, { role: 'body', size: 2.6, color: c.t.ink })
    t.y = r(y + (rh - t.height) / 2)
    c.els.push(t)
  }
}

/** Tables on worksheets grow to use the page; bigger rows leave room to write. */
const GROW = { fill: 0.95, maxGrow: 1.7 }

const blank = (n: number, k: number) => Array.from({ length: n }, () => Array.from({ length: k }, () => ''))

export const eduSheets: EduSheet[] = [
  sheet('addition', 'Addition worksheet', 'maths math addition worksheet sums kids', ['kids', 'playful'], (c, s) => problems(c, head(c, 'Addition practice'), s, '+')),
  sheet('subtraction', 'Subtraction worksheet', 'maths math subtraction worksheet kids', ['kids', 'fresh'], (c, s) => problems(c, head(c, 'Subtraction practice'), s, '−')),
  sheet('multiplication', 'Multiplication worksheet', 'maths math multiplication times worksheet', ['kids', 'bold'], (c, s) => problems(c, head(c, 'Multiplication practice'), s, '×')),
  sheet('times-table', 'Times table chart', 'times table multiplication chart 1 to 10 maths', ['kids', 'playful'], (c) => {
    const b = head(c, 'Times tables 1 to 10', 'Find where the row and column meet.')
    const n = Array.from({ length: 10 }, (_, i) => i + 1)
    stack(c, b, [TB([['×', ...n.map(String)], ...n.map((a) => [String(a), ...n.map((d) => String(a * d))])], { size: 2.2, align: 'center', name: 'Times table' })], { valign: 'middle', fill: 0.92, maxGrow: 1.35 })
  }),
  sheet('hundred-chart', 'Number chart 1 to 100', 'number chart hundred 1 to 100 counting maths', ['kids', 'fresh'], (c) => {
    const b = head(c, 'Numbers 1 to 100', 'Count, colour patterns and skip-count.')
    stack(c, b, [TB(Array.from({ length: 10 }, (_, rr) => Array.from({ length: 10 }, (_, cc) => String(rr * 10 + cc + 1))), { size: 2.4, header: false, align: 'center', name: 'Number chart' })], { valign: 'middle', fill: 0.92, maxGrow: 1.35 })
  }),
  sheet('handwriting', 'Handwriting practice', 'handwriting practice lines writing kids alphabet', ['kids', 'calm'], (c) => {
    const b = head(c, 'Handwriting practice')
    const set = c.u * 9
    const n = Math.floor(b.h / set)
    for (let i = 0; i < n; i++) {
      const y = b.y + i * set
      c.els.push(
        ...group([
          line(r(b.x), r(y + c.u * 1), r(b.w), c.t.muted, r(Math.max(2, c.u * 0.15)), { name: 'Top line' }),
          line(r(b.x), r(y + c.u * 3.5), r(b.w), c.t.accent, r(Math.max(2, c.u * 0.15)), { name: 'Middle line', dash: 'dashed' }),
          line(r(b.x), r(y + c.u * 6), r(b.w), c.t.muted, r(Math.max(2, c.u * 0.2)), { name: 'Base line' })
        ])
      )
    }
  }),
  sheet('spelling', 'Spelling list', 'spelling list words practice english', ['kids', 'calm'], (c) => {
    const b = head(c, 'Spelling words', 'Look, say, cover, write, check.')
    stack(c, b, [TB([['Word', 'Write it', 'Write it again', 'Check'], ...['because', 'friend', 'school', 'beautiful', 'answer', 'different', 'people', 'thought', 'enough', 'through', 'before', 'little'].map((w) => [w, '', '', ''])], { size: 2.2, name: 'Spelling' })], GROW)
  }),
  sheet('vocabulary', 'Vocabulary sheet', 'vocabulary words meaning english language', ['calm', 'minimal'], (c) => {
    const b = head(c, 'New words', 'Write the meaning and use each word in a sentence.')
    stack(c, b, [TB([['Word', 'Meaning', 'My sentence'], ...blank(12, 3)], { size: 2.2, name: 'Vocabulary' })], GROW)
  }),
  sheet('reading', 'Reading comprehension', 'reading comprehension worksheet passage questions english', ['calm', 'kids'], (c) => {
    const b = head(c, 'Reading comprehension')
    const [text, qs] = rows(c, b, [1, 1.3], 3)
    c.els.push(rect(r(text.x), r(text.y), r(text.w), r(text.h), c.t.soft2, { name: 'Passage box', cornerRadius: r(c.u * 1.2) }))
    stack(c, { x: text.x + c.u * 3, y: text.y + c.u * 3, w: text.w - c.u * 6, h: text.h - c.u * 6 }, [T('The Little Seed', { role: 'body', size: 2.2, style: 'bold', color: c.t.ink }), T('A little seed lay under the ground. Every day the sun warmed the soil and the rain gave it water. One morning, a tiny green shoot pushed up into the light. Week by week it grew taller, until one day it opened into a bright yellow flower. The bees came to visit, and the children smiled every time they walked past.', { role: 'body', size: 2, color: c.t.ink, lineHeight: 1.6 })], { valign: 'middle', gap: 1.5, maxGrow: 1 })
    const qList = ['1. Where was the seed?', '2. What helped the seed to grow?', '3. What colour was the flower?', '4. Who came to visit the flower?']
    const parts = rows(c, qs, [1, 1, 1, 1], 2)
    parts.forEach((p, i) => {
      const t = textEl(c, qList[i], p.x, p.y, p.w, { role: 'body', size: 2, style: 'bold', color: c.t.ink })
      c.els.push(t, ...writingLines(c, { x: p.x, y: t.y + t.height, w: p.w, h: p.h - t.height }, 4))
    })
  }),
  sheet('matching', 'Matching worksheet', 'matching worksheet draw lines animals kids', ['kids', 'playful'], (c) => {
    const b = head(c, 'Match the animal to its home', 'Draw a line from each animal to where it lives.')
    const left = ['Bird', 'Fish', 'Bee', 'Rabbit', 'Spider', 'Lion']
    const right = ['Hive', 'Den', 'Nest', 'Web', 'Burrow', 'Water']
    const rh = b.h / left.length
    left.forEach((word, i) => {
      for (const [x, label, align] of [[b.x, word, 'left'], [b.x + b.w * 0.62, right[i], 'right']] as const) {
        const box = rect(r(x), r(b.y + i * rh + rh * 0.15), r(b.w * 0.38), r(rh * 0.7), c.t.soft2, { name: 'Word box', cornerRadius: r(c.u * 1.5) })
        const t = textEl(c, label, x + c.u * 2, 0, b.w * 0.38 - c.u * 4, { role: 'body', size: 3, style: 'bold', align: align === 'left' ? 'left' : 'right', color: c.t.ink })
        t.y = r(b.y + i * rh + (rh - t.height) / 2)
        c.els.push(...group([box, t]))
      }
    })
  }),
  sheet('timetable', 'Class timetable', 'class timetable school schedule periods weekly', ['kids', 'corporate'], (c) => {
    const b = head(c, 'Class timetable', 'Class: ________   Term: ________')
    stack(c, b, [TB([['Time', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'], ['8:00', '', '', '', '', ''], ['8:45', '', '', '', '', ''], ['9:30', '', '', '', '', ''], ['10:15', 'Break', 'Break', 'Break', 'Break', 'Break'], ['10:45', '', '', '', '', ''], ['11:30', '', '', '', '', ''], ['12:15', 'Lunch', 'Lunch', 'Lunch', 'Lunch', 'Lunch'], ['1:00', '', '', '', '', ''], ['1:45', '', '', '', '', '']], { size: 2, align: 'center', name: 'Timetable' })], GROW)
  }),
  sheet('exam-routine', 'Exam routine', 'exam routine schedule test dates school', ['corporate', 'calm'], (c) => {
    const b = head(c, 'Exam routine', 'Class: ________   Term: First term examination 2027')
    stack(c, b, [TB([['Date', 'Day', 'Subject', 'Time'], ['3 May', 'Monday', 'English', '10 AM to 1 PM'], ['5 May', 'Wednesday', 'Mathematics', '10 AM to 1 PM'], ['7 May', 'Friday', 'Science', '10 AM to 12 PM'], ['10 May', 'Monday', 'Bangla', '10 AM to 1 PM'], ['12 May', 'Wednesday', 'Social studies', '10 AM to 12 PM'], ['14 May', 'Friday', 'Religion', '10 AM to 11 AM'], ['17 May', 'Monday', 'ICT', '10 AM to 11 AM']], { size: 2.1, name: 'Exams' }), T('Please arrive 15 minutes early and bring your admit card.', { role: 'body', size: 1.9, color: c.t.ink })], { ...GROW, gap: 3 })
  }),
  sheet('lesson-plan', 'Lesson plan', 'lesson plan teacher planning objectives', ['calm', 'corporate'], (c) => {
    const b = head(c, 'Lesson plan', 'Subject: ____________   Topic: ____________   Date: ________')
    const parts = rows(c, b, [0.8, 0.7, 1.4, 0.8], 2.5)
    const titles = ['Learning objectives', 'Materials', 'Activities', 'Assessment and homework']
    parts.forEach((p, i) => {
      c.els.push(rect(r(p.x), r(p.y), r(p.w), r(p.h), i % 2 === 0 ? c.t.soft2 : 'transparent', { name: `${titles[i]} box`, cornerRadius: r(c.u), stroke: c.t.soft, strokeWidth: i % 2 === 0 ? 0 : r(Math.max(2, c.u * 0.15)) }))
      const t = textEl(c, titles[i], p.x + c.u * 2, p.y + c.u * 1.5, p.w - c.u * 4, { role: 'label', size: 1.7, color: c.t.ink })
      c.els.push(t, ...writingLines(c, { x: p.x + c.u * 2, y: t.y + t.height, w: p.w - c.u * 4, h: p.h - t.height - c.u * 3 }, 4))
    })
  }),
  sheet('homework', 'Homework tracker', 'homework tracker assignments student weekly', ['kids', 'fresh'], (c) => {
    const b = head(c, 'Homework tracker', 'Week of: ____________')
    stack(c, b, [TB([['Subject', 'Homework', 'Due', 'Done'], ...blank(14, 4)], { size: 2.1, name: 'Homework' })], GROW)
  }),
  sheet('report-card', 'Report card', 'report card grades marks student result', ['corporate', 'kids'], (c) => {
    const b = head(c, 'Student report card', 'Name: ______________________   Class: ________   Roll: ______')
    stack(c, b, [TB([['Subject', 'Marks', 'Grade', 'Teacher’s comment'], ...['English', 'Mathematics', 'Science', 'Bangla', 'Social studies', 'ICT', 'Art', 'Physical education'].map((s) => [s, '', '', '']), ['Total', '', '', '']], { size: 2.1, name: 'Results' }), T('Class teacher’s remarks', { role: 'label', size: 1.8, color: c.t.ink })], { ...GROW, gap: 3 })
  }),
  sheet('alphabet', 'Alphabet chart', 'alphabet chart abc letters kids', ['kids', 'playful'], (c) => {
    const b = head(c, 'A to Z', 'Say each letter out loud.')
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
    const colsN = 5
    const rowsN = 6
    const cw = b.w / colsN
    const rh = b.h / rowsN
    const fills = [c.t.accent, c.t.accent2, c.t.soft, c.t.soft2]
    letters.forEach((l, i) => {
      const x = b.x + (i % colsN) * cw
      const y = b.y + Math.floor(i / colsN) * rh
      const fill = fills[i % fills.length]
      const tile = rect(r(x + c.u), r(y + c.u), r(cw - c.u * 2), r(rh - c.u * 2), fill, { name: 'Letter tile', cornerRadius: r(c.u * 2) })
      const ink = fill === c.t.accent ? c.t.onAccent : c.t.ink
      const t = textEl(c, `${l}${l.toLowerCase()}`, x + c.u, 0, cw - c.u * 2, { role: 'head', size: 6, align: 'center', color: ink, upper: false })
      t.y = r(y + (rh - t.height) / 2)
      c.els.push(...group([tile, t]))
    })
  }),
  sheet('lab-report', 'Science lab report', 'science lab report experiment worksheet', ['tech', 'fresh'], (c) => {
    const b = head(c, 'Science experiment')
    const parts = rows(c, b, [0.7, 0.7, 1, 1, 0.8], 2.2)
    const titles = ['Question', 'My prediction', 'What I did', 'What I saw', 'What I learned']
    parts.forEach((p, i) => {
      const t = textEl(c, titles[i], p.x, p.y, p.w, { role: 'label', size: 1.8, color: c.t.ink })
      c.els.push(t, ...writingLines(c, { x: p.x, y: t.y + t.height, w: p.w, h: p.h - t.height }, 4))
    })
  }),
  sheet('attendance', 'Attendance sheet', 'attendance register sheet class students', ['corporate', 'minimal'], (c) => {
    const b = head(c, 'Weekly attendance', 'Class: ________   Week of: ____________   Mark P for present, A for absent.')
    stack(c, b, [TB([['Student name', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], ...Array.from({ length: 18 }, (_, i) => [`${i + 1}.`, ...Array(6).fill('')])], { size: 1.9, name: 'Attendance' })], GROW)
  })
]

export function buildEduSheet(s: EduSheet, W: number, H: number, theme: Theme, seed: string): Page[] {
  const c = makeCtx(W, H, theme, seed)
  s.build(c, `${s.id}-${hash(seed)}`)
  return [finish(c)]
}

type Fields = Omit<PostContent, 'id' | 'title' | 'kw' | 'mood'>
const post = (id: string, title: string, kw: string, mood: Mood[], f: Fields): PostContent => ({ id, title, kw, mood, ...f })

/** School posters and notices, drawn with the post layouts. */
export const eduPosts: PostContent[] = [
  post('rules', 'Classroom rules', 'classroom rules poster school kids', ['kids', 'playful'], { label: 'Our class', head: 'Classroom rules', items: ['Be kind and helpful', 'Listen when others speak', 'Raise your hand', 'Look after our things', 'Always try your best'], icon: 'star' }),
  post('admission', 'Admission open', 'admission open school enrol new session', ['kids', 'bold'], { label: 'Session 2027', head: 'Admission open', items: ['Play group to Class 8', 'Qualified teachers', 'Safe, green campus', 'Transport available'], cta: 'Apply now', foot: 'Green Valley School · (123) 456-7890' }),
  post('ptm', 'Parent-teacher meeting', 'parent teacher meeting notice school', ['calm', 'corporate'], { label: 'Notice', head: 'Parent-teacher meeting', sub: 'Saturday 15 May, 9 AM to 1 PM. Please meet your child’s class teacher to discuss progress.', foot: 'The Principal, Green Valley School', icon: 'users' }),
  post('school-notice', 'School closed notice', 'school notice closed holiday', ['minimal', 'calm'], { label: 'Notice', head: 'School will remain closed', sub: 'The school will be closed from 10 to 14 April for the holidays. Classes resume on 15 April.', foot: 'By order of the Principal' }),
  post('science-fair', 'Science fair', 'science fair school event project exhibition', ['tech', 'kids'], { label: 'Annual event', head: 'Science fair 2027', sub: 'Show your best experiment and win prizes! Thursday 20 May in the school hall.', cta: 'Register by 10 May', icon: 'flask-conical' }),
  post('library-rules', 'Library rules', 'library rules poster reading quiet', ['calm', 'elegant'], { label: 'Welcome to the library', head: 'Library rules', items: ['Please keep quiet', 'Handle books with care', 'Return books on time', 'No food or drinks'], icon: 'book-open' }),
  post('handwash', 'Wash your hands poster', 'wash hands hygiene poster health school', ['fresh', 'kids'], { label: 'Stay healthy', head: 'Wash your hands', items: ['Wet your hands', 'Add soap and rub for 20 seconds', 'Rinse with clean water', 'Dry with a clean towel'], icon: 'droplets' }),
  post('reading-challenge', 'Reading challenge', 'reading challenge books kids summer library', ['kids', 'playful'], { label: 'Summer fun', big: '20', head: 'Books in 8 weeks', sub: 'Join the summer reading challenge and earn a certificate!', cta: 'Sign up at the library', icon: 'book-open' }),
  post('tuition-batch', 'New tuition batch', 'tuition coaching batch class admission', ['corporate', 'fresh'], { label: 'New batch', head: 'SSC preparation course', items: ['Maths, physics, chemistry', 'Model tests every week', 'Small batches of 15'], cta: 'Starts 1 June', foot: 'Bright Future Coaching · (123) 456-7890' }),
  post('results', 'Exam results', 'exam results published notice school', ['corporate', 'festive'], { label: 'Announcement', head: 'Results are out!', sub: 'Final exam results are now on the notice board and the school website.', foot: 'Congratulations to all our students', icon: 'award' }),
  post('quiet-zone', 'Exam in progress', 'exam in progress quiet please sign', ['minimal', 'bold'], { label: 'Please', head: 'Quiet please: exam in progress', foot: 'Thank you', icon: 'volume-x' }),
  post('kindness', 'Kindness poster', 'kindness poster classroom values kids', ['playful', 'kids'], { label: 'In this class', head: 'We are kind, we share and we help each other', icon: 'heart' })
]
