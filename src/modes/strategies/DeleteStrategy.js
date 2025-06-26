// DeleteStrategy：删除操作策略
import { DeleteElementCommand } from '../../commands/DeleteElementCommand.js'

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
