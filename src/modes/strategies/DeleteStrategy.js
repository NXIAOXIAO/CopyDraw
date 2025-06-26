// DeleteStrategy：删除操作策略
import { DeleteElementCommand } from '../../commands/DeleteElementCommand.js'
import { DeletePointCommand } from '../../commands/DeletePointCommand.js'

export class DeleteStrategy {
  constructor({ mode, state, eventEmitter, dataManager, commandManager }) {
    this.mode = mode
    this.state = state
    this.eventEmitter = eventEmitter
    this.dataManager = dataManager
    this.commandManager = commandManager
  }

  activate() {}
  deactivate() {}

  async handleDelete() {
    if (
      !this.state.selection.selectedElements ||
      this.state.selection.selectedElements.length === 0
    )
      return

    const sel = this.state.selection
    // 选中线元素上的点时，优先删除点
    if (
      sel.selectedElements.length === 1 &&
      sel.selectedElement &&
      sel.selectedElement.type === 'LineElement' &&
      typeof sel.selectedPointIdx === 'number' &&
      sel.selectedPointIdx !== -1
    ) {
      const line = sel.selectedElement
      if (line.geometies.length > 2) {
        // 删除点，使用命令支持undo/redo
        const deletedPoint = { ...line.geometies[sel.selectedPointIdx] }
        if (this.commandManager) {
          const command = new DeletePointCommand(
            this.dataManager,
            line.id,
            sel.selectedPointIdx,
            deletedPoint
          )
          await this.commandManager.execute(command)
        } else {
          line.geometies.splice(sel.selectedPointIdx, 1)
        }
        sel.selectedPointIdx = -1
        this.mode.updateTemporary()
        this.mode.reRender()
        return
      } else {
        // 仅剩2点，删除整条线
        if (this.commandManager) {
          const command = new DeleteElementCommand(this.dataManager, [line])
          await this.commandManager.execute(command)
        }
        sel.clear()
        this.mode.updateTemporary()
        this.mode.reRender()
        return
      }
    }

    // 默认：删除选中元素
    if (this.commandManager) {
      const command = new DeleteElementCommand(
        this.dataManager,
        this.state.selection.selectedElements
      )
      await this.commandManager.execute(command)
    }
    this.state.selection.clear()
    this.mode.updateTemporary()
    this.mode.reRender()
  }
}
