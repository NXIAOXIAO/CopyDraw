import { viewport } from '../core/viewport.js'
import logger from './logger.js'
import { worldToCanvas } from './utils.js'

class Line {
  constructor(id) {
    this.id = 'line' + Date.now()
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
    let hasVisible = false
    for (let i = 0; i < this.geometies.length - 1; i++) {
      const ps = worldToCanvas(this.geometies[i].x, this.geometies[i].y)
      const pe = worldToCanvas(this.geometies[i + 1].x, this.geometies[i + 1].y)
      if (isDraw(ps.x, ps.y, pe.x, pe.y, ctx)) {
        ctx.moveTo(ps.x, ps.y)
        ctx.lineTo(pe.x, pe.y)
        hasVisible = true
      }
    }
    if (hasVisible) {
      ctx.stroke()
    }
  }
}

function isDraw(x1, y1, x2, y2, ctx) {
  // 通过ctx获取canvas引用
  const { width, height } = ctx.canvas
  return (
    (x1 >= 0 && x1 <= width && y1 >= 0 && y1 <= height) ||
    (x2 >= 0 && x2 <= width && y2 >= 0 && y2 <= height)
  )
}

export default Line
