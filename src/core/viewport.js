import { EventEmitter } from '../common/EventEmitter.js'
/**
 * Viewport：视图变换器
 * 用途：负责视图的平移、缩放、旋转，提供世界坐标与canvas坐标的映射。
 * 参数：canvasElements 画布元素集合
 * 方法：
 *   - constructor(canvasElements)
 *   - toWorld(x, y): canvas坐标转世界坐标
 *   - toCanvas(x, y): 世界坐标转canvas坐标
 */
export class Viewport {
  /**
   * @param {EventEmitter} eventEmitter - 事件派发器
   */
  constructor(eventEmitter) {
    this.eventEmitter = eventEmitter
    this.xoffset = 0
    this.yoffset = 0
    this.scale = 1
    this.rotate = 0
    this.width = 0
    this.height = 0

    // 从 localStorage 加载状态 不包括width/height
    this.loadFromLocalStorage()

    // 由外部进行初始化 width/height
    this.eventEmitter.on('canvasSizeChange', (data) => {
      this.update({
        width: data.width,
        height: data.height
      })
    })
    console.log('[Viewport] 视口状态初始化', this)
  }

  /**
   * 更新视口状态 统一使用此方法更新，方便进行事件通知
   * @param {Object} newData
   */
  update(newData) {
    Object.assign(this, newData)
    this.eventEmitter.emit('viewportChange')
    this.eventEmitter.emit(
      'infoChange',
      `xoffset: ${this.xoffset.toFixed(2)}, yoffset: ${this.yoffset.toFixed(
        2
      )}, scale: ${this.scale.toFixed(2)}, rotate: ${this.rotate.toFixed(
        2
      )}, width: ${this.width.toFixed(2)}, height: ${this.height.toFixed(2)}`
    )
    console.log('[Viewport] 视口状态更新', this)
    this.saveToLocalStorage()
  }

  /**
   * 从 localStorage 加载状态
   * @private
   */
  loadFromLocalStorage() {
    try {
      const obj = JSON.parse(localStorage.getItem('viewport') || '{}')
      this.xoffset = obj.xoffset || 0
      this.yoffset = obj.yoffset || 0
      this.scale = obj.scale || 1
      this.rotate = obj.rotate || 0
    } catch (e) {
      console.error('[Viewport] 加载状态失败:', e)
    }
  }

  /**
   * 保存状态到 localStorage
   * @private
   */
  saveToLocalStorage() {
    try {
      const data = {
        xoffset: this.xoffset,
        yoffset: this.yoffset,
        scale: this.scale,
        rotate: this.rotate
      }
      localStorage.setItem('viewport', JSON.stringify(data))
    } catch (e) {
      console.error('[Viewport] 保存状态失败:', e)
    }
  }

  /**
   * 世界坐标转canvas坐标
   * @param {Object|number} wx 世界坐标x或包含x,y属性的对象
   * @param {number} [wy] 世界坐标y
   * @returns {{x: number, y: number}}
   */
  toCanvas(wx, wy) {
    try {
      let worldX, worldY

      // 处理参数
      if (typeof wx === 'object' && wx !== null) {
        if (!wx.hasOwnProperty('x') || !wx.hasOwnProperty('y')) {
          console.error('[Viewport] toCanvas参数无效:', { wx, wy })
          return { x: 0, y: 0 }
        }
        worldX = wx.x
        worldY = wx.y
      } else {
        if (typeof wx !== 'number' || typeof wy !== 'number') {
          console.error('[Viewport] toCanvas参数无效:', { wx, wy })
          return { x: 0, y: 0 }
        }
        worldX = wx
        worldY = wy
      }

      // 获取变换参数
      const { rotate, scale, xoffset, yoffset, width, height } = this

      // 计算变换
      const x1 = (worldX - xoffset) / scale - width / 2
      const y1 = (worldY - yoffset) / scale - height / 2
      const x2 = x1 * Math.cos(rotate) + y1 * Math.sin(rotate)
      const y2 = -x1 * Math.sin(rotate) + y1 * Math.cos(rotate)
      const vx = x2 + width / 2
      const vy = y2 + height / 2

      return { x: vx, y: vy }
    } catch (e) {
      console.error('[Viewport] toCanvas异常:', e)
      return { x: 0, y: 0 }
    }
  }

  /**
   * canvas坐标转世界坐标
   * @param {Object|number} vx canvas坐标x或包含x,y属性的对象
   * @param {number} [vy] canvas坐标y
   * @returns {{x: number, y: number}}
   */
  toWorld(vx, vy) {
    try {
      let canvasX, canvasY

      // 处理参数
      if (typeof vx === 'object' && vx !== null) {
        if (!vx.hasOwnProperty('x') || !vx.hasOwnProperty('y')) {
          console.error('[Viewport] toWorld参数无效:', { vx, vy })
          return { x: 0, y: 0 }
        }
        canvasX = vx.x
        canvasY = vx.y
      } else {
        if (typeof vx !== 'number' || typeof vy !== 'number') {
          console.error('[Viewport] toWorld参数无效:', { vx, vy })
          return { x: 0, y: 0 }
        }
        canvasX = vx
        canvasY = vy
      }

      // 获取变换参数
      const { rotate, scale, xoffset, yoffset, width, height } = this

      // 计算逆变换
      const x1 = canvasX - width / 2
      const y1 = canvasY - height / 2
      const x2 = x1 * Math.cos(-rotate) + y1 * Math.sin(-rotate)
      const y2 = -x1 * Math.sin(-rotate) + y1 * Math.cos(-rotate)
      const wx = (x2 + width / 2) * scale + xoffset
      const wy = (y2 + height / 2) * scale + yoffset

      return { x: wx, y: wy }
    } catch (e) {
      console.error('[Viewport] toWorld异常:', e)
      return { x: 0, y: 0 }
    }
  }

  /**
   * 检查点是否在视口内
   * @param {Object|number} vx canvas坐标x或包含x,y属性的对象
   * @param {number} [vy] canvas坐标y
   * @returns {boolean}
   */
  isInsideViewport(vx, vy) {
    try {
      let viewX, viewY

      // 处理参数
      if (typeof vx === 'object' && vx !== null) {
        viewX = vx.x
        viewY = vx.y
      } else {
        viewX = vx
        viewY = vy
      }

      // 参数验证
      if (typeof viewX !== 'number' || typeof viewY !== 'number') {
        console.error('[Viewport] isInsideViewport参数无效:', { vx, vy })
        return false
      }

      return viewX >= 0 && viewX <= this.width && viewY >= 0 && viewY <= this.height
    } catch (e) {
      console.error('[Viewport] isInsideViewport异常:', e)
      return false
    }
  }
}
