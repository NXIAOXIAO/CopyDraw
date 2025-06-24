/**
 * Render
 * 根据当前模式渲染元素，不直接处理交互，仅负责画图
 * 可扩展个性化渲染
 */
export class Render {
  constructor(ctx, viewport) {
    this.ctx = ctx
    this.viewport = viewport
    this.mode = 'view' // 'view', 'draw', 'render'
  }

  /**
   * 切换渲染模式
   * @param {string} mode
   */
  setMode(mode) {
    this.mode = mode
  }

  /**
   * 渲染所有元素
   * @param {Array<Element>} elements
   */
  render(elements) {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height)
    elements.forEach((ele) => {
      this._renderElement(ele)
      if (ele.selected) ele.selectorRender(this.ctx, this.viewport)
    })
  }

  /**
   * 渲染单个元素（根据类型和 mode 可个性化）
   * @param {Element} ele
   */
  _renderElement(ele) {
    switch (ele.type) {
      case 'rect':
        this._drawRect(ele)
        break
      case 'line':
        this._drawLine(ele)
        break
      case 'img':
        this._drawImg(ele)
        break
      default:
        break
    }
  }

  _drawRect(ele) {
    const { x, y } = this.viewport.canvasToScreen(ele.x, ele.y)
    const w = ele.width * this.viewport.scale
    const h = ele.height * this.viewport.scale
    this.ctx.save()
    this.ctx.strokeStyle = ele.style.stroke || '#333'
    this.ctx.lineWidth = ele.style.lineWidth || 2
    this.ctx.strokeRect(x, y, w, h)
    if (ele.style.fill) {
      this.ctx.fillStyle = ele.style.fill
      this.ctx.fillRect(x, y, w, h)
    }
    this.ctx.restore()
  }

  _drawLine(ele) {
    const p1 = this.viewport.canvasToScreen(ele.x1, ele.y1)
    const p2 = this.viewport.canvasToScreen(ele.x2, ele.y2)
    this.ctx.save()
    this.ctx.strokeStyle = ele.style.stroke || '#333'
    this.ctx.lineWidth = ele.style.lineWidth || 2
    this.ctx.beginPath()
    this.ctx.moveTo(p1.x, p1.y)
    this.ctx.lineTo(p2.x, p2.y)
    this.ctx.stroke()
    this.ctx.restore()
  }

  _drawImg(ele) {
    if (!ele._imgLoaded) return
    const { x, y } = this.viewport.canvasToScreen(ele.x, ele.y)
    const w = ele.width * this.viewport.scale
    const h = ele.height * this.viewport.scale
    this.ctx.drawImage(ele._img, x, y, w, h)
  }
}
