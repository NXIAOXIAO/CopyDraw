// TransparentRenderStrategy：透明背景渲染策略
// 用途：用于导出透明背景图片，只渲染线条
import { IRenderStrategy } from './IRenderStrategy.js'

export class TransparentRenderStrategy extends IRenderStrategy {
  getName() {
    return '透明背景'
  }

  getDescription() {
    return '透明背景渲染，只显示线条，用于导出'
  }

  render(canvasArea, dataManager, viewport) {
    try {
      const ctx = canvasArea.dataCanvas.getContext('2d')
      ctx.clearRect(0, 0, canvasArea.dataCanvas.width, canvasArea.dataCanvas.height)

      // 不填充背景，保持透明

      ctx.save()
      ctx.globalAlpha = 1.0
      ctx.strokeStyle = '#FFFFFF'
      ctx.lineWidth = 2

      const elements = dataManager.getAllElements()
      const lineElements = elements.filter(
        (el) => el.type === 'LineElement' || el.type === 'PathElement'
      )

      for (const line of lineElements) {
        if (!line.geometies || line.geometies.length < 2) continue

        for (let i = 0; i < line.geometies.length - 1; i++) {
          const ps = viewport.toCanvas(line.geometies[i].x, line.geometies[i].y)
          const pe = viewport.toCanvas(line.geometies[i + 1].x, line.geometies[i + 1].y)

          // 检查线段是否在视口内
          if (viewport.isInsideViewport(ps.x, ps.y) || viewport.isInsideViewport(pe.x, pe.y)) {
            ctx.beginPath()
            ctx.moveTo(ps.x, ps.y)
            ctx.lineTo(pe.x, pe.y)
            ctx.stroke()
          }
        }
      }
      ctx.restore()

      console.log('[TransparentRenderStrategy] 透明背景渲染完成')
    } catch (e) {
      console.error('[TransparentRenderStrategy] 渲染异常:', e)
      throw e
    }
  }
}
