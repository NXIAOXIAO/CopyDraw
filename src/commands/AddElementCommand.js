// AddElementCommand：添加元素命令
// 用途：向DataManager添加元素，支持撤销/重做
// 参数：dataManager, element
// 方法：execute/undo
// 返回值：无
// 异常：接口内部有try-catch

import { Command } from './Command.js';

export class AddElementCommand extends Command {
  /**
   * @param {DataManager} dataManager
   * @param {Object} element
   */
  constructor(dataManager, element) {
    super();
    this.dataManager = dataManager;
    this.element = element;
    this._index = null;
  }

  async execute() {
    try {
      await this.dataManager.addElement(this.element);
      console.log('[AddElementCommand] 执行添加', this.element);
    } catch (e) {
      console.error('[AddElementCommand] 执行异常', e);
    }
  }

  async undo() {
    try {
      await this.dataManager.deleteElement(this.element.id);
      console.log('[AddElementCommand] 撤销添加', this.element);
    } catch (e) {
      console.error('[AddElementCommand] 撤销异常', e);
    }
  }
}
