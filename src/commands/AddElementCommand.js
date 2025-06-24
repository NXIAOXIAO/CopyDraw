import { Command } from './Command.js'

/**
 * AddElementCommand
 * 新增元素命令，可撤销
 */
export class AddElementCommand extends Command {
  constructor(dataManager, element) {
    super()
    this.dataManager = dataManager
    this.element = element
  }

  async execute() {
    await this.dataManager.addElement(this.element)
  }

  async undo() {
    await this.dataManager.deleteElement(this.element.id)
  }
}
