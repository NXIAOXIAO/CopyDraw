import { BaseMode } from './BaseMode.js'

/**
 * ViewEditMode
 * 浏览/编辑模式：负责元素选择、移动，监听鼠标事件，操作通过命令模式
 */
export class ViewEditMode extends BaseMode {
  constructor() {
    super()
    this.name = 'edit-view'
    this._dragState = null
  }

  activate() {
    const canvas = document.getElementById('dataCanvas')
    this.bindEvent(canvas, 'mousedown', this._onMouseDown.bind(this))
    this.bindEvent(canvas, 'mousemove', this._onMouseMove.bind(this))
    this.bindEvent(canvas, 'mouseup', this._onMouseUp.bind(this))
    // 激活时不再主动 notifyUI('elementsChanged')，只监听数据层变化
  }

  _onMouseDown(e) {
    const { dataManager, viewport } = this.context
    const pos = viewport.viewportToWorld(e.offsetX, e.offsetY)
    // 简化：只选第一个命中的元素
    const ele = dataManager.getAllElements().find((el) => isInElement(pos, el))
    if (ele) {
      this._dragState = { id: ele.id, start: pos, origin: { x: ele.x, y: ele.y } }
      ele.selected = true // 选中
      this.context.appManager.notifyUI('selectionChanged', { id: ele.id })
    }
  }

  _onMouseMove(e) {
    if (!this._dragState) return
    const { viewport, commandInvoker, dataManager } = this.context
    const pos = viewport.viewportToWorld(e.offsetX, e.offsetY)
    const ele = dataManager.getElement(this._dragState.id)
    if (ele) {
      const dx = pos.x - this._dragState.start.x
      const dy = pos.y - this._dragState.start.y
      ele.x = this._dragState.origin.x + dx
      ele.y = this._dragState.origin.y + dy
      this.context.appManager.notifyUI('tempMove', { id: ele.id, x: ele.x, y: ele.y })
    }
  }

  _onMouseUp(e) {
    if (!this._dragState) return
    const { x, y } = this._dragState
    const ele = this.context.dataManager.getElement(this._dragState.id)
    if (ele) {
      // 执行移动命令
      this.context.commandInvoker.executeMove(ele.id, { x: ele.x, y: ele.y })
    }
    this._dragState = null
    this.context.appManager.notifyUI('tempMoveEnd')
  }

  handleUIEvent(eventType, payload) {
    // 扩展：响应UI按钮
  }
}

/**
 * 判断点是否在元素内（仅示例，矩形型元素）
 * @param {{x:number,y:number}} pos
 * @param {Element} ele
 */
function isInElement(pos, ele) {
  if (ele.type === 'rect') {
    return (
      pos.x >= ele.x && pos.x <= ele.x + ele.width && pos.y >= ele.y && pos.y <= ele.y + ele.height
    )
  }
  // 其他类型可扩展
  return false
}
