// IRenderStrategy：渲染策略接口
// 用途：所有渲染策略需实现render方法
// 方法：
//   - render(canvasArea, dataManager, viewport): 执行渲染
//   - getName(): 获取策略名称
//   - getDescription(): 获取策略描述
// 返回值：无
// 异常：由具体策略实现

export class IRenderStrategy {
  render(canvasArea, dataManager, viewport) {
    throw new Error('render() 未实现')
  }

  getName() {
    throw new Error('getName() 未实现')
  }

  getDescription() {
    throw new Error('getDescription() 未实现')
  }
}
