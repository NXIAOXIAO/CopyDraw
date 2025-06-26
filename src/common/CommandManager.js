// CommandManager：命令管理器
// 用途：管理命令栈，实现撤销/重做，命令模式核心。
import { Command } from '../commands/Command.js'

export class CommandManager {
  constructor(eventEmitter) {
    this.eventEmitter = eventEmitter
    this.undoStack = []
    this.redoStack = []
    this.eventEmitter.on('topbar-undo', () => {
      this.undo()
    })
    this.eventEmitter.on('topbar-redo', () => {
      this.redo()
    })
    console.log('[CommandManager] 命令管理器初始化完成')
    this.notifyUI()
  }

  notifyUI() {
    this.eventEmitter.emit('commandStackChanged', {
      canUndo: this.canUndo(),
      canRedo: this.canRedo()
    })
  }

  /**
   * 执行命令
   * @param {Command} command
   */
  execute(command) {
    try {
      command.execute()
      this.undoStack.push(command)
      this.redoStack = []
      this.notifyUI()
      console.log('[CommandManager] 执行命令', command.constructor.name)
    } catch (e) {
      console.error('[CommandManager] 命令执行异常', e)
      throw e
    }
  }

  /**
   * 撤销
   */
  undo() {
    if (!this.canUndo()) return
    try {
      const command = this.undoStack.pop()
      command.undo()
      this.redoStack.push(command)
      this.notifyUI()
      console.log('[CommandManager] 撤销命令', command.constructor.name)
      // 此处不再直接emit refreshTemporaryLayer，由elementsChanged事件回调统一触发
    } catch (e) {
      console.error('[CommandManager] 撤销异常', e)
    }
  }

  /**
   * 重做
   */
  redo() {
    if (!this.canRedo()) return
    try {
      const command = this.redoStack.pop()
      command.execute()
      this.undoStack.push(command)
      this.notifyUI()
      console.log('[CommandManager] 重做命令', command.constructor.name)
      // 此处不再直接emit refreshTemporaryLayer，由elementsChanged事件回调统一触发
    } catch (e) {
      console.error('[CommandManager] 重做异常', e)
    }
  }

  /**
   * 清空命令栈
   */
  clear() {
    this.undoStack = []
    this.redoStack = []
    this.notifyUI()
    console.log('[CommandManager] 命令栈已清空')
  }

  /**
   * 是否可撤销
   * @returns {boolean}
   */
  canUndo() {
    return this.undoStack.length > 0
  }

  /**
   * 是否可重做
   * @returns {boolean}
   */
  canRedo() {
    return this.redoStack.length > 0
  }
}
