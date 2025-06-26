import { Element } from './Element.js'

/**
 * PathElement：路径元素类
 * 用于表示笔模式绘制的连续线条，作为整体进行编辑
 * 不显示点，只显示线段，只能整体移动和调整
 */
export class PathElement extends Element {
  constructor() {
    super('PathElement')
    this.geometies = [] // 路径点集合
    this.color = '#3b82f6' // 默认颜色
    this.width = 2 // 默认线宽
    this.smooth = true // 默认启用平滑
  }

  /**
   * 选择器渲染方法
   * @param {CanvasRenderingContext2D} ctx
   * @param {Viewport} viewport
   */
  selectorRender(ctx, viewport) {
    if (!this.geometies || this.geometies.length < 2) return
    ctx.beginPath()
    const start = viewport.toCanvas(this.geometies[0].x, this.geometies[0].y)
    ctx.moveTo(start.x, start.y)

    // 绘制路径线段，不显示点
    for (let i = 1; i < this.geometies.length; i++) {
      const pt = viewport.toCanvas(this.geometies[i].x, this.geometies[i].y)
      ctx.lineTo(pt.x, pt.y)
    }

    ctx.lineWidth = 4
    ctx.stroke()
  }

  /**
   * 序列化方法
   */
  toJSON() {
    return {
      id: this.id,
      type: 'PathElement',
      geometies: this.geometies ? this.geometies.map((p) => ({ x: p.x, y: p.y })) : [],
      color: this.color,
      width: this.width,
      smooth: this.smooth,
      selected: this.selected
    }
  }
}
