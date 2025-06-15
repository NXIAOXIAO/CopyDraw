import { canvas } from '../controls/canvas.js'
import {
  addEventListenerWithTracking,
  removeAllEventListeners
} from '../common/eventListeners.js'

import { globalData } from '../core/globalData.js'
import logger from '../common/logger.js'
import { viewport } from '../core/viewport.js'
import { canvasToWorld } from '../common/utils.js'
import Img from '../common/img.js'

export function installDefaultOp() {
  logger.debug('注册默认操作事件')
  removeAllEventListeners()
  addEventListenerWithTracking(canvas, 'mousedown', defaultMouseDown)
  addEventListenerWithTracking(canvas, 'mousemove', defaultMouseMove)
  addEventListenerWithTracking(canvas, 'mouseup', defaultMouseUp)
  addEventListenerWithTracking(canvas, 'wheel', defaultWheel, { passive: true })
  addEventListenerWithTracking(document, 'keydown', defaultKeyDown)
  viewport.update() //移除其他临时渲染层的影响
}

let lastPos = {}
let clickdown = false
let mousePos = {}

export function defaultMouseDown(event) {
  if (event.button === 0) {
    logger.debug(`鼠标左键按下 [${event.clientX},${event.clientY}]`)
    lastPos = { x: event.clientX, y: event.clientY }
    clickdown = true
  }
}

export function defaultMouseMove(event) {
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
    viewport.update({
      xoffset: viewport.xoffset - movebyrotate.x * viewport.scale,
      yoffset: viewport.yoffset - movebyrotate.y * viewport.scale
    })
    logger.debug(`鼠标移动 [${move.x},${move.y}]`)
    lastPos = { x: event.clientX, y: event.clientY }
  }
}

export function defaultMouseUp(event) {
  if (event.button === 0) {
    logger.debug(`鼠标左键松开 [${event.clientX},${event.clientY}]`)
    lastPos = { x: event.clientX, y: event.clientY }
    clickdown = false
  }
}

export function defaultWheel(event) {
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
  viewport.update({
    xoffset: viewport.xoffset - dxoffset,
    yoffset: viewport.yoffset - dyoffset
  })
}

async function defaultKeyDown(event) {
  if (event.shiftKey) {
    let R = viewport.rotate
    switch (event.key) {
      case 'ArrowLeft':
        R += Math.PI / 8
        break
      case 'ArrowRight':
        R -= Math.PI / 8
        break
      default:
        break
    }
    R = Math.min(Math.max(R, -Math.PI * 2), Math.PI * 2)
    logger.debug(`当前旋转角: ${(R / Math.PI) * 180}`)
    viewport.update({ rotate: R })
  }
  if (event.ctrlKey && event.key === 'v') {
    logger.debug('Ctrl+V was pressed')
    logger.debug('鼠标位置', mousePos)
    let imageBlob = await getImageBlobFromClipboad()
    if (imageBlob) {
      const imgdata = await createImageBitmap(imageBlob)
      const wxy = canvasToWorld(mousePos.x, mousePos.y)
      const img = new Img(imgdata, wxy.x, wxy.y, viewport.rotate)
      globalData.addImg(img)
    }
  }
  //event.preventDefault()
}

async function getImageBlobFromClipboad() {
  const items = await navigator.clipboard.read()
  for (let item of items) {
    if (item.types.includes('image/png')) {
      logger.debug('getImageBlobFromClipboad')
      const blob = await item.getType('image/png')
      return blob
    } else {
      return undefined
    }
  }
}
