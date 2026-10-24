/** Points of a polygon or star that fills a width x height box, for shapes Konva only draws as circles. */

export function trianglePoints(width: number, height: number): number[] {
  return [width / 2, 0, width, height, 0, height]
}

export function starPoints(width: number, height: number, points = 5, innerRatio = 0.45): number[] {
  const result: number[] = []
  const cx = width / 2
  const cy = height / 2
  for (let i = 0; i < points * 2; i++) {
    const angle = (Math.PI * i) / points - Math.PI / 2
    const r = i % 2 === 0 ? 1 : innerRatio
    result.push(cx + Math.cos(angle) * r * cx, cy + Math.sin(angle) * r * cy)
  }
  return result
}

/** Axis-aligned bounds of a box rotated by `rotation` degrees around its top-left corner. */
export function rotatedBounds(x: number, y: number, width: number, height: number, rotation: number) {
  const rad = (rotation * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const corners = [
    [0, 0],
    [width, 0],
    [width, height],
    [0, height]
  ].map(([px, py]) => [x + px * cos - py * sin, y + px * sin + py * cos])
  const xs = corners.map((c) => c[0])
  const ys = corners.map((c) => c[1])
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys)
  }
}
