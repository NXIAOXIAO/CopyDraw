import { generateId } from '../utils/id.js'
import { Element } from './Element.js'

/**
 * 矩形元素类
 * @extends Element
 */
export class RectElement extends Element {
  /**
   * @param {number} x - 左上角 x 坐标
   * @param {number} y - 左上角 y 坐标
   * @param {number} width - 宽度
   * @param {number} height - 高度
   */
  constructor(x = 0, y = 0, width = 100, height = 100) {
    super('rect')
    this.x = x
    this.y = y
    this.width = width
    this.height = height
  }

  /**
   * 绘制选中态（供 Selector 使用）
   * @param {CanvasRenderingContext2D} ctx
   */
  selectorRender(ctx) {
    ctx.save()
    ctx.strokeStyle = '#4A90E2'
    ctx.lineWidth = 2
    ctx.setLineDash([4, 2])
    ctx.strokeRect(this.x, this.y, this.width, this.height)
    ctx.restore()
  }
}
