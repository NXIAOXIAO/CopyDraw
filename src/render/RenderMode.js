/**
 * RenderMode
 * 渲染模式，用于自定义特殊渲染表现，如高亮、特效等。
 * 通过 Render 统一调用（如 renderMode.renderElement(ele, ctx, viewport)）
 */
export class RenderMode {
  constructor() {}

  /**
   * 为指定元素提供个性化渲染
   * @param {Element} ele
   * @param {CanvasRenderingContext2D} ctx
   * @param {Viewport} viewport
   */
  renderElement(ele, ctx, viewport) {
    // 可扩展不同类型的渲染模式
    if (ele.type === 'rect') {
      ctx.save()
      ctx.globalAlpha = 0.7
      ctx.fillStyle = '#ff0'
      const { x, y } = viewport.canvasToScreen(ele.x, ele.y)
      ctx.fillRect(x, y, ele.width * viewport.scale, ele.height * viewport.scale)
      ctx.restore()
    }
    // 其他类型可自定义
  }
}
