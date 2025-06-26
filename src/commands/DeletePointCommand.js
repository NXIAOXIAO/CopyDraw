/**
 * 删除点命令
 * 用于撤销/重做LineElement中点的删除操作
 */
import { Command } from './Command.js'

export class DeletePointCommand extends Command {
  constructor(dataManager, elementId, pointIndex, deletedPoint) {
    super()
    this.dataManager = dataManager
    this.elementId = elementId
    this.pointIndex = pointIndex
    this.deletedPoint = deletedPoint
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

      // 删除指定位置的点
      element.geometies.splice(this.pointIndex, 1)
      await this.dataManager.updateElement(this.elementId, { geometies: element.geometies })
      console.log('[DeletePointCommand] 执行删除点', this.elementId, this.pointIndex)
    } catch (e) {
      console.error('[DeletePointCommand] 执行异常', e)
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

      // 在指定位置恢复被删除的点
      element.geometies.splice(this.pointIndex, 0, { ...this.deletedPoint })
      await this.dataManager.updateElement(this.elementId, { geometies: element.geometies })
      console.log('[DeletePointCommand] 撤销删除点', this.elementId, this.pointIndex)
    } catch (e) {
      console.error('[DeletePointCommand] 撤销异常', e)
    }
  }

  /**
   * 获取命令描述
   */
  getDescription() {
    return `删除线条点 ${this.pointIndex}`
  }
}
