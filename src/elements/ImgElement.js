import { Element } from './Element.js'

/**
 * 图片元素类
 * @extends Element
 */
export class ImgElement extends Element {
  /**
   * @param {any} imgdata - 图片数据
   * @param {number} [x=0] - x 坐标
   * @param {number} [y=0] - y 坐标
   * @param {number} [oA=0] - 初始角度
   */
  constructor(imgdata, x = 0, y = 0, oA = 0) {
    super('img')
    this.imgdata = imgdata
    this.x = x
    this.y = y
    this.oA = oA
  }

  /**
   * 选择器渲染（供 Selector 使用）
   * @param {CanvasRenderingContext2D} ctx
   * @param {Viewport} viewport
   */
  selectorRender(ctx, viewport) {
    const canvasPos = viewport.worldToViewport(this.x, this.y)
    const [newW, newH] = [this.imgdata.width / viewport.scale, this.imgdata.height / viewport.scale]
    ctx.save()
    ctx.translate(canvasPos.x, canvasPos.y)
    ctx.rotate(-(viewport.rotate - this.oA))
    ctx.fillRect(-newW / 2, -newH / 2, newW, newH)
    ctx.restore()
  }
}
