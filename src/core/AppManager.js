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
    this.modes = {} // {name: modeInstance}
    this.uiEventListener = this._onUIEvent.bind(this)
    AppManager._instance = this
  }

  /**
   * 注册所有业务模式
   * @param {Array<BaseMode>} modeInstances
   */
  registerModes(modeInstances) {
    modeInstances.forEach((mode) => {
      this.modes[mode.name] = mode
      mode.setContext({
        appManager: this,
        dataManager: this.dataManager,
        viewport: this.viewport,
        commandInvoker: this.commandInvoker,
        eventBus: this // 事件流通道
      })
    })
  }

  /**
   * 切换业务模式
   * @param {string} modeName
   */
  switchMode(modeName) {
    if (this.currentMode) this.currentMode.deactivate()
    this.currentMode = this.modes[modeName]
    if (this.currentMode) this.currentMode.activate()
    this.emit('modeChange', { mode: modeName })
  }

  /**
   * 处理 UI 层 emit 的事件（业务调度入口）
   * @param {string} eventType
   * @param {object} payload
   */
  _onUIEvent(eventType, payload) {
    if (!this.currentMode) return
    this.currentMode.handleUIEvent(eventType, payload)
  }

  /**
   * UI 层注册事件回调（如 UI 层 emit('xxx', payload)）
   * @param {HTMLElement} root
   */
  bindUI(root) {
    root.addEventListener('uievent', (e) => {
      this._onUIEvent(e.detail.type, e.detail.payload)
    })
  }

  /**
   * 业务变更时向 UI 层发送通知（如 elements 变更等）
   * @param {string} eventType
   * @param {object} payload
   */
  notifyUI(eventType, payload) {
    this.emit(eventType, payload) // UI 层通过订阅监听
  }
}
