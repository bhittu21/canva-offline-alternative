import type { DesignElement, ShapeElement } from '@shared/model'
import { BLOB, HEART } from '@renderer/render/shapes'
import { base, createFrame, createIcon, createLine, createShape, grouped, textAt } from '@renderer/editor/elementFactory'

/**
 * The built-in element library. Every entry is original artwork made from
 * editable shapes, lines, icons and text, so anything inserted can be
 * recoloured, resized and edited like any other element. New entries only need
 * a `make` function; the panel builds thumbnails and search from this list.
 */

type Size = { width: number; height: number }

export interface ElementPreset {
  id: string
  label: string
  category: string
  keywords: string
  make: (doc: Size) => DesignElement[]
}

export const elementCategories = [
  { id: 'shapes', label: 'Shapes' },
  { id: 'lines', label: 'Lines and arrows' },
  { id: 'decor', label: 'Decorative' },
  { id: 'callouts', label: 'Badges and callouts' },
  { id: 'patterns', label: 'Patterns and borders' },
  { id: 'diagrams', label: 'Infographics and diagrams' },
  { id: 'mockups', label: 'Mockups' }
] as const

const s = (doc: Size) => Math.min(doc.width, doc.height)

const pathShape = (name: string, path: string, viewBox: [number, number], props: Partial<ShapeElement> = {}) => (doc: Size) => [
  createShape(doc, 'path', { name, path, viewBox, ...props })
]

const outline = (doc: Size) => ({ fill: 'transparent', stroke: '#1f2329', strokeWidth: Math.max(2, Math.round(s(doc) * 0.008)) })

// ----- Original path artwork (100-unit boxes unless noted) -----

const P = {
  rightTriangle: 'M0 100V0L100 100Z',
  parallelogram: 'M24 8H100L76 92H0Z',
  trapezoid: 'M22 10H78L100 90H0Z',
  cross: 'M35 0H65V35H100V65H65V100H35V65H0V35H35Z',
  arch: 'M0 100V50A50 50 0 0 1 100 50V100Z',
  halfCircle: 'M0 50A50 50 0 0 1 100 50Z',
  quarter: 'M0 0A100 100 0 0 1 100 100H0Z',
  ring: 'M0 50A50 50 0 1 0 100 50A50 50 0 1 0 0 50ZM24 50A26 26 0 1 0 76 50A26 26 0 1 0 24 50Z',
  blockArrow: 'M0 34H60V12L100 50L60 88V66H0Z',
  doubleArrow: 'M0 50L26 18V36H74V18L100 50L74 82V64H26V82Z',
  chevron: 'M0 10H62L100 50L62 90H0L38 50Z',
  tag: 'M0 10H70L100 50L70 90H0Z',
  blob2: 'M60 4C80 6 98 24 95 44C93 60 99 74 88 86C76 98 56 92 40 95C22 98 6 86 4 68C2 52 12 42 10 28C8 12 26 2 42 4C48 5 54 4 60 4Z',
  blob3: 'M48 3C64 3 70 14 82 20C95 27 99 44 93 58C87 72 92 86 78 94C63 102 47 92 32 90C16 88 3 78 3 60C3 44 14 38 16 26C18 12 32 3 48 3Z',
  wave: 'M0 30C25 8 50 8 75 30S125 52 150 30S200 8 200 8V60H0Z',
  squiggle: 'M0 30C17 5 33 5 50 30S83 55 100 30S133 5 150 30S183 55 200 30',
  sparkle: 'M50 0C54 34 66 46 100 50C66 54 54 66 50 100C46 66 34 54 0 50C34 46 46 34 50 0Z',
  cloud: 'M26 80C12 80 4 70 4 58C4 46 14 38 26 38C28 22 40 12 55 12C70 12 82 22 84 38C92 40 98 48 98 58C98 70 90 80 78 80Z',
  bolt: 'M58 2L14 58H46L38 98L86 38H54Z',
  leaf: 'M8 92C8 40 40 8 92 8C92 60 60 92 8 92Z',
  drop: 'M50 4C50 4 86 44 86 64A36 36 0 0 1 14 64C14 44 50 4 50 4Z',
  moon: 'M62 6A44 44 0 1 0 94 70A36 36 0 1 1 62 6Z',
  shield: 'M50 4L92 18V46C92 70 74 88 50 96C26 88 8 70 8 46V18Z',
  brackets: 'M4 30V4H30M70 4H96V30M96 70V96H70M30 96H4V70',
  speech: 'M10 8H90Q96 8 96 14V60Q96 66 90 66H42L22 86L26 66H10Q4 66 4 60V14Q4 8 10 8Z',
  speechOval: 'M50 6C76 6 96 21 96 39C96 57 76 72 50 72C44 72 38 71 33 70L12 88L19 64C10 58 4 49 4 39C4 21 24 6 50 6Z',
  callout: 'M4 4H96V70H58L50 90L42 70H4Z',
  ribbon: 'M0 12H200L184 32L200 52H0L16 32Z',
  foldRibbon: 'M24 6H176V46H24ZM0 18H24V58H0L10 38ZM200 18H176V58H200L190 38Z',
  banner: 'M0 0H200V44L100 60L0 44Z',
  frameBorder: 'M0 0H100V100H0ZM7 7V93H93V7Z',
  doubleBorder: 'M0 0H100V100H0ZM4 4V96H96V4ZM8 8H92V92H8ZM11 11V89H89V11Z',
  stripes: 'M0 20L20 0M0 40L40 0M0 60L60 0M0 80L80 0M0 100L100 0M20 100L100 20M40 100L100 40M60 100L100 60M80 100L100 80',
  grid: 'M0 20H100M0 40H100M0 60H100M0 80H100M20 0V100M40 0V100M60 0V100M80 0V100M0 0H100V100H0Z',
  curvedArrow: 'M10 80C20 30 60 15 88 30M88 30L74 18M88 30L80 46',
  zigzag: 'M0 30L20 10L40 30L60 10L80 30L100 10L120 30L140 10L160 30L180 10L200 30',
  heartOutline: HEART
}

function dots(): string {
  let d = ''
  for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
    const cx = 10 + c * 20
    const cy = 10 + r * 20
    d += `M${cx - 4} ${cy}A4 4 0 1 0 ${cx + 4} ${cy}A4 4 0 1 0 ${cx - 4} ${cy}Z`
  }
  return d
}

const halftone = (() => {
  let d = ''
  for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) {
    const rad = 1.2 + (c + r) * 0.55
    const cx = 8 + c * 17
    const cy = 8 + r * 17
    d += `M${cx - rad} ${cy}A${rad} ${rad} 0 1 0 ${cx + rad} ${cy}A${rad} ${rad} 0 1 0 ${cx - rad} ${cy}Z`
  }
  return d
})()

// ----- Composite pieces -----

function labelled(_doc: Size, shape: ShapeElement, text: string, color = '#ffffff', sizeRatio = 0.16): DesignElement[] {
  const fontSize = Math.max(10, Math.round(Math.min(shape.width, shape.height) * sizeRatio))
  const label = textAt({ text, x: shape.x + shape.width * 0.1, y: 0, width: shape.width * 0.8, fontSize, fill: color, align: 'center', fontFamily: 'Poppins', fontStyle: 'bold' })
  label.y = shape.y + (shape.height - label.height) / 2
  return grouped([shape, label])
}

export const elementPresets: ElementPreset[] = [
  // Shapes
  { id: 'square', label: 'Square', category: 'shapes', keywords: 'rectangle box', make: (d) => [createShape(d, 'rect', { name: 'Square' })] },
  { id: 'rounded', label: 'Rounded square', category: 'shapes', keywords: 'rectangle round corner card', make: (d) => [createShape(d, 'rect', { name: 'Rounded square', cornerRadius: s(d) * 0.05 })] },
  { id: 'circle', label: 'Circle', category: 'shapes', keywords: 'round dot ellipse', make: (d) => [createShape(d, 'ellipse')] },
  { id: 'ellipse', label: 'Ellipse', category: 'shapes', keywords: 'oval', make: (d) => [createShape(d, 'ellipse', { name: 'Ellipse', width: s(d) * 0.4, height: s(d) * 0.26 })] },
  { id: 'triangle', label: 'Triangle', category: 'shapes', keywords: 'pyramid', make: (d) => [createShape(d, 'triangle')] },
  { id: 'right-triangle', label: 'Right triangle', category: 'shapes', keywords: 'corner', make: pathShape('Right triangle', P.rightTriangle, [100, 100]) },
  { id: 'diamond', label: 'Diamond', category: 'shapes', keywords: 'rhombus', make: (d) => [createShape(d, 'diamond')] },
  { id: 'pentagon', label: 'Pentagon', category: 'shapes', keywords: 'polygon five', make: (d) => [createShape(d, 'polygon', { name: 'Pentagon', sides: 5 })] },
  { id: 'hexagon', label: 'Hexagon', category: 'shapes', keywords: 'polygon six honeycomb', make: (d) => [createShape(d, 'polygon', { name: 'Hexagon', sides: 6 })] },
  { id: 'octagon', label: 'Octagon', category: 'shapes', keywords: 'polygon eight stop', make: (d) => [createShape(d, 'polygon', { name: 'Octagon', sides: 8 })] },
  { id: 'star', label: 'Star', category: 'shapes', keywords: 'rating favourite', make: (d) => [createShape(d, 'star')] },
  { id: 'star-6', label: 'Six-point star', category: 'shapes', keywords: 'star', make: (d) => [createShape(d, 'star', { name: 'Star', sides: 6, innerRatio: 0.55 })] },
  { id: 'burst', label: 'Burst', category: 'shapes', keywords: 'starburst explosion sale', make: (d) => [createShape(d, 'star', { name: 'Burst', sides: 14, innerRatio: 0.72, fill: '#ffbd59' })] },
  { id: 'heart', label: 'Heart', category: 'shapes', keywords: 'love valentine', make: pathShape('Heart', HEART, [100, 96], { fill: '#ff5757' }) },
  { id: 'parallelogram', label: 'Parallelogram', category: 'shapes', keywords: 'slant', make: pathShape('Parallelogram', P.parallelogram, [100, 100]) },
  { id: 'trapezoid', label: 'Trapezoid', category: 'shapes', keywords: '', make: pathShape('Trapezoid', P.trapezoid, [100, 100]) },
  { id: 'cross', label: 'Cross', category: 'shapes', keywords: 'plus add medical', make: pathShape('Cross', P.cross, [100, 100]) },
  { id: 'arch', label: 'Arch', category: 'shapes', keywords: 'door window', make: pathShape('Arch', P.arch, [100, 100], { fill: '#e8d5c4' }) },
  { id: 'half-circle', label: 'Half circle', category: 'shapes', keywords: 'semicircle', make: pathShape('Half circle', P.halfCircle, [100, 50]) },
  { id: 'quarter', label: 'Quarter circle', category: 'shapes', keywords: 'corner pie', make: pathShape('Quarter circle', P.quarter, [100, 100]) },
  { id: 'ring', label: 'Ring', category: 'shapes', keywords: 'donut circle outline', make: pathShape('Ring', P.ring, [100, 100]) },
  { id: 'pill', label: 'Pill', category: 'shapes', keywords: 'button capsule rounded', make: (d) => [createShape(d, 'rect', { name: 'Pill', width: s(d) * 0.4, height: s(d) * 0.13, cornerRadius: s(d) })] },
  { id: 'square-outline', label: 'Square outline', category: 'shapes', keywords: 'border frame stroke', make: (d) => [createShape(d, 'rect', { name: 'Square outline', ...outline(d) })] },
  { id: 'circle-outline', label: 'Circle outline', category: 'shapes', keywords: 'ring stroke', make: (d) => [createShape(d, 'ellipse', { name: 'Circle outline', ...outline(d) })] },
  { id: 'dashed-square', label: 'Dashed square', category: 'shapes', keywords: 'border stroke cut', make: (d) => [createShape(d, 'rect', { name: 'Dashed square', ...outline(d), dash: 'dashed', cornerRadius: s(d) * 0.02 })] },
  { id: 'dotted-circle', label: 'Dotted circle', category: 'shapes', keywords: 'stroke', make: (d) => [createShape(d, 'ellipse', { name: 'Dotted circle', ...outline(d), dash: 'dotted' })] },
  { id: 'transparent-box', label: 'Tinted box', category: 'shapes', keywords: 'overlay transparent', make: (d) => [createShape(d, 'rect', { name: 'Tinted box', fill: '#000000', opacity: 0.35, width: s(d) * 0.5, height: s(d) * 0.3 })] },

  // Lines and arrows
  { id: 'line', label: 'Line', category: 'lines', keywords: 'divider rule straight', make: (d) => [createLine(d)] },
  { id: 'line-dashed', label: 'Dashed line', category: 'lines', keywords: 'divider', make: (d) => [createLine(d, { name: 'Dashed line', dash: 'dashed' })] },
  { id: 'line-dotted', label: 'Dotted line', category: 'lines', keywords: 'divider', make: (d) => [createLine(d, { name: 'Dotted line', dash: 'dotted', strokeWidth: Math.max(3, s(d) * 0.01) })] },
  { id: 'arrow', label: 'Arrow', category: 'lines', keywords: 'pointer direction', make: (d) => [createLine(d, { name: 'Arrow', endCap: 'arrow' })] },
  { id: 'arrow-solid', label: 'Solid arrow', category: 'lines', keywords: 'pointer', make: (d) => [createLine(d, { name: 'Arrow', endCap: 'triangle' })] },
  { id: 'arrow-double', label: 'Double arrow', category: 'lines', keywords: 'both ways', make: (d) => [createLine(d, { name: 'Double arrow', startCap: 'triangle', endCap: 'triangle' })] },
  { id: 'connector', label: 'Connector', category: 'lines', keywords: 'flow link dots', make: (d) => [createLine(d, { name: 'Connector', startCap: 'circle', endCap: 'circle' })] },
  { id: 'arrow-dashed', label: 'Dashed arrow', category: 'lines', keywords: 'path route', make: (d) => [createLine(d, { name: 'Dashed arrow', dash: 'dashed', endCap: 'arrow' })] },
  { id: 'dimension', label: 'Measure line', category: 'lines', keywords: 'dimension bar ends', make: (d) => [createLine(d, { name: 'Measure line', startCap: 'bar', endCap: 'bar', strokeWidth: Math.max(2, s(d) * 0.004) })] },
  { id: 'block-arrow', label: 'Block arrow', category: 'lines', keywords: 'arrow right big', make: pathShape('Block arrow', P.blockArrow, [100, 100]) },
  { id: 'block-double', label: 'Double block arrow', category: 'lines', keywords: 'arrow both', make: pathShape('Double block arrow', P.doubleArrow, [100, 100]) },
  { id: 'chevron', label: 'Chevron', category: 'lines', keywords: 'arrow step process', make: pathShape('Chevron', P.chevron, [100, 100]) },
  { id: 'curved-arrow', label: 'Curved arrow', category: 'lines', keywords: 'hand drawn bend', make: pathShape('Curved arrow', P.curvedArrow, [100, 100], { fill: 'transparent', stroke: '#1f2329', strokeWidth: 3 }) },
  { id: 'squiggle', label: 'Squiggle', category: 'lines', keywords: 'wave line wavy', make: pathShape('Squiggle', P.squiggle, [200, 60], { fill: 'transparent', stroke: '#7c5cff', strokeWidth: 4 }) },
  { id: 'zigzag', label: 'Zigzag', category: 'lines', keywords: 'wave line', make: pathShape('Zigzag', P.zigzag, [200, 40], { fill: 'transparent', stroke: '#ff5757', strokeWidth: 4 }) },

  // Decorative
  { id: 'blob-1', label: 'Blob', category: 'decor', keywords: 'organic abstract shape', make: pathShape('Blob', BLOB, [100, 100], { fill: '#c9b8ff' }) },
  { id: 'blob-2', label: 'Blob', category: 'decor', keywords: 'organic abstract shape', make: pathShape('Blob', P.blob2, [100, 100], { fill: '#ffd6c9' }) },
  { id: 'blob-3', label: 'Blob', category: 'decor', keywords: 'organic abstract shape', make: pathShape('Blob', P.blob3, [100, 100], { fill: '#bfeedd' }) },
  { id: 'wave', label: 'Wave', category: 'decor', keywords: 'divider footer header water', make: (d) => [createShape(d, 'path', { name: 'Wave', path: P.wave, viewBox: [200, 60], width: d.width, height: d.width * 0.3, x: 0, y: d.height - d.width * 0.3, fill: '#7c5cff' })] },
  { id: 'sparkle', label: 'Sparkle', category: 'decor', keywords: 'star shine twinkle', make: pathShape('Sparkle', P.sparkle, [100, 100], { fill: '#ffbd59' }) },
  { id: 'cloud', label: 'Cloud', category: 'decor', keywords: 'weather sky', make: pathShape('Cloud', P.cloud, [100, 92], { fill: '#dbe7ff' }) },
  { id: 'bolt', label: 'Lightning', category: 'decor', keywords: 'flash energy power', make: pathShape('Lightning', P.bolt, [100, 100], { fill: '#ffde59' }) },
  { id: 'leaf', label: 'Leaf', category: 'decor', keywords: 'nature plant organic', make: pathShape('Leaf', P.leaf, [100, 100], { fill: '#7ed957' }) },
  { id: 'drop', label: 'Drop', category: 'decor', keywords: 'water liquid', make: pathShape('Drop', P.drop, [100, 104], { fill: '#38b6ff' }) },
  { id: 'moon', label: 'Moon', category: 'decor', keywords: 'night crescent', make: pathShape('Moon', P.moon, [100, 100], { fill: '#ffde59' }) },
  { id: 'shield', label: 'Shield', category: 'decor', keywords: 'security badge protect', make: pathShape('Shield', P.shield, [100, 100], { fill: '#004aad' }) },
  { id: 'brackets', label: 'Corner brackets', category: 'decor', keywords: 'frame focus corners', make: pathShape('Corner brackets', P.brackets, [100, 100], { fill: 'transparent', stroke: '#1f2329', strokeWidth: 3 }) },
  { id: 'circle-soft', label: 'Soft circle', category: 'decor', keywords: 'background glow gradient', make: (d) => [createShape(d, 'ellipse', { name: 'Soft circle', gradient: { kind: 'radial', angle: 0, stops: [{ offset: 0, color: '#c9b8ff' }, { offset: 1, color: '#f4f0ff' }] } })] },
  { id: 'gradient-blob', label: 'Gradient blob', category: 'decor', keywords: 'abstract colourful', make: pathShape('Gradient blob', P.blob3, [100, 100], { gradient: { kind: 'linear', angle: 135, stops: [{ offset: 0, color: '#ff9a8b' }, { offset: 1, color: '#7c5cff' }] } }) },

  // Badges and callouts
  { id: 'speech', label: 'Speech bubble', category: 'callouts', keywords: 'chat comment talk', make: pathShape('Speech bubble', P.speech, [100, 92], { fill: '#ffffff', stroke: '#1f2329', strokeWidth: 3 }) },
  { id: 'speech-oval', label: 'Round speech bubble', category: 'callouts', keywords: 'chat comment talk', make: pathShape('Speech bubble', P.speechOval, [100, 92], { fill: '#ffde59' }) },
  { id: 'callout', label: 'Callout box', category: 'callouts', keywords: 'tooltip note pointer', make: pathShape('Callout', P.callout, [100, 94], { fill: '#1f2329' }) },
  { id: 'tag', label: 'Tag', category: 'callouts', keywords: 'label price', make: pathShape('Tag', P.tag, [100, 100], { fill: '#ff914d' }) },
  { id: 'ribbon', label: 'Ribbon', category: 'callouts', keywords: 'banner title', make: pathShape('Ribbon', P.ribbon, [200, 64], { fill: '#ff5757' }) },
  { id: 'fold-ribbon', label: 'Folded ribbon', category: 'callouts', keywords: 'banner title award', make: pathShape('Ribbon', P.foldRibbon, [200, 64], { fill: '#8c52ff' }) },
  { id: 'pennant', label: 'Banner', category: 'callouts', keywords: 'flag header', make: pathShape('Banner', P.banner, [200, 60], { fill: '#1f2329' }) },
  {
    id: 'sale-badge',
    label: 'Sale badge',
    category: 'callouts',
    keywords: 'discount offer promo burst',
    make: (d) => labelled(d, createShape(d, 'star', { name: 'Badge', sides: 16, innerRatio: 0.84, fill: '#ff5757' }), '50%\nOFF', '#ffffff', 0.17)
  },
  {
    id: 'new-badge',
    label: 'Circle badge',
    category: 'callouts',
    keywords: 'new label sticker',
    make: (d) => labelled(d, createShape(d, 'ellipse', { name: 'Badge', fill: '#1f2329', width: s(d) * 0.22, height: s(d) * 0.22 }), 'NEW', '#ffde59', 0.22)
  },
  {
    id: 'button',
    label: 'Button',
    category: 'callouts',
    keywords: 'cta call to action shop now',
    make: (d) => labelled(d, createShape(d, 'rect', { name: 'Button', width: s(d) * 0.42, height: s(d) * 0.11, cornerRadius: s(d), fill: '#7c5cff' }), 'Shop now', '#ffffff', 0.36)
  },
  {
    id: 'price-tag',
    label: 'Price tag',
    category: 'callouts',
    keywords: 'price cost offer',
    make: (d) => labelled(d, createShape(d, 'path', { name: 'Tag', path: P.tag, viewBox: [100, 100], width: s(d) * 0.34, height: s(d) * 0.2, fill: '#ffbd59' }), '$29', '#1f2329', 0.4)
  },

  // Patterns and borders
  { id: 'dots', label: 'Dot grid', category: 'patterns', keywords: 'pattern texture halftone', make: pathShape('Dot grid', dots(), [100, 100], { fill: '#1f2329' }) },
  { id: 'halftone', label: 'Halftone', category: 'patterns', keywords: 'pattern dots gradient', make: pathShape('Halftone', halftone, [100, 100], { fill: '#7c5cff' }) },
  { id: 'stripes', label: 'Stripes', category: 'patterns', keywords: 'pattern diagonal lines', make: pathShape('Stripes', P.stripes, [100, 100], { fill: 'transparent', stroke: '#1f2329', strokeWidth: 2 }) },
  { id: 'grid', label: 'Grid', category: 'patterns', keywords: 'pattern table lines', make: pathShape('Grid', P.grid, [100, 100], { fill: 'transparent', stroke: '#b9bec9', strokeWidth: 1.5 }) },
  { id: 'border', label: 'Page border', category: 'patterns', keywords: 'frame edge outline', make: (d) => [createShape(d, 'path', { name: 'Border', path: P.frameBorder, viewBox: [100, 100], x: 0, y: 0, width: d.width, height: d.height, fill: '#1f2329' })] },
  { id: 'double-border', label: 'Double border', category: 'patterns', keywords: 'frame classic certificate', make: (d) => [createShape(d, 'path', { name: 'Double border', path: P.doubleBorder, viewBox: [100, 100], x: d.width * 0.04, y: d.height * 0.04, width: d.width * 0.92, height: d.height * 0.92, fill: '#c8a27a' })] },
  { id: 'inset-frame', label: 'Inset frame', category: 'patterns', keywords: 'border outline margin', make: (d) => [createShape(d, 'rect', { name: 'Inset frame', x: d.width * 0.05, y: d.height * 0.05, width: d.width * 0.9, height: d.height * 0.9, ...outline(d) })] },

  // Infographics and diagrams
  {
    id: 'step',
    label: 'Numbered step',
    category: 'diagrams',
    keywords: 'number circle list',
    make: (d) => labelled(d, createShape(d, 'ellipse', { name: 'Step', width: s(d) * 0.14, height: s(d) * 0.14, fill: '#7c5cff' }), '1', '#ffffff', 0.45)
  },
  { id: 'process', label: 'Process (3 steps)', category: 'diagrams', keywords: 'flow chevron steps arrow', make: (d) => processSteps(d) },
  { id: 'timeline', label: 'Timeline', category: 'diagrams', keywords: 'history milestones dates', make: (d) => timeline(d) },
  { id: 'flow-start', label: 'Start / end', category: 'diagrams', keywords: 'flowchart terminal pill', make: (d) => labelled(d, createShape(d, 'rect', { name: 'Start', width: s(d) * 0.3, height: s(d) * 0.11, cornerRadius: s(d), fill: '#12a37f' }), 'Start', '#ffffff', 0.3) },
  { id: 'flow-process', label: 'Process box', category: 'diagrams', keywords: 'flowchart step', make: (d) => labelled(d, createShape(d, 'rect', { name: 'Process', width: s(d) * 0.3, height: s(d) * 0.15, cornerRadius: s(d) * 0.012, fill: '#5271ff' }), 'Process', '#ffffff', 0.2) },
  { id: 'flow-decision', label: 'Decision', category: 'diagrams', keywords: 'flowchart diamond question', make: (d) => labelled(d, createShape(d, 'diamond', { name: 'Decision', width: s(d) * 0.26, height: s(d) * 0.2, fill: '#ffbd59' }), 'Yes?', '#1f2329', 0.18) },
  { id: 'stat', label: 'Big number', category: 'diagrams', keywords: 'statistic figure kpi percentage', make: (d) => stat(d) },
  { id: 'progress', label: 'Progress bar', category: 'diagrams', keywords: 'percentage meter loading', make: (d) => progress(d) },
  { id: 'checklist', label: 'Checklist', category: 'diagrams', keywords: 'list ticks todo bullet', make: (d) => checklist(d) },

  // Mockups
  { id: 'phone', label: 'Phone', category: 'mockups', keywords: 'mobile smartphone device screen app', make: (d) => phone(d) },
  { id: 'laptop', label: 'Laptop', category: 'mockups', keywords: 'computer device screen website', make: (d) => laptop(d) },
  { id: 'browser', label: 'Browser window', category: 'mockups', keywords: 'website screen ui', make: (d) => browser(d) },
  { id: 'polaroid', label: 'Instant photo', category: 'mockups', keywords: 'polaroid photo print frame', make: (d) => polaroid(d) }
]

function processSteps(d: Size): DesignElement[] {
  const w = s(d) * 0.26
  const h = w * 0.42
  const total = w * 3 - w * 0.12 * 2
  const x0 = (d.width - total) / 2
  const y = (d.height - h) / 2
  const colors = ['#7c5cff', '#5271ff', '#22a6c8']
  const items: DesignElement[] = []
  ;['Plan', 'Create', 'Launch'].forEach((label, i) => {
    const shape = createShape(d, 'path', { name: `Step ${i + 1}`, path: i === 0 ? P.tag : P.chevron, viewBox: [100, 100], x: x0 + i * w * 0.88, y, width: w, height: h, fill: colors[i] })
    const fontSize = Math.round(h * 0.26)
    const text = textAt({ text: label, x: shape.x + w * 0.18, y: 0, width: w * 0.62, fontSize, fill: '#ffffff', align: 'center', fontFamily: 'Poppins', fontStyle: 'bold' })
    text.y = y + (h - text.height) / 2
    items.push(shape, text)
  })
  return grouped(items)
}

function timeline(d: Size): DesignElement[] {
  const width = d.width * 0.76
  const x0 = (d.width - width) / 2
  const y = d.height / 2
  const stroke = Math.max(3, s(d) * 0.006)
  const line = createLine(d, { name: 'Timeline', x: x0, width, strokeWidth: stroke, stroke: '#b9bec9' })
  line.y = y - line.height / 2
  const items: DesignElement[] = [line]
  const labels = ['2023', '2024', '2025', '2026']
  labels.forEach((label, i) => {
    const cx = x0 + (width * (i + 0.5)) / labels.length
    const r = s(d) * 0.025
    items.push(createShape(d, 'ellipse', { name: 'Milestone', x: cx - r, y: y - r, width: r * 2, height: r * 2, fill: '#7c5cff', stroke: '#ffffff', strokeWidth: stroke }))
    const fs = Math.round(s(d) * 0.032)
    items.push(textAt({ text: label, x: cx - width / 8, y: y + r * 2, width: width / 4, fontSize: fs, align: 'center', fontFamily: 'Poppins', fontStyle: 'bold' }))
    items.push(textAt({ text: 'Milestone', x: cx - width / 8, y: y - r * 2 - fs * 1.3, width: width / 4, fontSize: Math.round(fs * 0.7), align: 'center', fill: '#5b6170' }))
  })
  return grouped(items)
}

function stat(d: Size): DesignElement[] {
  const w = s(d) * 0.4
  const big = textAt({ text: '87%', x: (d.width - w) / 2, y: d.height / 2 - s(d) * 0.1, width: w, fontSize: Math.round(s(d) * 0.13), align: 'center', fontFamily: 'Poppins', fontStyle: 'bold', fill: '#7c5cff' })
  const small = textAt({ text: 'of customers would recommend us', x: (d.width - w) / 2, y: big.y + big.height, width: w, fontSize: Math.round(s(d) * 0.026), align: 'center', fill: '#5b6170' })
  return grouped([big, small])
}

function progress(d: Size): DesignElement[] {
  const w = s(d) * 0.6
  const h = s(d) * 0.035
  const x = (d.width - w) / 2
  const y = d.height / 2
  return grouped([
    createShape(d, 'rect', { name: 'Track', x, y, width: w, height: h, cornerRadius: h, fill: '#e4e6eb' }),
    createShape(d, 'rect', { name: 'Progress', x, y, width: w * 0.7, height: h, cornerRadius: h, fill: '#12a37f' }),
    textAt({ text: '70%', x, y: y - h * 1.9, width: w, fontSize: Math.round(h * 1.1), align: 'right', fontFamily: 'Poppins', fontStyle: 'bold' })
  ])
}

function checklist(d: Size): DesignElement[] {
  const fs = Math.round(s(d) * 0.034)
  const x = d.width * 0.3
  const items: DesignElement[] = []
  ;['First benefit', 'Second benefit', 'Third benefit'].forEach((label, i) => {
    const y = d.height / 2 - fs * 2.2 + i * fs * 1.8
    const icon = createIcon(d, 'circle-check', '#12a37f')
    items.push({ ...icon, x, y: y - fs * 0.1, width: fs * 1.3, height: fs * 1.3 })
    items.push(textAt({ text: label, x: x + fs * 1.8, y, width: d.width * 0.4, fontSize: fs }))
  })
  return grouped(items)
}

function phone(d: Size): DesignElement[] {
  const h = s(d) * 0.62
  const w = h * 0.5
  const x = (d.width - w) / 2
  const y = (d.height - h) / 2
  const bezel = w * 0.045
  return grouped([
    { ...createShape(d, 'rect', { name: 'Phone body', fill: '#15171c', cornerRadius: w * 0.16 }), x, y, width: w, height: h },
    { ...createFrame(d, 'rounded', 1, { name: 'Phone screen', cornerRadius: w * 0.12 }), mask: 'rect', x: x + bezel, y: y + bezel, width: w - bezel * 2, height: h - bezel * 2 },
    { ...createShape(d, 'rect', { name: 'Camera notch', fill: '#15171c', cornerRadius: w }), x: x + w * 0.36, y: y + bezel * 1.6, width: w * 0.28, height: w * 0.07 }
  ])
}

function laptop(d: Size): DesignElement[] {
  const w = s(d) * 0.7
  const h = w * 0.62
  const x = (d.width - w) / 2
  const y = (d.height - h) / 2
  const screenW = w * 0.8
  const screenH = h * 0.86
  const sx = x + (w - screenW) / 2
  const bezel = screenW * 0.03
  return grouped([
    { ...createShape(d, 'rect', { name: 'Laptop lid', fill: '#2a2d35', cornerRadius: screenW * 0.03 }), x: sx, y, width: screenW, height: screenH },
    { ...createFrame(d, 'rect', 1, { name: 'Laptop screen' }), x: sx + bezel, y: y + bezel, width: screenW - bezel * 2, height: screenH - bezel * 2 },
    { ...createShape(d, 'path', { name: 'Laptop base', path: 'M8 0H92L100 70Q100 100 92 100H8Q0 100 0 70Z', viewBox: [100, 100], fill: '#c6cad3' }), x, y: y + screenH, width: w, height: h - screenH }
  ])
}

function browser(d: Size): DesignElement[] {
  const w = s(d) * 0.72
  const h = w * 0.66
  const x = (d.width - w) / 2
  const y = (d.height - h) / 2
  const bar = h * 0.09
  const r = bar * 0.17
  return grouped([
    { ...createShape(d, 'rect', { name: 'Window', fill: '#ffffff', stroke: '#d6d9e0', strokeWidth: 1, cornerRadius: w * 0.015, shadow: { color: '#000000', blur: 30, offsetX: 0, offsetY: 10, opacity: 0.15 } }), x, y, width: w, height: h },
    { ...createShape(d, 'rect', { name: 'Title bar', fill: '#eff1f4', cornerRadius: 0 }), x, y, width: w, height: bar },
    ...['#ff5f57', '#febc2e', '#28c840'].map((fill, i) => ({ ...createShape(d, 'ellipse', { name: 'Window button', fill }), x: x + bar * 0.5 + i * r * 3, y: y + bar / 2 - r, width: r * 2, height: r * 2 })),
    { ...createShape(d, 'rect', { name: 'Address bar', fill: '#ffffff', cornerRadius: bar }), x: x + w * 0.2, y: y + bar * 0.22, width: w * 0.6, height: bar * 0.56 },
    { ...createFrame(d, 'rect', 1, { name: 'Page content' }), x, y: y + bar, width: w, height: h - bar }
  ])
}

function polaroid(d: Size): DesignElement[] {
  const w = s(d) * 0.42
  const h = w * 1.18
  const x = (d.width - w) / 2
  const y = (d.height - h) / 2
  const m = w * 0.06
  const caption = textAt({ text: 'Summer 2026', x, y: y + w + m * 0.2, width: w, fontSize: Math.round(w * 0.08), align: 'center', fontFamily: 'Caveat', fill: '#3f4450' })
  return grouped([
    { ...createShape(d, 'rect', { name: 'Photo card', fill: '#ffffff', shadow: { color: '#000000', blur: 24, offsetX: 0, offsetY: 8, opacity: 0.18 } }), x, y, width: w, height: h },
    { ...createFrame(d, 'rect', 1, { name: 'Photo' }), x: x + m, y: y + m, width: w - m * 2, height: w - m * 2 },
    caption
  ]).map((el) => ({ ...el, rotation: 0 }))
}

export function searchPresets(query: string): ElementPreset[] {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return elementPresets
  return elementPresets.filter((p) => {
    const hay = `${p.label} ${p.keywords} ${p.category}`.toLowerCase()
    return words.every((w) => hay.includes(w))
  })
}

export { base }
