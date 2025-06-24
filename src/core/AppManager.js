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
  /**
   * @param {Object} options
   * @param {boolean} options.debug 是否开启调试模式
   */
  constructor(options = {}) {
    super()
    if (AppManager._instance) return AppManager._instance
    this.debug = !!options.debug
    this.dataManager = new DataManager()
    this.viewport = new Viewport()
    this.commandInvoker = new CommandInvoker(this.dataManager)
    this.currentMode = null
    this.modes = {}
    this.uiEventListener = this._onUIEvent.bind(this)
    AppManager._instance = this
    // 移除 debug 数据插入逻辑
    if (this.debug) {
      console.log('[AppManager] Debug mode enabled')
    }
  }

  registerModes(modeInstances) {
    if (this.debug) console.log('[AppManager] registerModes', modeInstances)
    // 监听 elementsChanged 事件，输出调试日志
    this.dataManager.on('elementsChanged', (payload) => {
      if (this.debug) console.log('[AppManager] elementsChanged 事件触发', payload)
    })
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
    if (this.debug) console.log('[AppManager] switchMode', modeName)
    if (this.currentMode && this.currentMode.name === modeName) {
      if (this.debug) console.log('[AppManager] switchMode: already in mode', modeName)
      return
    }
    if (this.currentMode) this.currentMode.deactivate()
    this.currentMode = this.modes[modeName]
    if (this.currentMode) this.currentMode.activate()
    this.emit('modeChange', { mode: modeName })
  }

  _onUIEvent(eventType, payload) {
    if (this.debug) console.log('[AppManager] _onUIEvent', eventType, payload)
    if (!this.currentMode) return
    this.currentMode.handleUIEvent(eventType, payload)
  }

  /**
   * 监听 document/body 上的 uievent，确保全局都能收到
   * @param {HTMLElement|Document} root
   */
  bindUI(root) {
    if (this.debug) console.log('[AppManager] bindUI')
    root.addEventListener('uievent', (e) => {
      this._onUIEvent(e.detail.type, e.detail.payload)
    })
  }

  notifyUI(eventType, payload) {
    if (this.debug) console.log('[AppManager] notifyUI', eventType, payload)
    this.emit(eventType, payload)
  }
}
