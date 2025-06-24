/**
 * Viewport
 * 提供画布坐标与屏幕坐标的变换、缩放、平移等方法
 * 只负责数学转换，不管理渲染和UI
 */
export class Viewport {
  constructor() {
    this.offsetX = 0
    this.offsetY = 0
    this.scale = 1
  }

  /**
   * 将屏幕坐标转换为画布坐标
   * @param {number} sx 屏幕 x
   * @param {number} sy 屏幕 y
   * @returns {{x: number, y: number}}
   */
  screenToCanvas(sx, sy) {
    return {
      x: (sx - this.offsetX) / this.scale,
      y: (sy - this.offsetY) / this.scale
    }
  }

  /**
   * 画布坐标转屏幕坐标
   * @param {number} cx
   * @param {number} cy
   */
  canvasToScreen(cx, cy) {
    return {
      x: cx * this.scale + this.offsetX,
      y: cy * this.scale + this.offsetY
    }
  }

  /**
   * 设置缩放
   * @param {number} scale
   */
  setScale(scale) {
    this.scale = scale
  }

  /**
   * 平移视口
   * @param {number} dx
   * @param {number} dy
   */
  pan(dx, dy) {
    this.offsetX += dx
    this.offsetY += dy
  }

  /**
   * 复位
   */
  reset() {
    this.offsetX = 0
    this.offsetY = 0
    this.scale = 1
  }
}
