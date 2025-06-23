import { Viewport } from '../core/Viewport.js'
import { generateId } from '../utils/id.js'
/**
 * 元素基类，所有绘制元素应继承此类
 */
export class Element {
  /**
   * @param {string} type - 元素类型
   */
  constructor(type) {
    /** @type {string} */
    this.id = generateId(type) // 统一生成id
    /** @type {string} */
    this.type = type
  }

  /**
   * 选择器渲染（供 Selector 使用）
   * @param {CanvasRenderingContext2D} ctx
   * @param {Viewport} viewport
   */
  selectorRender(ctx, viewport) {
    // 子类实现具体渲染逻辑
  }
}
