// OilPaintRenderStrategy：油画风格渲染策略
// 用途：实现油画风格的线条渲染，带有笔触质感和色彩变化
import { IRenderStrategy } from './IRenderStrategy.js'

export class OilPaintRenderStrategy extends IRenderStrategy {
  getName() {
    return '油画风格'
  }

  getDescription() {
    return '油画风格的线条渲染，带有笔触质感和色彩变化'
  }

  render(canvasArea, dataManager, viewport) {
    try {
      const ctx = canvasArea.dataCanvas.getContext('2d')
      ctx.clearRect(0, 0, canvasArea.dataCanvas.width, canvasArea.dataCanvas.height)

      // 米色背景
      ctx.fillStyle = '#f8f4e6'
      ctx.fillRect(0, 0, canvasArea.dataCanvas.width, canvasArea.dataCanvas.height)

      ctx.save()
      ctx.globalAlpha = 0.85

      const elements = dataManager.getAllElements()
      const lineElements = elements.filter(
        (el) => el.type === 'LineElement' || el.type === 'PathElement'
      )

      for (const line of lineElements) {
        if (!line.geometies || line.geometies.length < 2) continue

        // 减少重复绘制次数，提高精细度
        for (let repeat = 0; repeat < 2; repeat++) {
          ctx.beginPath()
          ctx.strokeStyle = `rgba(60,40,20,${0.6 + Math.random() * 0.3})`
          ctx.lineWidth = 2 + Math.random() * 1.5

          for (let i = 0; i < line.geometies.length; i++) {
            const { x, y } = line.geometies[i]
            const { x: cx, y: cy } = viewport.toCanvas(x, y)

            // 减少抖动幅度，提高精细度
            const jitter = 1.5
            const dx = cx + (Math.random() - 0.5) * jitter
            const dy = cy + (Math.random() - 0.5) * jitter

            if (i === 0) {
              ctx.moveTo(dx, dy)
            } else {
              ctx.lineTo(dx, dy)
            }
          }

          ctx.shadowColor = '#bfa76f'
          ctx.shadowBlur = 2
          ctx.stroke()
          ctx.shadowBlur = 0
        }
      }
      ctx.restore()

      console.log('[OilPaintRenderStrategy] 油画风格渲染完成')
    } catch (e) {
      console.error('[OilPaintRenderStrategy] 渲染异常:', e)
      throw e
    }
  }
}
