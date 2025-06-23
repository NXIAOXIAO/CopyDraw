export class Render {
  constructor(canvasArea, dataManager, viewport) {
    this.canvasArea = canvasArea
    this.viewport = viewport
    this.dataManager = dataManager
    this.selectedElements = [] // 由模式注入
    this.selectBox = null // {Start, End} 由模式注入
    this.selectedPointIdx = -1 //选择点
    this.selectedLine = null // 选择的线

    this.mousePos = null //鼠标位置
    this.isDrawMode = false //绘制模式响应
    this.isPenMode = false
    this.drawLinePoints = [] //临时绘制的点
    this.drawLines = [] //记录绘制线，还未保存到数据库中
  }
  // 主渲染入口
  renderAll() {
    this.clearAll()
    this.renderImages()
    this.renderLines()
    this.renderTemporary()
  }
  clearAll() {
    this.clearImages()
    this.clearLines()
    this.clearTemporary()
  }

  clearImages() {
    this.canvasArea.backgroundCtx.clearRect(
      0,
      0,
      this.canvasArea.backgroundCanvas.width,
      this.canvasArea.backgroundCanvas.height
    )
  }

  renderImages() {
    const ctx = this.canvasArea.backgroundCtx
    this.clearImages()
    const viewport = this.viewport
    for (const img of this.dataManager.imgs) {
      if (img.imgdata) {
        const canvasPos = viewport.worldToViewport(img.x, img.y)
        const [newW, newH] = [
          img.imgdata.width / viewport.scale,
          img.imgdata.height / viewport.scale
        ]
        ctx.save()
        ctx.translate(canvasPos.x, canvasPos.y)
        ctx.rotate(-(viewport.rotate - img.oA))
        ctx.drawImage(img.imgdata, -newW / 2, -newH / 2, newW, newH)
        ctx.restore()
      }
    }
  }

  clearLines() {
    this.canvasArea.dataCtx.clearRect(
      0,
      0,
      this.canvasArea.dataCanvas.width,
      this.canvasArea.dataCanvas.height
    )
  }
  renderLines() {
    const ctx = this.canvasArea.dataCtx
    this.clearLines()
    ctx.save()
    ctx.strokeStyle = '#46A5F3'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    const viewport = this.viewport
    for (const line of this.dataManager.lines) {
      ctx.beginPath()
      let hasVisible = false
      for (let i = 0; i < line.geometies.length - 1; i++) {
        const ps = viewport.worldToViewport(line.geometies[i].x, line.geometies[i].y)
        const pe = viewport.worldToViewport(line.geometies[i + 1].x, line.geometies[i + 1].y)
        if (viewport.isInsideViewport(ps.x, ps.y) || viewport.isInsideViewport(pe.x, pe.y)) {
          ctx.moveTo(ps.x, ps.y)
          ctx.lineTo(pe.x, pe.y)
          hasVisible = true
        }
      }
      if (hasVisible) {
        ctx.stroke()
      }
    }
    if (this.isPenMode && this.drawLines.length > 0) {
      for (const line of this.drawLines) {
        ctx.beginPath()
        let hasVisible = false
        for (let i = 0; i < line.length - 1; i++) {
          const ps = viewport.worldToViewport(line[i].x, line[i].y)
          const pe = viewport.worldToViewport(line[i + 1].x, line[i + 1].y)
          if (viewport.isInsideViewport(ps.x, ps.y) || viewport.isInsideViewport(pe.x, pe.y)) {
            ctx.moveTo(ps.x, ps.y)
            ctx.lineTo(pe.x, pe.y)
            hasVisible = true
          }
        }
        if (hasVisible) {
          ctx.stroke()
        }
      }
    }
    ctx.restore()
  }

  clearTemporary() {
    this.canvasArea.temporaryCtx.clearRect(
      0,
      0,
      this.canvasArea.temporaryCanvas.width,
      this.canvasArea.temporaryCanvas.height
    )
  }

  renderTemporary() {
    const ctx = this.canvasArea.temporaryCtx
    this.clearTemporary()
    const viewport = this.viewport
    // DrawMode 临时绘制
    if (this.isDrawMode) {
      if (this.mousePos) {
        // 鼠标准星/笔尖
        if (this.isPenMode) {
          // 橙色圆点
          ctx.save()
          ctx.beginPath()
          ctx.arc(this.mousePos.x, this.mousePos.y, 6, 0, Math.PI * 2)
          ctx.fillStyle = '#f1900b'
          ctx.fill()
          ctx.restore()
        } else {
          // 画一个5x5的十字准星，中间镂空
          const size = 20
          const gap = 6 // 镂空的长度
          const half = Math.floor(size / 2)
          const halfGap = Math.floor(gap / 2)
          const nowx = this.mousePos.x
          const nowy = this.mousePos.y
          ctx.save()
          ctx.strokeStyle = '#58F07C'
          ctx.lineWidth = 2

          // 垂直线（上半部分）
          ctx.beginPath()
          ctx.moveTo(nowx, nowy - half)
          ctx.lineTo(nowx, nowy - halfGap)
          ctx.stroke()

          // 垂直线（下半部分）
          ctx.beginPath()
          ctx.moveTo(nowx, nowy + halfGap)
          ctx.lineTo(nowx, nowy + half)
          ctx.stroke()

          // 水平线（左半部分）
          ctx.beginPath()
          ctx.moveTo(nowx - half, nowy)
          ctx.lineTo(nowx - halfGap, nowy)
          ctx.stroke()

          // 水平线（右半部分）
          ctx.beginPath()
          ctx.moveTo(nowx + halfGap, nowy)
          ctx.lineTo(nowx + half, nowy)
          ctx.stroke()

          ctx.restore()
        }
      }
      // 临时线段
      if (this.drawLinePoints && this.drawLinePoints.length > 0 && this.mousePos) {
        ctx.save()
        ctx.strokeStyle = '#58F07C'
        if (this.isPenMode) ctx.strokeStyle = '#a7a5b0'
        ctx.lineWidth = 2
        ctx.beginPath()
        const p1 = this.viewport.worldToViewport(this.drawLinePoints[0].x, this.drawLinePoints[0].y)
        ctx.moveTo(p1.x, p1.y)
        for (let i = 1; i < this.drawLinePoints.length; i++) {
          const pnext = this.viewport.worldToViewport(
            this.drawLinePoints[i].x,
            this.drawLinePoints[i].y
          )
          ctx.lineTo(pnext.x, pnext.y)
        }
        ctx.lineTo(this.mousePos.x, this.mousePos.y)
        //ctx.strokeStyle = '#f1900b'
        ctx.stroke()
        ctx.restore()
      }
    }

    // 选框
    // 框选高亮
    if (this.selectBox && this.selectBox.start && this.selectBox.end) {
      ctx.save()
      ctx.lineWidth = 3
      ctx.strokeStyle = '#58F07C'
      ctx.setLineDash([3, 5])
      const x = Math.min(this.selectBox.start.x, this.selectBox.end.x)
      const y = Math.min(this.selectBox.start.y, this.selectBox.end.y)
      const w = Math.abs(this.selectBox.end.x - this.selectBox.start.x)
      const h = Math.abs(this.selectBox.end.y - this.selectBox.start.y)
      ctx.strokeRect(x, y, w, h)
      ctx.restore()
    }
    // 高亮选中元素
    if (this.selectedElements && this.selectedElements.length > 0) {
      const viewport = this.viewport
      this.selectedElements.forEach((sel) => {
        if (sel.type === 'img') {
          const viewPos = viewport.worldToViewport(sel.x, sel.y)
          const [newW, newH] = [
            sel.imgdata.width / viewport.scale,
            sel.imgdata.height / viewport.scale
          ]
          ctx.save()
          ctx.strokeStyle = '#e87634'
          ctx.lineWidth = 3
          ctx.translate(viewPos.x, viewPos.y)
          ctx.rotate(-(viewport.rotate - sel.oA))
          ctx.strokeRect(-newW / 2, -newH / 2, newW, newH)
          ctx.restore()
        }
        if (sel.type === 'line') {
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
          sel.geometies.forEach((pt, idx) => {
            const cpt = viewport.worldToViewport(pt.x, pt.y)
            ctx.beginPath()
            ctx.arc(cpt.x, cpt.y, 6, 0, Math.PI * 2)
            ctx.fillStyle =
              this.selectedLine && this.selectedLine.id === sel.id && this.selectedPointIdx === idx
                ? '#1fe434'
                : '#fff'
            ctx.fill()
            ctx.stroke()
          })
          ctx.restore()
        } //line end
      })
    }
  }
}
