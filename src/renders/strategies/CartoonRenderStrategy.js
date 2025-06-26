// CartoonRenderStrategy：卡通风格渲染策略
// 用途：实现卡通风格的线条渲染，每段使用不同颜色
import { IRenderStrategy } from './IRenderStrategy.js'

export class CartoonRenderStrategy extends IRenderStrategy {
  getName() {
    return '卡通风格'
  }

  getDescription() {
    return '卡通风格的线条渲染，每段使用不同颜色'
  }

  render(canvasArea, dataManager, viewport) {
    try {
      const ctx = canvasArea.dataCanvas.getContext('2d')
      ctx.clearRect(0, 0, canvasArea.dataCanvas.width, canvasArea.dataCanvas.height)

      // 白色背景
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, canvasArea.dataCanvas.width, canvasArea.dataCanvas.height)

      ctx.save()
      ctx.globalAlpha = 1.0

      // 预设几种卡通风格颜色
      const cartoonColors = [
        '#111', // 黑色
        '#e74c3c', // 红色
        '#3498db', // 蓝色
        '#27ae60', // 绿色
        '#f1c40f', // 黄色
        '#9b59b6', // 紫色
        '#e67e22', // 橙色
        '#1abc9c' // 青色
      ]

      let colorIndex = 0

      const elements = dataManager.getAllElements()
      const lineElements = elements.filter(
        (el) => el.type === 'LineElement' || el.type === 'PathElement'
      )

      for (const line of lineElements) {
        if (!line.geometies || line.geometies.length < 2) continue

        // 每一段（两个点之间）使用不同颜色
        for (let i = 1; i < line.geometies.length; i++) {
          const prev = line.geometies[i - 1]
          const curr = line.geometies[i]
          const { x: x1, y: y1 } = viewport.toCanvas(prev.x, prev.y)
          const { x: x2, y: y2 } = viewport.toCanvas(curr.x, curr.y)

          const jitter = 0.3
          const dx1 = x1 + (Math.random() - 0.5) * jitter
          const dy1 = y1 + (Math.random() - 0.5) * jitter
          const dx2 = x2 + (Math.random() - 0.5) * jitter
          const dy2 = y2 + (Math.random() - 0.5) * jitter

          ctx.beginPath()
          ctx.strokeStyle = cartoonColors[colorIndex % cartoonColors.length]
          colorIndex++
          ctx.lineWidth = 3
          ctx.lineJoin = 'round'
          ctx.lineCap = 'round'
          ctx.moveTo(dx1, dy1)
          ctx.lineTo(dx2, dy2)
          ctx.stroke()
        }
      }
      ctx.restore()

      console.log('[CartoonRenderStrategy] 卡通风格渲染完成')
    } catch (e) {
      console.error('[CartoonRenderStrategy] 渲染异常:', e)
      throw e
    }
  }
}
