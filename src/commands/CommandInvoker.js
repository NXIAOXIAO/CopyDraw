import { AddElementCommand } from './AddElementCommand.js'
import { DeleteElementCommand } from './DeleteElementCommand.js'
import { MoveElementCommand } from './MoveElementCommand.js'

/**
 * CommandInvoker
 * 命令执行与撤销/重做栈
 */
export class CommandInvoker {
  constructor(dataManager) {
    this.dataManager = dataManager
    this.undoStack = []
    this.redoStack = []
  }

  async executeAdd(element) {
    const cmd = new AddElementCommand(this.dataManager, element)
    await cmd.execute()
    this.undoStack.push(cmd)
    this.redoStack = []
  }

  async executeDelete(elementId) {
    const cmd = new DeleteElementCommand(this.dataManager, elementId)
    await cmd.execute()
    this.undoStack.push(cmd)
    this.redoStack = []
  }

  async executeMove(elementId, newProps, oldProps = null) {
    if (!oldProps) {
      const ele = this.dataManager.getElement(elementId)
      oldProps = { x: ele.x, y: ele.y }
    }
    const cmd = new MoveElementCommand(this.dataManager, elementId, newProps, oldProps)
    await cmd.execute()
    this.undoStack.push(cmd)
    this.redoStack = []
  }

  async undo() {
    const cmd = this.undoStack.pop()
    if (cmd) {
      await cmd.undo()
      this.redoStack.push(cmd)
    }
  }

  async redo() {
    const cmd = this.redoStack.pop()
    if (cmd) {
      await cmd.execute()
      this.undoStack.push(cmd)
    }
  }
}
