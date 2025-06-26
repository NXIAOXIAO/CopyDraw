// ThickPaintRenderStrategy：厚涂风格渲染策略
// 用途：实现厚涂风格的线条渲染，线条粗大，边缘略有抖动
import { IRenderStrategy } from './IRenderStrategy.js'

export class ThickPaintRenderStrategy extends IRenderStrategy {
  getName() {
    return '厚涂风格'
  }

  getDescription() {
    return '厚涂风格的线条渲染，线条粗大，带有高光效果'
  }

  render(canvasArea, dataManager, viewport) {
    try {
      const ctx = canvasArea.dataCanvas.getContext('2d')
      ctx.clearRect(0, 0, canvasArea.dataCanvas.width, canvasArea.dataCanvas.height)

      // 浅灰色背景
      ctx.fillStyle = '#f5f5f5'
      ctx.fillRect(0, 0, canvasArea.dataCanvas.width, canvasArea.dataCanvas.height)

      ctx.save()
      ctx.globalAlpha = 0.9

      const elements = dataManager.getAllElements()
      const lineElements = elements.filter(
        (el) => el.type === 'LineElement' || el.type === 'PathElement'
      )

      for (const line of lineElements) {
        if (!line.geometies || line.geometies.length < 2) continue

        ctx.beginPath()
        ctx.strokeStyle = '#222'
        ctx.lineWidth = 6
        ctx.lineCap = 'round'

        for (let i = 0; i < line.geometies.length; i++) {
          const { x, y } = line.geometies[i]
          const { x: cx, y: cy } = viewport.toCanvas(x, y)

          // 减少抖动幅度，提高精细度
          const jitter = 0.8
          const dx = cx + (Math.random() - 0.5) * jitter
          const dy = cy + (Math.random() - 0.5) * jitter

          if (i === 0) {
            ctx.moveTo(dx, dy)
          } else {
            ctx.lineTo(dx, dy)
          }
        }
        ctx.stroke()

        // 叠加高光
        ctx.save()
        ctx.globalAlpha = 0.25
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2
        ctx.stroke()
        ctx.restore()
      }
      ctx.restore()

      console.log('[ThickPaintRenderStrategy] 厚涂风格渲染完成')
    } catch (e) {
      console.error('[ThickPaintRenderStrategy] 渲染异常:', e)
      throw e
    }
  }
}
