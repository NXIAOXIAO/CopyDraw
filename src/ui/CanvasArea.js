/**
 * CanvasArea
 * 负责 canvas 渲染与事件分发
 */
export class CanvasArea {
  constructor(canvasContainer, eventEmitter) {
    this.canvasContainer = canvasContainer
    this.backgroundCanvas = canvasContainer.querySelector('#backgroundCanvas')
    this.dataCanvas = canvasContainer.querySelector('#dataCanvas')
    this.temporaryCanvas = canvasContainer.querySelector('#temporaryCanvas')
    this.selectCanvas = canvasContainer.querySelector('#selectCanvas')

    // 检查canvas元素是否存在
    if (!this.backgroundCanvas || !this.dataCanvas || !this.temporaryCanvas || !this.selectCanvas) {
      console.error('[CanvasArea] 某些canvas元素未找到:', {
        backgroundCanvas: !!this.backgroundCanvas,
        dataCanvas: !!this.dataCanvas,
        temporaryCanvas: !!this.temporaryCanvas,
        selectCanvas: !!this.selectCanvas
      })
    }

    // 初始化各层context
    this.backgroundCtx = this.backgroundCanvas?.getContext('2d')
    this.dataCtx = this.dataCanvas?.getContext('2d')
    this.temporaryCtx = this.temporaryCanvas?.getContext('2d')
    this.selectCtx = this.selectCanvas?.getContext('2d', { willReadFrequently: true })
    this.eventEmitter = eventEmitter
    console.log(
      '[CanvasArea] 初始化完成',
      canvasContainer.clientWidth,
      canvasContainer.clientHeight
    )
    this.resizeCanvases(canvasContainer.clientWidth, canvasContainer.clientHeight)
  }

  /**
   * 调整所有 Canvas 元素的尺寸。
   * @param {number} width - 新的宽度。
   * @param {number} height - 新的高度。
   */
  resizeCanvases(width, height) {
    if (!width || !height) {
      console.warn('[CanvasArea] 无效的尺寸:', width, height)
      return
    }

    this.backgroundCanvas.style.width = `${width}px`
    this.backgroundCanvas.style.height = `${height}px`
    this.dataCanvas.style.width = `${width}px`
    this.dataCanvas.style.height = `${height}px`
    this.temporaryCanvas.style.width = `${width}px`
    this.temporaryCanvas.style.height = `${height}px`
    this.selectCanvas.style.width = `${width}px`
    this.selectCanvas.style.height = `${height}px`

    const dpr = window.devicePixelRatio || 1
    this.backgroundCanvas.width = width * dpr
    this.backgroundCanvas.height = height * dpr
    this.dataCanvas.width = width * dpr
    this.dataCanvas.height = height * dpr
    this.temporaryCanvas.width = width * dpr
    this.temporaryCanvas.height = height * dpr
    this.selectCanvas.width = width * dpr
    this.selectCanvas.height = height * dpr

    // 重新获取context，确保selectCtx设置willReadFrequently属性
    this.backgroundCtx = this.backgroundCanvas.getContext('2d')
    this.dataCtx = this.dataCanvas.getContext('2d')
    this.temporaryCtx = this.temporaryCanvas.getContext('2d')
    this.selectCtx = this.selectCanvas.getContext('2d', { willReadFrequently: true })

    this.backgroundCtx.setTransform(1, 0, 0, 1, 0, 0)
    this.dataCtx.setTransform(1, 0, 0, 1, 0, 0)
    this.temporaryCtx.setTransform(1, 0, 0, 1, 0, 0)
    this.selectCtx.setTransform(1, 0, 0, 1, 0, 0)
    this.backgroundCtx.scale(dpr, dpr)
    this.dataCtx.scale(dpr, dpr)
    this.temporaryCtx.scale(dpr, dpr)
    this.selectCtx.scale(dpr, dpr)

    this.eventEmitter.emit('canvasSizeChange', { width, height })
  }
}
