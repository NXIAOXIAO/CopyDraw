import { ViewEditMode } from '../modes/ViewEditMode.js'
import { DrawMode } from '../modes/DrawMode.js'
import { RenderMode } from '../modes/RenderMode.js'

export class ModeManager {
  constructor(eventEmitter, viewport, dataManager, canvasArea, commandManager) {
    this.eventEmitter = eventEmitter
    this.currentMode = null // 初始化为null，确保第一次能正确激活
    this.modes = {
      'view-edit': {
        mode: new ViewEditMode(eventEmitter, viewport, dataManager, canvasArea, commandManager)
      },
      draw: {
        mode: new DrawMode(eventEmitter, viewport, dataManager, canvasArea, commandManager)
      },
      render: {
        mode: new RenderMode(eventEmitter, viewport, dataManager, canvasArea)
      }
    }
    this.eventEmitter.on('modeChange', (modeName) => {
      this.switchMode(modeName)
    })
    console.log('[ModeManager] 模式管理器初始化完成')
    this.switchMode('view-edit') // 激活初始模式
  }

  switchMode(modeName) {
    if (!this.modes[modeName]) {
      throw new Error(`模式 ${modeName} 不存在`)
    }
    if (this.currentMode === modeName) {
      console.log(`[ModeManager] 模式 ${modeName} 已经是当前模式，跳过切换`)
      return
    }

    console.log(`[ModeManager] 切换模式: ${this.currentMode} -> ${modeName}`)

    // 获取当前鼠标位置（如果当前模式有跟踪）
    let currentMousePos = null
    if (this.currentMode && this.modes[this.currentMode]) {
      const currentMode = this.modes[this.currentMode].mode
      if (currentMode.mousePos) {
        currentMousePos = { ...currentMode.mousePos }
        console.log('[ModeManager] 保存当前鼠标位置:', currentMousePos)
      }
    }

    // 先停用当前模式
    if (this.currentMode && this.modes[this.currentMode]) {
      this.modes[this.currentMode].mode.deactivate()
    }

    this.currentMode = modeName
    const newMode = this.modes[modeName].mode

    // 如果新模式支持鼠标位置，传递当前位置
    if (currentMousePos && newMode.mousePos !== undefined) {
      newMode.mousePos = currentMousePos
      console.log('[ModeManager] 传递鼠标位置到新模式:', currentMousePos)
    }

    newMode.activate()

    console.log(`[ModeManager] 模式切换完成: ${modeName}`)
  }

  /**
   * 获取当前模式实例
   */
  getCurrentMode() {
    return this.currentMode ? this.modes[this.currentMode].mode : null
  }
}
