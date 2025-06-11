import { viewport } from '../core/viewport.js'
import logger from './logger.js'
import { worldToCanvas } from './utils.js'

class Line {
  constructor(id) {
    this.id = Date.now()
    this.geometies = []
  }
  //添加点
  addPoint(x, y) {
    this.geometies.push({ x: x, y: y })
  }

  //删除点
  removePoint(x, y) {
    this.geometies.filter((p) => {
      p.x != x || p.y != y
    })
  }

  //渲染方法，这里约定不能携带样式
  render(ctx) {
    if (this.geometies.length < 2) return
    ctx.beginPath()
    const start = worldToCanvas(this.geometies[0].x, this.geometies[0].y)
    logger.debug(viewport, start)
    ctx.moveTo(start.x, start.y)
    for (let i = 1; i < this.geometies.length; i++) {
      const pt = worldToCanvas(this.geometies[i].x, this.geometies[i].y)
      ctx.lineTo(pt.x, pt.y)
    }
    ctx.stroke()
  }
}

export default Line
