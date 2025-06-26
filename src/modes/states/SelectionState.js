// SelectionState：选中状态管理对象
// 负责管理当前选中元素、点等
export class SelectionState {
  constructor() {
    this.selectedElements = []
    this.selectedElement = null
    this.selectedPointIdx = -1
  }

  clear() {
    this.selectedElements = []
    this.selectedElement = null
    this.selectedPointIdx = -1
  }
}
