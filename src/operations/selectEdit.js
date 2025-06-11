import { canvas, ctx2 } from '../controls/canvas.js'
import { globalData } from '../core/globalData.js'
import CanvasSelector from '../common/selector.js'
import { resetToolbar } from '../controls/toolbar.js'
import {
  addEventListenerWithTracking,
  removeAllEventListeners
} from '../common/eventListeners.js'
import { worldToCanvas, canvasToWorld } from '../common/utils.js'
import { viewport } from '../core/viewport.js'

export const selector = new CanvasSelector()
let selectedLine = null
let selectedPointIdx = null
let selectedImg = null
let dragPoint = false
let dragBox = false
let dragImg = false
let imgDragOffset = null
let boxStart = null
let boxEnd = null

// 初始化选择器渲染
export function renderSelector() {
  selector.init(canvas.width, canvas.height)
  // 绘制图片层
  globalData.imgs.forEach((img) => {
    selector.addObject(img.id, (ctx) => {
      const canvasPos = worldToCanvas(img.x, img.y)
      const [newW, newH] = [
        img.imgdata.width / viewport.scale,
        img.imgdata.height / viewport.scale
      ]
      ctx.save()
      ctx.translate(canvasPos.x, canvasPos.y)
      ctx.rotate(-viewport.rotate)
      ctx.fillRect(-newW / 2, -newH / 2, newW, newH)
      ctx.restore()
    })
  })
  // 绘制线层
  globalData.lines.forEach((line) => {
    selector.addObject(line.id, (ctx) => {
      if (line.geometies.length < 2) return
      ctx.beginPath()
      const start = worldToCanvas(line.geometies[0].x, line.geometies[0].y)
      ctx.moveTo(start.x, start.y)
      for (let i = 1; i < line.geometies.length; i++) {
        const pt = worldToCanvas(line.geometies[i].x, line.geometies[i].y)
        ctx.lineTo(pt.x, pt.y)
      }
      ctx.lineWidth = 8
      ctx.stroke()
      line.geometies.forEach((pt) => {
        const cpt = worldToCanvas(pt.x, pt.y)
        ctx.beginPath()
        ctx.arc(cpt.x, cpt.y, 12, 0, Math.PI * 2)
        ctx.fill()
      })
    })
  })
}

function drawSelection() {
  ctx2.clearRect(0, 0, canvas.width, canvas.height)
  // 框选高亮
  if (dragBox && boxStart && boxEnd) {
    ctx2.save()
    ctx2.strokeStyle = '#58F07C'
    ctx2.setLineDash([5, 5])
    ctx2.strokeRect(
      Math.min(boxStart.x, boxEnd.x),
      Math.min(boxStart.y, boxEnd.y),
      Math.abs(boxEnd.x - boxStart.x),
      Math.abs(boxEnd.y - boxStart.y)
    )
    ctx2.restore()
  }
  // 图片高亮
  if (selectedImg) {
    const canvasPos = worldToCanvas(selectedImg.x, selectedImg.y)
    const [newW, newH] = [
      selectedImg.imgdata.width / viewport.scale,
      selectedImg.imgdata.height / viewport.scale
    ]
    ctx2.save()
    ctx2.strokeStyle = '#e87634'
    ctx2.lineWidth = 3
    ctx2.translate(canvasPos.x, canvasPos.y)
    ctx2.rotate(-viewport.rotate)
    ctx2.strokeRect(-newW / 2, -newH / 2, newW, newH)
    ctx2.restore()
  }
  // 线高亮
  if (selectedLine) {
    ctx2.save()
    ctx2.strokeStyle = '#e87634'
    ctx2.lineWidth = 4
    ctx2.beginPath()
    const start = worldToCanvas(
      selectedLine.geometies[0].x,
      selectedLine.geometies[0].y
    )
    ctx2.moveTo(start.x, start.y)
    for (let i = 1; i < selectedLine.geometies.length; i++) {
      const pt = worldToCanvas(
        selectedLine.geometies[i].x,
        selectedLine.geometies[i].y
      )
      ctx2.lineTo(pt.x, pt.y)
    }
    ctx2.stroke()
    selectedLine.geometies.forEach((pt, idx) => {
      const cpt = worldToCanvas(pt.x, pt.y)
      ctx2.beginPath()
      ctx2.arc(cpt.x, cpt.y, 6, 0, Math.PI * 2)
      ctx2.fillStyle = selectedPointIdx === idx ? '#ff0' : '#fff'
      ctx2.fill()
      ctx2.stroke()
    })
    ctx2.restore()
  }
}

function getPointAt(line, x, y) {
  for (let i = 0; i < line.geometies.length; i++) {
    const pt = worldToCanvas(line.geometies[i].x, line.geometies[i].y)
    if (Math.abs(pt.x - x) < 8 && Math.abs(pt.y - y) < 8) return i
  }
  return null
}

function onMouseDown(e) {
  const id = selector.getIdFromCoordinates(e.offsetX, e.offsetY)
  // 如果已有选中线，忽略对图片的任何选择，只允许线或框选
  if (selectedLine) {
    selectedImg = null
    const ptIdx = getPointAt(selectedLine, e.offsetX, e.offsetY)
    if (ptIdx !== null) {
      selectedPointIdx = ptIdx
      dragPoint = true
      drawSelection()
      return
    }
    if (id === selectedLine.id) {
      drawSelection()
      return
    }
    if (id && !id.startsWith('img')) {
      selectedLine = globalData.lines.find((l) => l.id === id)
      selectedPointIdx = getPointAt(selectedLine, e.offsetX, e.offsetY)
      if (selectedPointIdx !== null) dragPoint = true
      drawSelection()
      return
    }
    // 点击空白或图片时，进入框选
    selectedLine = null
    selectedPointIdx = null
    dragBox = true
    boxStart = { x: e.offsetX, y: e.offsetY }
    boxEnd = { x: e.offsetX, y: e.offsetY }
    drawSelection()
    return
  }

  // 无线选中状态下，处理图片或线或框选
  if (id) {
    if (id.startsWith('img')) {
      selectedImg = globalData.imgs.find((img) => img.id === id)
      selectedLine = null
      const cpt = worldToCanvas(selectedImg.x, selectedImg.y)
      dragImg = true
      imgDragOffset = { x: e.offsetX - cpt.x, y: e.offsetY - cpt.y }
      drawSelection()
      return
    } else {
      selectedLine = globalData.lines.find((l) => l.id === id)
      selectedImg = null
      selectedPointIdx = getPointAt(selectedLine, e.offsetX, e.offsetY)
      if (selectedPointIdx !== null) dragPoint = true
      drawSelection()
      return
    }
  }
  // 默认框选
  selectedLine = null
  selectedImg = null
  selectedPointIdx = null
  dragBox = true
  boxStart = { x: e.offsetX, y: e.offsetY }
  boxEnd = { x: e.offsetX, y: e.offsetY }
  drawSelection()
}

function onMouseMove(e) {
  if (dragImg && selectedImg) {
    const nw = canvasToWorld(
      e.offsetX - imgDragOffset.x,
      e.offsetY - imgDragOffset.y
    )
    selectedImg.x = nw.x
    selectedImg.y = nw.y
    const idx = globalData.imgs.findIndex((img) => img.id === selectedImg.id)
    if (idx !== -1) {
      globalData.imgs[idx].x = nw.x
      globalData.imgs[idx].y = nw.y
      viewport.update()
      globalData.save()
    }
    drawSelection()
  } else if (dragPoint && selectedLine && selectedPointIdx !== null) {
    const wpt = canvasToWorld(e.offsetX, e.offsetY)
    selectedLine.geometies[selectedPointIdx] = { x: wpt.x, y: wpt.y }
    const idx = globalData.lines.findIndex((l) => l.id === selectedLine.id)
    if (idx !== -1) {
      globalData.lines[idx].geometies = [...selectedLine.geometies]
      viewport.update()
      globalData.save()
    }
    drawSelection()
  } else if (dragBox && boxStart) {
    boxEnd = { x: e.offsetX, y: e.offsetY }
    drawSelection()
  }
}

function onMouseUp(e) {
  dragImg = false
  dragPoint = false
  if (dragBox) {
    dragBox = false
    const x1 = Math.min(boxStart.x, boxEnd.x)
    const y1 = Math.min(boxStart.y, boxEnd.y)
    const x2 = Math.max(boxStart.x, boxEnd.x)
    const y2 = Math.max(boxStart.y, boxEnd.y)
    // 检测框选结果，优先线后图片
    selectedLine = null
    for (const line of globalData.lines) {
      if (
        line.geometies.some((pt) => {
          const cpt = worldToCanvas(pt.x, pt.y)
          return cpt.x >= x1 && cpt.x <= x2 && cpt.y >= y1 && cpt.y <= y2
        })
      ) {
        selectedLine = line
        break
      }
    }
    if (!selectedLine) {
      selectedImg = null
      for (const img of globalData.imgs) {
        const cpt = worldToCanvas(img.x, img.y)
        const w = img.imgdata?.width || img.width
        const h = img.imgdata?.height || img.height
        const left = cpt.x - (w * viewport.scale) / 2
        const top = cpt.y - (h * viewport.scale) / 2
        if (
          left >= x1 &&
          left + w * viewport.scale <= x2 &&
          top >= y1 &&
          top + h * viewport.scale <= y2
        ) {
          selectedImg = img
          break
        }
      }
    }
    drawSelection()
  }
}

function onDblClick(e) {
  const id = selector.getIdFromCoordinates(e.offsetX, e.offsetY)
  // 双击空白退出选择
  if (!id) {
    selectedLine = null
    selectedPointIdx = null
    selectedImg = null
    resetToolbar()
    drawSelection()
    return
  }
  // 仅在线模式下双击可插入点
  if (selectedLine && !id.startsWith('img')) {
    let minDist = Infinity
    let insertIdx = -1
    let insertPt = null
    for (let i = 0; i < selectedLine.geometies.length - 1; i++) {
      const p1 = worldToCanvas(
        selectedLine.geometies[i].x,
        selectedLine.geometies[i].y
      )
      const p2 = worldToCanvas(
        selectedLine.geometies[i + 1].x,
        selectedLine.geometies[i + 1].y
      )
      const t =
        ((e.offsetX - p1.x) * (p2.x - p1.x) +
          (e.offsetY - p1.y) * (p2.y - p1.y)) /
        ((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2)
      if (t >= 0 && t <= 1) {
        const proj = {
          x: p1.x + t * (p2.x - p1.x),
          y: p1.y + t * (p2.y - p1.y)
        }
        const dist = Math.hypot(proj.x - e.offsetX, proj.y - e.offsetY)
        if (dist < minDist && dist < 12) {
          minDist = dist
          insertIdx = i + 1
          insertPt = canvasToWorld(proj.x, proj.y)
        }
      }
    }
    if (insertIdx >= 0) {
      selectedLine.geometies.splice(insertIdx, 0, insertPt)
      drawSelection()
    }
  } else {
    // 双击图片或其他无操作
  }
}

function onKeyDown(e) {
  if (e.key === 'Enter') {
    viewport.update()
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    if (selectedImg) {
      const idx = globalData.imgs.findIndex((img) => img.id === selectedImg.id)
      if (idx !== -1) globalData.imgs.splice(idx, 1)
      viewport.update()
      globalData.save()
      selectedImg = null
      resetToolbar()
      drawSelection()
    } else if (selectedLine) {
      const idx = globalData.lines.findIndex((l) => l.id === selectedLine.id)
      if (idx !== -1) globalData.lines.splice(idx, 1)
      viewport.update()
      globalData.save()
      selectedLine = null
      selectedPointIdx = null
      resetToolbar()
      drawSelection()
    }
  }
}

export function installSelectEditOp() {
  removeAllEventListeners()
  addEventListenerWithTracking(canvas, 'mousedown', onMouseDown)
  addEventListenerWithTracking(canvas, 'mousemove', onMouseMove)
  addEventListenerWithTracking(canvas, 'mouseup', onMouseUp)
  addEventListenerWithTracking(canvas, 'dblclick', onDblClick)
  addEventListenerWithTracking(window, 'keydown', onKeyDown)
}
