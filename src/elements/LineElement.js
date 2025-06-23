import { Element } from './Element.js'
import { Viewport } from '../core/Viewport.js'
// 线元素类
export class LineElement extends Element {
  constructor() {
    super('line')
    this.geometies = []
  }
  addPoint(x, y) {
    this.geometies.push({ x, y })
  }
  removePoint(x, y) {
    this.geometies = this.geometies.filter((p) => p.x !== x || p.y !== y)
  }
  removePointAt(index) {
    if (index >= 0 && index < this.geometies.length) {
      this.geometies.splice(index, 1)
    }
  }
  insertPointAt(index, x, y) {
    if (index >= 0 && index <= this.geometies.length) {
      this.geometies.splice(index, 0, { x, y })
    }
  }
  /**
   * 选择器渲染（供 Selector 使用）
   * @param {CanvasRenderingContext2D} ctx
   * @param {Viewport} viewport
   */
  selectorRender(ctx, viewport) {
    ctx.beginPath()
    const start = viewport.worldToViewport(this.geometies[0].x, this.geometies[0].y)
    ctx.moveTo(start.x, start.y)
    for (let i = 1; i < this.geometies.length; i++) {
      const pt = viewport.worldToViewport(this.geometies[i].x, this.geometies[i].y)
      ctx.lineTo(pt.x, pt.y)
    }
    ctx.lineWidth = 4
    ctx.stroke()
    this.geometies.forEach((pt) => {
      const cpt = viewport.worldToViewport(pt.x, pt.y)
      ctx.beginPath()
      ctx.arc(cpt.x, cpt.y, 6, 0, Math.PI * 2)
      ctx.fill()
    })
  }
}
