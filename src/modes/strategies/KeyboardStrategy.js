import { getCenterToNearestElementOffset } from '../../utils/viewHelpers.js'
// KeyboardStrategy：键盘操作策略
// 负责处理所有键盘快捷键
export class KeyboardStrategy {
  constructor({ mode, state, eventEmitter, commandManager, strategies }) {
    this.mode = mode
    this.state = state
    this.eventEmitter = eventEmitter
    this.commandManager = commandManager
    this.strategies = strategies // { delete, copyPaste, drag, view }
  }

  activate() {}
  deactivate() {}

  handleEvent(e) {
    if (e.type !== 'keydown') return
    // e.preventDefault() // 阻止默认事件

    // 路由到不同策略
    if (this.strategies.drag.isMovingByKey) {
      switch (e.key) {
        case 'Enter':
          e.preventDefault()
          this.strategies.drag._finalizeMove()
          return
        case 'Escape':
          e.preventDefault()
          this.strategies.drag._resetState()
          return
      }
    }

    switch (e.key) {
      case 'Delete':
      case 'Backspace':
        this.strategies.delete?.handleDelete()
        break
      case 'c':
      case 'C':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          this.strategies.copyPaste?.handleCopy()
        }
        break
      case 'v':
      case 'V':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          this.strategies.copyPaste?.handlePaste()
        }
        break
      case 'm':
      case 'M':
        if (this.state.selection.selectedElements.length > 0) {
          e.preventDefault()
          // 'm' 键启动拖动模式
          this.mode.enterMoveMode()
        }
        break
      case 'z':
      case 'Z':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          this.commandManager.undo()
        }
        break
      case 'y':
      case 'Y':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          this.commandManager.redo()
        }
        break
      case ' ': // 空格键
        e.preventDefault()
        break
      case 'p':
      case 'P':
        e.preventDefault()
        const elements = this.mode.dataManager
          .getAllElements()
          .filter((ele) => ele.type !== 'ImgElement')
        const offset = getCenterToNearestElementOffset(
          elements,
          this.mode.viewport,
          this.mode.canvasArea
        )
        if (offset) {
          this.mode.eventEmitter.emit('updateViewport', offset)
        }
        break
      default:
        break
    }
  }
}
