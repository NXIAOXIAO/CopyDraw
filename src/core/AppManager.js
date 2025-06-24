/**
 * AppManager
 * 统一调度核心控制器，负责模式切换、事件分发、状态管理和 UI 通知。
 * 依赖 DataManager, Viewport, Render, CommandInvoker 等。
 *
 * 用法：单例模式，挂载全局 window.AppManager 或通过 import 获取。
 */
import { DataManager } from './DataManager.js'
import { Viewport } from './Viewport.js'
import { CommandInvoker } from '../commands/CommandInvoker.js'
import { EventEmitter } from '../common/EventEmitter.js'

export class AppManager extends EventEmitter {
  constructor() {
    super()
    if (AppManager._instance) return AppManager._instance
    this.dataManager = new DataManager()
    this.viewport = new Viewport()
    this.commandInvoker = new CommandInvoker(this.dataManager)
    this.currentMode = null
    this.modes = {}
    this.uiEventListener = this._onUIEvent.bind(this)
    AppManager._instance = this
  }

  registerModes(modeInstances) {
    modeInstances.forEach((mode) => {
      this.modes[mode.name] = mode
      mode.setContext({
        appManager: this,
        dataManager: this.dataManager,
        viewport: this.viewport,
        commandInvoker: this.commandInvoker,
        eventBus: this
      })
    })
  }

  switchMode(modeName) {
    if (this.currentMode) this.currentMode.deactivate()
    this.currentMode = this.modes[modeName]
    if (this.currentMode) this.currentMode.activate()
    this.emit('modeChange', { mode: modeName })
  }

  _onUIEvent(eventType, payload) {
    if (!this.currentMode) return
    this.currentMode.handleUIEvent(eventType, payload)
  }

  /**
   * 监听 document/body 上的 uievent，确保全局都能收到
   * @param {HTMLElement|Document} root
   */
  bindUI(root) {
    root.addEventListener('uievent', (e) => {
      this._onUIEvent(e.detail.type, e.detail.payload)
    })
  }

  notifyUI(eventType, payload) {
    this.emit(eventType, payload)
  }
}
