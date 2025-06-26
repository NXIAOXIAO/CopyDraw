// DrawStrategy：绘制操作策略
import { LineElement } from '../../elements/LineElement.js'
import { PathElement } from '../../elements/PathElement.js'
import { AddElementCommand } from '../../commands/AddElementCommand.js'

export class DrawStrategy {
  constructor({ mode, eventEmitter, viewport, dataManager, commandManager }) {
    this.mode = mode
    this.eventEmitter = eventEmitter
    this.viewport = viewport
    this.dataManager = dataManager
    this.commandManager = commandManager

    this.isPenMode = false
    this.linePoints = []
    this.leftMouseHold = false
    this.leftMouseClick = null
    this.rightMouseHold = false
    this.penDrawing = false
    this.lastPointerId = null
    this._lastRecordTime = 0
    this._recordInterval = 10 // ms
    this._pendingUpdate = false
    this.mousePos = null
  }

  activate() {
    this.isPenMode = false
    this.linePoints = []
    this._updateTemporary()
    this._pendingUpdate = false
  }

  deactivate() {
    this.linePoints = []
    this._updateTemporary()
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
      case 'dblclick':
        this._onDoubleClick(e)
        break
      case 'pointerdown':
        this._onPointerDown(e)
        break
      case 'pointermove':
        this._onPointerMove(e)
        break
      case 'pointerup':
        this._onPointerUp(e)
        break
    }
  }

  togglePenMode() {
    if (this.linePoints.length > 0) {
      this.linePoints = []
    }
    this.isPenMode = !this.isPenMode
    this._updateTemporary()
    this.eventEmitter.emit('renderMousePos', {
      mousePos: this.mode.mousePos,
      isPenMode: this.isPenMode
    })
  }

  undoLastPoint() {
    this.linePoints.pop()
    this._updateTemporary()
  }

  finishLine() {
    if (this.linePoints.length < 2) {
      this.linePoints = []
      this._updateTemporary()
      return
    }

    let element
    if (this.isPenMode) {
      element = new PathElement()
      element.geometies = [...this.linePoints]
    } else {
      element = new LineElement()
      element.geometies = [...this.linePoints]
    }

    if (this.commandManager) {
      const command = new AddElementCommand(this.dataManager, element)
      this.commandManager.execute(command)
    }

    this.linePoints = []
    this._updateTemporary()
  }

  cancelDrawing() {
    this.linePoints = []
    this._updateTemporary()
  }

  _onMouseDown(e) {
    if (e.button === 0 && !this.isPenMode) {
      this.leftMouseHold = true
      this.leftMouseClick = { x: e.offsetX, y: e.offsetY }
    } else if (e.button === 2 && this.isPenMode) {
      this.rightMouseHold = true
      this.linePoints = []
      const wxy = this.viewport.toWorld(e.offsetX, e.offsetY)
      this.linePoints.push({ x: wxy.x, y: wxy.y, pressure: 0.5 })
      this._lastRecordTime = Date.now()
      this._updateTemporary()
    }
  }

  _onMouseMove(e) {
    this.mousePos = { x: e.offsetX, y: e.offsetY }
    // 只要鼠标移动就发renderMousePos事件
    this.eventEmitter.emit('renderMousePos', {
      mousePos: this.mousePos,
      isPenMode: this.isPenMode
    })
    if (this._pendingUpdate) return
    this._pendingUpdate = true
    requestAnimationFrame(() => {
      this._pendingUpdate = false
      if (!this.mousePos) return
      // 只有在绘制状态下才调用_updateTemporary
      if ((this.rightMouseHold && this.isPenMode) || this.leftMouseHold || this.penDrawing) {
        if (this.rightMouseHold && this.isPenMode) {
          const now = Date.now()
          if (now - this._lastRecordTime > this._recordInterval) {
            const wxy = this.viewport.toWorld(this.mousePos.x, this.mousePos.y)
            this.linePoints.push({ x: wxy.x, y: wxy.y, pressure: 0.5 })
            this._lastRecordTime = now
            this._updateTemporary()
          }
        } else {
          this._updateTemporary() // For preview line
        }
      } else if (this.linePoints.length > 0 && !this.isPenMode) {
        // 鼠标模式下，已开始绘制时，鼠标移动也要实时预览
        this._updateTemporary()
      }
    })
  }

  _onMouseUp(e) {
    if (e.button === 0 && !this.isPenMode) {
      this.leftMouseHold = false
      const limit = 4
      if (
        Math.abs(this.leftMouseClick.x - e.offsetX) < limit &&
        Math.abs(this.leftMouseClick.y - e.offsetY) < limit
      ) {
        const wxy = this.viewport.toWorld(e.offsetX, e.offsetY)
        // 新增：如果已有2个及以上点，且当前点与最后一个点坐标一致（容差4px），则不再添加
        let shouldAdd = true
        if (this.linePoints.length >= 2) {
          const last = this.linePoints[this.linePoints.length - 1]
          if (Math.abs(last.x - wxy.x) < 1e-2 && Math.abs(last.y - wxy.y) < 1e-2) {
            shouldAdd = false
          }
        }
        if (shouldAdd) {
          this.linePoints.push({ x: wxy.x, y: wxy.y })
          this._updateTemporary()
        }
      }
    } else if (e.button === 2 && this.isPenMode && this.rightMouseHold) {
      this.rightMouseHold = false
      this.finishLine()
    }
  }

  _onDoubleClick(e) {
    if (!this.isPenMode && e.button === 0) {
      // 标记本次mouseup不再加点
      this._pendingDoubleClick = true
      this.finishLine()
    }
  }

  _onPointerDown(e) {
    if (!this.isPenMode || e.pointerType !== 'pen') return
    this.penDrawing = true
    this.lastPointerId = e.pointerId
    this.linePoints = []
    const wxy = this.viewport.toWorld(e.offsetX, e.offsetY)
    this.linePoints.push({ x: wxy.x, y: wxy.y, pressure: e.pressure })
    this._updateTemporary()
  }

  _onPointerMove(e) {
    if (!this.isPenMode || !this.penDrawing || e.pointerId !== this.lastPointerId) return
    const wxy = this.viewport.toWorld(e.offsetX, e.offsetY)
    this.linePoints.push({ x: wxy.x, y: wxy.y, pressure: e.pressure })
    this._updateTemporary()
  }

  _onPointerUp(e) {
    if (!this.isPenMode || !this.penDrawing || e.pointerId !== this.lastPointerId) return
    this.penDrawing = false
    this.finishLine()
  }

  _updateTemporary() {
    let previewPoints = [...this.linePoints]
    if (this.linePoints.length > 0 && this.mode.mousePos && !this.isPenMode) {
      const previewWorldPos = this.viewport.toWorld(this.mode.mousePos.x, this.mode.mousePos.y)
      previewPoints.push({ x: previewWorldPos.x, y: previewWorldPos.y, pressure: 0.5 })
    }

    this.eventEmitter.emit('setTemporary', {
      drawMode: true,
      isPenMode: this.isPenMode,
      linePoints: previewPoints
    })
  }
}
