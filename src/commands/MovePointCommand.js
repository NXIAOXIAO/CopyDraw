/**
 * 移动LineElement点命令
 * 用于撤销/重做LineElement中点的移动操作
 */
import { Command } from './Command.js'

export class MovePointCommand extends Command {
  constructor(dataManager, elementId, pointIndex, oldPosition, newPosition) {
    super()
    this.dataManager = dataManager
    this.elementId = elementId
    this.pointIndex = pointIndex
    this.oldPosition = oldPosition
    this.newPosition = newPosition
  }

  /**
   * 执行命令
   */
  async execute() {
    try {
      const element = this.dataManager.getElement(this.elementId)
      if (!element || element.type !== 'LineElement') {
        throw new Error('元素不存在或不是LineElement类型')
      }

      // 更新点的位置
      element.geometies[this.pointIndex] = { ...this.newPosition }
      await this.dataManager.updateElement(this.elementId, { geometies: element.geometies })
      console.log('[MovePointCommand] 执行移动点', this.elementId, this.pointIndex)
    } catch (e) {
      console.error('[MovePointCommand] 执行异常', e)
    }
  }

  /**
   * 撤销命令
   */
  async undo() {
    try {
      const element = this.dataManager.getElement(this.elementId)
      if (!element || element.type !== 'LineElement') {
        throw new Error('元素不存在或不是LineElement类型')
      }

      // 恢复点的原始位置
      element.geometies[this.pointIndex] = { ...this.oldPosition }
      await this.dataManager.updateElement(this.elementId, { geometies: element.geometies })
      console.log('[MovePointCommand] 撤销移动点', this.elementId, this.pointIndex)
    } catch (e) {
      console.error('[MovePointCommand] 撤销异常', e)
    }
  }

  /**
   * 获取命令描述
   */
  getDescription() {
    return `移动线条点 ${this.pointIndex}`
  }
}
