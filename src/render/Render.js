/**
 * Render
 * 多层Canvas渲染：图片在backgroundCanvas，线条在dataCanvas，临时元素在temporaryCanvas
 * 支持模式切换、选中高亮
 *
 * 构造时只需传入canvasArea，渲染时传入dataManager/viewport/临时数据等
 */
export class Render {
  /**
   * @param {object} canvasArea - {backgroundCanvas, backgroundCtx, dataCanvas, dataCtx, temporaryCanvas, temporaryCtx}
   */
  constructor(canvasArea) {
    this.canvasArea = canvasArea
    this.mode = 'view' // 'view', 'draw', 'render'
  }

  setMode(mode) {
    this.mode = mode
  }

  // 合并图片和线条渲染
  renderElements(dataManager, viewport) {
    if (this.mode) console.log('[Render] 当前模式:', this.mode)
    // 检查 canvas 尺寸和 context
    if (this.canvasArea.backgroundCanvas && this.canvasArea.dataCanvas) {
      console.log(
        '[Render] backgroundCanvas size:',
        this.canvasArea.backgroundCanvas.width,
        this.canvasArea.backgroundCanvas.height
      )
      console.log(
        '[Render] dataCanvas size:',
        this.canvasArea.dataCanvas.width,
        this.canvasArea.dataCanvas.height
      )
      console.log('[Render] backgroundCtx:', this.canvasArea.backgroundCtx)
      console.log('[Render] dataCtx:', this.canvasArea.dataCtx)
    } else {
      console.warn('[Render] Canvas 未初始化', this.canvasArea)
    }
    this.clearImages()
    this.clearLines()
    // 图片
    const ctxImg = this.canvasArea.backgroundCtx
    const imgs =
      (dataManager.getAllElements
        ? dataManager.getAllElements().filter((e) => e.type === 'img')
        : dataManager.imgs) || []
    console.log('[Render] 图片元素数量:', imgs.length, imgs)
    for (const img of imgs) {
      if (img._imgLoaded && img._img) {
        const { x, y } = viewport.worldToViewport(img.x, img.y)
        const w = img.width * viewport.scale
        const h = img.height * viewport.scale
        console.log('[Render] 绘制图片:', img, { x, y, w, h })
        ctxImg.save()
        ctxImg.drawImage(img._img, x, y, w, h)
        ctxImg.restore()
      } else {
        console.log('[Render] 跳过未加载图片:', img)
      }
    }
    // 线条
    const ctxLine = this.canvasArea.dataCtx
    ctxLine.save()
    ctxLine.strokeStyle = '#46A5F3'
    ctxLine.lineWidth = 2
    ctxLine.lineCap = 'round'
    ctxLine.lineJoin = 'round'
    const lines =
      (dataManager.getAllElements
        ? dataManager.getAllElements().filter((e) => e.type === 'line')
        : dataManager.lines) || []
    console.log('[Render] 线条元素数量:', lines.length, lines)
    for (const line of lines) {
      if (line.geometies && line.geometies.length > 1) {
        ctxLine.beginPath()
        let hasVisible = false
        for (let i = 0; i < line.geometies.length - 1; i++) {
          const ps = viewport.worldToViewport(line.geometies[i].x, line.geometies[i].y)
          const pe = viewport.worldToViewport(line.geometies[i + 1].x, line.geometies[i + 1].y)
          ctxLine.moveTo(ps.x, ps.y)
          ctxLine.lineTo(pe.x, pe.y)
          hasVisible = true
        }
        if (hasVisible) {
          console.log('[Render] 绘制线条:', line)
          ctxLine.stroke()
        }
      } else if (line.points && line.points.length > 1) {
        ctxLine.beginPath()
        let hasVisible = false
        for (let i = 0; i < line.points.length - 1; i++) {
          const ps = viewport.worldToViewport(line.points[i].x, line.points[i].y)
          const pe = viewport.worldToViewport(line.points[i + 1].x, line.points[i + 1].y)
          ctxLine.moveTo(ps.x, ps.y)
          ctxLine.lineTo(pe.x, pe.y)
          hasVisible = true
        }
        if (hasVisible) {
          console.log('[Render] 绘制线条(points):', line)
          ctxLine.stroke()
        }
      }
    }
    ctxLine.restore()
  }

  clearImages() {
    if (!this.canvasArea.backgroundCtx) {
      console.warn('[Render] backgroundCtx 未初始化')
      return
    }
    this.canvasArea.backgroundCtx.clearRect(
      0,
      0,
      this.canvasArea.backgroundCanvas.width,
      this.canvasArea.backgroundCanvas.height
    )
  }

  clearLines() {
    if (!this.canvasArea.dataCtx) {
      console.warn('[Render] dataCtx 未初始化')
      return
    }
    this.canvasArea.dataCtx.clearRect(
      0,
      0,
      this.canvasArea.dataCanvas.width,
      this.canvasArea.dataCanvas.height
    )
  }

  clearTemporary() {
    if (!this.canvasArea.temporaryCtx) {
      console.warn('[Render] temporaryCtx 未初始化')
      return
    }
    this.canvasArea.temporaryCtx.clearRect(
      0,
      0,
      this.canvasArea.temporaryCanvas.width,
      this.canvasArea.temporaryCanvas.height
    )
  }

  // 临时绘制：点线
  renderTempLine({
    viewport,
    drawLinePoints = [],
    mousePos = null,
    isDrawMode = false,
    isPenMode = false
  }) {
    const ctx = this.canvasArea.temporaryCtx
    this.clearTemporary()
    if (isDrawMode && drawLinePoints && drawLinePoints.length > 0 && mousePos) {
      ctx.save()
      ctx.strokeStyle = isPenMode ? '#a7a5b0' : '#58F07C'
      ctx.lineWidth = 2
      ctx.beginPath()
      const p1 = viewport.worldToViewport(drawLinePoints[0].x, drawLinePoints[0].y)
      ctx.moveTo(p1.x, p1.y)
      for (let i = 1; i < drawLinePoints.length; i++) {
        const pnext = viewport.worldToViewport(drawLinePoints[i].x, drawLinePoints[i].y)
        ctx.lineTo(pnext.x, pnext.y)
      }
      ctx.lineTo(mousePos.x, mousePos.y)
      ctx.stroke()
      ctx.restore()
    }
  }

  // 临时绘制：选框
  renderTempBox({ selectBox }) {
    const ctx = this.canvasArea.temporaryCtx
    this.clearTemporary()
    if (selectBox && selectBox.start && selectBox.end) {
      ctx.save()
      ctx.lineWidth = 3
      ctx.strokeStyle = '#58F07C'
      ctx.setLineDash([3, 5])
      const x = Math.min(selectBox.start.x, selectBox.end.x)
      const y = Math.min(selectBox.start.y, selectBox.end.y)
      const w = Math.abs(selectBox.end.x - selectBox.start.x)
      const h = Math.abs(selectBox.end.y - selectBox.start.y)
      ctx.strokeRect(x, y, w, h)
      ctx.restore()
    }
  }

  // 临时绘制：高亮选中元素
  renderTempSelection({
    viewport,
    selectedElements = [],
    selectedPointIdx = -1,
    selectedLine = null
  }) {
    const ctx = this.canvasArea.temporaryCtx
    this.clearTemporary()
    if (selectedElements && selectedElements.length > 0) {
      selectedElements.forEach((sel) => {
        if (sel.type === 'img' && sel._imgLoaded && sel._img) {
          const viewPos = viewport.worldToViewport(sel.x, sel.y)
          const w = sel.width * viewport.scale
          const h = sel.height * viewport.scale
          ctx.save()
          ctx.strokeStyle = '#e87634'
          ctx.lineWidth = 3
          ctx.strokeRect(viewPos.x, viewPos.y, w, h)
          ctx.restore()
        }
        if (sel.type === 'line' && sel.geometies && sel.geometies.length > 0) {
          ctx.save()
          ctx.strokeStyle = '#e87634'
          ctx.lineWidth = 4
          ctx.beginPath()
          const start = viewport.worldToViewport(sel.geometies[0].x, sel.geometies[0].y)
          ctx.moveTo(start.x, start.y)
          for (let i = 1; i < sel.geometies.length; i++) {
            const pt = viewport.worldToViewport(sel.geometies[i].x, sel.geometies[i].y)
            ctx.lineTo(pt.x, pt.y)
          }
          ctx.stroke()
          ctx.restore()
        }
      })
    }
  }
}
