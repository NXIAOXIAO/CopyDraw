import { canvas, ctx2 } from '../controls/canvas.js'
import {
  addEventListenerWithTracking,
  removeAllEventListeners
} from '../common/eventListeners.js'
import Line from '../common/line.js'
import { canvasToWorld, worldToCanvas } from '../common/utils.js'
import { globalData } from '../core/globalData.js'
import { installDefaultOp } from './default.js'
import logger from '../common/logger.js'

export function installLineDrawOp() {
  logger.debug('注册鼠标绘制模式操作事件')
  //removeAllEventListeners()
  installDefaultOp()
  addEventListenerWithTracking(canvas, 'mousedown', lineMouseDown)
  addEventListenerWithTracking(canvas, 'mouseup', lineMouseUp)
  addEventListenerWithTracking(canvas, 'mousemove', lineMouseMove)
  addEventListenerWithTracking(canvas, 'wheel', lineWheel, {
    passive: true
  })
  addEventListenerWithTracking(canvas, 'dblclick', lineDblClick)
  addEventListenerWithTracking(document, 'keydown', lineKeyDown)
}

let linePoints = []
let downPoint = { x: 0, y: 0 }
function lineMouseDown(event) {
  downPoint.x = event.offsetX
  downPoint.y = event.offsetY
}

function lineMouseMove(event) {
  //绘制临时点
  drawReactive(event.offsetX, event.offsetY)
}

function lineMouseUp(event) {
  if (downPoint.x === event.offsetX && downPoint.y === event.offsetY) {
    const currentX = event.offsetX
    const currentY = event.offsetY
    let wxy = canvasToWorld(currentX, currentY)
    let length = linePoints.length
    if (length == 0) {
      linePoints.push({ x: wxy.x, y: wxy.y })
      return
    }
    if (
      wxy.x !== linePoints[length - 1].x ||
      wxy.y !== linePoints[length - 1].y
    ) {
      //不能添加重复点
      linePoints.push({ x: wxy.x, y: wxy.y })
    }
  }
}

function lineWheel(event) {
  drawReactive(event.offsetX, event.offsetY)
}

function lineDblClick(event) {
  // const currentX = event.offsetX
  // const currentY = event.offsetY
  // let wxy = canvasToWorld(currentX, currentY)
  // linePoints.push({ x: wxy.x, y: wxy.y })
  //这里结束绘制
  endDrawLine()
}

function lineKeyDown(event) {
  if (event.key === 'Enter') {
    endDrawLine()
  } else if (event.key === 'Escape') {
    linePoints = []
  }

  if (event.ctrlKey && event.key === 'z') {
    linePoints.pop()
  }

  drawReactive(event.offsetX, event.offsetY)
}

function endDrawLine() {
  const line = new Line()
  line.geometies = [...linePoints]
  if (line.geometies.length < 2) {
    linePoints = []
    return
  }
  globalData.addLine(line)
  linePoints = []
}

function clearCanvas() {
  if (ctx2) {
    ctx2.clearRect(0, 0, canvas.width, canvas.height)
  }
}

function drawReactive(nowx, nowy) {
  clearCanvas()
  if (linePoints.length > 0) {
    ctx2.beginPath()
    const p1 = worldToCanvas(linePoints[0].x, linePoints[0].y)
    ctx2.moveTo(p1.x, p1.y)
    for (let i = 1; i < linePoints.length; i++) {
      const pnext = worldToCanvas(linePoints[i].x, linePoints[i].y)
      ctx2.lineTo(pnext.x, pnext.y)
    }
    ctx2.lineTo(nowx, nowy)
    ctx2.strokeStyle = 'white'
    ctx2.stroke()
  }
  // 画一个5x5的十字准星，中间镂空
  const size = 20
  const gap = 6 // 镂空的长度
  const half = Math.floor(size / 2)
  const halfGap = Math.floor(gap / 2)
  ctx2.save()
  ctx2.strokeStyle = '#58F07C'
  ctx2.lineWidth = 2

  // 垂直线（上半部分）
  ctx2.beginPath()
  ctx2.moveTo(nowx, nowy - half)
  ctx2.lineTo(nowx, nowy - halfGap)
  ctx2.stroke()

  // 垂直线（下半部分）
  ctx2.beginPath()
  ctx2.moveTo(nowx, nowy + halfGap)
  ctx2.lineTo(nowx, nowy + half)
  ctx2.stroke()

  // 水平线（左半部分）
  ctx2.beginPath()
  ctx2.moveTo(nowx - half, nowy)
  ctx2.lineTo(nowx - halfGap, nowy)
  ctx2.stroke()

  // 水平线（右半部分）
  ctx2.beginPath()
  ctx2.moveTo(nowx + halfGap, nowy)
  ctx2.lineTo(nowx + half, nowy)
  ctx2.stroke()

  ctx2.restore()
}
