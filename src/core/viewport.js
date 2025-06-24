/**
 * 完全复刻原 src/core/viewport.js，提供核心坐标转换与状态同步本地存储
 */
export class Viewport {
  constructor() {
    this._xoffset = 0
    this._yoffset = 0
    this._scale = 1
    this._rotate = 0
    this._width = 0
    this._height = 0
    this.loadFromLocalStorage()
  }

  get xoffset() {
    return this._xoffset
  }
  set xoffset(val) {
    this._xoffset = val
    this.saveToLocalStorage()
  }

  get yoffset() {
    return this._yoffset
  }
  set yoffset(val) {
    this._yoffset = val
    this.saveToLocalStorage()
  }

  get scale() {
    return this._scale
  }
  set scale(val) {
    this._scale = val
    this.saveToLocalStorage()
  }

  get rotate() {
    return this._rotate
  }
  set rotate(val) {
    this._rotate = val
    this.saveToLocalStorage()
  }

  get width() {
    return this._width
  }
  set width(val) {
    this._width = val
    this.saveToLocalStorage()
  }

  get height() {
    return this._height
  }
  set height(val) {
    this._height = val
    this.saveToLocalStorage()
  }

  loadFromLocalStorage() {
    let obj = JSON.parse(localStorage.getItem('viewport') || '{}')
    this._xoffset = obj.xoffset || 0
    this._yoffset = obj.yoffset || 0
    this._scale = obj.scale || 1
    this._rotate = obj.rotate || 0
    this._width = obj.width || 0
    this._height = obj.height || 0
  }
  saveToLocalStorage() {
    const data = {
      xoffset: this._xoffset,
      yoffset: this._yoffset,
      scale: this._scale,
      rotate: this._rotate,
      width: this._width,
      height: this._height
    }
    localStorage.setItem('viewport', JSON.stringify(data))
  }
  // 世界坐标转viewport坐标
  worldToViewport(wx, wy) {
    let { rotate, scale, xoffset, yoffset, width, height } = this
    let x1 = (wx - xoffset) / scale - width / 2
    let y1 = (wy - yoffset) / scale - height / 2
    let x2 = x1 * Math.cos(rotate) + y1 * Math.sin(rotate)
    let y2 = -x1 * Math.sin(rotate) + y1 * Math.cos(rotate)
    let vx = x2 + width / 2
    let vy = y2 + height / 2
    return { x: vx, y: vy }
  }
  // viewport坐标转世界坐标
  viewportToWorld(vx, vy) {
    let { rotate, scale, xoffset, yoffset, width, height } = this
    let x2 = vx - width / 2
    let y2 = vy - height / 2
    let x1 = x2 * Math.cos(rotate) - y2 * Math.sin(rotate)
    let y1 = x2 * Math.sin(rotate) + y2 * Math.cos(rotate)
    let wx = (x1 + width / 2) * scale + xoffset
    let wy = (y1 + height / 2) * scale + yoffset
    return { x: wx, y: wy }
  }
  isInsideViewport(vx, vy) {
    return vx >= 0 && vx <= this.width && vy >= 0 && vy <= this.height
  }
}
