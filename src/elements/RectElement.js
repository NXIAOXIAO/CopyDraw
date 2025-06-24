import { Element } from './Element.js'

/**
 * RectElement
 * 矩形元素，继承自 Element
 */
export class RectElement extends Element {
  constructor({ id, x, y, width, height, style = {} }) {
    super({ id, type: 'rect' })
    this.x = x
    this.y = y
    this.width = width
    this.height = height
    this.style = style
  }

  selectorRender(ctx, viewport) {
    // 高亮矩形边框与八个锚点
    const { x, y } = viewport.canvasToScreen(this.x, this.y)
    const w = this.width * viewport.scale,
      h = this.height * viewport.scale
    ctx.save()
    ctx.strokeStyle = '#0099ff'
    ctx.lineWidth = 2
    ctx.setLineDash([4, 2])
    ctx.strokeRect(x, y, w, h)
    ctx.setLineDash([])
    // 锚点
    for (let dx of [0, w])
      for (let dy of [0, h]) {
        ctx.beginPath()
        ctx.arc(x + dx, y + dy, 5, 0, Math.PI * 2)
        ctx.fillStyle = '#fff'
        ctx.fill()
        ctx.strokeStyle = '#0099ff'
        ctx.stroke()
      }
    ctx.restore()
  }
}
