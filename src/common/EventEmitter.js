/**
 * 事件派发器，实现 on/emit/off
 */
export class EventEmitter {
  constructor() {
    this._listeners = {}
  }

  on(type, handler) {
    if (!this._listeners[type]) this._listeners[type] = []
    this._listeners[type].push(handler)
  }

  off(type, handler) {
    if (!this._listeners[type]) return
    this._listeners[type] = this._listeners[type].filter((h) => h !== handler)
  }

  emit(type, payload) {
    if (!this._listeners[type]) return
    this._listeners[type].forEach((fn) => fn(payload))
  }
}
