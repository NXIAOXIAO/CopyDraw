// StateSyncer：状态同步辅助类
export class StateSyncer {
  constructor({ selectionState, dragState }) {
    this.selectionState = selectionState
    this.dragState = dragState
  }

  getSelection() {
    return this.selectionState
  }

  getDrag() {
    return this.dragState
  }

  clearAll() {
    this.selectionState.clear()
    this.dragState.clear()
  }
}
