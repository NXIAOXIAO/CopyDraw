import { Constants } from '../common/Constants.js'
import { Viewport } from '../core/Viewport.js'

export class CanvasArea {
  /**
   *
   * @param {DOMElement} containerElement
   * @param {EventEmitter} eventEmitter
   * @param {Viewport} viewport
   */
  constructor(containerElement, eventEmitter, viewport) {
    this.containerElement = containerElement
    this.eventEmitter = eventEmitter
    // 获取父容器实际像素宽高
    const rect = containerElement.getBoundingClientRect()
    viewport.width = rect.width
    viewport.height = rect.height
    this._initCanvases()
    this.resizeCanvases(viewport.width, viewport.height)
  }

  _initCanvases() {
    // 创建背景 Canvas
    this.backgroundCanvas = document.createElement('canvas')
    this.backgroundCanvas.id = 'backgroundCanvas'
    this.backgroundCanvas.style.zIndex = '1'
    this.backgroundCanvas.style.position = 'absolute'
    this.backgroundCanvas.style.pointerEvents = 'none'
    this.backgroundCtx = this.backgroundCanvas.getContext('2d')
    this.containerElement.appendChild(this.backgroundCanvas)

    // 创建数据 Canvas (主要绘制内容)
    this.dataCanvas = document.createElement('canvas')
    this.dataCanvas.id = 'dataCanvas'
    this.dataCanvas.style.zIndex = '2'
    this.dataCanvas.style.position = 'absolute'
    this.dataCtx = this.dataCanvas.getContext('2d')
    this.containerElement.appendChild(this.dataCanvas)

    // 创建临时 Canvas (用于绘制过程中的临时线条、选择框等)
    this.temporaryCanvas = document.createElement('canvas')
    this.temporaryCanvas.id = 'temporaryCanvas'
    this.temporaryCanvas.style.zIndex = '3' // 确保在最顶层
    this.temporaryCanvas.style.position = 'absolute'
    this.temporaryCanvas.style.pointerEvents = 'none' // 确保是dataCanvas接收鼠标事件
    this.temporaryCtx = this.temporaryCanvas.getContext('2d')
    this.containerElement.appendChild(this.temporaryCanvas)

    // 设置所有 Canvas 的背景为透明，以便层级叠加可见
    this.backgroundCanvas.style.backgroundColor = 'transparent'
    this.dataCanvas.style.backgroundColor = 'transparent'
    this.temporaryCanvas.style.backgroundColor = 'transparent'
  }

  /**
   * 调整所有 Canvas 元素的尺寸。
   * @param {number} width - 新的宽度。
   * @param {number} height - 新的高度。
   */
  resizeCanvases(width, height) {
    // 设置 Canvas 元素的 DOM 尺寸
    this.backgroundCanvas.style.width = `${width}px`
    this.backgroundCanvas.style.height = `${height}px`
    this.dataCanvas.style.width = `${width}px`
    this.dataCanvas.style.height = `${height}px`
    this.temporaryCanvas.style.width = `${width}px`
    this.temporaryCanvas.style.height = `${height}px`

    // 设置 Canvas 绘图表面的分辨率
    // 这对于 Retina 屏幕非常重要，否则会模糊
    // 虽然还不知道为什么，但是加上先
    const dpr = window.devicePixelRatio || 1
    this.backgroundCanvas.width = width * dpr
    this.backgroundCanvas.height = height * dpr
    this.dataCanvas.width = width * dpr
    this.dataCanvas.height = height * dpr
    this.temporaryCanvas.width = width * dpr
    this.temporaryCanvas.height = height * dpr

    // 缩放所有 Context，以匹配高 DPI
    this.backgroundCtx.scale(dpr, dpr)
    this.dataCtx.scale(dpr, dpr)
    this.temporaryCtx.scale(dpr, dpr)

    console.log(`Canvases resized to ${width}x${height} (DPR: ${dpr})`)
  }

  /**
   * 获取数据层 Canvas 元素。
   * 用于事件监听器（如鼠标事件）。
   * @returns {HTMLCanvasElement | null}
   */
  getDataCanvas() {
    return this.dataCanvas
  }
}
