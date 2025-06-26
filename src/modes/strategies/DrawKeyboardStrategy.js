// DrawKeyboardStrategy：绘制模式下的键盘操作策略
export class DrawKeyboardStrategy {
  constructor({ mode, eventEmitter, commandManager, strategies }) {
    this.mode = mode
    this.eventEmitter = eventEmitter
    this.commandManager = commandManager
    this.strategies = strategies // { draw, view, copyPaste }
  }

  activate() {}
  deactivate() {}

  handleEvent(e) {
    if (e.type !== 'keydown') return

    switch (e.key) {
      case 'q':
      case 'Q':
        this.strategies.draw.togglePenMode()
        break
      case 'v':
      case 'V':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          this.strategies.copyPaste.handlePaste()
        }
        break
      case 'ArrowLeft':
      case 'ArrowRight':
        if (e.shiftKey) {
          e.preventDefault()
          this.strategies.view.handleRotation(e.key)
        }
        break
      case 'z':
      case 'Z':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          if (!this.strategies.draw.isPenMode && this.strategies.draw.linePoints.length > 0) {
            this.strategies.draw.undoLastPoint()
          }
          // 其它情况（包括isPenMode）不在这里处理undo，交由全局监听
        }
        break
      case 'Enter':
        if (!this.strategies.draw.isPenMode) {
          this.strategies.draw.finishLine()
        }
        break
      case 'Escape':
        this.strategies.draw.cancelDrawing()
        break
    }
  }
}
