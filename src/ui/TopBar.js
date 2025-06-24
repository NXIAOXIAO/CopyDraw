/**
 * TopBar
 * 顶部工具栏，负责撤销、重做、保存、导出等操作，所有操作 emit uievent 事件
 */
export class TopBar {
  constructor(root) {
    this.root = root
    this._bind()
  }

  _bind() {
    this.root.querySelector('#btn-undo').addEventListener('click', () => {
      this.emitEvent('undo')
    })
    this.root.querySelector('#btn-redo').addEventListener('click', () => {
      this.emitEvent('redo')
    })
    this.root.querySelector('#btn-save').addEventListener('click', () => {
      this.emitEvent('save')
    })
    this.root.querySelector('#btn-export').addEventListener('click', () => {
      this.emitEvent('export')
    })
  }

  emitEvent(type, payload = {}) {
    // 必须 bubbles:true，否则冒泡不到 body
    const evt = new CustomEvent('uievent', { detail: { type, payload }, bubbles: true })
    this.root.dispatchEvent(evt)
  }
}
