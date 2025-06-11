import { worldToCanvas } from './utils.js'
import { viewport } from '../core/viewport.js'
class Img {
  constructor(imgdata, x, y) {
    this.id = 'img' + Date.now()
    this.imgdata = imgdata
    this.x = x
    this.y = y
  }
  //约定的渲染方式
  async render(ctx) {
    const canvasPos = worldToCanvas(this.x, this.y) //从世界坐标转为屏幕坐标
    const [newW, newH] = [
      this.imgdata.width / viewport.scale,
      this.imgdata.height / viewport.scale
    ]
    ctx.save()
    ctx.translate(canvasPos.x, canvasPos.y)
    ctx.rotate(-viewport.rotate)

    ctx.drawImage(this.imgdata, 0 - newW / 2, 0 - newH / 2, newW, newH)
    ctx.restore()
  }
}

export default Img
