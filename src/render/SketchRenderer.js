// 素描风格渲染器
export class SketchRenderer {
  render(canvasArea, dataManager, viewport) {
    const ctx = canvasArea.dataCtx

    ctx.clearRect(0, 0, viewport.width, viewport.height)
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, viewport.width, viewport.height)
    ctx.save()
    ctx.strokeStyle = '#222'
    ctx.lineWidth = 1
    ctx.globalAlpha = 0.7
    for (const line of dataManager.lines) {
      if (!line.geometies || line.geometies.length < 2) continue
      // 素描风格：每条线重复画多次，带微小扰动
      for (let repeat = 0; repeat < 5; repeat++) {
        ctx.beginPath()
        for (let i = 0; i < line.geometies.length - 1; i++) {
          const p1 = line.geometies[i]
          const p2 = line.geometies[i + 1]
          const { x: cx1, y: cy1 } = viewport.worldToViewport(p1.x, p1.y)
          const { x: cx2, y: cy2 } = viewport.worldToViewport(p2.x, p2.y)
          // 计算两点距离
          const dx = cx2 - cx1
          const dy = cy2 - cy1
          const dist = Math.sqrt(dx * dx + dy * dy)
          // 插值点数
          const steps = Math.max(1, Math.ceil(dist / 5))
          for (let s = 0; s < steps; s++) {
            const t1 = s / steps
            const t2 = (s + 1) / steps
            // 插值点
            const ix1 = cx1 + dx * t1 + (Math.random() - 0.5) * 2.5
            const iy1 = cy1 + dy * t1 + (Math.random() - 0.5) * 2.5
            const ix2 = cx1 + dx * t2 + (Math.random() - 0.5) * 2.5
            const iy2 = cy1 + dy * t2 + (Math.random() - 0.5) * 2.5
            if (i === 0 && s === 0) {
              ctx.moveTo(ix1, iy1)
            }
            ctx.lineTo(ix2, iy2)
          }
        }
        ctx.stroke()
      }
    }
    ctx.restore()
  }
}
