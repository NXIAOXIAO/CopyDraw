// GrowthRenderStrategy：生长动画渲染策略
// 用途：实现缓慢生长动画效果
import { IRenderStrategy } from './IRenderStrategy.js'

export class GrowthRenderStrategy extends IRenderStrategy {
  constructor() {
    super()
    this.renderingTask = null
    this.isAnimating = false
  }

  getName() {
    return '生长动画'
  }

  getDescription() {
    return '缓慢生长动画效果'
  }

  render(canvasArea, dataManager, viewport) {
    try {
      // 取消前一个动画任务
      this.stopAnimation()

      const ctx = canvasArea.dataCanvas.getContext('2d')
      ctx.clearRect(0, 0, canvasArea.dataCanvas.width, canvasArea.dataCanvas.height)

      // 黑色背景
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, canvasArea.dataCanvas.width, canvasArea.dataCanvas.height)

      // 过滤出在viewport内的线段
      const segments = []
      const elements = dataManager.getAllElements()
      const lineElements = elements.filter(
        (el) => el.type === 'LineElement' || el.type === 'PathElement'
      )

      // 统计不同类型的元素数量，用于计算速度
      const lineElementCount = lineElements.filter((el) => el.type === 'LineElement').length
      const pathElementCount = lineElements.filter((el) => el.type === 'PathElement').length

      // 计算PathElement的目标生长时间（相当于2-3段LineElement的时间）
      const targetLineSegments = 2.5 // 目标：2.5段LineElement的时间
      const pathSpeedMultiplier =
        pathElementCount > 0 ? (lineElementCount * targetLineSegments) / pathElementCount : 1

      for (const line of lineElements) {
        if (!line.geometies || line.geometies.length < 2) continue

        if (line.type === 'PathElement') {
          // PathElement作为一整条line处理，不切分为segments
          const canvasPoints = line.geometies.map((p) => viewport.toCanvas(p.x, p.y))

          // 检查是否在视口内
          const isVisible = canvasPoints.some((point) =>
            viewport.isInsideViewport(point.x, point.y)
          )

          if (isVisible) {
            segments.push({
              type: 'PathElement',
              points: canvasPoints,
              speedMultiplier: pathSpeedMultiplier,
              isPath: true
            })
          }
        } else {
          // LineElement按原来的方式切分为segments
          for (let i = 0; i < line.geometies.length - 1; i++) {
            const ps = viewport.toCanvas(line.geometies[i].x, line.geometies[i].y)
            const pe = viewport.toCanvas(line.geometies[i + 1].x, line.geometies[i + 1].y)

            // 检查线段是否在视口内
            if (viewport.isInsideViewport(ps.x, ps.y) || viewport.isInsideViewport(pe.x, pe.y)) {
              segments.push({ s: ps, e: pe, speedMultiplier: 1, type: line.type, isPath: false })
            }
          }
        }
      }

      let progress = 0
      const totalSteps = 400 // 动画总帧数，从1200减少到800，加快整体速度
      let cancelled = false

      const cancel = () => {
        cancelled = true
        this.isAnimating = false
      }

      this.renderingTask = { cancel }
      this.isAnimating = true

      const animate = () => {
        if (cancelled) return

        ctx.clearRect(0, 0, canvasArea.dataCanvas.width, canvasArea.dataCanvas.height)
        ctx.fillStyle = '#000000'
        ctx.fillRect(0, 0, canvasArea.dataCanvas.width, canvasArea.dataCanvas.height)

        ctx.save()
        ctx.strokeStyle = '#FFFFFF'
        ctx.lineWidth = 2
        ctx.globalAlpha = 1.0

        // 计算当前应该完成的线段数量
        let completedSegments = 0
        let currentSegmentProgress = 0

        for (let i = 0; i < segments.length; i++) {
          const seg = segments[i]

          if (seg.isPath) {
            // PathElement作为整条line处理
            const segmentDuration = totalSteps / segments.length / seg.speedMultiplier
            const segmentStart = i * (totalSteps / segments.length)
            const segmentEnd = segmentStart + segmentDuration

            if (progress >= segmentEnd) {
              // PathElement已完成，绘制整条路径
              ctx.beginPath()
              ctx.moveTo(seg.points[0].x, seg.points[0].y)
              for (let j = 1; j < seg.points.length; j++) {
                ctx.lineTo(seg.points[j].x, seg.points[j].y)
              }
              ctx.stroke()
            } else if (progress >= segmentStart) {
              // PathElement正在生长
              const t = (progress - segmentStart) / segmentDuration
              const currentPointIndex = Math.floor(t * (seg.points.length - 1))

              ctx.beginPath()
              ctx.moveTo(seg.points[0].x, seg.points[0].y)

              // 绘制已完成的点
              for (let j = 1; j <= currentPointIndex; j++) {
                ctx.lineTo(seg.points[j].x, seg.points[j].y)
              }

              // 绘制当前正在生长的段
              if (currentPointIndex < seg.points.length - 1) {
                const segmentT = t * (seg.points.length - 1) - currentPointIndex
                const p1 = seg.points[currentPointIndex]
                const p2 = seg.points[currentPointIndex + 1]
                const currentX = p1.x + (p2.x - p1.x) * segmentT
                const currentY = p1.y + (p2.y - p1.y) * segmentT
                ctx.lineTo(currentX, currentY)
              }

              ctx.stroke()
              break
            }
          } else {
            // LineElement按原来的方式处理
            const segmentDuration = totalSteps / segments.length / seg.speedMultiplier
            const segmentStart = i * (totalSteps / segments.length)
            const segmentEnd = segmentStart + segmentDuration

            if (progress >= segmentEnd) {
              // 线段已完成
              completedSegments = i + 1
              ctx.beginPath()
              ctx.moveTo(seg.s.x, seg.s.y)
              ctx.lineTo(seg.e.x, seg.e.y)
              ctx.stroke()
            } else if (progress >= segmentStart) {
              // 线段正在生长
              const t = (progress - segmentStart) / segmentDuration
              const x = seg.s.x + (seg.e.x - seg.s.x) * t
              const y = seg.s.y + (seg.e.y - seg.s.y) * t
              ctx.beginPath()
              ctx.moveTo(seg.s.x, seg.s.y)
              ctx.lineTo(x, y)
              ctx.stroke()
              break
            }
          }
        }

        ctx.restore()
        progress++

        if (progress <= totalSteps && !cancelled) {
          requestAnimationFrame(animate)
        } else {
          this.isAnimating = false
        }
      }

      animate()

      console.log('[GrowthRenderStrategy] 生长动画开始')
    } catch (e) {
      console.error('[GrowthRenderStrategy] 渲染异常:', e)
      throw e
    }
  }

  stopAnimation() {
    if (this.renderingTask && this.renderingTask.cancel) {
      this.renderingTask.cancel()
    }
    this.isAnimating = false
  }

  isAnimating() {
    return this.isAnimating
  }
}
