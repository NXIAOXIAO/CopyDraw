import { worldToCanvas } from './utils.js'
import { viewport } from '../core/viewport.js'
class Img {
  constructor(imgdata, x, y, oA = 0) {
    this.id = 'img' + Date.now()
    this.imgdata = imgdata
    this.x = x
    this.y = y
    this.oA = oA //增加初始角度
  }
  //约定的渲染方式
  async render(ctx) {
    // 计算中心点
    const canvasPos = worldToCanvas(this.x, this.y)
    // 计算缩放后的宽高
    const [newW, newH] = [
      this.imgdata.width / viewport.scale,
      this.imgdata.height / viewport.scale
    ]
    ctx.save()
    ctx.translate(canvasPos.x, canvasPos.y)
    ctx.rotate(-(viewport.rotate - this.oA))
    ctx.drawImage(this.imgdata, -newW / 2, -newH / 2, newW, newH)
    ctx.restore()
  }
}

export default Img
