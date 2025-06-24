import { Command } from './Command.js'

/**
 * DeleteElementCommand
 * 删除元素命令
 */
export class DeleteElementCommand extends Command {
  constructor(dataManager, elementId) {
    super()
    this.dataManager = dataManager
    this.elementId = elementId
    this._backup = null
  }

  async execute() {
    this._backup = this.dataManager.getElement(this.elementId)
    await this.dataManager.deleteElement(this.elementId)
  }

  async undo() {
    if (this._backup) {
      await this.dataManager.addElement(this._backup)
    }
  }
}
