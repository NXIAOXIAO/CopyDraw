/**
 * CanvasArea
 * 负责 canvas 渲染与事件分发
 */
export class CanvasArea {
  constructor(mainRoot) {
    this.mainRoot = mainRoot
    this.backgroundCanvas = mainRoot.querySelector('#backgroundCanvas')
    this.dataCanvas = mainRoot.querySelector('#dataCanvas')
    this.temporaryCanvas = mainRoot.querySelector('#temporaryCanvas')
    this.selectCanvas = mainRoot.querySelector('#selectCanvas')
    // 初始化各层context
    this.backgroundCtx = this.backgroundCanvas.getContext('2d')
    this.dataCtx = this.dataCanvas.getContext('2d')
    this.temporaryCtx = this.temporaryCanvas.getContext('2d')
    this.eventBus = null // 可由外部注入
  }

  bindEventEmit(emit) {
    // 这里只处理 pointer 事件，实际业务交给 mode
    ;['mousedown', 'mousemove', 'mouseup', 'mouseleave'].forEach((type) => {
      this.dataCanvas.addEventListener(type, (e) => {
        emit(type, { x: e.offsetX, y: e.offsetY, raw: e })
      })
    })
  }

  render(dataManager, viewport, renderInstance) {
    if (!renderInstance || typeof renderInstance.renderElements !== 'function') {
      console.warn('[CanvasArea] renderInstance 未定义或无 renderElements 方法')
      return
    }
    renderInstance.renderElements(dataManager, viewport)
  }

  renderTemp(drawState) {
    const ctx = this.temporaryCanvas.getContext('2d')
    ctx.clearRect(0, 0, this.temporaryCanvas.width, this.temporaryCanvas.height)
    if (!drawState) return
    ctx.save()
    ctx.strokeStyle = '#f78d23'
    ctx.lineWidth = 2
    ctx.setLineDash([4, 2])
    const x = Math.min(drawState.x0, drawState.x1)
    const y = Math.min(drawState.y0, drawState.y1)
    const w = Math.abs(drawState.x1 - drawState.x0)
    const h = Math.abs(drawState.y1 - drawState.y0)
    ctx.strokeRect(x, y, w, h)
    ctx.restore()
  }

  /**
   * 注入事件总线（AppManager 或 EventEmitter 实例）
   */
  setEventBus(eventBus) {
    this.eventBus = eventBus
  }

  /**
   * 调整所有 Canvas 元素的尺寸。
   * @param {number} width - 新的宽度。
   * @param {number} height - 新的高度。
   */
  resizeCanvases(width, height) {
    this.backgroundCanvas.style.width = `${width}px`
    this.backgroundCanvas.style.height = `${height}px`
    this.dataCanvas.style.width = `${width}px`
    this.dataCanvas.style.height = `${height}px`
    this.temporaryCanvas.style.width = `${width}px`
    this.temporaryCanvas.style.height = `${height}px`

    const dpr = window.devicePixelRatio || 1
    this.backgroundCanvas.width = width * dpr
    this.backgroundCanvas.height = height * dpr
    this.dataCanvas.width = width * dpr
    this.dataCanvas.height = height * dpr
    this.temporaryCanvas.width = width * dpr
    this.temporaryCanvas.height = height * dpr

    this.backgroundCtx.setTransform(1, 0, 0, 1, 0, 0)
    this.dataCtx.setTransform(1, 0, 0, 1, 0, 0)
    this.temporaryCtx.setTransform(1, 0, 0, 1, 0, 0)
    this.backgroundCtx.scale(dpr, dpr)
    this.dataCtx.scale(dpr, dpr)
    this.temporaryCtx.scale(dpr, dpr)

    console.log(`Canvases resized to ${width}x${height} (DPR: ${dpr})`)

    // 通过事件总线通知 AppManager 进行重绘
    if (this.eventBus && typeof this.eventBus.emit === 'function') {
      this.eventBus.emit('canvasresize', { width, height, dpr })
    }
  }
}
