// DragElementStrategy：拖动元素操作策略
// 只负责拖动元素的相关交互和状态
import { MoveElementsCommand } from '../../commands/MoveElementsCommand.js'
import { isPointOnElement } from '../../utils/viewEditHelpers.js'

export class DragElementStrategy {
  constructor({ mode, state, eventEmitter, viewport, dataManager, commandManager }) {
    this.mode = mode
    this.state = state // { selection, drag }
    this.eventEmitter = eventEmitter
    this.viewport = viewport
    this.dataManager = dataManager
    this.commandManager = commandManager
    this.active = false
    this.isMovingByKey = false // 'm' key initiated move
    this.leftMouseHold = false
    this.lastMouse = null
    this.moveBegin = null
    this.mousePos = null
    this._pendingUpdate = false
  }

  activate() {
    this.active = true
    this.isMovingByKey = false
    this.state.drag.clear()
    this._pendingUpdate = false
  }

  deactivate() {
    this.active = false
    this.isMovingByKey = false
    this.state.drag.clear()
    this.moveBegin = null
    this.mousePos = null
  }

  handleEvent(e) {
    this.mousePos = { x: e.offsetX, y: e.offsetY }
    // 只允许移动模式下处理拖动
    if (!this.isMovingByKey) return
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

  enterMoveMode() {
    if (
      !this.state.selection.selectedElements ||
      this.state.selection.selectedElements.length === 0
    )
      return

    this.isMovingByKey = true
    this.state.drag.isDragging = true // Use isDragging to indicate moving state

    // 记录开始位置
    this.state.drag.startPositions = {}
    this.state.selection.selectedElements.forEach((element) => {
      if (element.type === 'LineElement' || element.type === 'PathElement') {
        this.state.drag.startPositions[element.id] = {
          geometies: element.geometies.map((p) => ({ x: p.x, y: p.y }))
        }
      } else if (element.type === 'ImgElement') {
        this.state.drag.startPositions[element.id] = {
          x: element.x,
          y: element.y
        }
      }
    })

    this.state.drag.movedElements = this.state.selection.selectedElements.map((element) => {
      if (element.type === 'ImgElement') {
        return { ...element, imgdata: element.imgdata }
      } else if (element.type === 'LineElement' || element.type === 'PathElement') {
        return JSON.parse(JSON.stringify(element))
      }
      return element
    })

    // 修正：确保 moveBegin 和 mousePos 都有值
    const mouse = this.mode.mousePos || { x: 0, y: 0 }
    this.moveBegin = { ...mouse }
    this.mousePos = { ...mouse }

    this._updateTemporary()
    // 主层需要重绘以排除被移动的元素
    this.mode.reRender()
  }

  _onMouseDown(e) {
    if (e.button !== 0) return
    // 只允许移动模式下点击完成移动
    if (this.isMovingByKey) {
      this._finalizeMove()
    }
  }

  _onMouseMove(e) {
    if (!this.state.drag.isDragging || !this.moveBegin) return
    this.mousePos = { x: e.offsetX, y: e.offsetY }
    if (this._pendingUpdate) return
    this._pendingUpdate = true
    requestAnimationFrame(() => {
      this._pendingUpdate = false
      if (!this.state.drag.isDragging || !this.moveBegin || !this.mousePos) return

      // 计算偏移
      const move = {
        x: this.mousePos.x - this.moveBegin.x,
        y: this.mousePos.y - this.moveBegin.y
      }
      const cosTheta = Math.cos(this.viewport.rotate)
      const sinTheta = Math.sin(this.viewport.rotate)
      const movebyrotate = {
        x: move.x * cosTheta - move.y * sinTheta,
        y: move.x * sinTheta + move.y * cosTheta
      }
      const totalDx = movebyrotate.x * this.viewport.scale
      const totalDy = movebyrotate.y * this.viewport.scale

      // Apply offset from original start positions
      this.state.drag.movedElements = this.state.selection.selectedElements.map((element) => {
        const startPosition = this.state.drag.startPositions?.[element.id]
        if (!startPosition) return element

        if (element.type === 'ImgElement') {
          return {
            ...element,
            x: startPosition.x + totalDx,
            y: startPosition.y + totalDy,
            imgdata: element.imgdata
          }
        } else if (element.type === 'LineElement' || element.type === 'PathElement') {
          const elementCopy = JSON.parse(JSON.stringify(element))
          elementCopy.geometies = startPosition.geometies.map((point) => ({
            x: point.x + totalDx,
            y: point.y + totalDy
          }))
          return elementCopy
        }
        return element
      })

      this._updateTemporary()
    })
  }

  _onMouseUp(e) {
    if (e.button !== 0) return
    this.leftMouseHold = false
    if (this.state.drag.isDragging && this.state.selection.selectedElements.length > 0) {
      // 记录结束位置，必须从 movedElements 采集
      this.state.drag.endPositions = {}
      this.state.drag.movedElements.forEach((element) => {
        if (element.type === 'LineElement' || element.type === 'PathElement') {
          this.state.drag.endPositions[element.id] = {
            geometies: element.geometies.map((p) => ({ x: p.x, y: p.y }))
          }
        } else if (element.type === 'ImgElement') {
          this.state.drag.endPositions[element.id] = {
            x: element.x,
            y: element.y
          }
        }
      })
      // 执行命令
      if (this.commandManager && this.state.drag.startPositions && this.state.drag.endPositions) {
        const command = new MoveElementsCommand(
          this.dataManager,
          this.state.selection.selectedElements,
          this.state.drag.startPositions,
          this.state.drag.endPositions
        )
        this.commandManager.execute(command)
      }
      // 清理状态
      this.state.drag.clear()
      this._updateTemporary()
    }
  }

  _finalizeMove() {
    if (!this.commandManager || !this.state.drag.startPositions || !this.state.drag.movedElements) {
      this._resetState()
      return
    }

    // 记录结束位置，必须从 movedElements 采集
    this.state.drag.endPositions = {}
    this.state.drag.movedElements.forEach((element) => {
      if (element.type === 'LineElement' || element.type === 'PathElement') {
        this.state.drag.endPositions[element.id] = {
          geometies: element.geometies.map((p) => ({ x: p.x, y: p.y }))
        }
      } else if (element.type === 'ImgElement') {
        this.state.drag.endPositions[element.id] = {
          x: element.x,
          y: element.y
        }
      }
    })

    const command = new MoveElementsCommand(
      this.dataManager,
      this.state.selection.selectedElements,
      this.state.drag.startPositions,
      this.state.drag.endPositions
    )
    this.commandManager.execute(command)

    this._resetState()
    this.mode.reRender()
  }

  _resetState() {
    this.isMovingByKey = false
    this.moveBegin = null
    this.state.drag.clear()
    this.mousePos = null
    this._updateTemporary()
  }

  _updateTemporary() {
    this.eventEmitter.emit('setTemporary', {
      selectedElements: this.state.selection.selectedElements,
      selectedElement: this.state.selection.selectedElement,
      selectedPointIdx: this.state.selection.selectedPointIdx,
      isMovingElement: this.state.drag.isDragging,
      movedElements: this.state.drag.movedElements
    })
  }

  keyboardMove(dx, dy) {
    if (!this.isMovingByKey || !this.state.drag.isDragging) return
    // 直接在 movedElements 上累加 dx, dy
    this.state.drag.movedElements = this.state.drag.movedElements.map((element) => {
      if (element.type === 'ImgElement') {
        return { ...element, x: element.x + dx, y: element.y + dy, imgdata: element.imgdata }
      } else if (element.type === 'LineElement' || element.type === 'PathElement') {
        const elementCopy = JSON.parse(JSON.stringify(element))
        elementCopy.geometies = elementCopy.geometies.map((point) => ({
          x: point.x + dx,
          y: point.y + dy
        }))
        return elementCopy
      }
      return element
    })
    this._updateTemporary()
    this.mode.reRender()
  }
}
