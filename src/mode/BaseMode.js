/**
 * BaseMode
 * 所有模式基类，统一接口，负责事件注册/解绑
 * activate/deactivate 必须实现
 */
export class BaseMode {
  constructor() {
    this.name = 'base'
    this.context = null
    this._boundEvents = []
  }

  setContext(ctx) {
    this.context = ctx
  }

  activate() {
    // 事件注册
  }

  deactivate() {
    // 取消所有事件监听
    this._boundEvents.forEach(({ target, type, handler }) => {
      target.removeEventListener(type, handler)
    })
    this._boundEvents = []
  }

  /**
   * 事件注册辅助
   * @param {EventTarget} target
   * @param {string} type
   * @param {Function} handler
   */
  bindEvent(target, type, handler) {
    target.addEventListener(type, handler)
    this._boundEvents.push({ target, type, handler })
  }

  /**
   * 处理 UI 层事件
   * @param {string} eventType
   * @param {object} payload
   */
  handleUIEvent(eventType, payload) {}
}
