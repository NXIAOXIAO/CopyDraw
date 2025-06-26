// PointOperationStrategy：点操作策略
// 负责点选、点拖动、点删除、点新增等所有点相关交互
import {
  isPointOnElement,
  pointToSegmentDistance,
  getClosestSegment
} from '../../utils/viewEditHelpers.js'
import { MovePointCommand } from '../../commands/MovePointCommand.js'
import { AddPointCommand } from '../../commands/AddPointCommand.js'

export class PointOperationStrategy {
  constructor({ mode, state, eventEmitter, viewport, dataManager, commandManager }) {
    this.mode = mode
    this.state = state // { selection }
    this.eventEmitter = eventEmitter
    this.viewport = viewport
    this.dataManager = dataManager
    this.commandManager = commandManager
    this.isDragging = false
    this.leftMouseHold = false
    this.leftMouseClick = null
    this.draggedElement = null
    this.mousePos = null
    this._pendingUpdate = false
  }

  activate() {
    this.isDragging = false
    this.leftMouseHold = false
    this.leftMouseClick = null
    this.draggedElement = null
    this.mousePos = null
    this._pendingUpdate = false
  }

  deactivate() {
    this.isDragging = false
    this.leftMouseHold = false
    this.leftMouseClick = null
    this.draggedElement = null
    this.mousePos = null
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
      default:
        break
    }
  }

  _onMouseDown(e) {
    if (e.button !== 0) return
    this.leftMouseHold = true
    this.leftMouseClick = { x: e.offsetX, y: e.offsetY }
    // 检查是否点击在已选中线条的点上
    const selection = this.state.selection
    if (
      selection.selectedElement &&
      selection.selectedElement.type === 'LineElement' &&
      selection.selectedPointIdx !== -1
    ) {
      const pointIdx = this.mode.getPointAt(selection.selectedElement, e.offsetX, e.offsetY)
      if (pointIdx === selection.selectedPointIdx) {
        this.isDragging = true
        this.draggedElement = selection.selectedElement
        // 拖动点时主层渲染排除该元素
        this.mode.reRender([this.draggedElement.id])
      }
    }
  }

  _onMouseMove(e) {
    this.mousePos = { x: e.offsetX, y: e.offsetY }
    const selection = this.state.selection
    if (
      this.leftMouseHold &&
      selection.selectedElement &&
      selection.selectedElement.type === 'LineElement' &&
      selection.selectedPointIdx !== -1 &&
      this.isDragging
    ) {
      if (this._pendingUpdate) return
      this._pendingUpdate = true
      requestAnimationFrame(() => {
        this._pendingUpdate = false
        if (!this.mousePos || !this.isDragging) return

        const wpt = this.viewport.toWorld(this.mousePos.x, this.mousePos.y)
        selection.selectedElement.geometies[selection.selectedPointIdx] = { x: wpt.x, y: wpt.y }

        this._updateTemporary()

        if (this.draggedElement) {
          this.mode.reRender([this.draggedElement.id])
        }
      })
    }
  }

  _onMouseUp(e) {
    if (e.button !== 0) return
    this.leftMouseHold = false
    const selection = this.state.selection
    if (this.isDragging && selection.selectedElement && selection.selectedPointIdx !== -1) {
      this.isDragging = false
      if (this.commandManager) {
        const newPosition = { ...selection.selectedElement.geometies[selection.selectedPointIdx] }
        const originalWorldPos = this.viewport.toWorld(this.leftMouseClick.x, this.leftMouseClick.y)
        const oldPosition = { x: originalWorldPos.x, y: originalWorldPos.y }
        const command = new MovePointCommand(
          this.dataManager,
          selection.selectedElement.id,
          selection.selectedPointIdx,
          oldPosition,
          newPosition
        )
        this.commandManager.execute(command)
        this.mode.reRender()
      }
      if (this.draggedElement) {
        this.draggedElement = null
        this.mode.reRender()
      }
    }
  }

  _onDoubleClick(e) {
    if (e.button !== 0) return
    const selection = this.state.selection
    if (selection.selectedElement && selection.selectedElement.type === 'LineElement') {
      const pointIdx = this.mode.getPointAt(selection.selectedElement, e.offsetX, e.offsetY)
      if (pointIdx === -1) {
        // 在线段上新增点
        this._addPointToLine(selection.selectedElement, e.offsetX, e.offsetY)
      } else {
        // 点击已存在的点，切换为选中状态
        selection.selectedPointIdx = pointIdx
        this._updateTemporary()
      }
    }
  }

  _addPointToLine(lineElement, offsetX, offsetY) {
    if (!this.commandManager || !this.dataManager) return

    const pointIndex = getClosestSegment(lineElement, offsetX, offsetY, this.viewport)

    if (pointIndex !== -1) {
      // 计算新点在世界坐标系中的位置
      const worldPos = this.viewport.toWorld(offsetX, offsetY)
      // 创建添加点命令
      const command = new AddPointCommand(this.dataManager, lineElement.id, pointIndex, worldPos)
      // 执行命令
      this.commandManager.execute(command)
      // 新增：立即刷新临时层
      this._updateTemporary()
    }
  }

  _updateTemporary() {
    const selection = this.state.selection
    this.eventEmitter.emit('setTemporary', {
      selectedElements: selection.selectedElements,
      selectedElement: selection.selectedElement,
      selectedPointIdx: selection.selectedPointIdx
    })
  }
}
