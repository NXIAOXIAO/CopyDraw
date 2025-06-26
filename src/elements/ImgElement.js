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
    super('ImgElement')
    this.imgdata = imgdata
    this.x = x
    this.y = y
    this.oA = oA
  }

  /**
   * 选择器渲染方法
   * @param {CanvasRenderingContext2D} ctx
   * @param {Viewport} viewport
   */
  selectorRender(ctx, viewport) {
    if (!this.imgdata) return

    const canvasPos = viewport.toCanvas(this.x, this.y)
    const [newW, newH] = [this.imgdata.width / viewport.scale, this.imgdata.height / viewport.scale]
    // 计算旋转后的四个角坐标
    const angle = -(viewport.rotate - this.oA)
    ctx.save()
    ctx.translate(canvasPos.x, canvasPos.y)
    ctx.rotate(angle)
    ctx.fillRect(-newW / 2, -newH / 2, newW, newH)
    ctx.restore()
  }
}
