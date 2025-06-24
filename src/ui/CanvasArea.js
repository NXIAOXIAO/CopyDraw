/**
 * CanvasArea
 * 负责 canvas 渲染与事件分发
 */
export class CanvasArea {
  constructor(mainRoot) {
    this.mainRoot = mainRoot
    this.backgroundCanvas = mainRoot.querySelector('#backgroundCanvas')
    this.dataCanvas = mainRoot.querySelector('#dataCanvas')
    this.temporaryCanvas = mainRoot.querySelector('#temporaryCanvas')
    this.selectCanvas = mainRoot.querySelector('#selectCanvas')
  }

  /**
   * 绑定所有UI事件，仅 emit，不处理业务
   * @param {Function} emit
   */
  bindEventEmit(emit) {
    // 这里只处理 pointer 事件，实际业务交给 mode
    ;['mousedown', 'mousemove', 'mouseup', 'mouseleave'].forEach((type) => {
      this.dataCanvas.addEventListener(type, (e) => {
        emit(type, { x: e.offsetX, y: e.offsetY, raw: e })
      })
    })
  }

  /**
   * 渲染指定元素集合
   * @param {Array<Element>} elements
   * @param {Render} render
   */
  render(elements, render) {
    render.render(elements)
  }

  /**
   * 渲染临时绘制
   * @param {object} drawState
   */
  renderTemp(drawState) {
    const ctx = this.temporaryCanvas.getContext('2d')
    ctx.clearRect(0, 0, this.temporaryCanvas.width, this.temporaryCanvas.height)
    if (!drawState) return
    ctx.save()
    ctx.strokeStyle = '#f78d23'
    ctx.lineWidth = 2
    ctx.setLineDash([4, 2])
    ctx.strokeRect(
      drawState.x0,
      drawState.y0,
      drawState.x1 - drawState.x0,
      drawState.y1 - drawState.y0
    )
    ctx.restore()
  }
}
