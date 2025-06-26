// MoveElementCommand：移动元素命令
// 用途：移动元素，支持撤销/重做
// 参数：dataManager, element, oldPos, newPos
// 方法：execute/undo
// 返回值：无
// 异常：接口内部有try-catch

import { Command } from './Command.js';

export class MoveElementCommand extends Command {
  /**
   * @param {DataManager} dataManager
   * @param {Object} element
   * @param {Object} oldPos
   * @param {Object} newPos
   */
  constructor(dataManager, element, oldPos, newPos) {
    super();
    this.dataManager = dataManager;
    this.element = element;
    this.oldPos = oldPos;
    this.newPos = newPos;
  }

  execute() {
    try {
      Object.assign(this.element, this.newPos);
      this.dataManager.setData(this.dataManager.getData());
      this.dataManager.save();
      console.log('[MoveElementCommand] 执行移动', this.element);
    } catch (e) {
      console.error('[MoveElementCommand] 执行异常', e);
    }
  }

  undo() {
    try {
      Object.assign(this.element, this.oldPos);
      this.dataManager.setData(this.dataManager.getData());
      this.dataManager.save();
      console.log('[MoveElementCommand] 撤销移动', this.element);
    } catch (e) {
      console.error('[MoveElementCommand] 撤销异常', e);
    }
  }
}
