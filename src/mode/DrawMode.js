import { BaseMode } from './BaseMode.js'
import { RectElement } from '../elements/RectElement.js'
import { generateId } from '../utils/id.js'

/**
 * DrawMode
 * 绘制模式：监听画布鼠标事件，生成元素并通过 CommandInvoker 添加
 */
export class DrawMode extends BaseMode {
  constructor() {
    super()
    this.name = 'draw'
  }

  activate() {
    // 注册画布事件
    const canvas = document.getElementById('dataCanvas')
    this._drawState = null
    this.bindEvent(canvas, 'mousedown', this._onMouseDown.bind(this))
    this.bindEvent(canvas, 'mousemove', this._onMouseMove.bind(this))
    this.bindEvent(canvas, 'mouseup', this._onMouseUp.bind(this))
  }

  _onMouseDown(e) {
    const { viewport } = this.context
    const pos = viewport.screenToCanvas(e.offsetX, e.offsetY)
    this._drawState = { x0: pos.x, y0: pos.y, x1: pos.x, y1: pos.y }
  }

  _onMouseMove(e) {
    if (!this._drawState) return
    const { viewport } = this.context
    const pos = viewport.screenToCanvas(e.offsetX, e.offsetY)
    this._drawState.x1 = pos.x
    this._drawState.y1 = pos.y
    // 可以做临时渲染，emit 给 UI
    this.context.appManager.notifyUI('tempDraw', { ...this._drawState })
  }

  _onMouseUp(e) {
    if (!this._drawState) return
    const { x0, y0, x1, y1 } = this._drawState
    const x = Math.min(x0, x1),
      y = Math.min(y0, y1)
    const width = Math.abs(x1 - x0),
      height = Math.abs(y1 - y0)
    if (width < 4 || height < 4) {
      this._drawState = null
      return // 忽略太小的
    }
    const rect = new RectElement({
      id: generateId('rect'),
      x,
      y,
      width,
      height,
      style: { stroke: '#f78d23', fill: '' }
    })
    this.context.commandInvoker.executeAdd(rect)
    this._drawState = null
    this.context.appManager.notifyUI('tempDrawEnd')
  }

  handleUIEvent(eventType, payload) {
    // 可扩展（如响应UI按钮、快捷键等）
  }
}
