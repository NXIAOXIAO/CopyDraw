// DeleteElementCommand：删除元素命令
// 用途：从DataManager删除元素，支持撤销/重做
// 参数：dataManager, element, index
// 方法：execute/undo
// 返回值：无
// 异常：接口内部有try-catch

import { Command } from './Command.js'

export class DeleteElementCommand extends Command {
  /**
   * @param {DataManager} dataManager
   * @param {Object|Object[]} elementOrElements
   */
  constructor(dataManager, elementOrElements) {
    super()
    this.dataManager = dataManager
    this.elements = Array.isArray(elementOrElements) ? elementOrElements : [elementOrElements]
  }

  async execute() {
    try {
      for (const element of this.elements) {
        await this.dataManager.deleteElement(element.id)
        console.log('[DeleteElementCommand] 执行删除', element)
      }
    } catch (e) {
      console.error('[DeleteElementCommand] 执行异常', e)
    }
  }

  async undo() {
    try {
      for (const element of this.elements) {
        await this.dataManager.addElement(element)
        console.log('[DeleteElementCommand] 撤销删除', element)
      }
    } catch (e) {
      console.error('[DeleteElementCommand] 撤销异常', e)
    }
  }
}
