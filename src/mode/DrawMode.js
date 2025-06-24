import { BaseMode } from './BaseMode.js'
import { Constants } from '../common/Constants.js'
import { LineElement } from '../elements/LineElement.js'
import { ImgElement } from '../elements/ImgElement.js'
import { getImageBitmapFromClipboard } from '../utils/clipboard.js'

// DrawMode：线条绘制模式，完全复刻原有逻辑
export class DrawMode extends BaseMode {
  constructor(eventListeners, dom, viewport, render, dataManager) {
    super(Constants.MODE_DRAW, eventListeners, dom)
    this.viewport = viewport
    this.render = render
    this.dataManager = dataManager

    this.isPenMode = false //标记是否使用画笔模式
    // 视图操作相关变量
    this.linePoints = [] //临时记录绘制的点
    this.mousePos = null //实时记录鼠标位置
    this.leftMouseHold = false //鼠标左键保持按下
    this.leftMouseClick = null //记录鼠标左键一开始按下的位置 用于新增点判断
    this.lastMouse = null //记录鼠标上次按下位置

    this.lines = [] // 临时记录绘制的线条
    this.rightMouseHold = false //鼠标右键保持按下
    this.rightMouseClick = null //记录鼠标右键一开始按下的位置 用于画笔模式绘制点

    this._lastRecordTime = 0 // 上次记录点的时间戳
    this._recordInterval = 10 // 采点最小间隔(ms)

    this._onTouchStart = this._onTouchStart.bind(this)
    this._onTouchMove = this._onTouchMove.bind(this)
    this._onTouchEndAndCancel = this._onTouchEndAndCancel.bind(this)
    this._onPaste = this._onPaste.bind(this)
  }
  enter() {
    // 1:1复刻原 enter
    console.log('Entering DrawMode')
    this._addEventListeners()
    const addEventListener = this.eventListeners.addEventListenerWithTracking.bind(
      this.eventListeners
    )
    addEventListener(this.dom, 'touchstart', this._onTouchStart)
    addEventListener(this.dom, 'touchmove', this._onTouchMove)
    addEventListener(this.dom, 'touchend', this._onTouchEndAndCancel)
    addEventListener(this.dom, 'touchcancel', this._onTouchEndAndCancel)
    // 注入相关参数
    this.render.isDrawMode = true

    // 剪贴板粘贴图片
    window.addEventListener('paste', this._onPaste)
  }
  exit() {
    this._removeEventListeners()
    this.render.isDrawMode = false
    window.removeEventListener('paste', this._onPaste)
  }

  /**
   * 处理粘贴图片
   */
  async _onPaste(e) {
    // 只处理图片
    let imgBitmap = await getImageBitmapFromClipboard()
    if (imgBitmap) {
      // 放到画布中心
      const cx = this.viewport.width / 2
      const cy = this.viewport.height / 2
      const world = this.viewport.viewportToWorld(cx, cy)
      const imgElement = new ImgElement(imgBitmap, world.x, world.y, 0)
      this.dataManager.addImage(imgElement)
      this.dataManager.saveData()
      this.render.renderAll()
      e.preventDefault()
    }
  }

  _onMouseUp(e) {
    if (e.button === 0 && !this.isPenMode) {
      this.leftMouseHold = false
      const limit = 4
      if (
        Math.abs(this.leftMouseClick.x - e.offsetX) < limit &&
        Math.abs(this.leftMouseClick.y - e.offsetY) < limit
      ) {
        //鼠标按下和抬起是同一个点，视为新增点操作
        const wxy = this.viewport.viewportToWorld(e.offsetX, e.offsetY)
        const length = this.linePoints.length
        if (length === 0) {
          this.linePoints.push({ x: wxy.x, y: wxy.y })
        } else if (
          wxy.x !== this.linePoints[length - 1].x ||
          wxy.y !== this.linePoints[length - 1].y
        ) {
          //不添加重复点
          this.linePoints.push({ x: wxy.x, y: wxy.y })
        }
        this.render.drawLinePoints = [...this.linePoints]
        this.render.renderTemporary()
      }
    }
    if (e.button === 2 && this.isPenMode && this.rightMouseHold) {
      //鼠标使用右键当画笔,松开时输出到lines中
      this.rightMouseHold = false
      if (this.linePoints.length < 2) {
        return
      }
      this.linePoints = this._smoothLine2(this.linePoints)
      this.lines.push([...this.linePoints])
      this.linePoints = []
      this.render.drawLinePoints = []
      this.render.drawLines = [...this.lines]
      this.render.renderAll()
      //
    }
  }
  _onMouseMove(e) {
    this.mousePos = { x: e.offsetX, y: e.offsetY }
    this.render.mousePos = this.mousePos

    if (this.leftMouseHold) {
      //移动视图
      const viewport = this.viewport
      const move = {
        x: e.offsetX - this.lastMouse.x,
        y: e.offsetY - this.lastMouse.y
      }
      const cosTheta = Math.cos(viewport.rotate)
      const sinTheta = Math.sin(viewport.rotate)
      const movebyrotate = {
        x: move.x * cosTheta - move.y * sinTheta,
        y: move.x * sinTheta + move.y * cosTheta
      }
      viewport.xoffset = viewport.xoffset - movebyrotate.x * viewport.scale
      viewport.yoffset = viewport.yoffset - movebyrotate.y * viewport.scale
      this.lastMouse = { x: e.offsetX, y: e.offsetY }
      this.render.renderAll()
    }

    if (this.rightMouseHold && this.isPenMode) {
      //记录轨迹
      const now = Date.now()
      if (now - this._lastRecordTime > this._recordInterval) {
        const wxy = this.viewport.viewportToWorld(e.offsetX, e.offsetY)
        this.linePoints.push({ x: wxy.x, y: wxy.y })
        this._lastRecordTime = now
      }
      this.render.drawLinePoints = [...this.linePoints]
    }
    this.render.renderTemporary()
  }

  _onMouseDown(e) {
    if (e.button === 0) {
      this.leftMouseHold = true
      this.lastMouse = { x: e.clientX, y: e.clientY }
      this.leftMouseClick = { x: e.clientX, y: e.clientY }
    } else if (e.button === 2 && this.isPenMode) {
      this.rightMouseHold = true
      this.rightMouseClick = { x: e.clientX, y: e.clientY }
      this.linePoints = []
      const wxy = this.viewport.viewportToWorld(e.offsetX, e.offsetY)
      this.linePoints.push({ x: wxy.x, y: wxy.y })
      this._lastRecordTime = Date.now()
    }
  }

  _onWheel(e) {
    e.preventDefault()
    const viewport = this.viewport
    let wxy = viewport.viewportToWorld(e.offsetX, e.offsetY)
    let delta = e.deltaY > 0 ? 1.11 : 0.9
    let dscale = viewport.scale
    dscale *= delta
    dscale = Math.min(Math.max(dscale, 0.01), 30)
    viewport.scale = dscale
    let wxy2 = viewport.viewportToWorld(e.offsetX, e.offsetY)
    let dxoffset = wxy2.x - wxy.x
    let dyoffset = wxy2.y - wxy.y
    viewport.xoffset = viewport.xoffset - dxoffset
    viewport.yoffset = viewport.yoffset - dyoffset
    this.render.renderAll()
  }

  _onKeyDown(e) {
    // Q键切换笔模式
    if (e.key === 'q' || e.key === 'Q') {
      this.isPenMode = !this.isPenMode
      this.linePoints = []
      this.lines = []

      this.render.isPenMode = this.isPenMode
      this.render.mousePos = this.mousePos
      this.render.renderTemporary()
    }
    // 旋转视图
    if (e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      let R = this.viewport.rotate
      switch (e.key) {
        case 'ArrowLeft':
          R += Math.PI / 8
          break
        case 'ArrowRight':
          R -= Math.PI / 8
          break
      }
      R = Math.min(Math.max(R, -Math.PI * 2), Math.PI * 2)
      if (Math.abs(R) < 1e-6) R = 0
      this.viewport.rotate = R
      this.render.renderAll()
    }
    // Ctrl+Z 撤销
    if (e.ctrlKey && (e.key === 'z' || e.key === 'Z')) {
      if (this.isPenMode) {
        // 撤销一整条线
        this.lines.pop()
        this.render.drawLines = [...this.lines]
        this.render.renderLines()
      } else {
        // 撤销一个点
        this.linePoints.pop()
        this.render.drawLinePoints = [...this.linePoints]
      }
      this.render.renderTemporary()
    }

    // Ctrl+S 保存
    if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
      if (this.lines.length > 0) {
        this.lines.forEach((points) => {
          const line = new LineElement()
          line.geometies = [...points]
          this.dataManager.addLine(line)
        })
        console.log('保存数据...')
        this.dataManager.saveData()
      }
      e.preventDefault()
    }

    // Enter/双击结束绘制
    if (!this.isPenMode && e.key === 'Enter') {
      this._finishLine()
    }
    // Esc取消鼠标模式下单次线段绘制
    if (e.key === 'Escape') {
      this.linePoints = []
      this.render.drawLinePoints = []
      this.render.renderTemporary()
    }
  }

  _onKeyUp(e) {
    if (e.key === ' ') {
      this.isPanning = false
      this.dom.style.cursor = 'default'
    }
  }

  _ondbClick(e) {
    if (!this.isPenMode && e.button === 0) {
      this._finishLine()
    }
  }

  _finishLine() {
    if (this.linePoints.length >= 2) {
      // 生成线对象并加入dataManager
      const line = new LineElement()
      line.geometies = [...this.linePoints]
      this.dataManager.addLine(line)
      this.dataManager.saveData()
    }
    this.linePoints = []
    this.render.drawLinePoints = []
    this.render.renderAll()
  }

  // 平滑算法（简单贝塞尔平滑，保证连续性）
  _smoothLine(points) {
    if (points.length < 3) return points
    const smooth = []
    // 保证第一个点被包含
    smooth.push(points[0])
    for (let i = 0; i < points.length - 2; i++) {
      const p0 = points[i],
        p1 = points[i + 1],
        p2 = points[i + 2]
      for (let t = 0.2; t <= 1; t += 0.2) {
        const x = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x
        const y = (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y
        smooth.push({ x, y })
      }
    }
    // 保证最后一个点被包含
    smooth.push(points[points.length - 1])
    return smooth
  }

  _smoothLine2(points, iterations = 3) {
    if (!points || points.length < 3) return points // 点数不足时直接返回
    let smoothed = [...points]
    for (let i = 0; i < iterations; i++) {
      const newPoints = [smoothed[0]] // 保留起点
      for (let j = 0; j < smoothed.length - 1; j++) {
        const p1 = smoothed[j]
        const p2 = smoothed[j + 1]
        // 计算线段上的 1/4 和 3/4 分割点
        const q = {
          x: 0.75 * p1.x + 0.25 * p2.x,
          y: 0.75 * p1.y + 0.25 * p2.y
        }
        const r = {
          x: 0.25 * p1.x + 0.75 * p2.x,
          y: 0.25 * p1.y + 0.75 * p2.y
        }
        newPoints.push(q, r)
      }
      newPoints.push(smoothed[smoothed.length - 1]) // 保留终点
      smoothed = newPoints // 更新为当前迭代结果
    }

    return smoothed
  }

  //扩展
  _onTouchStart(e) {
    if (!this.isPenMode) return
    if (e.touches.length === 1) {
      const touch = e.touches[0]
      this.linePoints = []
      const rect = this.dom.getBoundingClientRect()
      const offsetX = touch.clientX - rect.left
      const offsetY = touch.clientY - rect.top
      const wxy = this.viewport.viewportToWorld(offsetX, offsetY)
      this.linePoints.push({ x: wxy.x, y: wxy.y })
      this._lastRecordTime = Date.now()
      this.render.drawLinePoints = [...this.linePoints]
      this.render.renderTemporary()
    }
  }
  _onTouchMove(e) {
    if (!this.isPenMode || !this.linePoints) return
    if (e.touches.length === 1) {
      const touch = e.touches[0]
      const rect = this.dom.getBoundingClientRect()
      const offsetX = touch.clientX - rect.left
      const offsetY = touch.clientY - rect.top
      const now = Date.now()
      if (now - this._lastRecordTime > this._recordInterval) {
        const wxy = this.viewport.viewportToWorld(offsetX, offsetY)
        this.linePoints.push({ x: wxy.x, y: wxy.y })
        this._lastRecordTime = now
      }
      this.render.drawLinePoints = [...this.linePoints]
      this.render.mousePos = { x: offsetX, y: offsetY }
      this.render.renderTemporary()
    }
  }
  _onTouchEndAndCancel(e) {
    if (!this.isPenMode || !this.linePoints) return
    if (this.linePoints.length < 2) {
      this.linePoints = []
      this.render.drawLinePoints = []
      this.render.renderTemporary()
      return
    }
    this.linePoints = this._smoothLine2(this.linePoints)
    this.lines.push([...this.linePoints])
    this.linePoints = []
    this.render.drawLinePoints = []
    this.render.drawLines = [...this.lines]
    this.render.renderAll()
  }
}
