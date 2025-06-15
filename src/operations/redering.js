import { globalData } from '../core/globalData.js'
import { worldToCanvas, canvasToWorld } from '../common/utils.js'
import { canvas, ctx, ctx3 } from '../controls/canvas.js'
import logger from '../common/logger.js'
import { resetToolbar } from '../controls/toolbar.js'
import {
  addEventListenerWithTracking,
  removeAllEventListeners
} from '../common/eventListeners.js'
import { viewport } from '../core/viewport.js'
import { isDraw } from '../common/utils.js'

export function installRendingOp() {
  logger.debug('注册渲染操作事件')
  removeAllEventListeners()
  addEventListenerWithTracking(canvas, 'mousedown', defaultMouseDown)
  addEventListenerWithTracking(canvas, 'mousemove', defaultMouseMove)
  addEventListenerWithTracking(canvas, 'mouseup', defaultMouseUp)
  addEventListenerWithTracking(canvas, 'wheel', defaultWheel, { passive: true })
  addEventListenerWithTracking(canvas, 'dblclick', rendringDblClick)
  addEventListenerWithTracking(document, 'keydown', rendringKeyDown)
}

let rendering = defaultRendering

// 默认透明背景
let renderingTask = null // 用于跟踪当前绘制任务

export function stopRendering() {
  if (renderingTask && renderingTask.cancel) {
    renderingTask.cancel()
  }
}

export function defaultRendering() {
  // 首先要筛选出在viewport内的线段
  let segment = []
  for (const line of globalData.lines) {
    for (let i = 0; i < line.geometies.length - 1; i++) {
      const ps = worldToCanvas(line.geometies[i].x, line.geometies[i].y)
      const pe = worldToCanvas(line.geometies[i + 1].x, line.geometies[i + 1].y)
      if (isDraw(ps.x, ps.y, pe.x, pe.y, ctx)) {
        segment.push({ lineid: line.id, s: ps, e: pe })
      }
    }
  }

  logger.debug('rendering', segment)

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx3.clearRect(0, 0, canvas.width, canvas.height)

  // 如果有正在进行的绘制任务，取消它
  if (renderingTask && renderingTask.cancel) {
    renderingTask.cancel()
  }

  let i = 0
  let cancelled = false

  function cancel() {
    cancelled = true
  }

  renderingTask = { cancel }

  // 批量绘制，每帧渲染多个线段以提升速度
  const BATCH_SIZE = 10 // 每帧绘制的线段数，可根据需要调整

  function drawNextSegment() {
    ctx.save()
    ctx.globalAlpha = 1.0
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 2
    if (cancelled) {
      ctx.restore()
      return
    }
    let count = 0
    while (i < segment.length && count < BATCH_SIZE) {
      const seg = segment[i]
      ctx.beginPath()
      ctx.moveTo(seg.s.x, seg.s.y)
      ctx.lineTo(seg.e.x, seg.e.y)
      ctx.stroke()
      i++
      count++
    }
    ctx.restore()
    if (i < segment.length && !cancelled) {
      requestAnimationFrame(drawNextSegment)
    }
  }

  requestAnimationFrame(drawNextSegment)
}

// 素描画风线条渲染
export function renderSketchLines() {
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.save()
  ctx.strokeStyle = '#222'
  ctx.lineWidth = 1
  ctx.globalAlpha = 0.7

  for (const line of globalData.lines) {
    if (!line.geometies || line.geometies.length < 2) continue
    // 素描风格：每条线重复画多次，带微小扰动
    for (let repeat = 0; repeat < 5; repeat++) {
      ctx.beginPath()
      for (let i = 0; i < line.geometies.length - 1; i++) {
        const p1 = line.geometies[i]
        const p2 = line.geometies[i + 1]
        const { x: cx1, y: cy1 } = worldToCanvas(p1.x, p1.y)
        const { x: cx2, y: cy2 } = worldToCanvas(p2.x, p2.y)
        // 计算两点距离
        const dx = cx2 - cx1
        const dy = cy2 - cy1
        const dist = Math.sqrt(dx * dx + dy * dy)
        // 插值点数
        const steps = Math.max(1, Math.ceil(dist / 5))
        for (let s = 0; s < steps; s++) {
          const t1 = s / steps
          const t2 = (s + 1) / steps
          // 插值点
          const ix1 = cx1 + dx * t1 + (Math.random() - 0.5) * 2.5
          const iy1 = cy1 + dy * t1 + (Math.random() - 0.5) * 2.5
          const ix2 = cx1 + dx * t2 + (Math.random() - 0.5) * 2.5
          const iy2 = cy1 + dy * t2 + (Math.random() - 0.5) * 2.5
          if (i === 0 && s === 0) {
            ctx.moveTo(ix1, iy1)
          }
          ctx.lineTo(ix2, iy2)
        }
      }
      ctx.stroke()
    }
  }
  ctx.restore()
}

// 油画风格线条渲染
export function renderOilPaintLines() {
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#f8f4e6'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.save()
  ctx.globalAlpha = 0.85

  for (const line of globalData.lines) {
    if (!line.geometies || line.geometies.length < 2) continue
    for (let repeat = 0; repeat < 3; repeat++) {
      ctx.beginPath()
      ctx.strokeStyle = `rgba(60,40,20,${0.5 + Math.random() * 0.5})`
      ctx.lineWidth = 2 + Math.random() * 2
      for (let i = 0; i < line.geometies.length; i++) {
        const { x, y } = line.geometies[i]
        const { x: cx, y: cy } = worldToCanvas(x, y)
        // 油画风格：线条有较大抖动和粗细变化
        const jitter = 3
        const dx = cx + (Math.random() - 0.5) * jitter
        const dy = cy + (Math.random() - 0.5) * jitter
        if (i === 0) {
          ctx.moveTo(dx, dy)
        } else {
          ctx.lineTo(dx, dy)
        }
      }
      ctx.shadowColor = '#bfa76f'
      ctx.shadowBlur = 4
      ctx.stroke()
      ctx.shadowBlur = 0
    }
  }
  ctx.restore()
}

// 厚涂风格线条渲染
export function renderThickPaintLines() {
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#f5f5f5'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.save()
  ctx.globalAlpha = 0.9

  for (const line of globalData.lines) {
    if (!line.geometies || line.geometies.length < 2) continue
    ctx.beginPath()
    ctx.strokeStyle = '#222'
    ctx.lineWidth = 6
    ctx.lineCap = 'round'
    for (let i = 0; i < line.geometies.length; i++) {
      const { x, y } = line.geometies[i]
      const { x: cx, y: cy } = worldToCanvas(x, y)
      // 厚涂风格：线条粗大，边缘略有抖动
      const jitter = 1.2
      const dx = cx + (Math.random() - 0.5) * jitter
      const dy = cy + (Math.random() - 0.5) * jitter
      if (i === 0) {
        ctx.moveTo(dx, dy)
      } else {
        ctx.lineTo(dx, dy)
      }
    }
    ctx.stroke()
    // 叠加高光
    ctx.save()
    ctx.globalAlpha = 0.25
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.restore()
  }
  ctx.restore()
}

// 卡通风格线条渲染
export function renderCartoonLines() {
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.save()
  ctx.globalAlpha = 1.0

  // 预设几种卡通风格颜色
  const cartoonColors = [
    '#111', // 黑色
    '#e74c3c', // 红色
    '#3498db', // 蓝色
    '#27ae60', // 绿色
    '#f1c40f', // 黄色
    '#9b59b6', // 紫色
    '#e67e22', // 橙色
    '#1abc9c' // 青色
  ]

  let colorIndex = 0

  for (const line of globalData.lines) {
    if (!line.geometies || line.geometies.length < 2) continue
    // 每一段（两个点之间）使用不同颜色
    for (let i = 1; i < line.geometies.length; i++) {
      const prev = line.geometies[i - 1]
      const curr = line.geometies[i]
      const { x: x1, y: y1 } = worldToCanvas(prev.x, prev.y)
      const { x: x2, y: y2 } = worldToCanvas(curr.x, curr.y)
      const jitter = 0.3
      const dx1 = x1 + (Math.random() - 0.5) * jitter
      const dy1 = y1 + (Math.random() - 0.5) * jitter
      const dx2 = x2 + (Math.random() - 0.5) * jitter
      const dy2 = y2 + (Math.random() - 0.5) * jitter

      ctx.beginPath()
      ctx.strokeStyle = cartoonColors[colorIndex % cartoonColors.length]
      colorIndex++
      ctx.lineWidth = 3
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      ctx.moveTo(dx1, dy1)
      ctx.lineTo(dx2, dy2)
      ctx.stroke()
    }
  }
  ctx.restore()
}

function rendringDblClick(e) {
  resetToolbar()
  viewport.update()
}

function rendringKeyDown(e) {
  switch (e.key) {
    case '1':
      rendering = renderSketchLines
      break
    case '2':
      rendering = renderOilPaintLines
      break
    case '3':
      rendering = renderThickPaintLines
      break
    case '4':
      rendering = renderCartoonLines
      break
    default:
      rendering = defaultRendering
      break
  }
  rendering()
}

let lastPos = {}
let clickdown = false
let mousePos = {}

function defaultMouseDown(event) {
  if (event.button === 0) {
    logger.debug(`鼠标左键按下 [${event.clientX},${event.clientY}]`)
    lastPos = { x: event.clientX, y: event.clientY }
    clickdown = true
  } else if (event.button === 2) {
    // 阻止默认的右键菜单
    resetToolbar() //右键切换选择模式
    event.preventDefault()
  }
}

function defaultMouseMove(event) {
  mousePos = { x: event.clientX, y: event.clientY }
  if (clickdown) {
    const move = {
      x: event.clientX - lastPos.x,
      y: event.clientY - lastPos.y
    }
    const cosTheta = Math.cos(viewport.rotate)
    const sinTheta = Math.sin(viewport.rotate)
    const movebyrotate = {
      x: move.x * cosTheta - move.y * sinTheta,
      y: move.x * sinTheta + move.y * cosTheta
    }
    viewport.update(
      {
        xoffset: viewport.xoffset - movebyrotate.x * viewport.scale,
        yoffset: viewport.yoffset - movebyrotate.y * viewport.scale
      },
      rendering
    )
    logger.debug(`鼠标移动 [${move.x},${move.y}]`)
    lastPos = { x: event.clientX, y: event.clientY }
  }
}

function defaultMouseUp(event) {
  if (event.button === 0) {
    logger.debug(`鼠标左键松开 [${event.clientX},${event.clientY}]`)
    lastPos = { x: event.clientX, y: event.clientY }
    clickdown = false
  } else if (event.button === 2) {
    // 阻止默认的右键菜单
    event.preventDefault()
  }
}

function defaultWheel(event) {
  let wxy = canvasToWorld(event.clientX, event.clientY)
  // 阻止默认滚轮事件
  //event.preventDefault()
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
  viewport.update(
    {
      xoffset: viewport.xoffset - dxoffset,
      yoffset: viewport.yoffset - dyoffset
    },
    rendering
  )
}
