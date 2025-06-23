// TopBar 顶部栏组件，仅在 RenderMode 下显示
// 包含：渲染方式下拉菜单、导出按钮

const exportIcon = './public/icon/export.png'

export class TopBar {
  constructor({ onRenderTypeChange, onExport, renderTypes = [], activeType }) {
    this.onRenderTypeChange = onRenderTypeChange
    this.onExport = onExport
    this.renderTypes = renderTypes
    this.activeType = activeType || this.renderTypes[0].value
    this.el = this._createBar()
  }
  _createBar() {
    const bar = document.createElement('div')
    bar.className = 'topbar'
    // 下拉菜单
    const select = document.createElement('select')
    select.className = 'topbar-select'
    this.renderTypes.forEach((rt) => {
      const opt = document.createElement('option')
      opt.value = rt.value
      opt.textContent = rt.label
      select.appendChild(opt)
    })
    select.value = this.activeType
    select.onchange = (e) => {
      this.activeType = e.target.value
      if (this.onRenderTypeChange) this.onRenderTypeChange(this.activeType)
    }
    bar.appendChild(select)
    // 导出按钮
    const exportBtn = document.createElement('button')
    exportBtn.className = 'topbar-export-btn'
    const img = document.createElement('img')
    img.src = exportIcon
    img.alt = '导出PNG'
    exportBtn.appendChild(img)
    exportBtn.title = '导出PNG'
    exportBtn.onclick = () => {
      if (this.onExport) this.onExport()
    }
    bar.appendChild(exportBtn)
    return bar
  }
  setActiveType(type) {
    this.activeType = type
    const select = this.el.querySelector('select')
    if (select) select.value = type
  }
  mount(container) {
    container.appendChild(this.el)
  }
  unmount() {
    if (this.el && this.el.parentNode) {
      this.el.parentNode.removeChild(this.el)
    }
  }
}
