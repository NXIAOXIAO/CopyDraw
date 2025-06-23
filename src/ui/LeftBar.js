// LeftBar 侧边栏组件，用于多模式切换
const drawIcon = './public/icon/line_icon.ico'
const renderIcon = './public/icon/render-icon.png'
const arrowIcon = './public/icon/arrow.png'

export class LeftBar {
  constructor({ onModeChange }) {
    this.onModeChange = onModeChange
    this.modes = [
      { name: '默认', icon: arrowIcon, mode: 'view-edit' },
      { name: '绘制', icon: drawIcon, mode: 'draw' },
      { name: '渲染', icon: renderIcon, mode: 'render' }
    ]
    this.activeMode = 'view-edit'
    this.el = this._createBar()
    document.body.appendChild(this.el) //直接挂载在body上
  }
  _createBar() {
    const bar = document.createElement('div')
    bar.className = 'leftbar'
    this.modes.forEach((m) => {
      const btn = document.createElement('div')
      btn.className = 'leftbar-item' + (m.mode === this.activeMode ? ' active' : '')
      btn.title = m.name
      const img = document.createElement('img')
      img.src = m.icon
      img.alt = m.name
      btn.appendChild(img)
      btn.onclick = () => {
        this.setActive(m.mode)
        if (this.onModeChange) this.onModeChange(m.mode)
      }
      bar.appendChild(btn)
    })
    return bar
  }
  setActive(mode) {
    this.activeMode = mode
    Array.from(this.el.children).forEach((btn, i) => {
      btn.classList.toggle('active', this.modes[i].mode === mode)
    })
  }
}
