/**
 * 增加点命令
 * 用于撤销/重做LineElement中点的增加操作
 */
import { Command } from './Command.js'

export class AddPointCommand extends Command {
  constructor(dataManager, elementId, pointIndex, point) {
    super()
    this.dataManager = dataManager
    this.elementId = elementId
    this.pointIndex = pointIndex
    this.point = point
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

      // 在指定位置插入新点
      element.geometies.splice(this.pointIndex, 0, { ...this.point })
      await this.dataManager.updateElement(this.elementId, { geometies: element.geometies })
      console.log('[AddPointCommand] 执行添加点', this.elementId, this.pointIndex)
    } catch (e) {
      console.error('[AddPointCommand] 执行异常', e)
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

      // 移除指定位置的点
      element.geometies.splice(this.pointIndex, 1)
      await this.dataManager.updateElement(this.elementId, { geometies: element.geometies })
      console.log('[AddPointCommand] 撤销添加点', this.elementId, this.pointIndex)
    } catch (e) {
      console.error('[AddPointCommand] 撤销异常', e)
    }
  }

  /**
   * 获取命令描述
   */
  getDescription() {
    return `增加线条点 ${this.pointIndex}`
  }
}
