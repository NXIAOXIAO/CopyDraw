// 油画风格渲染器（示例，粗线+半透明）
export class OilPaintRenderer {
  render(canvasArea, dataManager, viewport) {
    const ctx = canvasArea.dataCtx
    ctx.clearRect(0, 0, canvasArea.dataCanvas.width, canvasArea.dataCanvas.height)
    ctx.save()
    ctx.strokeStyle = '#b97a56'
    ctx.lineWidth = 6
    ctx.globalAlpha = 0.5
    ctx.lineCap = 'round'
    for (const line of dataManager.lines) {
      ctx.beginPath()
      for (let i = 0; i < line.geometies.length - 1; i++) {
        const ps = viewport.worldToViewport(line.geometies[i].x, line.geometies[i].y)
        const pe = viewport.worldToViewport(line.geometies[i + 1].x, line.geometies[i + 1].y)
        ctx.moveTo(ps.x, ps.y)
        ctx.lineTo(pe.x, pe.y)
      }
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    ctx.restore()
  }
}
