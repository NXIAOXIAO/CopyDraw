import { viewport } from '../core/viewport.js'

export function canvasToWorld(cx, cy) {
  let { rotate, scale, xoffset, yoffset, width, height } = viewport
  let x2 = cx - width / 2
  let y2 = cy - height / 2
  let x1 = x2 * Math.cos(rotate) - y2 * Math.sin(rotate)
  let y1 = x2 * Math.sin(rotate) + y2 * Math.cos(rotate)
  let wx = (x1 + width / 2) * scale + xoffset
  let wy = (y1 + height / 2) * scale + yoffset
  return { x: wx, y: wy }
}

export function worldToCanvas(wx, wy) {
  let { rotate, scale, xoffset, yoffset, width, height } = viewport
  let x1 = (wx - xoffset) / scale - width / 2
  let y1 = (wy - yoffset) / scale - height / 2
  let x2 = x1 * Math.cos(rotate) + y1 * Math.sin(rotate)
  let y2 = -x1 * Math.sin(rotate) + y1 * Math.cos(rotate)
  let cx = x2 + width / 2
  let cy = y2 + height / 2
  return { x: cx, y: cy }
}

export function isDraw(x1, y1, x2, y2, ctx) {
  // 通过ctx获取canvas引用
  const { width, height } = ctx.canvas
  return (
    (x1 >= 0 && x1 <= width && y1 >= 0 && y1 <= height) ||
    (x2 >= 0 && x2 <= width && y2 >= 0 && y2 <= height)
  )
}
