// 生长动画渲染器（每次只渲染部分线段，简单动画演示）
export class GrowthRenderer {
  constructor() {
    this.progress = 0 // 0~1
    this.animating = false
  }
  render(canvasArea, dataManager, viewport) {
    const ctx = canvasArea.dataCtx
    ctx.clearRect(0, 0, canvasArea.dataCanvas.width, canvasArea.dataCanvas.height)
    ctx.save()
    ctx.strokeStyle = '#2ecc40'
    ctx.lineWidth = 3
    let total = 0
    for (const line of dataManager.lines) total += line.geometies.length - 1
    let drawCount = Math.floor(total * this.progress)
    for (const line of dataManager.lines) {
      ctx.beginPath()
      for (let i = 0; i < line.geometies.length - 1 && drawCount > 0; i++, drawCount--) {
        const ps = viewport.worldToViewport(line.geometies[i].x, line.geometies[i].y)
        const pe = viewport.worldToViewport(line.geometies[i + 1].x, line.geometies[i + 1].y)
        ctx.moveTo(ps.x, ps.y)
        ctx.lineTo(pe.x, pe.y)
      }
      ctx.stroke()
    }
    ctx.restore()
    if (this.animating && this.progress < 1) {
      this.progress += 0.02
      requestAnimationFrame(() => this.render(canvasArea, dataManager, viewport))
    }
  }
  startAnimation(canvasArea, dataManager, viewport) {
    this.progress = 0
    this.animating = true
    this.render(canvasArea, dataManager, viewport)
  }
  stopAnimation() {
    this.animating = false
    this.progress = 1
  }
}
