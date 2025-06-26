/**
 * 事件派发器，实现 on/emit/off
 * 一个简单的事件发布/订阅机制。
 * 允许模块之间进行解耦通信。
 */
export class EventEmitter {
  constructor() {
    /**
     * @private
     * @type {Object.<string, Array<function>>}
     * 存储不同事件类型及其对应的监听器数组。
     */
    this._listeners = {}
  }

  /**
   * 注册一个事件监听器。
   * 当指定类型的事件发生时，会调用此监听器。
   * @param {string} eventType - 要监听的事件类型（例如 'elementsChange', 'modeChange'）。
   * @param {function} listener - 事件发生时要执行的回调函数。
   */
  on(eventType, listener) {
    if (!this._listeners[eventType]) {
      this._listeners[eventType] = []
    }
    // 检查监听器是否已存在，避免重复添加
    if (!this._listeners[eventType].includes(listener)) {
      this._listeners[eventType].push(listener)
    }
  }

   /**
   * 移除一个事件监听器。
   * 如果没有提供特定的监听器，则移除所有针对该事件类型的监听器。
   * @param {string} eventType - 要移除监听器的事件类型。
   * @param {function} [listener] - 要移除的特定回调函数。
   */
   off(eventType, listener) {
    if (!this._listeners[eventType]) {
      return
    }
    if (listener) {
      this._listeners[eventType] = this._listeners[eventType].filter(
        (l) => l !== listener
      )
    } else {
      // 如果未提供监听器，则移除所有该事件类型的监听器
      delete this._listeners[eventType]
    }
  }

  /**
   * 触发一个事件，并向所有注册的监听器广播数据。
   * @param {string} eventType - 要触发的事件类型。
   * @param {*} [data] - 传递给监听器的数据。
   */
  emit(eventType, data) {
    if (this._listeners[eventType]) {
      // 使用 slice() 创建一个副本，以防止在遍历时修改数组（例如，监听器中移除自身）
      this._listeners[eventType].slice().forEach((listener) => {
        try {
          listener(data)
        } catch (error) {
          console.error(`Error in event listener for "${eventType}":`, error)
        }
      })
    }
  }
}
