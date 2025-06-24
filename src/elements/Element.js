/**
 * Element 基类
 * 所有元素通用属性和方法，提供 selectorRender（被选中时渲染），默认渲染交给 Render
 * @abstract
 */
export class Element {
  constructor({ id, type }) {
    this.id = id
    this.type = type
    this.selected = false
  }

  /**
   * 选择器渲染（被选中时的高亮/辅助锚点等）
   * @param {CanvasRenderingContext2D} ctx
   * @param {Viewport} viewport
   * @abstract
   */
  selectorRender(ctx, viewport) {
    // 具体元素子类实现
  }
}
