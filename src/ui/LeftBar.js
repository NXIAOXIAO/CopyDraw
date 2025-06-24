/**
 * LeftBar
 * 左侧工具栏，切换模式（编辑、绘制、渲染），emit uievent 事件
 */
export class LeftBar {
  constructor(root) {
    this.root = root
    this.btnMap = {
      'edit-view': this.root.querySelector('#edit-view'),
      draw: this.root.querySelector('#draw'),
      render: this.root.querySelector('#render')
    }
    this._bind()
  }

  _bind() {
    this.btnMap['edit-view'].addEventListener('click', () => {
      this.emitEvent('switchMode', { mode: 'edit-view' })
    })
    this.btnMap['draw'].addEventListener('click', () => {
      this.emitEvent('switchMode', { mode: 'draw' })
    })
    this.btnMap['render'].addEventListener('click', () => {
      this.emitEvent('switchMode', { mode: 'render' })
    })
  }

  emitEvent(type, payload = {}) {
    // 必须 bubbles:true，否则冒泡不到 body
    const evt = new CustomEvent('uievent', { detail: { type, payload }, bubbles: true })
    this.root.dispatchEvent(evt)
  }

  /**
   * 设置当前激活按钮的样式
   * @param {'edit-view'|'draw'|'render'} mode
   */
  setActive(mode) {
    Object.entries(this.btnMap).forEach(([key, btn]) => {
      if (key === mode) {
        btn.classList.add('active')
      } else {
        btn.classList.remove('active')
      }
    })
  }
}
