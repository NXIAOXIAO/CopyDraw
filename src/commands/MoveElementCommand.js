import { Command } from './Command.js'

/**
 * MoveElementCommand
 * 移动物体命令
 */
export class MoveElementCommand extends Command {
  constructor(dataManager, elementId, newProps, oldProps) {
    super()
    this.dataManager = dataManager
    this.elementId = elementId
    this.newProps = newProps
    this.oldProps = oldProps
  }

  async execute() {
    await this.dataManager.updateElement(this.elementId, this.newProps)
  }

  async undo() {
    await this.dataManager.updateElement(this.elementId, this.oldProps)
  }
}
