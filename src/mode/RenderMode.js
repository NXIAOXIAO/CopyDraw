import { BaseMode } from './BaseMode.js'

/**
 * RenderMode
 * 纯渲染/预览模式，不可交互，仅控制渲染样式
 */
export class RenderMode extends BaseMode {
  constructor() {
    super()
    this.name = 'render'
  }

  activate() {
    // 仅切换渲染样式，不绑定事件
    this.context.appManager.notifyUI('renderModeActivated')
  }

  deactivate() {}
  handleUIEvent() {}
}
