// DefaultRenderStrategy：默认渲染策略
// 用途：基本的线条渲染，支持平滑、颜色、宽度等属性。
// 参数：viewport, dataManager
// 方法：
//   - constructor({viewport, dataManager})
//   - render(): 执行渲染
//   - _renderLine(ctx, line): 渲染线条
//   - _renderImage(ctx, img): 渲染图片
// 返回值：无
// 异常：接口内部有try-catch

import { IRenderStrategy } from './IRenderStrategy.js'

export class DefaultRenderStrategy extends IRenderStrategy {
  /**
   * @param {Object} options
   * @param {Viewport} options.viewport
   * @param {DataManager} options.dataManager
   * @param {Object} options.canvases
   */
  constructor({ viewport, dataManager, canvases }) {
    super()
    this.viewport = viewport
    this.dataManager = dataManager
    this.canvases = canvases
  }

  getName() {
    return '默认渲染'
  }

  getDescription() {
    return '基本的线条和图片渲染'
  }

  /**
   * 执行渲染
   */
  render(canvasArea, dataManager, viewport) {
    try {
      this._clearAll()
      const elements = dataManager.getAllElements()
      if (!elements || elements.length === 0) {
        console.warn('[DefaultRenderStrategy] 无数据可渲染')
        return
      }

      // 设置黑色背景
      const ctx = canvasArea.dataCanvas.getContext('2d')
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, canvasArea.dataCanvas.width, canvasArea.dataCanvas.height)

      // 只绘制线条元素到数据层
      const lineElements = elements.filter(
        (el) => el.type === 'LineElement' || el.type === 'PathElement'
      )
      for (const el of lineElements) {
        this._drawLineElement(el, canvasArea, viewport)
      }

      console.log('[DefaultRenderStrategy] 渲染完成')
    } catch (e) {
      console.error('[DefaultRenderStrategy] 渲染异常:', e)
      throw e
    }
  }

  /**
   * 清理所有画布
   */
  clearAll() {
    this._clearAll()
  }

  _clearAll() {
    try {
      if (this.canvases) {
        Object.values(this.canvases).forEach((canvas) => {
          if (canvas) {
            const ctx = canvas.getContext('2d')
            ctx.clearRect(0, 0, canvas.width, canvas.height)
          }
        })
      }
    } catch (e) {
      console.error('[DefaultRenderStrategy] 清理画布异常:', e)
    }
  }

  _drawImgElement(el, canvasArea, viewport) {
    if (!canvasArea.backgroundCanvas || !el.imgdata) {
      return
    }

    const ctx = canvasArea.backgroundCanvas.getContext('2d')
    ctx.save()
    try {
      const { x, y } = viewport.toCanvas(el.x, el.y)
      const [newW, newH] = [el.imgdata.width / viewport.scale, el.imgdata.height / viewport.scale]
      ctx.translate(x, y)
      ctx.rotate(-(viewport.rotate - el.oA))
      ctx.drawImage(el.imgdata, -newW / 2, -newH / 2, newW, newH)
    } catch (e) {
      console.error('[DefaultRenderStrategy] 绘制图片异常:', e)
    } finally {
      ctx.restore()
    }
  }

  _drawLineElement(el, canvasArea, viewport) {
    if (!canvasArea.dataCanvas || !el.geometies || el.geometies.length === 0) {
      return
    }

    const ctx = canvasArea.dataCanvas.getContext('2d')
    ctx.save()
    try {
      // 设置线条样式 - 白色线条
      ctx.strokeStyle = '#FFFFFF'
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      // 绘制路径
      ctx.beginPath()
      const canvasPoints = el.geometies.map((p) => viewport.toCanvas(p))
      ctx.moveTo(canvasPoints[0].x, canvasPoints[0].y)
      if (el.smooth) {
        for (let i = 1; i < canvasPoints.length - 2; i++) {
          const xc = (canvasPoints[i].x + canvasPoints[i + 1].x) / 2
          const yc = (canvasPoints[i].y + canvasPoints[i + 1].y) / 2
          ctx.quadraticCurveTo(canvasPoints[i].x, canvasPoints[i].y, xc, yc)
        }
        if (canvasPoints.length > 2) {
          const last = canvasPoints[canvasPoints.length - 1]
          const secondLast = canvasPoints[canvasPoints.length - 2]
          ctx.quadraticCurveTo(secondLast.x, secondLast.y, last.x, last.y)
        }
      } else {
        for (let i = 1; i < canvasPoints.length; i++) {
          ctx.lineTo(canvasPoints[i].x, canvasPoints[i].y)
        }
      }
      ctx.stroke()
    } catch (e) {
      console.error('[DefaultRenderStrategy] 绘制线条异常:', e)
    } finally {
      ctx.restore()
    }
  }

  /**
   * 销毁资源
   */
  dispose() {
    try {
      this._clearAll()
      this.viewport = null
      this.dataManager = null
      this.canvases = null
    } catch (e) {
      console.error('[DefaultRenderStrategy] 销毁资源异常:', e)
    }
  }
}
