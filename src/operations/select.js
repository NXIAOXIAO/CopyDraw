import { canvas, ctx2 } from '../controls/canvas.js'
import {
  addEventListenerWithTracking,
  removeAllEventListeners
} from '../common/eventListeners.js'

import { globalData } from '../core/globalData.js'
import logger from '../common/logger.js'
import { viewport } from '../core/viewport.js'
import { worldToCanvas, canvasToWorld } from '../common/utils.js'
import CanvasSelector from '../common/selector.js'

export function installSelectOp() {
  removeAllEventListeners()
  selection = []
  selectedLine = null
  selectedPointIdx = null
  addEventListenerWithTracking(canvas, 'wheel', defaultWheel, { passive: true })

  addEventListenerWithTracking(canvas, 'mousedown', selectMouseDown)
  addEventListenerWithTracking(canvas, 'mousemove', selectMouseMove)
  addEventListenerWithTracking(canvas, 'mouseup', selectMouseUp)
  addEventListenerWithTracking(canvas, 'dblclick', selectDblClick)
  addEventListenerWithTracking(document, 'keydown', selectKeyDown)
  viewport.update()
}

//让在选择时也可以正常移动视图
let lastPos = {}
let clickdown = false
let clickdown2 = false //用于移动视图标记

// 默认模式即可选择元素进行相关操作
export const selector = new CanvasSelector()
//选择的对象数组 需支持多选
let selection = []

//选择框
let dragBox = false
let boxStart = null
let boxEnd = null
let clickPoint = null

//为选择线的编辑添加支持
let selectedLine = null
let selectedPointIdx = null

//移动元素
let moveFlag = false
let moveBegin = null

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
      ctx.rotate(-(viewport.rotate - img.oA))
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

//选择高亮显示
function drawSelection() {
  ctx2.clearRect(0, 0, canvas.width, canvas.height)
  // 框选高亮
  if (dragBox && boxStart && boxEnd) {
    ctx2.save()
    ctx2.lineWidth = 2
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

  //选择元素高亮
  if (selection.length > 0) {
    selection.forEach((sel) => {
      if (sel.startsWith('img')) {
        let selectedImg = globalData.imgs.find((img) => img.id === sel)
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
          ctx2.rotate(-(viewport.rotate - selectedImg.oA))
          ctx2.strokeRect(-newW / 2, -newH / 2, newW, newH)
          ctx2.restore()
        }
      }
      if (sel.startsWith('line')) {
        let highlightLine = globalData.lines.find((line) => line.id === sel)
        // 线高亮
        if (highlightLine) {
          ctx2.save()
          ctx2.strokeStyle = '#e87634'
          ctx2.lineWidth = 4
          ctx2.beginPath()
          const start = worldToCanvas(
            highlightLine.geometies[0].x,
            highlightLine.geometies[0].y
          )
          ctx2.moveTo(start.x, start.y)
          for (let i = 1; i < highlightLine.geometies.length; i++) {
            const pt = worldToCanvas(
              highlightLine.geometies[i].x,
              highlightLine.geometies[i].y
            )
            ctx2.lineTo(pt.x, pt.y)
          }
          ctx2.stroke()
          highlightLine.geometies.forEach((pt, idx) => {
            const cpt = worldToCanvas(pt.x, pt.y)
            ctx2.beginPath()
            ctx2.arc(cpt.x, cpt.y, 6, 0, Math.PI * 2)
            if (
              selectedLine != null &&
              selectedPointIdx != null &&
              selectedLine.id === highlightLine.id
            ) {
              ctx2.fillStyle = selectedPointIdx === idx ? '#1fe434' : '#fff'
            } else {
              ctx2.fillStyle = '#fff'
            }

            ctx2.fill()
            ctx2.stroke()
          })
          ctx2.restore()
        }
      }
    })
  }
}

function getPointAt(line, x, y) {
  for (let i = 0; i < line.geometies.length; i++) {
    const pt = worldToCanvas(line.geometies[i].x, line.geometies[i].y)
    if (Math.abs(pt.x - x) < 8 && Math.abs(pt.y - y) < 8) return i
  }
  return null
}

function selectMouseDown(e) {
  moveFlag = false
  //默认实现点选
  clickPoint = { x: e.offsetX, y: e.offsetY }
  boxStart = { x: e.offsetX, y: e.offsetY }
  if (e.button == 0) {
    clickdown = true
    clickdown2 = true
    lastPos = { x: e.clientX, y: e.clientY }
    //这里处理选择线后对点的操作，只选择一条线时
    if (selection.filter((sel) => sel.startsWith('line')).length > 0) {
      let id = selector.getIdFromCoordinates(clickPoint.x, clickPoint.y)
      selectedLine = globalData.lines.find((l) => l.id === id)
      if (selectedLine) {
        selectedPointIdx = getPointAt(selectedLine, e.offsetX, e.offsetY)
        clickdown2 = false
      }
    }
  } else if (e.button == 2) {
    //然后是框选支持，调整成右键框选，以方便融合到default模式中
    dragBox = true
  }
  drawSelection()
}

function selectMouseMove(e) {
  //处理移动元素逻辑
  if (moveFlag) {
    const dx = (e.offsetX - moveBegin.x) * viewport.scale
    const dy = (e.offsetY - moveBegin.y) * viewport.scale
    selection.forEach((sel) => {
      if (sel.startsWith('img')) {
        let moveImg = globalData.imgs.find((img) => img.id === sel)
        moveImg.x += dx
        moveImg.y += dy
      }
      if (sel.startsWith('line')) {
        let moveLine = globalData.lines.find((line) => line.id === sel)
        moveLine.geometies.forEach((p) => {
          p.x += dx
          p.y += dy
        })
      }
    })
    viewport.update()
  }
  moveBegin = { x: e.offsetX, y: e.offsetY }
  boxEnd = { x: e.offsetX, y: e.offsetY }
  if (clickdown2) {
    const move = {
      x: e.clientX - lastPos.x,
      y: e.clientY - lastPos.y
    }
    const cosTheta = Math.cos(viewport.rotate)
    const sinTheta = Math.sin(viewport.rotate)
    const movebyrotate = {
      x: move.x * cosTheta - move.y * sinTheta,
      y: move.x * sinTheta + move.y * cosTheta
    }
    viewport.update({
      xoffset: viewport.xoffset - movebyrotate.x * viewport.scale,
      yoffset: viewport.yoffset - movebyrotate.y * viewport.scale
    })
    logger.debug(`鼠标移动 [${move.x},${move.y}]`)
    lastPos = { x: e.clientX, y: e.clientY }
  }
  if (selectedLine != null && selectedPointIdx != null && clickdown) {
    const wpt = canvasToWorld(e.offsetX, e.offsetY)
    selectedLine.geometies[selectedPointIdx] = { x: wpt.x, y: wpt.y }
    const idx = globalData.lines.findIndex((l) => l.id === selectedLine.id)
    if (idx !== -1) {
      globalData.lines[idx].geometies = [...selectedLine.geometies]
      viewport.update()
    }
  }
  drawSelection()
}

function selectMouseUp(e) {
  clickdown = false
  clickdown2 = false
  //点击在同一个地方，判断是点选
  if (
    e.button === 0 &&
    e.offsetX === clickPoint.x &&
    e.offsetY == clickPoint.y
  ) {
    let id = selector.getIdFromCoordinates(clickPoint.x, clickPoint.y)
    if (id) {
      if (e.shiftKey) {
        selection = selection.filter((item) => item !== id)
      } else if (e.ctrlKey) {
        selection.push(id)
      } else {
        selection = []
        selection.push(id)
        if (selection.length == 1 && selection[0].startsWith('line')) {
          selectedLine = globalData.lines.find((l) => l.id === selection[0])
        }
        if (selection.length == 1 && selection[0].startsWith('img')) {
          selectedLine = null
          selectedPointIdx = null
        }
      }
    } else {
      selection = []
      selectedLine = null
      selectedPointIdx = null
    }
  }
  //处理框选，框选的逻辑是，只要在选框内则视作选择
  if (dragBox) {
    dragBox = false
    if (boxEnd.x === boxStart.x && boxEnd.y === boxStart.y) {
      selection = []
      return
    }
    if (e.ctrlKey) {
      const temp = selector.getIdsFromRect(
        boxStart.x,
        boxStart.y,
        boxEnd.x,
        boxEnd.y
      )
      selection = [...temp, ...selection]
    } else {
      selection = selector.getIdsFromRect(
        boxStart.x,
        boxStart.y,
        boxEnd.x,
        boxEnd.y
      )
    }

    if (selection.length == 1 && selection[0].startsWith('line')) {
      selectedLine = globalData.lines.find((l) => l.id === selection[0])
    }
  }
  if (selection.length !== 0) logger.debug('选择了', selection)
  drawSelection()
}

function defaultWheel(event) {
  let wxy = canvasToWorld(event.clientX, event.clientY)
  // 阻止默认滚轮事件
  // 计算缩放比例增量
  let delta = event.deltaY > 0 ? 1.11 : 0.9
  let dscale = viewport.scale
  // 更新缩放比例
  dscale *= delta
  dscale = Math.min(Math.max(dscale, 0.01), 30) // 限制在 0.1 到 30 之间
  logger.debug(`缩放 当前缩放级别: ${dscale.toFixed(3)}`)
  //计算新的viewport参数，确保以鼠标为中心缩放
  //原理是修改xyoffset wxy2-wxy1
  viewport.scale = dscale
  let wxy2 = canvasToWorld(event.clientX, event.clientY)
  let dxoffset = wxy2.x - wxy.x
  let dyoffset = wxy2.y - wxy.y
  viewport.update({
    xoffset: viewport.xoffset - dxoffset,
    yoffset: viewport.yoffset - dyoffset
  })
  drawSelection()
}

function selectDblClick(e) {
  if (selectedLine != null) {
    let insertIdx = -1
    let insertPt = null
    let point = { x: e.offsetX, y: e.offsetY }
    let length = selectedLine.geometies.length
    const pstart = worldToCanvas(
      selectedLine.geometies[0].x,
      selectedLine.geometies[0].y
    )
    const pend = worldToCanvas(
      selectedLine.geometies[length - 1].x,
      selectedLine.geometies[length - 1].y
    )
    if (
      (Math.abs(point.x - pstart.x) < 4 && Math.abs(point.y - pstart.y) < 4) ||
      (Math.abs(point.x - pend.x) < 4 && Math.abs(point.y - pend.y) < 4)
    )
      return //如果插入点等于首尾结点则不能插入
    for (let i = 0; i < length - 1; i++) {
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
        if (dist < 8) {
          insertIdx = i + 1
          insertPt = canvasToWorld(proj.x, proj.y)
          break
        }
      }
    }

    if (insertIdx >= 0) {
      selectedLine.geometies.splice(insertIdx, 0, insertPt)
      viewport.update()
      drawSelection()
    }
  }
}

function selectKeyDown(e) {
  if ((e.ctrlKey && e.key === 's') || e.key === 'S') {
    //改成手动保存，以免在移动时触发性能瓶颈
    globalData.save()
    e.preventDefault()
  }

  if (e.key === 'Enter') {
    viewport.update()
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    //当只选择了一个元素时，支持删除
    if (selection.length == 1) {
      if (selection[0].startsWith('img')) {
        const id1 = globalData.imgs.findIndex((img) => img.id === selection[0])
        if (id1 !== -1) globalData.imgs.splice(id1, 1)
      }
      if (selection[0].startsWith('line') && selectedPointIdx === null) {
        const id2 = globalData.lines.findIndex((l) => l.id === selection[0])
        if (id2 !== -1) globalData.lines.splice(id2, 1)
      }
      if (selectedLine != null && selectedPointIdx !== null) {
        selectedLine.geometies.splice(selectedPointIdx, 1)
        if (selectedLine.geometies.length == 1) {
          const id3 = globalData.lines.findIndex(
            (l) => l.id === selectedLine.id
          )
          if (id3 !== -1) globalData.lines.splice(id3, 1)
        }
      }

      selection = []
      selectedLine = null
      selectedPointIdx = null
      viewport.update()
      drawSelection()
    }
  }

  if ((e.key === 'm' || e.key === 'M') && selection.length > 0) {
    //当按下M键时，进入移动模式
    moveFlag = true
  } else {
    moveFlag = false
  }
}
