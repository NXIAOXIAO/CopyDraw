// 黑色背景白色线条
export class DarkWhiteLineRenderer {
  render(canvasArea, dataManager, viewport) {
    const ctx = canvasArea.dataCtx
    ctx.clearRect(0, 0, canvasArea.dataCanvas.width, canvasArea.dataCanvas.height)
    // 填充黑色背景
    ctx.save()
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, canvasArea.dataCanvas.width, canvasArea.dataCanvas.height)
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2.5
    ctx.setLineDash([])
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
    ctx.restore()
  }
}
