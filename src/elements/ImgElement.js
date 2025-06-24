import { Element } from './Element.js'

/**
 * 图片元素类
 * @extends Element
 *
 * imgdata: ImageBitmap 或 HTMLImageElement 实例 或 {width, height, src} 描述对象
 * x/y: 世界坐标
 * oA: 初始角度
 */
export class ImgElement extends Element {
  /**
   * @param {ImageBitmap|HTMLImageElement|Object} imgdata - 图片对象或图片描述数据
   * @param {number} [x=0] - x 坐标
   * @param {number} [y=0] - y 坐标
   * @param {number} [oA=0] - 初始角度
   */
  constructor(imgdata, x = 0, y = 0, oA = 0) {
    super('img')
    // 支持直接存储图片对象，或从对象/数据还原
    if (
      imgdata instanceof HTMLImageElement ||
      (typeof ImageBitmap !== 'undefined' && imgdata instanceof ImageBitmap)
    ) {
      this.img = imgdata
      this.imgdata = {
        width: imgdata.width,
        height: imgdata.height,
        src: imgdata.src || imgdata._src || ''
      }
    } else if (typeof imgdata === 'object' && imgdata.src) {
      // 存在 src，尝试同步构建 HTMLImageElement
      this.imgdata = imgdata
      this.img = null
      // 自动延迟加载，避免多次重复加载
      this._ensureImg()
    } else {
      this.imgdata = { width: 0, height: 0, src: '' }
      this.img = null
    }
    this.x = x
    this.y = y
    this.oA = oA
  }

  /**
   * 从imgdata.src自动加载图片对象
   */
  _ensureImg() {
    if (this.img || !this.imgdata?.src) return
    const img = new window.Image()
    // 保证 img.width/height 正确
    img.onload = () => {
      this.imgdata.width = img.width
      this.imgdata.height = img.height
    }
    img.src = this.imgdata.src
    this.img = img
  }

  /**
   * 选择器渲染（供 Selector 使用）
   * @param {CanvasRenderingContext2D} ctx
   * @param {Viewport} viewport
   */
  selectorRender(ctx, viewport) {
    // 保证图片对象已加载
    this._ensureImg()
    const canvasPos = viewport.worldToViewport(this.x, this.y)
    const width = this.imgdata?.width || (this.img?.width ?? 32)
    const height = this.imgdata?.height || (this.img?.height ?? 32)
    const [newW, newH] = [width / viewport.scale, height / viewport.scale]
    ctx.save()
    ctx.translate(canvasPos.x, canvasPos.y)
    ctx.rotate(-(viewport.rotate - this.oA))
    ctx.strokeStyle = '#0099ff'
    ctx.lineWidth = 2
    ctx.setLineDash([4, 2])
    ctx.strokeRect(-newW / 2, -newH / 2, newW, newH)
    ctx.setLineDash([])
    ctx.restore()
  }

  /**
   * 主渲染（在 Render/Canvas 绘制时调用）
   * @param {CanvasRenderingContext2D} ctx
   * @param {Viewport} viewport
   */
  render(ctx, viewport) {
    this._ensureImg()
    if (!this.img || !this.img.complete) return
    const canvasPos = viewport.worldToViewport(this.x, this.y)
    const width = this.imgdata?.width || this.img.width
    const height = this.imgdata?.height || this.img.height
    const [newW, newH] = [width / viewport.scale, height / viewport.scale]
    ctx.save()
    ctx.translate(canvasPos.x, canvasPos.y)
    ctx.rotate(-(viewport.rotate - this.oA))
    ctx.drawImage(this.img, -newW / 2, -newH / 2, newW, newH)
    ctx.restore()
  }
}
