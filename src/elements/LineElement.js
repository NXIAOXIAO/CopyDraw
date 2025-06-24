import { Element } from './Element.js'

/**
 * LineElement
 * 直线元素
 */
export class LineElement extends Element {
  constructor({ id, x1, y1, x2, y2, style = {} }) {
    super({ id, type: 'line' })
    this.x1 = x1
    this.y1 = y1
    this.x2 = x2
    this.y2 = y2
    this.style = style
  }

  selectorRender(ctx, viewport) {
    // 高亮线段
    const p1 = viewport.canvasToScreen(this.x1, this.y1)
    const p2 = viewport.canvasToScreen(this.x2, this.y2)
    ctx.save()
    ctx.strokeStyle = '#0099ff'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(p1.x, p1.y)
    ctx.lineTo(p2.x, p2.y)
    ctx.stroke()
    ctx.restore()
    // 两端锚点
    ;[p1, p2].forEach((pt) => {
      ctx.beginPath()
      ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2)
      ctx.fillStyle = '#fff'
      ctx.fill()
      ctx.strokeStyle = '#0099ff'
      ctx.stroke()
    })
  }
}
