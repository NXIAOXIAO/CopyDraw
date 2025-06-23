import { BaseMode } from './BaseMode.js'
import { Constants } from '../common/Constants.js'
import { TopBar } from '../ui/TopBar.js'
import { SketchRenderer } from '../render/SketchRenderer.js'
import { OilPaintRenderer } from '../render/OilPaintRenderer.js'
import { GrowthRenderer } from '../render/GrowthRenderer.js'
import { WhiteLineRenderer } from '../render/WhiteLineRenderer.js'
import { BlackLineRenderer } from '../render/BlackLineRenderer.js'
import { DarkWhiteLineRenderer } from '../render/DarkWhiteLineRenderer.js'
// RenderMode：渲染模式，支持特殊渲染和只读视图
export class RenderMode extends BaseMode {
  constructor(eventListeners, dom, viewport, render, dataManager) {
    super(Constants.MODE_RENDER, eventListeners, dom)
    this.viewport = viewport
    this.render = render
    this.dataManager = dataManager
    this.topBar = null
    this._renderType = 'sketch'
    this._rendererMap = {
      sketch: new SketchRenderer(),
      oil: new OilPaintRenderer(),
      growth: new GrowthRenderer(),
      white: new WhiteLineRenderer(),
      black: new BlackLineRenderer(),
      darkwhite: new DarkWhiteLineRenderer()
    }
    this._currentRenderer = this._rendererMap[this._renderType]
  }
  enter() {
    this._addEventListeners()
    this.topBar = new TopBar({
      onRenderTypeChange: (type) => this.setRenderType(type),
      onExport: () => this.exportPNG(),
      renderTypes: [
        { label: '素描', value: 'sketch' },
        { label: '油画', value: 'oil' },
        { label: '生长动画', value: 'growth' },
        { label: '白线(透明)', value: 'white' },
        { label: '黑线(透明)', value: 'black' },
        { label: '白线(黑底)', value: 'darkwhite' }
      ],
      activeType: this._renderType
    })
    this.topBar.mount(document.body)
    this.setRenderType(this._renderType)
  }
  exit() {
    this._removeEventListeners()
    if (this.topBar) this.topBar.unmount()
  }
  setRenderType(type) {
    this._renderType = type
    this._currentRenderer = this._rendererMap[type]
    if (type === 'growth') {
      this._currentRenderer.startAnimation(this.render.canvasArea, this.dataManager, this.viewport)
    } else {
      this._currentRenderer.render(this.render.canvasArea, this.dataManager, this.viewport)
    }
  }
  exportPNG() {
    // 导出当前主canvas为PNG
    const dataUrl = this.render.canvasArea.dataCanvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = 'export.png'
    a.click()
  }
}
