import { COLOR } from '../utils/Color.js'

export class Render {
  constructor(canvasArea, eventEmitter, viewport) {
    this.canvasArea = canvasArea
    this.eventEmitter = eventEmitter
    this.viewport = viewport
    this.eventEmitter.on('renderElements', (elements, excludeIds) => {
      this.renderElements(elements, excludeIds)
    })
    this.eventEmitter.on('renderTemporary', (temporary) => {
      this.renderTemporary(temporary)
    })
  }

  clearElements() {
    this.canvasArea.backgroundCtx.clearRect(
      0,
      0,
      this.canvasArea.backgroundCanvas.width,
      this.canvasArea.backgroundCanvas.height
    )
    this.canvasArea.dataCtx.clearRect(
      0,
      0,
      this.canvasArea.dataCanvas.width,
      this.canvasArea.dataCanvas.height
    )
  }

  clearTemporary() {
    this.canvasArea.temporaryCtx.clearRect(
      0,
      0,
      this.canvasArea.temporaryCanvas.width,
      this.canvasArea.temporaryCanvas.height
    )
  }

  renderElements(elements, excludeIds = []) {
    if (!Array.isArray(excludeIds)) excludeIds = []
    this.clearElements()
    const viewport = this.viewport
    console.log('[Render] renderElements: excludeIds =', excludeIds)
    for (const element of elements) {
      if (excludeIds.includes(element.id)) {
        console.log('[Render] renderElements: 排除元素', element.id, element.type)
        continue
      }
      if (element.type === 'ImgElement') {
        const ctx = this.canvasArea.backgroundCtx
        if (element.imgdata) {
          // 计算图片中心和缩放后宽高
          const canvasPos = viewport.toCanvas(element.x, element.y)
          const [newW, newH] = [
            element.imgdata.width / viewport.scale,
            element.imgdata.height / viewport.scale
          ]
          // 包围盒相交判断
          const imgLeft = canvasPos.x - newW / 2
          const imgRight = canvasPos.x + newW / 2
          const imgTop = canvasPos.y - newH / 2
          const imgBottom = canvasPos.y + newH / 2
          const vpLeft = 0
          const vpRight = this.canvasArea.backgroundCanvas.width
          const vpTop = 0
          const vpBottom = this.canvasArea.backgroundCanvas.height
          const overlap = !(
            imgRight < vpLeft ||
            imgLeft > vpRight ||
            imgBottom < vpTop ||
            imgTop > vpBottom
          )
          if (!overlap) continue
          // 旋转绘制
          const angle = -(viewport.rotate - element.oA)
          if (
            element.imgdata instanceof ImageBitmap ||
            element.imgdata instanceof HTMLImageElement ||
            element.imgdata instanceof HTMLCanvasElement ||
            (typeof OffscreenCanvas !== 'undefined' && element.imgdata instanceof OffscreenCanvas)
          ) {
            ctx.save()
            ctx.translate(canvasPos.x, canvasPos.y)
            ctx.rotate(angle)
            ctx.drawImage(element.imgdata, -newW / 2, -newH / 2, newW, newH)
            ctx.restore()
          } else {
            console.warn('[Render] imgdata 不是可绘制图片对象，跳过渲染', element)
          }
        }
      }
      if (element.type === 'LineElement') {
        // 所有点都不在视口内则不绘制
        const allOut = element.geometies.every((pt) => {
          const c = viewport.toCanvas(pt.x, pt.y)
          return !viewport.isInsideViewport(c.x, c.y)
        })
        if (allOut) {
          continue
        }

        const ctx = this.canvasArea.dataCtx
        ctx.save()
        ctx.strokeStyle = COLOR.LINE
        ctx.lineWidth = 3
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.beginPath()
        let hasVisible = false
        for (let i = 0; i < element.geometies.length - 1; i++) {
          const ps = viewport.toCanvas(element.geometies[i].x, element.geometies[i].y)
          const pe = viewport.toCanvas(element.geometies[i + 1].x, element.geometies[i + 1].y)
          if (viewport.isInsideViewport(ps.x, ps.y) || viewport.isInsideViewport(pe.x, pe.y)) {
            ctx.moveTo(ps.x, ps.y)
            ctx.lineTo(pe.x, pe.y)
            hasVisible = true
          }
        }

        if (hasVisible) {
          ctx.stroke()
        }
        ctx.restore()
      }
      if (element.type === 'PathElement') {
        const ctx = this.canvasArea.dataCtx
        ctx.save()
        ctx.strokeStyle = element.color || COLOR.PATH
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        const points = element.geometies
        if (points && points.length > 1) {
          // 所有点都不在视口内则不绘制
          const allOut = points.every((p) => {
            const c = viewport.toCanvas(p.x, p.y)
            return !viewport.isInsideViewport(c.x, c.y)
          })
          if (allOut) {
            ctx.restore()
            continue
          }
          for (let i = 1; i < points.length; i++) {
            const p0 = points[i - 1]
            const p1 = points[i]
            const c0 = viewport.toCanvas(p0.x, p0.y)
            const c1 = viewport.toCanvas(p1.x, p1.y)
            // pressure 映射线宽
            const w0 = p0.pressure ? 1 + p0.pressure * 4 : element.width || 2
            const w1 = p1.pressure ? 1 + p1.pressure * 4 : element.width || 2
            ctx.lineWidth = (w0 + w1) / 2
            ctx.beginPath()
            ctx.moveTo(c0.x, c0.y)
            ctx.lineTo(c1.x, c1.y)
            ctx.stroke()
          }
        }
        ctx.restore()
      }
    }
  }

  renderTemporary(temporary) {
    this.clearTemporary()
    // 调试：输出当前传入的 temporary 内容，便于排查高亮残留
    console.log('[Render] renderTemporary called with:', temporary)
    // 临时层彻底清空的判定：无选中、无移动、无框选、无drawMode
    if (
      !temporary ||
      (!(temporary.selectedElements && temporary.selectedElements.length > 0) &&
        !(temporary.movedElements && temporary.movedElements.length > 0) &&
        !temporary.selectBox &&
        !temporary.drawMode)
    ) {
      // 彻底无内容，直接清空并返回
      this.clearTemporary()
      return
    }

    const ctx = this.canvasArea.temporaryCtx
    const viewport = this.viewport

    // 渲染DrawMode的绘制状态
    if (temporary.drawMode) {
      // 渲染绘制中的线条点
      if (temporary.linePoints && temporary.linePoints.length > 0) {
        ctx.save()

        // 确定已绘制的点数量（不包括预览点）
        const actualPointsCount = temporary.isPenMode
          ? temporary.linePoints.length
          : temporary.linePoints.length > 1 && !temporary.isPenMode
          ? temporary.linePoints.length - 1
          : temporary.linePoints.length

        // 渲染已确定的线条（支持pressure线宽）
        if (actualPointsCount > 1) {
          ctx.strokeStyle = COLOR.DRAW
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          for (let i = 1; i < actualPointsCount; i++) {
            const p0 = temporary.linePoints[i - 1]
            const p1 = temporary.linePoints[i]
            const c0 = viewport.toCanvas(p0.x, p0.y)
            const c1 = viewport.toCanvas(p1.x, p1.y)
            const w0 = p0.pressure ? 1 + p0.pressure * 4 : 3
            const w1 = p1.pressure ? 1 + p1.pressure * 4 : 3
            ctx.lineWidth = (w0 + w1) / 2
            ctx.beginPath()
            ctx.moveTo(c0.x, c0.y)
            ctx.lineTo(c1.x, c1.y)
            ctx.stroke()
          }
        }

        // 渲染预览轨迹（两种模式都支持）
        if (temporary.linePoints.length > 1) {
          ctx.strokeStyle = COLOR.DRAW
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          ctx.setLineDash([5, 5]) // 虚线表示预览部分
          const lastActualPoint = viewport.toCanvas(
            temporary.linePoints[actualPointsCount - 1].x,
            temporary.linePoints[actualPointsCount - 1].y
          )
          const previewPoint = viewport.toCanvas(
            temporary.linePoints[temporary.linePoints.length - 1].x,
            temporary.linePoints[temporary.linePoints.length - 1].y
          )
          ctx.lineWidth = 3
          ctx.beginPath()
          ctx.moveTo(lastActualPoint.x, lastActualPoint.y)
          ctx.lineTo(previewPoint.x, previewPoint.y)
          ctx.stroke()
          ctx.setLineDash([])
        }

        // 渲染点（只在鼠标模式下显示）
        if (!temporary.isPenMode) {
          temporary.linePoints.forEach((pt, idx) => {
            const cpt = viewport.toCanvas(pt.x, pt.y)
            ctx.beginPath()
            ctx.arc(cpt.x, cpt.y, 5, 0, Math.PI * 2)

            // 区分不同类型的点
            if (idx === 0) {
              ctx.fillStyle = COLOR.PATH_POINT_START // 起点
              ctx.strokeStyle = COLOR.PATH_POINT
              ctx.lineWidth = 2
            } else if (idx < actualPointsCount) {
              ctx.fillStyle = COLOR.PATH_POINT_CONFIRMED // 已确定的点
              ctx.strokeStyle = COLOR.PATH_POINT
              ctx.lineWidth = 2
            } else {
              ctx.fillStyle = COLOR.PATH_POINT_PREVIEW // 预览点（橙色）
              ctx.strokeStyle = COLOR.PATH_POINT
              ctx.lineWidth = 2
            }

            ctx.fill()
            ctx.stroke()
          })
        }

        ctx.restore()
      }

      // 渲染鼠标位置
      if (temporary.mousePos) {
        if (temporary.isPenMode) {
          // 笔模式：显示圆形光标
          ctx.save()
          ctx.strokeStyle = COLOR.DRAW
          ctx.lineWidth = 2
          ctx.setLineDash([])

          const pos = temporary.mousePos
          ctx.beginPath()
          ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2)
          ctx.stroke()
          ctx.restore()
        } else {
          // 鼠标模式：显示十字准星
          const size = 20
          const gap = 6 // 镂空的长度
          const half = Math.floor(size / 2)
          const halfGap = Math.floor(gap / 2)
          const nowx = temporary.mousePos.x
          const nowy = temporary.mousePos.y

          ctx.save()
          ctx.strokeStyle = COLOR.DRAW_CURSOR_CROSS
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

      return // DrawMode不需要渲染其他临时内容
    }

    // 渲染选中元素的高亮
    if (temporary.selectedElements && temporary.selectedElements.length > 0) {
      // 只有在 isMovingElement 时才排除 movedElements
      const movingIds = temporary.isMovingElement
        ? (temporary.movedElements || []).map((e) => e.id)
        : []
      temporary.selectedElements.forEach((element) => {
        if (movingIds.includes(element.id)) return // 跳过正在移动的元素
        const strokeColor = COLOR.PATH_SELECTED
        const strokeWidth = 4
        if (element.type === 'ImgElement') {
          const viewPos = viewport.toCanvas(element.x, element.y)
          const [newW, newH] = [
            element.imgdata.width / viewport.scale,
            element.imgdata.height / viewport.scale
          ]
          ctx.save()
          ctx.strokeStyle = strokeColor
          ctx.lineWidth = strokeWidth
          ctx.translate(viewPos.x, viewPos.y)
          ctx.rotate(-(viewport.rotate - element.oA))
          ctx.strokeRect(-newW / 2, -newH / 2, newW, newH)
          ctx.restore()
        }
        if (element.type === 'LineElement') {
          ctx.save()
          ctx.strokeStyle = strokeColor
          ctx.lineWidth = strokeWidth
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          ctx.beginPath()
          const start = viewport.toCanvas(element.geometies[0].x, element.geometies[0].y)
          ctx.moveTo(start.x, start.y)
          for (let i = 1; i < element.geometies.length; i++) {
            const pt = viewport.toCanvas(element.geometies[i].x, element.geometies[i].y)
            ctx.lineTo(pt.x, pt.y)
          }
          ctx.stroke()
          // 显示点
          element.geometies.forEach((pt, idx) => {
            const cpt = viewport.toCanvas(pt.x, pt.y)
            ctx.beginPath()
            ctx.arc(cpt.x, cpt.y, 6, 0, Math.PI * 2)
            ctx.fillStyle =
              temporary.selectedElement &&
              temporary.selectedElement.id === element.id &&
              temporary.selectedPointIdx === idx
                ? COLOR.PATH_SELECTED_POINT
                : COLOR.PATH_POINT
            ctx.fill()
            ctx.stroke()
          })
          ctx.restore()
        }
        if (element.type === 'PathElement') {
          ctx.save()
          ctx.strokeStyle = strokeColor
          ctx.lineWidth = strokeWidth + 2
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          ctx.beginPath()
          if (element.geometies && element.geometies.length > 0) {
            const canvasPoints = element.geometies.map((p) => viewport.toCanvas(p))
            ctx.moveTo(canvasPoints[0].x, canvasPoints[0].y)
            for (let i = 1; i < canvasPoints.length; i++) {
              ctx.lineTo(canvasPoints[i].x, canvasPoints[i].y)
            }
          }
          ctx.stroke()
          ctx.restore()
        }
      })
    }

    // 渲染移动中的元素（使用movedElements）
    if (
      temporary.isMovingElement &&
      temporary.movedElements &&
      temporary.movedElements.length > 0
    ) {
      temporary.movedElements.forEach((element) => {
        ctx.save()
        ctx.strokeStyle = COLOR.PATH_MOVING // 移动时用红色
        ctx.lineWidth = 6 // 移动时线宽更粗
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        if (element.type === 'ImgElement') {
          const viewPos = viewport.toCanvas(element.x, element.y)
          const [newW, newH] = [
            element.imgdata.width / viewport.scale,
            element.imgdata.height / viewport.scale
          ]
          ctx.translate(viewPos.x, viewPos.y)
          ctx.rotate(-(viewport.rotate - element.oA))
          ctx.drawImage(element.imgdata, -newW / 2, -newH / 2, newW, newH)
          ctx.strokeRect(-newW / 2, -newH / 2, newW, newH)
        }
        if (element.type === 'LineElement') {
          ctx.beginPath()
          const start = viewport.toCanvas(element.geometies[0].x, element.geometies[0].y)
          ctx.moveTo(start.x, start.y)
          for (let i = 1; i < element.geometies.length; i++) {
            const pt = viewport.toCanvas(element.geometies[i].x, element.geometies[i].y)
            ctx.lineTo(pt.x, pt.y)
          }
          ctx.stroke()
        }
        if (element.type === 'PathElement') {
          ctx.beginPath()
          if (element.geometies && element.geometies.length > 0) {
            const canvasPoints = element.geometies.map((p) => viewport.toCanvas(p))
            ctx.moveTo(canvasPoints[0].x, canvasPoints[0].y)
            for (let i = 1; i < canvasPoints.length; i++) {
              ctx.lineTo(canvasPoints[i].x, canvasPoints[i].y)
            }
          }
          ctx.stroke()
        }
        ctx.restore()
      })
    }

    // 渲染选择框
    if (temporary.selectBox && temporary.selectBox.start && temporary.selectBox.end) {
      ctx.save()
      ctx.lineWidth = 3
      ctx.strokeStyle = COLOR.SELECT_BOX
      ctx.setLineDash([3, 5])

      const x = Math.min(temporary.selectBox.start.x, temporary.selectBox.end.x)
      const y = Math.min(temporary.selectBox.start.y, temporary.selectBox.end.y)
      const w = Math.abs(temporary.selectBox.end.x - temporary.selectBox.start.x)
      const h = Math.abs(temporary.selectBox.end.y - temporary.selectBox.start.y)

      ctx.strokeRect(x, y, w, h)
      ctx.restore()
    }
  }
}
