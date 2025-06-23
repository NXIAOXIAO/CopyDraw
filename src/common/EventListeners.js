/**
 * 实现简单的事件追踪，用于辅助mode切换
 */

export class EventListeners {
  constructor() {
    this._listeners = []
  }
  addEventListenerWithTracking(element, event, listener, ...args) {
    element.addEventListener(event, listener, ...args)
    this._listeners.push({ element, event, listener })
  }

  removeAllEventListeners() {
    this._listeners.forEach(({ element, event, listener }) => {
      element.removeEventListener(event, listener)
    })
    this._listeners.length = 0
  }
}
