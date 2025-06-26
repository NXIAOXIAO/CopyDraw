// Command：命令接口
// 用途：所有命令需实现execute和undo方法
// 方法：
//   - execute(): 执行命令
//   - undo(): 撤销命令
// 返回值：无
// 异常：由具体命令实现

export class Command {
  execute() {
    throw new Error('execute() 未实现');
  }
  undo() {
    throw new Error('undo() 未实现');
  }
} 