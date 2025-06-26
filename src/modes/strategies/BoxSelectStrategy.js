// BoxSelectStrategy：框选操作策略
// 只负责框选相关交互和状态
import { isElementInRect } from '../../utils/viewEditHelpers.js'

export class BoxSelectStrategy {
  constructor({ mode, state, eventEmitter, viewport, dataManager }) {
    this.mode = mode
    this.state = state // 依赖SelectionState等
    this.eventEmitter = eventEmitter
    this.viewport = viewport
    this.dataManager = dataManager
    this.active = false
    this.dragBox = false
    this.boxStart = null
    this.boxEnd = null
    this._pendingUpdate = false
  }

  activate() {
    this.active = true
    this.dragBox = false
    this.boxStart = null
    this.boxEnd = null
    this._pendingUpdate = false
  }

  deactivate() {
    this.active = false
    this.dragBox = false
    this.boxStart = null
    this.boxEnd = null
    this._pendingUpdate = false
  }

  handleEvent(e) {
    switch (e.type) {
      case 'mousedown':
        this._onMouseDown(e)
        break
      case 'mousemove':
        this._onMouseMove(e)
        break
      case 'mouseup':
        this._onMouseUp(e)
        break
      default:
        break
    }
  }

  _onMouseDown(e) {
    if (e.button !== 2) return
    this.dragBox = true
    this.boxStart = { x: e.offsetX, y: e.offsetY }
    this.boxEnd = { x: e.offsetX, y: e.offsetY }
    this._updateTemporary()
  }

  _onMouseMove(e) {
    if (!this.dragBox) return

    this.boxEnd = { x: e.offsetX, y: e.offsetY }
    if (this._pendingUpdate) return

    this._pendingUpdate = true
    requestAnimationFrame(() => {
      this._pendingUpdate = false
      if (!this.dragBox) return
      this._updateTemporary()
    })
  }

  _onMouseUp(e) {
    if (e.button !== 2) return
    if (this.dragBox) {
      this.dragBox = false
      const x = Math.min(this.boxStart.x, this.boxEnd.x)
      const y = Math.min(this.boxStart.y, this.boxEnd.y)
      const w = Math.abs(this.boxEnd.x - this.boxStart.x)
      const h = Math.abs(this.boxEnd.y - this.boxStart.y)
      const rect = { x, y, w, h }
      const allElements = this.dataManager.getAllElements()
      this.state.selection.selectedElements = allElements.filter((el) =>
        isElementInRect(el, rect, this.viewport)
      )
      allElements.forEach((el) => {
        el.selected = this.state.selection.selectedElements.includes(el)
      })
      this.state.selection.selectedElement = null
      this.state.selection.selectedPointIdx = -1
      this._updateTemporary()
      this.eventEmitter.emit('renderElements', allElements)
      if (
        !this.state.selection.selectedElements ||
        this.state.selection.selectedElements.length === 0
      ) {
        this.mode.strategies.drag._resetState && this.mode.strategies.drag._resetState()
      }
    }
  }

  _updateTemporary() {
    this.eventEmitter.emit('setTemporary', {
      selectedElements: this.state.selection.selectedElements,
      selectedElement: this.state.selection.selectedElement,
      selectedPointIdx: this.state.selection.selectedPointIdx,
      selectBox: this.dragBox ? { start: this.boxStart, end: this.boxEnd } : null
    })
  }
}
