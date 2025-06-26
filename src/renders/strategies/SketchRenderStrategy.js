// SketchRenderStrategy：素描风格渲染策略
// 用途：实现素描风格的线条渲染，每条线重复画多次，带微小扰动
import { IRenderStrategy } from './IRenderStrategy.js'

export class SketchRenderStrategy extends IRenderStrategy {
  getName() {
    return '素描风格'
  }

  getDescription() {
    return '素描风格的线条渲染，带有手绘质感'
  }

  render(canvasArea, dataManager, viewport) {
    try {
      const ctx = canvasArea.dataCanvas.getContext('2d')
      ctx.clearRect(0, 0, canvasArea.dataCanvas.width, canvasArea.dataCanvas.height)

      // 白色背景
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, canvasArea.dataCanvas.width, canvasArea.dataCanvas.height)

      ctx.save()
      ctx.strokeStyle = '#222'
      ctx.lineWidth = 1
      ctx.globalAlpha = 0.7

      const elements = dataManager.getAllElements()
      const lineElements = elements.filter(
        (el) => el.type === 'LineElement' || el.type === 'PathElement'
      )

      for (const line of lineElements) {
        if (!line.geometies || line.geometies.length < 2) continue

        // 减少重复绘制次数，提高精细度
        for (let repeat = 0; repeat < 3; repeat++) {
          ctx.beginPath()
          for (let i = 0; i < line.geometies.length - 1; i++) {
            const p1 = line.geometies[i]
            const p2 = line.geometies[i + 1]
            const { x: cx1, y: cy1 } = viewport.toCanvas(p1.x, p1.y)
            const { x: cx2, y: cy2 } = viewport.toCanvas(p2.x, p2.y)

            // 计算两点距离
            const dx = cx2 - cx1
            const dy = cy2 - cy1
            const dist = Math.sqrt(dx * dx + dy * dy)

            // 减少插值点数，提高精细度
            const steps = Math.max(1, Math.ceil(dist / 8))
            for (let s = 0; s < steps; s++) {
              const t1 = s / steps
              const t2 = (s + 1) / steps

              // 减少扰动幅度
              const ix1 = cx1 + dx * t1 + (Math.random() - 0.5) * 1.5
              const iy1 = cy1 + dy * t1 + (Math.random() - 0.5) * 1.5
              const ix2 = cx1 + dx * t2 + (Math.random() - 0.5) * 1.5
              const iy2 = cy1 + dy * t2 + (Math.random() - 0.5) * 1.5

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

      console.log('[SketchRenderStrategy] 素描风格渲染完成')
    } catch (e) {
      console.error('[SketchRenderStrategy] 渲染异常:', e)
      throw e
    }
  }
}
