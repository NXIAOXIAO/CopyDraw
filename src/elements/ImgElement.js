import { Element } from './Element.js'

/**
 * ImgElement
 * 图片元素
 */
export class ImgElement extends Element {
  constructor({ id, x, y, width, height, src }) {
    super({ id, type: 'img' })
    this.x = x
    this.y = y
    this.width = width
    this.height = height
    this.src = src // 图片 base64 或 url
    this._img = null
    this._imgLoaded = false
    if (src) this._loadImg()
  }

  _loadImg() {
    this._img = new window.Image()
    this._img.onload = () => {
      this._imgLoaded = true
    }
    this._img.src = this.src
  }

  selectorRender(ctx, viewport) {
    // 高亮外框+锚点
    const { x, y } = viewport.canvasToScreen(this.x, this.y)
    const w = this.width * viewport.scale,
      h = this.height * viewport.scale
    ctx.save()
    ctx.strokeStyle = '#0099ff'
    ctx.lineWidth = 2
    ctx.setLineDash([4, 2])
    ctx.strokeRect(x, y, w, h)
    ctx.setLineDash([])
    ctx.restore()
  }
}
