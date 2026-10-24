import type { Page } from '@shared/model'
import { ellipse, frame, rect } from '../../templateKit'
import { type Block, type Box, type Ctx, E, R, S, T, cols, finish, inset, makeCtx, r, stack } from '../core'
import type { Mood, Theme } from '../themes'

/** Résumés and cover letters. Names, employers and dates are placeholders. */

export interface ResumeContent {
  id: string
  title: string
  kw: string
  mood: Mood[]
  name: string
  role: string
  summary: string
  experience: [string, string, string, string][]
  education: [string, string, string][]
  skills: string[]
  languages: string[]
}

const cv = (id: string, title: string, kw: string, mood: Mood[], name: string, role: string, summary: string, experience: ResumeContent['experience'], education: ResumeContent['education'], skills: string[], languages = ['English · fluent', 'Bangla · native']): ResumeContent => ({ id, title, kw, mood, name, role, summary, experience, education, skills, languages })

export const resumes: ResumeContent[] = [
  cv('r-designer', 'Graphic designer résumé', 'graphic designer creative', ['playful', 'minimal'], 'Maya Rahman', 'Graphic designer', 'Designer with 6 years of experience creating brands, packaging and social media for small businesses and agencies.', [['Senior designer', 'Spark Agency', '2023 to now', 'Lead the design of 30+ brand identities and campaign visuals.'], ['Graphic designer', 'Maya Studio', '2020 to 2023', 'Created logos, menus and packaging for local businesses.'], ['Junior designer', 'Print House', '2019 to 2020', 'Prepared print files and supported the creative team.']], [['BA in Fine Arts', 'City University', '2015 to 2019'], ['Certificate in UX design', 'Online Academy', '2022']], ['Branding', 'Illustration', 'Typography', 'Layout design', 'Social media']),
  cv('r-developer', 'Software engineer résumé', 'software engineer developer programmer', ['tech', 'minimal'], 'Arif Hasan', 'Software engineer', 'Full-stack engineer who enjoys building fast, accessible web apps and mentoring junior developers.', [['Software engineer', 'Hasan Labs', '2022 to now', 'Built a booking platform used by 40,000 customers.'], ['Frontend developer', 'Bright Apps', '2020 to 2022', 'Rebuilt the main web app and cut load time by half.'], ['Intern', 'City Tech Park', '2019', 'Wrote tests and fixed bugs in the payments service.']], [['BSc in Computer Science', 'National University', '2016 to 2020']], ['TypeScript', 'React', 'Node.js', 'SQL', 'Testing', 'Cloud basics']),
  cv('r-teacher', 'Teacher résumé', 'teacher education school', ['kids', 'calm'], 'Rina Akter', 'Primary school teacher', 'Patient, creative teacher with 8 years of experience making learning fun for children aged 6 to 11.', [['Class teacher', 'Green Valley School', '2019 to now', 'Teach English and maths to classes of 30 pupils.'], ['Assistant teacher', 'Little Stars School', '2016 to 2019', 'Planned lessons and ran the reading club.']], [['BEd in Primary Education', 'Teachers’ College', '2012 to 2016'], ['MA in English', 'City University', '2017 to 2018']], ['Lesson planning', 'Classroom management', 'Phonics', 'Parent communication', 'Child safety']),
  cv('r-nurse', 'Nurse résumé', 'nurse healthcare hospital medical', ['fresh', 'calm'], 'Sara Ahmed', 'Registered nurse', 'Caring registered nurse with 5 years in busy hospital wards and a calm approach under pressure.', [['Staff nurse', 'City General Hospital', '2021 to now', 'Care for up to 12 patients a shift on the medical ward.'], ['Nurse', 'Family Health Clinic', '2019 to 2021', 'Ran vaccination clinics and patient education sessions.']], [['BSc in Nursing', 'College of Nursing', '2015 to 2019']], ['Patient care', 'Medication', 'First aid', 'Record keeping', 'Teamwork']),
  cv('r-marketing', 'Marketing manager résumé', 'marketing manager digital', ['bold', 'corporate'], 'Kevin Lee', 'Marketing manager', 'Marketer who turns ideas into campaigns that grow brands, with strong skills in content and paid social.', [['Marketing manager', 'Spark Agency', '2022 to now', 'Manage a team of 5 and a yearly budget of $400,000.'], ['Digital marketer', 'Shop Online', '2019 to 2022', 'Grew online sales by 180% in two years.'], ['Marketing assistant', 'City Foods', '2018 to 2019', 'Ran social media and in-store promotions.']], [['BBA in Marketing', 'Business School', '2014 to 2018']], ['Campaign planning', 'SEO', 'Paid social', 'Content strategy', 'Analytics']),
  cv('r-accountant', 'Accountant résumé', 'accountant finance tax', ['corporate', 'minimal'], 'Rafiq Islam', 'Chartered accountant', 'Detail-focused accountant with experience in audit, tax and monthly reporting for growing companies.', [['Senior accountant', 'Islam Accounting', '2021 to now', 'Prepare accounts and tax returns for 60 clients.'], ['Audit associate', 'Big Four Firm', '2017 to 2021', 'Audited manufacturing and retail companies.']], [['Chartered Accountant', 'Institute of Accountants', '2020'], ['BCom in Accounting', 'City University', '2013 to 2017']], ['Financial reporting', 'Tax', 'Audit', 'Excel', 'Budgeting']),
  cv('r-sales', 'Sales executive résumé', 'sales executive business development', ['bold', 'warm'], 'Omar Faruk', 'Sales executive', 'Friendly, results-driven sales executive who builds long-term relationships with customers.', [['Sales executive', 'Prime Motors', '2021 to now', 'Top seller in 2023 and 2024, beating targets by 30%.'], ['Sales associate', 'Home Mart', '2018 to 2021', 'Helped customers choose furniture and appliances.']], [['BBA in Management', 'National University', '2014 to 2018']], ['Negotiation', 'Customer service', 'CRM', 'Product demos', 'Presentations']),
  cv('r-chef', 'Chef résumé', 'chef cook restaurant kitchen', ['warm', 'luxury'], 'Marco Rossi', 'Head chef', 'Chef with 12 years in busy kitchens, focused on seasonal menus and training young cooks.', [['Head chef', 'The Olive Table', '2020 to now', 'Created the menu and lead a team of 9.'], ['Sous chef', 'Grand Hotel', '2015 to 2020', 'Ran the kitchen for banquets of up to 400 guests.']], [['Diploma in Culinary Arts', 'Culinary Institute', '2010 to 2012']], ['Menu design', 'Food safety', 'Stock control', 'Team training', 'Pastry'], ['English · fluent', 'Italian · native']),
  cv('r-student', 'Student résumé', 'student graduate internship fresher', ['fresh', 'playful'], 'Zara Khan', 'Computer science student', 'Final-year student looking for an internship in software development or data analysis.', [['Teaching assistant', 'University CS Department', '2025 to now', 'Help 40 first-year students with programming labs.'], ['Volunteer', 'Code Club for Kids', '2024 to now', 'Teach basic coding to children every Saturday.']], [['BSc in Computer Science', 'National University', '2023 to 2027'], ['Higher Secondary Certificate', 'City College', '2021 to 2023']], ['Python', 'Java', 'SQL', 'Problem solving', 'Teamwork']),
  cv('r-manager', 'Project manager résumé', 'project manager operations', ['corporate', 'calm'], 'Elena Ruiz', 'Project manager', 'PMP-certified project manager who delivers complex projects on time and keeps teams calm and focused.', [['Project manager', 'Ruiz Advisory', '2021 to now', 'Delivered 15 projects worth $3 million in total.'], ['Project coordinator', 'Build Group', '2017 to 2021', 'Planned schedules and budgets for construction projects.']], [['MBA', 'Business School', '2015 to 2017'], ['PMP certification', 'Project Management Institute', '2020']], ['Planning', 'Risk management', 'Budgeting', 'Stakeholders', 'Agile']),
  cv('r-architect', 'Architect résumé', 'architect architecture design', ['minimal', 'elegant'], 'Hana Sato', 'Architect', 'Architect with a love for simple, sustainable homes and public spaces that bring people together.', [['Architect', 'Line & Form Studio', '2020 to now', 'Designed 12 homes and a community library.'], ['Junior architect', 'City Planning Office', '2017 to 2020', 'Prepared drawings and 3D models for public projects.']], [['Master of Architecture', 'School of Architecture', '2015 to 2017']], ['AutoCAD', 'SketchUp', '3D rendering', 'Sustainable design', 'Site visits'], ['English · fluent', 'Japanese · native']),
  cv('r-customer', 'Customer service résumé', 'customer service support call centre', ['fresh', 'warm'], 'Priya Sen', 'Customer support lead', 'Patient problem-solver who helps customers quickly and trains new team members.', [['Support team lead', 'Shop Online', '2022 to now', 'Lead 8 agents with a 96% satisfaction score.'], ['Support agent', 'Telecom Co.', '2019 to 2022', 'Answered 60+ customer calls and chats a day.']], [['BA in English', 'City University', '2015 to 2019']], ['Customer care', 'Live chat', 'Training', 'Problem solving', 'Ticketing tools']),
  cv('r-photographer', 'Photographer résumé', 'photographer photography creative', ['dark', 'elegant'], 'Lena Park', 'Photographer', 'Wedding and portrait photographer with an eye for natural light and real moments.', [['Founder and photographer', 'Captured by Lena', '2019 to now', 'Photographed 150+ weddings and family sessions.'], ['Photo assistant', 'Studio North', '2017 to 2019', 'Set up lighting and edited photos for commercial shoots.']], [['Diploma in Photography', 'Arts College', '2015 to 2017']], ['Portraits', 'Lighting', 'Photo editing', 'Client care', 'Video basics']),
  cv('r-driver', 'Driver résumé', 'driver delivery logistics', ['corporate', 'bold'], 'Sohel Rana', 'Professional driver', 'Safe, punctual driver with a clean licence and 10 years of experience in city and long-distance driving.', [['Delivery driver', 'Fast Logistics', '2019 to now', 'Deliver 80+ parcels a day with a 99% on-time rate.'], ['Company driver', 'Prime Motors', '2014 to 2019', 'Drove executives and guests safely across the city.']], [['Higher Secondary Certificate', 'City College', '2010 to 2012'], ['Professional driving licence', 'Road Transport Authority', '2013']], ['Safe driving', 'Route planning', 'Vehicle checks', 'Customer service', 'Punctuality']),
  cv('r-admin', 'Administrative assistant résumé', 'administrative assistant office secretary', ['minimal', 'calm'], 'Nadia Karim', 'Administrative assistant', 'Organised office assistant who keeps calendars, records and visitors running smoothly.', [['Office administrator', 'Karim & Partners', '2021 to now', 'Manage calendars, files and supplies for 25 staff.'], ['Receptionist', 'City Family Clinic', '2018 to 2021', 'Welcomed patients and booked 100+ appointments a week.']], [['BA in Management', 'National University', '2014 to 2018']], ['Scheduling', 'MS Office', 'Record keeping', 'Communication', 'Data entry'])
]

// ------------------------------------------------------------ pieces

function section(c: Ctx, title: string, color: string, rule: string): Block[] {
  return [T(title, { role: 'label', size: 1.7, color, gapAfter: 1 }), E(0.2, (x, y, w) => [rect(x, y, w, r(Math.max(2, c.u * 0.15)), rule, { name: 'Section line' })], undefined, 1.6)]
}

function experience(q: ResumeContent, ink: string, muted: string): Block[] {
  return q.experience.flatMap(([role, org, dates, text]) => [
    T(role, { role: 'body', size: 1.85, style: 'bold', color: ink, gapAfter: 0.4 }),
    T(`${org} · ${dates}`, { role: 'body', size: 1.6, color: muted, gapAfter: 0.6 }),
    T(text, { role: 'body', size: 1.65, color: ink, gapAfter: 2.2 })
  ])
}

function education(q: ResumeContent, ink: string, muted: string): Block[] {
  return q.education.flatMap(([degree, school, dates]) => [T(degree, { role: 'body', size: 1.75, style: 'bold', color: ink, gapAfter: 0.4 }), T(`${school} · ${dates}`, { role: 'body', size: 1.6, color: muted, gapAfter: 1.8 })])
}

const CONTACT = ['+1 234 567 890', 'you@email.com', 'yourname.com', 'Your City']
const CONTACT_ICONS = ['phone', 'mail', 'globe', 'map-pin']

function buildResumePage(c: Ctx, q: ResumeContent, style: number) {
  const m = c.u * 7
  const t = c.t
  if (style === 0) {
    // Sidebar with photo, contact and skills.
    const sw = c.W * 0.34
    c.els.push(rect(0, 0, r(sw), c.H, t.accent, { name: 'Sidebar' }))
    const d = sw * 0.56
    c.els.push(ellipse(r((sw - d) / 2 - c.u * 0.8), r(m - c.u * 0.8), r(d + c.u * 1.6), r(d + c.u * 1.6), t.onAccent, { name: 'Photo ring' }))
    c.els.push(frame(r((sw - d) / 2), r(m), r(d), r(d), { mask: 'circle', name: 'Your photo' }))
    const on = t.onAccent
    stack(
      c,
      { x: c.u * 5, y: m + d + c.u * 6, w: sw - c.u * 10, h: c.H - m * 2 - d - c.u * 6 },
      [
        ...section(c, 'Contact', on, on),
        R(CONTACT, { spec: { role: 'body', size: 1.6, color: on }, icons: CONTACT_ICONS, badgeFill: on, gap: 1, gapAfter: 4 }),
        ...section(c, 'Skills', on, on),
        R(q.skills, { spec: { role: 'body', size: 1.65, color: on }, badge: 'dot', badgeFill: on, gap: 0.8, gapAfter: 4 }),
        ...section(c, 'Languages', on, on),
        T(q.languages.join('\n'), { role: 'body', size: 1.65, color: on, lineHeight: 1.6 })
      ],
      { valign: 'top', gap: 1, maxGrow: 1 }
    )
    stack(
      c,
      { x: sw + m, y: m, w: c.W - sw - m * 2, h: c.H - m * 2 },
      [
        T(q.name, { role: 'head', size: 5.2, gapAfter: 0.6 }),
        T(q.role, { role: 'label', size: 1.9, color: t.accentText, gapAfter: 4 }),
        ...section(c, 'Profile', t.ink, t.soft),
        T(q.summary, { role: 'body', size: 1.7, color: t.ink, lineHeight: 1.55, gapAfter: 4 }),
        ...section(c, 'Experience', t.ink, t.soft),
        ...experience(q, t.ink, t.muted),
        S(2),
        ...section(c, 'Education', t.ink, t.soft),
        ...education(q, t.ink, t.muted)
      ],
      { valign: 'top', gap: 1, maxGrow: 1 }
    )
  } else if (style === 1) {
    // Classic single column.
    stack(
      c,
      { x: m * 1.3, y: m, w: c.W - m * 2.6, h: c.H - m * 2 },
      [
        T(q.name, { role: 'head', size: 5.4, align: 'center', gapAfter: 0.8 }),
        T(q.role, { role: 'label', size: 1.9, align: 'center', color: t.accentText, gapAfter: 1.2 }),
        T(CONTACT.join('  ·  '), { role: 'body', size: 1.6, align: 'center', gapAfter: 4 }),
        ...section(c, 'Profile', t.accentText, t.accent),
        T(q.summary, { role: 'body', size: 1.7, color: t.ink, lineHeight: 1.55, gapAfter: 4 }),
        ...section(c, 'Experience', t.accentText, t.accent),
        ...experience(q, t.ink, t.muted),
        S(2),
        ...section(c, 'Education', t.accentText, t.accent),
        ...education(q, t.ink, t.muted),
        S(2),
        ...section(c, 'Skills', t.accentText, t.accent),
        T(q.skills.join('  ·  '), { role: 'body', size: 1.7, color: t.ink, gapAfter: 3 }),
        ...section(c, 'Languages', t.accentText, t.accent),
        T(q.languages.join('  ·  '), { role: 'body', size: 1.7, color: t.ink })
      ],
      { valign: 'top', gap: 1, maxGrow: 1 }
    )
  } else if (style === 2) {
    // Colour band header with photo, two columns below.
    const bh = c.u * 26
    c.els.push(rect(0, 0, c.W, r(bh), t.accent, { name: 'Header band' }))
    const d = c.u * 18
    c.els.push(frame(r(c.W - m - d), r((bh - d) / 2), r(d), r(d), { mask: 'circle', name: 'Your photo' }))
    stack(c, { x: m, y: 0, w: c.W - m * 3 - d, h: bh }, [T(q.name, { role: 'head', size: 5.4, color: t.onAccent }), T(q.role, { role: 'label', size: 1.9, color: t.onAccent })], { valign: 'middle', gap: 1, maxGrow: 1 })
    const [main, side] = cols(c, { x: m, y: bh + m, w: c.W - m * 2, h: c.H - bh - m * 2 }, [1.7, 1], 6)
    stack(c, main, [...section(c, 'Profile', t.accentText, t.soft), T(q.summary, { role: 'body', size: 1.7, color: t.ink, lineHeight: 1.55, gapAfter: 4 }), ...section(c, 'Experience', t.accentText, t.soft), ...experience(q, t.ink, t.muted)], { valign: 'top', gap: 1, maxGrow: 1 })
    stack(
      c,
      side,
      [
        ...section(c, 'Contact', t.accentText, t.soft),
        T(CONTACT.join('\n'), { role: 'body', size: 1.6, color: t.ink, lineHeight: 1.6, gapAfter: 4 }),
        ...section(c, 'Education', t.accentText, t.soft),
        ...education(q, t.ink, t.muted),
        S(2),
        ...section(c, 'Skills', t.accentText, t.soft),
        R(q.skills, { spec: { role: 'body', size: 1.65, color: t.ink }, badge: 'dot', gap: 0.8, gapAfter: 4 }),
        ...section(c, 'Languages', t.accentText, t.soft),
        T(q.languages.join('\n'), { role: 'body', size: 1.65, color: t.ink, lineHeight: 1.6 })
      ],
      { valign: 'top', gap: 1, maxGrow: 1 }
    )
  } else {
    // Minimal: headings in a narrow left column.
    stack(c, { x: m, y: m, w: c.W * 0.58 - m, h: c.u * 16 }, [T(q.name, { role: 'head', size: 5.6 }), T(q.role, { role: 'body', size: 2, color: t.accentText })], { valign: 'top', gap: 0.8, maxGrow: 1 })
    stack(c, { x: c.W * 0.62, y: m, w: c.W * 0.38 - m, h: c.u * 16 }, [T(CONTACT.join('\n'), { role: 'body', size: 1.6, align: 'right', lineHeight: 1.5 })], { valign: 'top', maxGrow: 1 })
    c.els.push(rect(m, r(m + c.u * 18), c.W - m * 2, r(Math.max(2, c.u * 0.2)), t.ink, { name: 'Divider' }))
    const rowsDef: [string, Block[]][] = [
      ['Profile', [T(q.summary, { role: 'body', size: 1.7, color: t.ink, lineHeight: 1.55 })]],
      ['Experience', experience(q, t.ink, t.muted)],
      ['Education', education(q, t.ink, t.muted)],
      ['Skills', [T(q.skills.join(' · '), { role: 'body', size: 1.7, color: t.ink })]],
      ['Languages', [T(q.languages.join(' · '), { role: 'body', size: 1.7, color: t.ink })]]
    ]
    let y = m + c.u * 22
    const lw = c.W * 0.22
    for (const [title, blocks] of rowsDef) {
      stack(c, { x: m, y, w: lw - c.u * 2, h: c.u * 4 }, [T(title, { role: 'label', size: 1.7, color: t.accentText })], { maxGrow: 1 })
      const used: Box = stack(c, { x: m + lw, y, w: c.W - m * 2 - lw, h: c.H - y - m }, blocks, { valign: 'top', gap: 1, maxGrow: 1 })
      y = used.y + used.h + c.u * 4
    }
  }
}

export function buildResume(style: number, q: ResumeContent, W: number, H: number, theme: Theme, seed: string): Page[] {
  const c = makeCtx(W, H, theme, seed)
  buildResumePage(c, q, style)
  return [finish(c)]
}

/** A cover letter that matches a résumé's name and style. */
export function buildCoverLetter(style: number, q: ResumeContent, W: number, H: number, theme: Theme, seed: string): Page[] {
  const c = makeCtx(W, H, theme, seed)
  const m = c.u * 8
  const t = c.t
  if (style % 2 === 0) {
    c.els.push(rect(0, 0, c.W, r(c.u * 20), t.accent, { name: 'Header band' }))
    stack(c, inset({ x: 0, y: 0, w: c.W, h: c.u * 20 }, m, c.u * 3), [T(q.name, { role: 'head', size: 4.6, color: t.onAccent }), T(`${q.role} · ${CONTACT.slice(0, 2).join(' · ')}`, { role: 'body', size: 1.6, color: t.onAccent })], { valign: 'middle', gap: 0.8, maxGrow: 1 })
  } else {
    stack(c, { x: m, y: m, w: c.W - m * 2, h: c.u * 14 }, [T(q.name, { role: 'head', size: 4.6, align: 'center' }), T(`${q.role} · ${CONTACT.slice(0, 2).join(' · ')}`, { role: 'body', size: 1.6, align: 'center' })], { valign: 'top', gap: 0.8, maxGrow: 1 })
    c.els.push(rect(m, r(m + c.u * 15), c.W - m * 2, r(Math.max(2, c.u * 0.2)), t.accent, { name: 'Divider' }))
  }
  stack(
    c,
    { x: m, y: c.u * 28, w: c.W - m * 2, h: c.H - c.u * 28 - m },
    [
      T('20 March 2027', { role: 'body', size: 1.7, color: t.ink, gapAfter: 3 }),
      T('Hiring Manager\nCompany Name\n45 Park Avenue, Your City', { role: 'body', size: 1.7, color: t.ink, lineHeight: 1.5, gapAfter: 3 }),
      T('Dear Hiring Manager,', { role: 'body', size: 1.7, color: t.ink }),
      T(
        `I am writing to apply for the ${q.role.toLowerCase()} position at your company. ${q.summary}\n\nIn my current role I have learned to plan carefully, work well with others and deliver on time. I would love to bring the same energy and care to your team.\n\nThank you for considering my application. I would welcome the chance to talk about how I can help.`,
        { role: 'body', size: 1.7, color: t.ink, lineHeight: 1.6, gapAfter: 4 }
      ),
      T('Yours sincerely,', { role: 'body', size: 1.7, color: t.ink, gapAfter: 5 }),
      T(q.name, { role: 'body', size: 1.8, style: 'bold', color: t.ink })
    ],
    { valign: 'top', gap: 2, maxGrow: 1 }
  )
  return [finish(c)]
}
