// ElementSelectionStrategy：元素点选操作策略
// 负责处理单击选择元素的逻辑
import { isPointOnElement } from '../../utils/viewEditHelpers.js'

export class ElementSelectionStrategy {
  constructor({ mode, state, eventEmitter, dataManager, commandManager, viewport }) {
    this.mode = mode
    this.state = state // { selection }
    this.eventEmitter = eventEmitter
    this.dataManager = dataManager
    this.viewport = viewport
    this.commandManager = commandManager
  }

  activate() {}
  deactivate() {}

  handleEvent(e) {
    if (e.type === 'mouseup' && e.button === 0) {
      this._onMouseUp(e)
    }
  }

  _onMouseUp(e) {
    const { selection } = this.state
    const allElements = this.dataManager.getAllElements()
    let hitElement = null
    let hitPointIdx = -1

    // 从顶层元素开始查找
    for (let i = allElements.length - 1; i >= 0; i--) {
      if (isPointOnElement(allElements[i], e.offsetX, e.offsetY, this.viewport)) {
        hitElement = allElements[i]
        // 优先判断是否点到点
        if (hitElement.type === 'LineElement') {
          hitPointIdx = this.mode.getPointAt(hitElement, e.offsetX, e.offsetY)
        }
        break
      }
    }

    if (hitElement) {
      if (e.shiftKey) {
        // 按住 Shift：如果元素已选中则取消选中，否则添加到选中集
        const index = selection.selectedElements.findIndex((el) => el.id === hitElement.id)
        if (index > -1) {
          selection.selectedElements.splice(index, 1)
        } else {
          selection.selectedElements.push(hitElement)
        }
        selection.selectedPointIdx = -1
        selection.selectedElement = null // 多选时不设置单个选中元素
      } else {
        // 无修饰键：
        if (hitElement.type === 'LineElement' && hitPointIdx !== -1) {
          // 优先点选点
          selection.selectedElements = [hitElement]
          selection.selectedElement = hitElement
          selection.selectedPointIdx = hitPointIdx
        } else {
          // 否则只选中元素
          selection.selectedElements = [hitElement]
          selection.selectedElement = hitElement
          selection.selectedPointIdx = -1
        }
      }
    } else {
      // 点击空白处，取消所有选择
      selection.clear()
      // 同步清空拖动状态
      this.mode.strategies.drag._resetState && this.mode.strategies.drag._resetState()
    }
    this._updateTemporary()
  }

  _updateTemporary() {
    this.eventEmitter.emit('setTemporary', {
      selectedElements: this.state.selection.selectedElements,
      selectedElement: this.state.selection.selectedElement,
      selectedPointIdx: this.state.selection.selectedPointIdx,
      selectBox: null,
      isMovingElement: this.state.drag.isDragging,
      movedElements: this.state.drag.movedElements
    })
  }
}
