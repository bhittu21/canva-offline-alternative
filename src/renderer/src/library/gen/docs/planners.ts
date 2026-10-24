import type { DesignElement, Page } from '@shared/model'
import { ellipse, frame, group, line, path, rect } from '../../templateKit'
import { type Box, type Ctx, T, TB, cols, finish, inset, makeCtx, r, rows, stack, textEl } from '../core'
import { decorate } from '../deco'
import type { Mood, Theme } from '../themes'

/** Printable planners, trackers and 2027 calendars. */

// ------------------------------------------------------------ building blocks

/** Writing lines that fill the height they are given. */
function linesIn(c: Ctx, b: Box, gap = 4.2, color?: string): DesignElement[] {
  const n = Math.max(1, Math.floor(b.h / (gap * c.u)))
  const els = Array.from({ length: n }, (_, i) => line(r(b.x), r(b.y + (i + 1) * gap * c.u - c.u), r(b.w), color ?? c.t.soft, r(Math.max(2, c.u * 0.15)), { name: 'Writing line' }))
  return group(els)
}

/** Checkbox rows with optional labels, filling the height they are given. */
function checklist(c: Ctx, b: Box, labels: string[] | number, gap = 4.6): DesignElement[] {
  const count = typeof labels === 'number' ? labels : labels.length
  const step = Math.min(gap * c.u, b.h / Math.max(1, count))
  const box = Math.min(c.u * 2.2, step * 0.55)
  const out: DesignElement[] = []
  for (let i = 0; i < count; i++) {
    const y = b.y + i * step
    const label = typeof labels === 'number' ? '' : labels[i]
    const parts: DesignElement[] = [rect(r(b.x), r(y + (step - box) / 2), r(box), r(box), 'transparent', { name: 'Checkbox', stroke: c.t.accent, strokeWidth: r(Math.max(2, c.u * 0.2)), cornerRadius: r(box * 0.2) })]
    if (label) {
      const t = textEl(c, label, b.x + box + c.u * 1.6, 0, b.w - box - c.u * 1.6, { role: 'body', size: 1.7, color: c.t.ink })
      t.y = r(y + (step - t.height) / 2)
      parts.push(t)
    } else parts.push(line(r(b.x + box + c.u * 1.6), r(y + step / 2 + box / 2), r(b.w - box - c.u * 1.6), c.t.soft, r(Math.max(2, c.u * 0.15)), { name: 'Writing line' }))
    out.push(...group(parts))
  }
  return out
}

/** A titled box with a soft fill. Returns the inner content box. */
function panel(c: Ctx, b: Box, title: string, fill = true): Box {
  c.els.push(rect(r(b.x), r(b.y), r(b.w), r(b.h), fill ? c.t.soft2 : 'transparent', { name: `${title} box`, cornerRadius: r(c.u * 1.2), stroke: c.t.soft, strokeWidth: fill ? 0 : r(Math.max(2, c.u * 0.15)) }))
  const t = textEl(c, title, b.x + c.u * 2, b.y + c.u * 1.6, b.w - c.u * 4, { role: 'label', size: 1.7, color: c.t.ink })
  c.els.push(t)
  return { x: b.x + c.u * 2, y: t.y + t.height + c.u * 1.2, w: b.w - c.u * 4, h: b.h - (t.y + t.height + c.u * 1.2 - b.y) - c.u * 1.5 }
}

/** Page title block at the top; returns the remaining area. */
function header(c: Ctx, title: string, sub?: string): Box {
  const m = c.u * 7
  decorate(c, 0.35)
  const used = stack(c, { x: m, y: m, w: c.W - m * 2, h: c.u * 16 }, [T(title, { role: 'head', size: 5 }), T(sub, { role: 'body', size: 1.8 })], { valign: 'top', gap: 1, maxGrow: 1 })
  const y = used.y + used.h + c.u * 4
  return { x: m, y, w: c.W - m * 2, h: c.H - y - m }
}

/** A grid of small circles drawn as one shape (habit and savings trackers). */
function dotGrid(cols: number, rowsN: number, cell: number, rad: number): { d: string; w: number; h: number } {
  let d = ''
  for (let i = 0; i < cols; i++)
    for (let j = 0; j < rowsN; j++) {
      const x = i * cell + cell / 2
      const y = j * cell + cell / 2
      d += `M${x - rad} ${y}a${rad} ${rad} 0 1 0 ${rad * 2} 0a${rad} ${rad} 0 1 0 ${-rad * 2} 0Z`
    }
  return { d, w: cols * cell, h: rowsN * cell }
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const blankRows = (n: number, cols: number) => Array.from({ length: n }, () => Array.from({ length: cols }, () => ''))

// ------------------------------------------------------------ planners

export interface PlannerType {
  id: string
  title: string
  kw: string
  mood: Mood[]
  build: (c: Ctx) => void
}

const planner = (id: string, title: string, kw: string, mood: Mood[], build: (c: Ctx) => void): PlannerType => ({ id, title, kw, mood, build })

export const planners: PlannerType[] = [
  planner('daily', 'Daily planner', 'daily planner day schedule to do', ['calm', 'minimal'], (c) => {
    const b = header(c, 'Daily planner', 'Date: ____________________     M  T  W  T  F  S  S')
    const [left, right] = cols(c, b, [1.1, 1], 3)
    const sched = panel(c, left, 'Schedule')
    stack(c, sched, [TB(['6 AM', '7 AM', '8 AM', '9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM', '6 PM', '7 PM', '8 PM', '9 PM'].map((h) => [h, '', '']), { size: 1.55, header: false, name: 'Schedule' })], { maxGrow: 1 })
    const [p1, p2, p3] = rows(c, right, [0.8, 1.5, 0.9], 3)
    c.els.push(...checklist(c, panel(c, p1, 'Top 3 priorities'), 3))
    c.els.push(...checklist(c, panel(c, p2, 'To do'), 8))
    c.els.push(...linesIn(c, panel(c, p3, 'Notes')))
  }),
  planner('weekly', 'Weekly planner', 'weekly planner week schedule', ['calm', 'fresh'], (c) => {
    const b = header(c, 'Weekly planner', 'Week of: ____________________')
    const boxes = rows(c, b, [1, 1, 1, 1], 2.5).flatMap((row) => cols(c, row, [1, 1], 2.5))
    boxes.forEach((box, i) => c.els.push(...linesIn(c, panel(c, box, i < 7 ? DAYS[i] : 'Notes', i % 2 === 0), 4)))
  }),
  planner('monthly', 'Monthly planner', 'monthly planner month overview undated', ['minimal', 'calm'], (c) => {
    const b = header(c, 'Monthly planner', 'Month: ____________________')
    const [grid, notes] = rows(c, b, [3.2, 1], 3)
    monthGrid(c, grid, null)
    c.els.push(...linesIn(c, panel(c, notes, 'Goals and notes')))
  }),
  planner('todo', 'To-do list', 'to do list checklist tasks', ['fresh', 'playful'], (c) => {
    const b = header(c, 'To-do list', 'Date: ____________________')
    const [a, d] = cols(c, b, [1, 1], 4)
    c.els.push(...checklist(c, panel(c, a, 'Must do', false), 14))
    c.els.push(...checklist(c, panel(c, d, 'Nice to do', false), 14))
  }),
  planner('habit', 'Habit tracker', 'habit tracker monthly routine goals', ['playful', 'calm'], (c) => {
    const b = header(c, 'Habit tracker', 'Month: ____________________   Tick a circle each day you keep the habit.')
    const habits = 10
    const labelW = b.w * 0.24
    const cell = Math.min((b.w - labelW) / 31, (b.h - c.u * 6) / habits)
    const g = dotGrid(31, habits, 10, 3.6)
    const gw = cell * 31
    for (let i = 0; i < habits; i++) {
      const y = b.y + c.u * 4 + i * cell
      c.els.push(line(r(b.x), r(y + cell * 0.8), r(labelW - c.u * 2), c.t.soft, r(Math.max(2, c.u * 0.15)), { name: 'Habit name line' }))
    }
    c.els.push(path(g.d, [g.w, g.h], r(b.x + labelW), r(b.y + c.u * 4), r(gw), r(cell * habits), 'transparent', { name: 'Habit circles', stroke: c.t.accent, strokeWidth: 1 }))
    stack(c, { x: b.x + labelW, y: b.y, w: gw, h: c.u * 3.5 }, [T('Days 1 to 31  →', { role: 'label', size: 1.6, color: c.t.accentText })], { maxGrow: 1 })
    stack(c, { x: b.x, y: b.y, w: labelW, h: c.u * 3.5 }, [T('Habit', { role: 'label', size: 1.6, color: c.t.accentText })], { maxGrow: 1 })
    const notesY = b.y + c.u * 6 + cell * habits
    if (b.y + b.h - notesY > c.u * 12) c.els.push(...linesIn(c, panel(c, { x: b.x, y: notesY, w: b.w, h: b.y + b.h - notesY }, 'Reflection')))
  }),
  planner('meal', 'Meal planner', 'meal planner food weekly menu grocery', ['warm', 'fresh'], (c) => {
    const b = header(c, 'Meal planner', 'Week of: ____________________')
    const [t, g] = rows(c, b, [2.3, 1], 3)
    stack(c, t, [TB([['Day', 'Breakfast', 'Lunch', 'Dinner'], ...DAYS.map((d) => [d, '', '', ''])], { size: 2.2, name: 'Meals' })], { maxGrow: 1 })
    const [g1, g2] = cols(c, g, [1, 1], 3)
    c.els.push(...checklist(c, panel(c, g1, 'Grocery list'), 6))
    c.els.push(...linesIn(c, panel(c, g2, 'Prep notes')))
  }),
  planner('budget', 'Monthly budget planner', 'budget planner money finance expenses income', ['corporate', 'calm'], (c) => {
    const b = header(c, 'Monthly budget', 'Month: ____________________')
    stack(
      c,
      b,
      [
        T('Income', { role: 'label', size: 1.8, color: c.t.accentText }),
        TB([['Source', 'Expected', 'Actual'], ['Salary', '', ''], ['Side income', '', ''], ['Other', '', ''], ['Total income', '', '']], { size: 1.8, name: 'Income' }),
        T('Expenses', { role: 'label', size: 1.8, color: c.t.accentText }),
        TB([['Category', 'Budget', 'Spent', 'Difference'], ...['Rent', 'Food', 'Transport', 'Bills', 'Health', 'Education', 'Savings', 'Fun', 'Other', 'Total'].map((x) => [x, '', '', ''])], { size: 1.8, name: 'Expenses' })
      ],
      { gap: 2, maxGrow: 1 }
    )
  }),
  planner('reading', 'Reading log', 'reading log books tracker list', ['calm', 'elegant'], (c) => {
    const b = header(c, 'Reading log', 'Books I have read this year')
    stack(c, b, [TB([['Title', 'Author', 'Finished', 'Rating'], ...blankRows(16, 4)], { size: 2, name: 'Books' })], { maxGrow: 1 })
  }),
  planner('goals', 'Goal planner', 'goal planner goals plan steps', ['bold', 'fresh'], (c) => {
    const b = header(c, 'Goal planner', 'Dream it, plan it, do it.')
    const [g, why, steps, end] = rows(c, b, [0.7, 0.8, 1.8, 0.7], 2.5)
    c.els.push(...linesIn(c, panel(c, g, 'My goal')))
    c.els.push(...linesIn(c, panel(c, why, 'Why it matters')))
    c.els.push(...checklist(c, panel(c, steps, 'Action steps'), 7))
    const [d, rw] = cols(c, end, [1, 1], 3)
    c.els.push(...linesIn(c, panel(c, d, 'Deadline')))
    c.els.push(...linesIn(c, panel(c, rw, 'Reward')))
  }),
  planner('gratitude', 'Gratitude journal', 'gratitude journal daily reflection mindfulness', ['calm', 'nature'], (c) => {
    const b = header(c, 'Gratitude journal', 'Date: ____________________')
    const parts = rows(c, b, [1, 1, 1, 1], 2.5)
    const prompts = ['Today I am grateful for', 'Something that made me smile', 'One thing I did well', 'Tomorrow I will']
    parts.forEach((p, i) => c.els.push(...linesIn(c, panel(c, p, prompts[i], i % 2 === 0))))
  }),
  planner('workout', 'Workout log', 'workout log fitness gym exercise tracker', ['bold', 'dark'], (c) => {
    const b = header(c, 'Workout log', 'Date: ____________   Focus: ____________')
    stack(c, b, [TB([['Exercise', 'Sets', 'Reps', 'Weight', 'Notes'], ...blankRows(14, 5)], { size: 2, name: 'Workout' }), T('How did it feel?', { role: 'label', size: 1.8, color: c.t.accentText })], { gap: 3, maxGrow: 1 })
  }),
  planner('study', 'Study planner', 'study planner student exam revision school', ['kids', 'fresh'], (c) => {
    const b = header(c, 'Study planner', 'Week of: ____________________')
    const [t, bottom] = rows(c, b, [1.6, 1], 3)
    stack(c, t, [TB([['Subject', 'Topic', 'Time', 'Done'], ...blankRows(9, 4)], { size: 1.9, name: 'Study sessions' })], { maxGrow: 1 })
    const [ex, gl] = cols(c, bottom, [1, 1], 3)
    stack(c, panel(c, ex, 'Upcoming exams'), [TB([['Subject', 'Date'], ...blankRows(4, 2)], { size: 1.7, header: true, name: 'Exams' })], { maxGrow: 1 })
    c.els.push(...checklist(c, panel(c, gl, 'Weekly goals'), 5))
  }),
  planner('packing', 'Packing list', 'packing list travel trip checklist holiday', ['fresh', 'playful'], (c) => {
    const b = header(c, 'Packing list', 'Trip to: ____________________')
    const groups: [string, string[]][] = [
      ['Clothes', ['T-shirts', 'Trousers', 'Underwear', 'Socks', 'Jacket', 'Sleepwear', 'Shoes']],
      ['Toiletries', ['Toothbrush', 'Toothpaste', 'Shampoo', 'Soap', 'Sunscreen', 'Medicines', 'Hairbrush']],
      ['Documents', ['Passport', 'Tickets', 'Hotel booking', 'ID card', 'Cash and cards', 'Insurance', 'Visa']],
      ['Gadgets', ['Phone', 'Charger', 'Power bank', 'Headphones', 'Adapter', 'Camera', 'Laptop']]
    ]
    const boxes = rows(c, b, [1, 1], 3).flatMap((row) => cols(c, row, [1, 1], 3))
    boxes.forEach((box, i) => c.els.push(...checklist(c, panel(c, box, groups[i][0]), groups[i][1])))
  }),
  planner('grocery', 'Grocery list', 'grocery shopping list supermarket food', ['fresh', 'warm'], (c) => {
    const b = header(c, 'Grocery list', 'Shop on: ____________________')
    const names = ['Fruit and vegetables', 'Meat and fish', 'Dairy and eggs', 'Bakery', 'Pantry', 'Household']
    const boxes = rows(c, b, [1, 1, 1], 2.5).flatMap((row) => cols(c, row, [1, 1], 2.5))
    boxes.forEach((box, i) => c.els.push(...checklist(c, panel(c, box, names[i], i % 2 === 0), 6)))
  }),
  planner('cleaning', 'Cleaning schedule', 'cleaning schedule chores home checklist', ['fresh', 'calm'], (c) => {
    const b = header(c, 'Cleaning schedule', 'A little every day keeps the home happy.')
    const [d, w, mo] = rows(c, b, [1, 1.1, 1], 3)
    c.els.push(...checklist(c, panel(c, d, 'Daily'), ['Make the beds', 'Wash the dishes', 'Wipe kitchen counters', 'Quick tidy of living room', 'Take out rubbish']))
    c.els.push(...checklist(c, panel(c, w, 'Weekly'), ['Vacuum and mop floors', 'Clean bathrooms', 'Change bed sheets', 'Dust surfaces', 'Laundry', 'Water the plants']))
    c.els.push(...checklist(c, panel(c, mo, 'Monthly'), ['Clean windows', 'Clean the fridge', 'Wash curtains', 'Declutter one drawer', 'Clean fans and lights']))
  }),
  planner('savings', 'Savings tracker', 'savings tracker money challenge save', ['bold', 'playful'], (c) => {
    const b = header(c, 'Savings tracker', 'Goal: save $1,000. Colour one circle for every $10 you save.')
    const g = dotGrid(10, 10, 10, 4.2)
    const size = Math.min(b.w, b.h * 0.75)
    c.els.push(path(g.d, [g.w, g.h], r(b.x + (b.w - size) / 2), r(b.y), r(size), r(size), 'transparent', { name: 'Savings circles', stroke: c.t.accent, strokeWidth: 1.2 }))
    const rest = { x: b.x, y: b.y + size + c.u * 4, w: b.w, h: b.h - size - c.u * 4 }
    if (rest.h > c.u * 10) {
      const [a, d] = cols(c, rest, [1, 1], 3)
      c.els.push(...linesIn(c, panel(c, a, 'Saving for')))
      c.els.push(...linesIn(c, panel(c, d, 'Target date')))
    }
  }),
  planner('mood', 'Mood tracker', 'mood tracker mental health feelings monthly', ['calm', 'playful'], (c) => {
    const b = header(c, 'Mood tracker', 'Month: ____________________')
    const [grid, legend] = rows(c, b, [3, 1], 3)
    monthGrid(c, grid, null, true)
    const moods = ['Happy', 'Calm', 'Tired', 'Sad', 'Anxious', 'Excited']
    const colors = [c.t.accent, c.t.accent2, c.t.soft, c.t.muted, c.t.accentText, c.t.ink]
    const l = panel(c, legend, 'Colour key')
    const cw = l.w / 3
    moods.forEach((m, i) => {
      const x = l.x + (i % 3) * cw
      const y = l.y + Math.floor(i / 3) * c.u * 5
      const t = textEl(c, m, x + c.u * 4, y, cw - c.u * 5, { role: 'body', size: 1.7, color: c.t.ink })
      c.els.push(...group([ellipse(r(x), r(y + (t.height - c.u * 2.6) / 2), r(c.u * 2.6), r(c.u * 2.6), colors[i], { name: 'Mood colour' }), t]))
    })
  }),
  planner('project', 'Project planner', 'project planner tasks team work plan', ['corporate', 'tech'], (c) => {
    const b = header(c, 'Project planner', 'Project: ____________________   Deadline: ____________')
    stack(c, b, [T('Tasks', { role: 'label', size: 1.8, color: c.t.accentText }), TB([['Task', 'Owner', 'Due', 'Status'], ...blankRows(10, 4)], { size: 1.9, name: 'Tasks' }), T('Milestones', { role: 'label', size: 1.8, color: c.t.accentText }), TB([['Milestone', 'Date', 'Done'], ...blankRows(4, 3)], { size: 1.9, name: 'Milestones' })], { gap: 2, maxGrow: 1 })
  }),
  planner('event-plan', 'Event planning checklist', 'event planning checklist party wedding organiser', ['festive', 'elegant'], (c) => {
    const b = header(c, 'Event planner', 'Event: ____________________   Date: ____________')
    const [a, d] = cols(c, b, [1, 1], 3)
    const [a1, a2] = rows(c, a, [1, 1], 3)
    const [d1, d2] = rows(c, d, [1, 1], 3)
    c.els.push(...checklist(c, panel(c, a1, '2 months before'), ['Set the budget', 'Choose the venue', 'Make the guest list', 'Send save the dates']))
    c.els.push(...checklist(c, panel(c, a2, '1 month before'), ['Send invitations', 'Book catering', 'Plan decorations', 'Book photographer']))
    c.els.push(...checklist(c, panel(c, d1, '1 week before'), ['Confirm guest numbers', 'Confirm suppliers', 'Plan the schedule', 'Prepare gifts']))
    c.els.push(...checklist(c, panel(c, d2, 'On the day'), ['Set up the venue', 'Welcome guests', 'Enjoy the moment', 'Say thank you']))
  }),
  planner('bills', 'Bill payment tracker', 'bill payment tracker bills due finance', ['minimal', 'corporate'], (c) => {
    const b = header(c, 'Bill tracker', 'Year: ____________')
    stack(c, b, [TB([['Bill', 'Amount', 'Due date', 'Paid'], ...['Rent', 'Electricity', 'Water', 'Gas', 'Internet', 'Phone', 'Insurance', 'School fees', 'Loan', 'Credit card', 'Subscriptions', 'Other'].map((x) => [x, '', '', ''])], { size: 2.1, name: 'Bills' })], { maxGrow: 1 })
  })
]

export function buildPlanner(t: PlannerType, W: number, H: number, theme: Theme, seed: string): Page[] {
  const c = makeCtx(W, H, theme, seed)
  t.build(c)
  return [finish(c)]
}

// ------------------------------------------------------------ calendars

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const YEAR = 2027

/** Day numbers of a month laid out Monday first; null for blank cells. */
function weeks(year: number, month: number): (number | null)[][] {
  const first = (new Date(year, month, 1).getDay() + 6) % 7
  const days = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
  while (cells.length % 7) cells.push(null)
  return Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7))
}

/** A month grid of boxes with day numbers (or blank, for undated planners). */
function monthGrid(c: Ctx, b: Box, month: number | null, compact = false) {
  const head = c.u * 4
  const ws = month === null ? Array.from({ length: 5 }, () => Array(7).fill(null)) : weeks(YEAR, month)
  const cw = b.w / 7
  const ch = (b.h - head) / ws.length
  const out: DesignElement[] = []
  WEEK.forEach((d, i) => {
    const t = textEl(c, d, b.x + i * cw, b.y, cw, { role: 'label', size: 1.6, align: 'center', color: i >= 5 ? c.t.accentText : c.t.ink })
    t.y = r(b.y + (head - t.height) / 2)
    out.push(t)
  })
  const cells: DesignElement[] = []
  const nums: DesignElement[] = []
  ws.forEach((week, wi) =>
    week.forEach((day, di) => {
      const x = b.x + di * cw
      const y = b.y + head + wi * ch
      cells.push(rect(r(x), r(y), r(cw), r(ch), day === null && month !== null ? c.t.soft2 : 'transparent', { name: 'Day box', stroke: c.t.soft, strokeWidth: r(Math.max(2, c.u * 0.15)) }))
      if (day !== null) nums.push(textEl(c, String(day), x + c.u * 1, y + c.u * 0.6, cw - c.u * 2, { role: compact ? 'body' : 'head', size: compact ? 1.6 : 2.2, align: compact ? 'center' : 'left', color: di >= 5 ? c.t.accentText : c.t.ink }))
    })
  )
  c.els.push(...group(out), ...group(cells), ...nums)
}

export interface CalendarItem {
  id: string
  title: string
  kw: string
  mood: Mood[]
  month: number | 'year' | 'all'
}

const seasonMood: Mood[][] = [['calm', 'minimal'], ['elegant', 'festive'], ['fresh', 'nature'], ['fresh', 'playful'], ['nature', 'calm'], ['warm', 'bold'], ['bold', 'playful'], ['warm', 'fresh'], ['nature', 'warm'], ['warm', 'elegant'], ['calm', 'dark'], ['festive', 'warm']]

export const calendarItems: CalendarItem[] = [
  ...MONTHS.map((m, i) => ({ id: `cal-${m.toLowerCase()}`, title: `${m} ${YEAR} calendar`, kw: `calendar ${m.toLowerCase()} ${YEAR} month monthly printable`, mood: seasonMood[i], month: i })),
  { id: 'cal-year', title: `${YEAR} year calendar`, kw: `calendar ${YEAR} yearly year at a glance`, mood: ['minimal', 'calm'], month: 'year' },
  { id: 'cal-all', title: `${YEAR} monthly calendar (12 pages)`, kw: `calendar ${YEAR} monthly 12 months all months`, mood: ['nature', 'fresh'], month: 'all' }
]

function calendarPage(c: Ctx, month: number, style: number) {
  const m = c.u * 7
  const name = MONTHS[month]
  if (style === 0) {
    const ph = c.H * 0.36
    c.els.push(frame(0, 0, c.W, r(ph), { name: 'Photo' }))
    c.els.push(rect(0, r(ph), c.W, r(c.u * 1.2), c.t.accent, { name: 'Accent bar' }))
    const used = stack(c, { x: m, y: ph + c.u * 4, w: c.W - m * 2, h: c.u * 12 }, [T(name, { role: 'head', size: 6 }), T(String(YEAR), { role: 'label', size: 2, color: c.t.accentText })], { valign: 'top', gap: 0.5, maxGrow: 1 })
    monthGrid(c, { x: m, y: used.y + used.h + c.u * 3, w: c.W - m * 2, h: c.H - used.y - used.h - c.u * 3 - m }, month)
  } else if (style === 1) {
    decorate(c, 0.5)
    const lw = c.W * 0.28
    stack(c, { x: m, y: m, w: lw - m, h: c.H * 0.4 }, [T(String(month + 1).padStart(2, '0'), { role: 'head', size: 14, color: c.t.accentText }), T(name, { role: 'head', size: 5.5 }), T(String(YEAR), { role: 'label', size: 2, color: c.t.muted })], { valign: 'top', gap: 1, maxGrow: 1 })
    const notes = { x: m, y: m + c.H * 0.45, w: lw - m * 1.2, h: c.H * 0.55 - m * 2 }
    c.els.push(...linesIn(c, panel(c, notes, 'Notes', false)))
    monthGrid(c, { x: lw + c.u * 2, y: m, w: c.W - lw - m - c.u * 2, h: c.H - m * 2 }, month)
  } else {
    const bh = c.u * 22
    c.els.push(rect(0, 0, c.W, r(bh), c.t.accent, { name: 'Header band' }))
    const [a, b] = cols(c, inset({ x: 0, y: 0, w: c.W, h: bh }, m, c.u * 4), [2, 1], 4)
    stack(c, a, [T(name, { role: 'head', size: 7, color: c.t.onAccent })], { valign: 'middle', maxGrow: 1 })
    stack(c, b, [T(String(YEAR), { role: 'head', size: 5, align: 'right', color: c.t.onAccent })], { valign: 'middle', maxGrow: 1 })
    const [grid, notes] = rows(c, { x: m, y: bh + m * 0.8, w: c.W - m * 2, h: c.H - bh - m * 1.8 }, [4, 1], 3)
    monthGrid(c, grid, month)
    c.els.push(...linesIn(c, panel(c, notes, 'Notes')))
  }
}

function yearPage(c: Ctx) {
  const m = c.u * 6
  decorate(c, 0.4)
  const used = stack(c, { x: m, y: m, w: c.W - m * 2, h: c.u * 10 }, [T(String(YEAR), { role: 'head', size: 7, align: 'center' })], { maxGrow: 1 })
  const area = { x: m, y: used.y + used.h + c.u * 3, w: c.W - m * 2, h: c.H - used.y - used.h - c.u * 3 - m }
  const grid = rows(c, area, [1, 1, 1, 1], 3).flatMap((row) => cols(c, row, [1, 1, 1], 3))
  grid.forEach((b, i) => {
    stack(c, b, [T(MONTHS[i], { role: 'label', size: 1.8, color: c.t.accentText, gapAfter: 1 }), TB([WEEK.map((d) => d[0]), ...weeks(YEAR, i).map((w) => w.map((d) => (d ? String(d) : '')))], { size: 1.6, align: 'center', stripe: null, fill: c.t.bg, ink: c.t.ink, headerFill: c.t.bg, headerInk: c.t.muted, border: c.t.bg, name: `${MONTHS[i]} table` })], { valign: 'top', gap: 1, maxGrow: 1 })
  })
}

export function buildCalendar(style: number, item: CalendarItem, W: number, H: number, theme: Theme, seed: string): Page[] {
  if (item.month === 'year') {
    const c = makeCtx(W, H, theme, seed)
    yearPage(c)
    return [finish(c)]
  }
  const months = item.month === 'all' ? MONTHS.map((_, i) => i) : [item.month]
  return months.map((mo) => {
    const c = makeCtx(W, H, theme, `${seed}-${mo}`)
    calendarPage(c, mo, style)
    return finish(c, MONTHS[mo])
  })
}

