/**
 * LeftBar
 * 左侧工具栏，切换模式（编辑、绘制、渲染），emit uievent 事件
 */
export class LeftBar {
  constructor(root) {
    this.root = root
    this._bind()
  }

  _bind() {
    this.root.querySelector('#edit-view').addEventListener('click', () => {
      this.emitEvent('switchMode', { mode: 'edit-view' })
    })
    this.root.querySelector('#draw').addEventListener('click', () => {
      this.emitEvent('switchMode', { mode: 'draw' })
    })
    this.root.querySelector('#render').addEventListener('click', () => {
      this.emitEvent('switchMode', { mode: 'render' })
    })
  }

  emitEvent(type, payload = {}) {
    const evt = new CustomEvent('uievent', { detail: { type, payload } })
    this.root.dispatchEvent(evt)
  }
}
