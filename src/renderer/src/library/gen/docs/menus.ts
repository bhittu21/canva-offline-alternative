import type { DesignElement, Page } from '@shared/model'
import { frame, group, icon, rect } from '../../templateKit'
import { type Block, type Box, type Ctx, E, S, T, cols, finish, inset, makeCtx, r, stack, textEl, textWidth } from '../core'
import { decorate } from '../deco'
import type { Mood, Theme } from '../themes'

/** Restaurant and cafe menus, and price lists for local services. Prices are placeholders. */

export interface Menu {
  id: string
  title: string
  kw: string
  mood: Mood[]
  name: string
  tagline: string
  icon: string
  /** Section title and its items: name, price and an optional description. */
  sections: [string, [string, string, string?][]][]
  foot: string
}

/** Menu items: the name and price on one line, the description under the name. */
function items(list: [string, string, string?][], ink: string, muted: string, accent: string, size: number): Block {
  return {
    make: (c, w, scale) => {
      const gap = c.u * 1.8 * scale
      // The price column is as wide as the longest price, so prices stay on one line.
      const priceSpec = { role: 'body' as const, size, style: 'bold' as const, align: 'right' as const, color: accent }
      const priceW = Math.min(w * 0.45, Math.max(w * 0.12, ...list.map(([, price]) => (price ? textWidth(textEl(c, price, 0, 0, w * 0.45, priceSpec, Infinity, scale)) + c.u * 0.5 : 0))))
      const made = list.map(([name, price, desc]) => {
        const n = textEl(c, name, 0, 0, price ? w - priceW - c.u * 2 : w, { role: 'body', size, style: 'bold', color: ink }, Infinity, scale)
        const p = price ? textEl(c, price, 0, 0, priceW, priceSpec, Infinity, scale) : null
        const d = desc ? textEl(c, desc, 0, 0, w - priceW - c.u * 2, { role: 'body', size: size * 0.78, color: muted }, Infinity, scale) : null
        return { n, p, d, h: Math.max(n.height, p?.height ?? 0) + (d ? d.height + c.u * 0.3 : 0) }
      })
      const h = made.reduce((s, x) => s + x.h + gap, -gap)
      return {
        w,
        h,
        place: (x, y) => {
          const out: DesignElement[] = []
          let yy = y
          for (const it of made) {
            it.n.x = r(x)
            it.n.y = r(yy)
            const parts: DesignElement[] = [it.n]
            if (it.p) {
              it.p.x = r(x + w - priceW)
              it.p.y = r(yy)
              parts.push(it.p)
            }
            if (it.d) {
              it.d.x = r(x)
              it.d.y = r(yy + it.n.height + c.u * 0.3)
              parts.push(it.d)
            }
            out.push(...group(parts))
            yy += it.h + gap
          }
          return out
        }
      }
    }
  }
}

/** Two columns of blocks laid out at the same scale, so both sides share one text size. */
function twoCols(left: Block[], right: Block[], gapU: number): Block {
  return {
    make: (c, w, scale) => {
      const cw = (w - gapU * c.u) / 2
      const side = (blocks: Block[]) => {
        const made = blocks.map((bl) => ({ bl, m: bl.make(c, cw, scale) })).filter((x): x is { bl: Block; m: NonNullable<ReturnType<Block['make']>> } => !!x.m)
        const gaps = made.map((x, i) => (i < made.length - 1 && !x.bl.space ? (x.bl.gapAfter ?? 1) * c.u * scale : 0))
        return { made, gaps, h: made.reduce((t, x, i) => t + x.m.h + gaps[i], 0) }
      }
      const L = side(left)
      const R = side(right)
      return {
        w,
        h: Math.max(L.h, R.h),
        place: (x, y) =>
          [L, R].flatMap((col, k) => {
            let yy = y
            return col.made.flatMap((it, i) => {
              const out = it.m.place(x + k * (cw + gapU * c.u), yy)
              yy += it.m.h + col.gaps[i]
              return out
            })
          })
      }
    }
  }
}

const sectionHead = (_c: Ctx, title: string, color: string, align: 'left' | 'center' = 'left'): Block => T(title, { role: 'label', size: 2.3, color, align, gapAfter: 2 })

function blocksFor(c: Ctx, sections: Menu['sections'], ink: string, muted: string, accent: string, labelInk: string, size: number): Block[] {
  return sections.flatMap(([title, list], i) => [...(i ? [S(2)] : []), sectionHead(c, title, labelInk), items(list, ink, muted, accent, size)])
}

function header(c: Ctx, mn: Menu, b: Box, align: 'left' | 'center', ink = c.t.ink, muted = c.t.muted, accent = c.t.accentText): Box {
  return stack(c, b, [E(7, (x, y, w, h) => [icon(mn.icon, r(align === 'center' ? x + (w - h) / 2 : x), y, h, accent)], undefined, 2), T(mn.name, { role: 'head', size: 7, align, color: ink }), T(mn.tagline, { role: 'body', size: 2.4, align, color: muted })], { gap: 1.5, maxGrow: 1, align })
}

/** One column, centred heading. */
function classic(c: Ctx, mn: Menu): void {
  const m = c.u * 9
  decorate(c, 0.5)
  c.els.push(rect(r(c.u * 3.5), r(c.u * 3.5), r(c.W - c.u * 7), r(c.H - c.u * 7), 'transparent', { name: 'Border', stroke: c.t.accent, strokeWidth: r(Math.max(2, c.u * 0.3)) }))
  const h = header(c, mn, { x: m, y: m, w: c.W - m * 2, h: c.u * 30 }, 'center')
  const top = h.y + h.h + c.u * 5
  const body = { x: m + c.u * 4, y: top, w: c.W - m * 2 - c.u * 8, h: c.H - top - m - c.u * 6 }
  stack(c, body, blocksFor(c, mn.sections, c.t.ink, c.t.muted, c.t.accentText, c.t.accentText, 2.6), { gap: 1, fill: 0.92, maxGrow: 2.2 })
  const f = textEl(c, mn.foot, m, 0, c.W - m * 2, { role: 'body', size: 1.9, align: 'center', color: c.t.muted })
  f.y = r(c.H - m - f.height)
  c.els.push(f)
}

/** Two columns under a coloured header with a photo. */
function twoColumn(c: Ctx, mn: Menu): void {
  const m = c.u * 7
  const hh = c.H * 0.27
  c.els.push(rect(0, 0, c.W, r(hh), c.t.accent, { name: 'Header' }))
  const [txt, pic] = cols(c, inset({ x: 0, y: 0, w: c.W, h: hh }, m, m * 0.8), [1.5, 1], 4)
  stack(c, txt, [T(mn.name, { role: 'head', size: 7, color: c.t.onAccent }), T(mn.tagline, { role: 'body', size: 2.4, color: c.t.onAccent })], { valign: 'middle', gap: 1.5, maxGrow: 1 })
  c.els.push(frame(r(pic.x), r(pic.y), r(pic.w), r(pic.h), { mask: 'rounded', cornerRadius: r(c.u * 2), name: 'Food photo' }))
  const body = inset({ x: 0, y: hh, w: c.W, h: c.H - hh }, m, m * 0.8, m, m * 1.6)
  const half = Math.ceil(mn.sections.length / 2)
  const side = (list: Menu['sections']) => blocksFor(c, list, c.t.ink, c.t.muted, c.t.accentText, c.t.accentText, 2.4)
  stack(c, body, [twoCols(side(mn.sections.slice(0, half)), side(mn.sections.slice(half)), 6)], { fill: 0.92, maxGrow: 2 })
  c.els.push(rect(r(c.W / 2 - c.u * 0.1), r(body.y), r(Math.max(2, c.u * 0.2)), r(body.h), c.t.soft, { name: 'Divider' }))
  const f = textEl(c, mn.foot, m, 0, c.W - m * 2, { role: 'body', size: 1.9, align: 'center', color: c.t.muted })
  f.y = r(c.H - m * 0.8 - f.height)
  c.els.push(f)
}

/** Each section on its own card. */
function board(c: Ctx, mn: Menu): void {
  const m = c.u * 7
  decorate(c, 0.6)
  const h = header(c, mn, { x: m, y: m, w: c.W - m * 2, h: c.u * 24 }, 'left')
  const top = h.y + h.h + c.u * 4
  const n = mn.sections.length
  const weights = mn.sections.map(([, list]) => list.length + 1.2)
  const area = { x: m, y: top, w: c.W - m * 2, h: c.H - top - m * 1.6 }
  const gap = c.u * 3
  const total = weights.reduce((s, w) => s + w, 0)
  let y = area.y
  mn.sections.forEach(([title, list], i) => {
    const hh = (area.h - gap * (n - 1)) * (weights[i] / total)
    const card = rect(r(area.x), r(y), r(area.w), r(hh), c.t.surface, { name: 'Section card', cornerRadius: r(c.u * 2) })
    c.els.push(card)
    stack(c, inset({ x: area.x, y, w: area.w, h: hh }, c.u * 4, c.u * 3), [sectionHead(c, title, c.t.surfaceMuted), items(list, c.t.surfaceInk, c.t.surfaceMuted, c.t.surfaceInk, 2.4)], { gap: 1, valign: 'middle', fill: 0.9, maxGrow: 2 })
    y += hh + gap
  })
  const f = textEl(c, mn.foot, m, 0, c.W - m * 2, { role: 'body', size: 1.9, align: 'center', color: c.t.muted })
  f.y = r(c.H - m * 0.8 - f.height)
  c.els.push(f)
}

const layouts: Record<string, (c: Ctx, mn: Menu) => void> = { classic, twoColumn, board }
export const menuLayoutIds = Object.keys(layouts)

export function buildMenu(layout: string, mn: Menu, W: number, H: number, theme: Theme, seed: string): Page[] {
  const c = makeCtx(W, H, theme, seed)
  layouts[layout](c, mn)
  return [finish(c)]
}

type MenuFields = Omit<Menu, 'id' | 'title' | 'kw' | 'mood'>
const menu = (id: string, title: string, kw: string, mood: Mood[], f: MenuFields): Menu => ({ id, title, kw, mood, ...f })

export const menus: Menu[] = [
  menu('cafe', 'Cafe menu', 'cafe coffee shop menu drinks', ['warm', 'calm'], {
    name: 'The Corner Cafe',
    tagline: 'Good coffee, good company',
    icon: 'coffee',
    sections: [
      ['Coffee', [['Espresso', '$2.50'], ['Cappuccino', '$3.50', 'Espresso, steamed milk and foam'], ['Caffe latte', '$3.80'], ['Iced mocha', '$4.20', 'Chocolate, espresso and cold milk']]],
      ['Tea and more', [['Masala chai', '$3.00'], ['Green tea', '$2.50'], ['Hot chocolate', '$3.50']]],
      ['Bites', [['Butter croissant', '$2.80'], ['Chicken sandwich', '$5.50', 'Grilled chicken, lettuce and mayo'], ['Chocolate brownie', '$3.20']]]
    ],
    foot: 'Free Wi-Fi · Open daily 8 AM to 10 PM'
  }),
  menu('restaurant', 'Restaurant menu', 'restaurant dinner menu food', ['elegant', 'luxury'], {
    name: 'The Olive Table',
    tagline: 'Seasonal, local, delicious',
    icon: 'utensils',
    sections: [
      ['Starters', [['Tomato soup', '$6', 'With basil and fresh bread'], ['Garden salad', '$7', 'Leaves, cucumber and lemon dressing'], ['Garlic prawns', '$9']]],
      ['Mains', [['Grilled salmon', '$18', 'With lemon butter and greens'], ['Roast chicken', '$15', 'Herb potatoes and gravy'], ['Mushroom risotto', '$14']]],
      ['Desserts', [['Chocolate cake', '$7'], ['Lemon tart', '$6'], ['Ice cream', '$5', 'Three scoops of your choice']]]
    ],
    foot: 'Please tell us about any allergies · Reservations (123) 456-7890'
  }),
  menu('pizza', 'Pizza menu', 'pizza pizzeria menu italian', ['bold', 'warm'], {
    name: 'Slice House',
    tagline: 'Wood-fired pizza since 2015',
    icon: 'pizza',
    sections: [
      ['Classic pizzas', [['Margherita', '$9', 'Tomato, mozzarella and basil'], ['Pepperoni', '$11'], ['Four cheese', '$12'], ['Veggie supreme', '$11', 'Peppers, olives, onion and mushroom']]],
      ['Specials', [['Chicken tikka', '$13', 'Spicy chicken, onion and coriander'], ['BBQ beef', '$14']]],
      ['Sides and drinks', [['Garlic bread', '$4'], ['Potato wedges', '$4'], ['Soft drinks', '$2']]]
    ],
    foot: 'Free delivery over $20 · Call (123) 456-7890'
  }),
  menu('burger', 'Burger menu', 'burger fast food menu fries', ['bold', 'playful'], {
    name: 'Big Bite Burgers',
    tagline: 'Juicy, fresh and made to order',
    icon: 'beef',
    sections: [
      ['Burgers', [['Classic beef', '$7', 'Beef, cheese, lettuce and tomato'], ['Double cheese', '$9'], ['Crispy chicken', '$7', 'Fried chicken, slaw and mayo'], ['Veggie burger', '$6']]],
      ['Sides', [['Fries', '$2.50'], ['Onion rings', '$3'], ['Chicken wings (6)', '$5']]],
      ['Drinks', [['Milkshake', '$3.50', 'Chocolate, vanilla or strawberry'], ['Soft drinks', '$1.50']]]
    ],
    foot: 'Make it a meal: add fries and a drink for $3'
  }),
  menu('bakery', 'Bakery menu', 'bakery cakes pastry bread menu', ['warm', 'playful'], {
    name: 'Sweet Crumbs',
    tagline: 'Baked fresh every morning',
    icon: 'croissant',
    sections: [
      ['Breads', [['Sourdough loaf', '$5'], ['Milk bread', '$3'], ['Garlic buns (4)', '$3.50']]],
      ['Cakes', [['Chocolate fudge slice', '$4'], ['Red velvet slice', '$4.50'], ['Whole cakes', 'from $25', 'Order two days ahead']]],
      ['Pastries', [['Croissant', '$2.50'], ['Cinnamon roll', '$3'], ['Fruit tart', '$3.50']]]
    ],
    foot: 'Custom birthday cakes · Order at the counter'
  }),
  menu('juice', 'Juice bar menu', 'juice smoothie bar healthy drinks menu', ['fresh', 'playful'], {
    name: 'Fresh Squeeze',
    tagline: 'Fruit, fresh and nothing else',
    icon: 'citrus',
    sections: [
      ['Fresh juices', [['Orange', '$3'], ['Watermelon', '$3'], ['Green detox', '$4', 'Apple, cucumber, spinach and lime'], ['Carrot and ginger', '$3.50']]],
      ['Smoothies', [['Mango lassi', '$4'], ['Berry blast', '$4.50', 'Strawberry, blueberry and yoghurt'], ['Banana and peanut', '$4.50']]],
      ['Bowls', [['Acai bowl', '$7'], ['Fruit salad', '$5']]]
    ],
    foot: 'No added sugar · Ask for a loyalty card'
  }),
  menu('bangla', 'Bangladeshi restaurant menu', 'bangladeshi bengali restaurant biryani kacchi menu desi', ['warm', 'festive'], {
    name: 'Dhaka Kitchen',
    tagline: 'Home-style Bengali food',
    icon: 'soup',
    sections: [
      ['Rice', [['Kacchi biryani', 'Tk 350', 'Mutton, fragrant rice and potato'], ['Chicken biryani', 'Tk 250'], ['Morog polao', 'Tk 280'], ['Plain rice', 'Tk 40']]],
      ['Curries', [['Beef bhuna', 'Tk 260'], ['Chicken roast', 'Tk 220'], ['Rui fish curry', 'Tk 200'], ['Mixed vegetables', 'Tk 120']]],
      ['Sweets and drinks', [['Firni', 'Tk 80'], ['Borhani', 'Tk 60'], ['Mango lassi', 'Tk 90']]]
    ],
    foot: 'Home delivery · Catering for weddings and events'
  }),
  menu('chinese', 'Chinese restaurant menu', 'chinese restaurant noodles fried rice menu', ['bold', 'warm'], {
    name: 'Golden Dragon',
    tagline: 'Chinese and Thai favourites',
    icon: 'utensils-crossed',
    sections: [
      ['Soups', [['Thai soup', '$5'], ['Corn soup', '$4'], ['Hot and sour soup', '$5']]],
      ['Mains', [['Chicken fried rice', '$8'], ['Beef chow mein', '$9'], ['Sweet and sour prawns', '$11'], ['Chilli chicken', '$9']]],
      ['Sides', [['Spring rolls (4)', '$4'], ['Fried wontons', '$4'], ['Mixed vegetables', '$6']]]
    ],
    foot: 'Family set menus available · Takeaway welcome'
  }),
  menu('dessert', 'Ice cream menu', 'ice cream dessert parlour sundae menu', ['playful', 'kids'], {
    name: 'Scoops',
    tagline: 'Happiness in a cone',
    icon: 'ice-cream-cone',
    sections: [
      ['Scoops', [['One scoop', '$2'], ['Two scoops', '$3.50'], ['Three scoops', '$4.50']]],
      ['Sundaes', [['Banana split', '$6', 'Three scoops, banana and chocolate sauce'], ['Brownie sundae', '$6'], ['Fruit sundae', '$5.50']]],
      ['Shakes', [['Chocolate shake', '$4'], ['Strawberry shake', '$4'], ['Cookie shake', '$4.50']]]
    ],
    foot: 'Flavours change every week · Ask what’s new'
  }),
  menu('breakfast', 'Breakfast menu', 'breakfast brunch menu morning eggs', ['fresh', 'calm'], {
    name: 'Sunny Side',
    tagline: 'All-day breakfast',
    icon: 'egg-fried',
    sections: [
      ['Eggs', [['Eggs on toast', '$5', 'Fried, scrambled or poached'], ['Cheese omelette', '$6'], ['Full breakfast', '$9', 'Eggs, sausage, beans, toast and tomato']]],
      ['Sweet', [['Pancakes', '$6', 'With honey and fresh fruit'], ['French toast', '$6'], ['Granola and yoghurt', '$5']]],
      ['Drinks', [['Fresh orange juice', '$3'], ['Coffee', '$2.50'], ['Tea', '$2']]]
    ],
    foot: 'Served 7 AM to 2 PM'
  }),
  menu('wedding-menu', 'Wedding dinner menu', 'wedding dinner menu reception banquet', ['elegant', 'luxury'], {
    name: 'Wedding dinner',
    tagline: 'Sara and Imran · 12 December 2027',
    icon: 'heart',
    sections: [
      ['To start', [['Chicken corn soup', ''], ['Fresh garden salad', '']]],
      ['Main course', [['Kacchi biryani', ''], ['Chicken roast', ''], ['Beef rezala', ''], ['Mixed vegetables', '']]],
      ['Dessert', [['Firni', ''], ['Sweet yoghurt', ''], ['Seasonal fruit', '']]]
    ],
    foot: 'Thank you for celebrating with us'
  }),
  menu('bbq', 'BBQ menu', 'bbq barbecue grill menu kebab', ['bold', 'dark'], {
    name: 'Smoke and Fire',
    tagline: 'Grilled over charcoal',
    icon: 'flame',
    sections: [
      ['From the grill', [['Chicken tikka', '$9'], ['Beef seekh kebab', '$10'], ['Lamb chops', '$16'], ['Grilled fish', '$12']]],
      ['Breads', [['Naan', '$1.50'], ['Garlic naan', '$2'], ['Paratha', '$1.50']]],
      ['Sides', [['Mint yoghurt', '$1'], ['Onion salad', '$1'], ['Grilled corn', '$3']]]
    ],
    foot: 'Platters for groups of four or more'
  }),
  menu('kids-menu', 'Kids menu', 'kids children menu meal restaurant', ['kids', 'playful'], {
    name: 'Little Eaters',
    tagline: 'Meals for children under 12',
    icon: 'cookie',
    sections: [
      ['Meals', [['Chicken nuggets and fries', '$5'], ['Mini cheese pizza', '$5'], ['Pasta with tomato sauce', '$4.50']]],
      ['Treats', [['Ice cream scoop', '$2'], ['Fruit cup', '$2']]],
      ['Drinks', [['Apple juice', '$1.50'], ['Milk', '$1']]]
    ],
    foot: 'Every meal comes with a colouring sheet'
  }),
  menu('tea-stall', 'Tea and snacks menu', 'tea stall snacks menu chai singara', ['warm', 'minimal'], {
    name: 'Cha Adda',
    tagline: 'Tea, snacks and good talk',
    icon: 'cup-soda',
    sections: [
      ['Tea', [['Milk tea', 'Tk 20'], ['Lemon tea', 'Tk 15'], ['Ginger tea', 'Tk 20'], ['Masala tea', 'Tk 30']]],
      ['Snacks', [['Singara (2)', 'Tk 20'], ['Samosa (2)', 'Tk 20'], ['Puri', 'Tk 10'], ['Chicken roll', 'Tk 60']]],
      ['Something sweet', [['Jilapi', 'Tk 30'], ['Cake slice', 'Tk 40']]]
    ],
    foot: 'Open 7 AM to 11 PM'
  }),
  // Price lists for services
  menu('salon', 'Salon price list', 'salon beauty price list services', ['elegant', 'calm'], {
    name: 'Glow Beauty Salon',
    tagline: 'Look good, feel great',
    icon: 'scissors',
    sections: [
      ['Hair', [['Haircut', '$15'], ['Blow dry', '$12'], ['Colour', 'from $40'], ['Keratin treatment', 'from $80']]],
      ['Face', [['Facial', '$25'], ['Threading', '$5'], ['Party makeup', '$35']]],
      ['Hands and feet', [['Manicure', '$15'], ['Pedicure', '$18'], ['Henna', 'from $10']]]
    ],
    foot: 'Book on (123) 456-7890 · Bridal packages available'
  }),
  menu('barber', 'Barber price list', 'barber shop haircut price list men', ['bold', 'dark'], {
    name: 'Sharp Cuts',
    tagline: 'Barbers for gentlemen',
    icon: 'scissors',
    sections: [
      ['Cuts', [['Haircut', '$12'], ['Skin fade', '$15'], ['Kids’ cut', '$8']]],
      ['Beard', [['Beard trim', '$6'], ['Hot towel shave', '$12'], ['Beard colour', '$10']]],
      ['Extras', [['Hair wash', '$4'], ['Face mask', '$8']]]
    ],
    foot: 'Walk-ins welcome · Open Tuesday to Sunday'
  }),
  menu('laundry', 'Laundry price list', 'laundry dry cleaning price list wash iron', ['fresh', 'minimal'], {
    name: 'Fresh Fold Laundry',
    tagline: 'Washed, ironed and ready',
    icon: 'shirt',
    sections: [
      ['Wash and iron', [['Shirt', '$2'], ['Trousers', '$2.50'], ['Saree', '$4'], ['Bed sheet', '$3']]],
      ['Dry cleaning', [['Suit (2 pieces)', '$12'], ['Jacket', '$8'], ['Sherwani', '$15']]],
      ['Iron only', [['Per piece', '$1']]]
    ],
    foot: 'Free pickup and delivery over $15'
  }),
  menu('tailor', 'Tailor price list', 'tailor sewing alterations price list', ['warm', 'elegant'], {
    name: 'Fine Stitch Tailors',
    tagline: 'Made to measure',
    icon: 'ruler',
    sections: [
      ['Men', [['Shirt', '$15'], ['Trousers', '$12'], ['Panjabi', '$18'], ['Suit', 'from $90']]],
      ['Women', [['Salwar kameez', '$20'], ['Blouse', '$10'], ['Gown', 'from $40']]],
      ['Alterations', [['Hemming', '$4'], ['Taking in or letting out', '$6']]]
    ],
    foot: 'Ready in 7 days · Express service available'
  }),
  menu('car-wash', 'Car wash price list', 'car wash detailing price list auto', ['bold', 'tech'], {
    name: 'Shine Car Wash',
    tagline: 'Clean car, happy driver',
    icon: 'car',
    sections: [
      ['Wash', [['Outside wash', '$8'], ['Inside and out', '$15'], ['Premium wash and wax', '$25']]],
      ['Detailing', [['Interior deep clean', '$45'], ['Polish', '$40'], ['Engine clean', '$20']]],
      ['Monthly plans', [['4 washes', '$28'], ['Unlimited washes', '$45']]]
    ],
    foot: 'Open 8 AM to 8 PM every day'
  }),
  menu('spa', 'Spa price list', 'spa massage wellness price list', ['calm', 'luxury'], {
    name: 'Serene Spa',
    tagline: 'Relax, restore, renew',
    icon: 'flower-2',
    sections: [
      ['Massage', [['Swedish massage, 60 min', '$45'], ['Deep tissue, 60 min', '$55'], ['Head and shoulders, 30 min', '$25']]],
      ['Body', [['Body scrub', '$35'], ['Body wrap', '$40']]],
      ['Packages', [['Half day of calm', '$110', 'Massage, facial and lunch'], ['Couples retreat', '$150']]]
    ],
    foot: 'Gift vouchers available'
  }),
  menu('photo-packages', 'Photography packages', 'photography packages price list wedding photo', ['minimal', 'elegant'], {
    name: 'Captured by Lena',
    tagline: 'Photography packages',
    icon: 'camera',
    sections: [
      ['Portraits', [['Mini session, 30 min', '$80', '10 edited photos'], ['Family session, 1 hour', '$150', '25 edited photos']]],
      ['Events', [['Birthday, 3 hours', '$250'], ['Corporate event, half day', '$400']]],
      ['Weddings', [['Holud or mehndi', '$350'], ['Wedding day', '$800', 'Two photographers and an album']]]
    ],
    foot: 'Book with a 30% deposit'
  }),
  menu('tuition-fees', 'Tuition fees list', 'tuition coaching fees price list classes', ['corporate', 'fresh'], {
    name: 'Bright Future Coaching',
    tagline: 'Monthly fees',
    icon: 'graduation-cap',
    sections: [
      ['Primary', [['Class 1 to 3, all subjects', '$20'], ['Class 4 and 5, all subjects', '$25']]],
      ['Secondary', [['Maths', '$15'], ['Physics', '$15'], ['Chemistry', '$15'], ['English', '$12']]],
      ['Exam batches', [['SSC model tests', '$30'], ['HSC crash course', '$45']]]
    ],
    foot: 'Admission fee $10 · Sibling discount 10%'
  }),
  menu('gym-plans', 'Gym membership prices', 'gym fitness membership price list plans', ['bold', 'dark'], {
    name: 'Iron Gym',
    tagline: 'Membership plans',
    icon: 'dumbbell',
    sections: [
      ['Memberships', [['Monthly', '$30'], ['Three months', '$80'], ['One year', '$280']]],
      ['Classes', [['Yoga, per class', '$6'], ['Zumba, per class', '$6'], ['Boxing, per class', '$8']]],
      ['Personal training', [['Single session', '$20'], ['Ten sessions', '$170']]]
    ],
    foot: 'Free first visit · Open 6 AM to 11 PM'
  }),
  menu('cleaning', 'Cleaning service prices', 'cleaning service home office price list', ['fresh', 'calm'], {
    name: 'Sparkle Cleaning',
    tagline: 'Homes and offices',
    icon: 'sparkles',
    sections: [
      ['Home', [['Studio flat', '$40'], ['Two bedrooms', '$60'], ['Three bedrooms', '$80']]],
      ['Deep cleaning', [['Kitchen', '$45'], ['Bathroom', '$30'], ['Sofa shampoo', '$35']]],
      ['Office', [['Small office, weekly', '$90'], ['Large office', 'Ask for a quote']]]
    ],
    foot: 'All cleaning materials included'
  }),
  menu('print-shop', 'Print shop prices', 'printing print shop photocopy price list', ['minimal', 'corporate'], {
    name: 'Quick Print',
    tagline: 'Print, copy and bind',
    icon: 'printer',
    sections: [
      ['Copies', [['Black and white, per page', '$0.10'], ['Colour, per page', '$0.50']]],
      ['Printing', [['Business cards (100)', '$12'], ['Flyers (100)', '$20'], ['Banner, per sq ft', '$2']]],
      ['Finishing', [['Spiral binding', '$2'], ['Lamination, A4', '$1'], ['Photo print', '$0.40']]]
    ],
    foot: 'Same-day service for most orders'
  })
]
