/**
 * src/modes/BaseMode.js
 *
 * 所有操作模式的基类。
 * 定义了模式必须实现的方法，例如进入、退出、处理鼠标事件等。
 * 这是一个抽象概念，不应被直接实例化。
 */
export class BaseMode {
  /**
   * @param {string} name
   * @param {EventListeners} eventListeners
   * @param {DOMElement} dom
   */
  constructor(name, eventListeners, dom) {
    if (new.target === BaseMode) {
      throw new TypeError('Cannot construct BaseMode instances directly.')
    }
    this.name = name
    this.eventListeners = eventListeners
    this.dom = dom //事件绑定对象

    // 绑定事件处理函数，确保 'this' 上下文正确
    this._onMouseDown = this._onMouseDown.bind(this)
    this._onMouseMove = this._onMouseMove.bind(this)
    this._onMouseUp = this._onMouseUp.bind(this)
    this._onWheel = this._onWheel.bind(this)
    this._onKeyDown = this._onKeyDown.bind(this)
    this._onKeyUp = this._onKeyUp.bind(this)
    this._ondbClick = this._ondbClick.bind(this)
  }

  /**
   * 进入此模式时调用。
   * 在这里设置事件监听器、初始化模式特有的状态等。
   */
  enter() {
    // 子类必须实现
    throw new Error('Method "enter()" must be implemented by subclasses.')
  }

  /**
   * 退出此模式时调用。
   * 在这里移除事件监听器、清理模式特有的状态等。
   */
  exit() {
    // 子类必须实现
    throw new Error('Method "exit()" must be implemented by subclasses.')
  }

  /**
   * 在交互 Canvas 上注册模式相关的事件监听器。
   * @param {HTMLCanvasElement} canvas - 要监听事件的 Canvas 元素。
   * @protected
   */
  _addEventListeners() {
    const addEventListener = this.eventListeners.addEventListenerWithTracking.bind(
      this.eventListeners
    )
    addEventListener(this.dom, 'mousedown', this._onMouseDown)
    addEventListener(this.dom, 'mousemove', this._onMouseMove)
    addEventListener(this.dom, 'mouseup', this._onMouseUp)
    addEventListener(this.dom, 'wheel', this._onWheel, {
      passive: false
    }) // 阻止默认滚动
    addEventListener(window, 'keydown', this._onKeyDown)
    addEventListener(window, 'keyup', this._onKeyUp)
    addEventListener(this.dom, 'dblclick', this._ondbClick)
  }

  /**
   * 移除模式相关的事件监听器。
   * @protected
   */
  _removeEventListeners() {
    this.eventListeners.removeAllEventListeners()
  }

  /**
   * 鼠标按下事件处理。
   * @param {MouseEvent} e - 鼠标事件对象。
   * @protected
   */
  _onMouseDown(e) {
    /* 子类实现 */
  }

  /**
   * 鼠标移动事件处理。
   * @param {MouseEvent} e - 鼠标事件对象。
   * @protected
   */
  _onMouseMove(e) {
    /* 子类实现 */
  }

  /**
   * 鼠标松开事件处理。
   * @param {MouseEvent} e - 鼠标事件对象。
   * @protected
   */
  _onMouseUp(e) {
    /* 子类实现 */
  }

  /**
   * 鼠标滚轮事件处理（用于缩放）。
   * @param {WheelEvent} e - 滚轮事件对象。
   * @protected
   */
  _onWheel(e) {
    /* 子类实现 */
  }

  /**
   * 键盘按下事件处理。
   * @param {KeyboardEvent} e - 键盘事件对象。
   * @protected
   */
  _onKeyDown(e) {
    /* 子类实现 */
  }

  /**
   * 键盘抬起事件处理。
   * @param {KeyboardEvent} e - 键盘事件对象。
   * @protected
   */
  _onKeyUp(e) {
    /* 子类实现 */
  }

  /**
   * 双击事件处理。
   * @param {MouseEvent} e - 鼠标事件对象。
   * @protected
   */
  _ondbClick(e) {
    /* 子类实现 */
  }
}
