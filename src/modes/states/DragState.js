// DragState：拖动状态管理对象
// 负责管理拖动相关的临时状态
export class DragState {
  constructor() {
    this.isDragging = false
    this.draggedElement = null
    this.draggedElements = []
    this.movedElements = []
    this.startPositions = null
    this.endPositions = null
    this.moveBegin = null
  }

  clear() {
    this.isDragging = false
    this.draggedElement = null
    this.draggedElements = []
    this.movedElements = []
    this.startPositions = null
    this.endPositions = null
    this.moveBegin = null
  }
}
