import { BaseMode } from './BaseMode.js'
import { LineElement } from '../elements/LineElement.js'
import { PathElement } from '../elements/PathElement.js'
import { AddElementCommand } from '../commands/AddElementCommand.js'
import { ImgElement } from '../elements/ImgElement.js'
import { getImageBitmapFromClipboard } from '../utils/clipboard.js'
import { getNextScale } from '../utils/zoom.js'

/**
 * DrawMode：线条绘制模式
 * 支持两种绘制模式：
 * 1. 鼠标模式：左键点击添加点，Enter/双击完成线条
 * 2. 笔模式：右键拖拽绘制连续线条
 */
export class DrawMode extends BaseMode {
  constructor(eventEmitter, viewport, dataManager, canvasArea, commandManager) {
    super(eventEmitter)

    // 直接接收依赖实例
    this.viewport = viewport
    this.dataManager = dataManager
    this.canvasArea = canvasArea
    this.commandManager = commandManager

    // 绘制模式相关变量
    this.isPenMode = false // 标记是否使用画笔模式
    this.linePoints = [] // 临时记录绘制的点
    // this.mousePos 已在 BaseMode 中初始化
    this.leftMouseHold = false // 鼠标左键保持按下
    this.leftMouseClick = null // 记录鼠标左键一开始按下的位置
    this.lastMouse = null // 记录鼠标上次按下位置
    this.isPanning = false // 是否在移动viewport

    // 笔模式相关变量
    this.rightMouseHold = false // 鼠标右键保持按下
    this.rightMouseClick = null // 记录鼠标右键一开始按下的位置
    this._lastRecordTime = 0 // 上次记录点的时间戳
    this._recordInterval = 10 // 采点最小间隔(ms)
    this.isActive = false // 跟踪模式是否激活
    this.penDrawing = false // 用于pen模式下的绘制状态
    this.lastPointerId = null // 用于记录pen模式的pointerId

    // 绑定事件处理器
    this._boundMouseDown = this._onMouseDown.bind(this)
    this._boundMouseMove = this._onMouseMove.bind(this)
    this._boundMouseUp = this._onMouseUp.bind(this)
    this._boundWheel = this._onWheel.bind(this)
    this._boundKeyDown = this._onKeyDown.bind(this)
    this._boundKeyUp = this._onKeyUp.bind(this)
    this._boundDoubleClick = this._onDoubleClick.bind(this)
    this._boundPointerDown = this._onPointerDown.bind(this)
    this._boundPointerMove = this._onPointerMove.bind(this)
    this._boundPointerUp = this._onPointerUp.bind(this)

    // 注册内部事件监听器
    this._registerInternalEventListeners()
  }

  /**
   * 注册内部事件监听器
   */
  _registerInternalEventListeners() {
    // 监听viewport变化
    this.eventEmitter.on('viewportChange', () => {
      // 只有在DrawMode激活时才更新临时数据
      if (this.isActive) {
        this._updateTemporary()
      }
    })
  }

  /**
   * 更新temporary数据并通知渲染
   */
  _updateTemporary() {
    let previewPoints = [...this.linePoints]

    // 如果有已绘制的点，添加鼠标当前位置作为预览（两种模式都支持）
    if (this.linePoints.length > 0 && this.mousePos) {
      const previewWorldPos = this.viewport.toWorld(this.mousePos.x, this.mousePos.y)
      // pressure为0.5预览
      previewPoints.push({ x: previewWorldPos.x, y: previewWorldPos.y, pressure: 0.5 })
    }

    const temporary = {
      drawMode: true,
      isPenMode: this.isPenMode,
      linePoints: previewPoints,
      mousePos: this.mousePos // 始终传递鼠标位置，确保十字准星显示
    }
    this.eventEmitter.emit('setTemporary', temporary)
  }

  activate() {
    super.activate()
    this.isActive = true
    console.log('[DrawMode] 进入绘制模式')

    // 检查依赖
    console.log('[DrawMode] 依赖检查:', {
      viewport: !!this.viewport,
      canvasArea: !!this.canvasArea,
      dataManager: !!this.dataManager,
      commandManager: !!this.commandManager
    })

    // 重新注册DOM事件监听器
    this._addDOMEventListeners()

    // 初始化鼠标位置（如果鼠标在canvas上且没有现有位置）
    if (this.canvasArea && this.canvasArea.dataCanvas && !this.mousePos) {
      // 设置一个默认的鼠标位置（canvas中心）
      const rect = this.canvasArea.dataCanvas.getBoundingClientRect()
      this.mousePos = {
        x: rect.width / 2,
        y: rect.height / 2
      }
    }

    // 主动触发渲染，确保从RenderMode切换时能正确显示
    if (this.dataManager) {
      const elements = this.dataManager.getAllElements()
      this.eventEmitter.emit('renderElements', elements)
    }

    // 更新临时数据，显示十字准星
    this._updateTemporary()
  }

  deactivate() {
    super.deactivate()
    this.isActive = false
    console.log('[DrawMode] 退出绘制模式')

    // 移除DOM事件监听器
    this._removeDOMEventListeners()

    // 清空temporary数据
    this.eventEmitter.emit('setTemporary', {})

    // 清空绘制状态
    this.linePoints = []
    this.isPenMode = false
  }

  /**
   * 鼠标按下事件
   */
  _onMouseDown(e) {
    console.log('[DrawMode] 鼠标按下', e.button, e.offsetX, e.offsetY)

    if (e.button === 0) {
      // 左键：移动视图或添加点
      this.leftMouseHold = true
      this.lastMouse = { x: e.offsetX, y: e.offsetY }
      this.leftMouseClick = { x: e.offsetX, y: e.offsetY }
    } else if (e.button === 2 && this.isPenMode) {
      // 右键：笔模式绘制
      this.rightMouseHold = true
      this.rightMouseClick = { x: e.offsetX, y: e.offsetY }
      this.linePoints = []
      const wxy = this.viewport.toWorld(e.offsetX, e.offsetY)
      this.linePoints.push({ x: wxy.x, y: wxy.y })
      this._lastRecordTime = Date.now()
      this._updateTemporary()
    }
  }

  /**
   * 鼠标移动事件
   */
  _onMouseMove(e) {
    this.mousePos = { x: e.offsetX, y: e.offsetY }

    if (this.leftMouseHold && !this.isPenMode) {
      // 移动视图
      if (!this.viewport) return

      const move = {
        x: e.offsetX - this.lastMouse.x,
        y: e.offsetY - this.lastMouse.y
      }
      const cosTheta = Math.cos(this.viewport.rotate)
      const sinTheta = Math.sin(this.viewport.rotate)
      const movebyrotate = {
        x: move.x * cosTheta - move.y * sinTheta,
        y: move.x * sinTheta + move.y * cosTheta
      }

      this.eventEmitter.emit('updateViewport', {
        xoffset: this.viewport.xoffset - movebyrotate.x * this.viewport.scale,
        yoffset: this.viewport.yoffset - movebyrotate.y * this.viewport.scale
      })
      this.lastMouse = { x: e.offsetX, y: e.offsetY }
    }

    if (this.rightMouseHold && this.isPenMode) {
      // 笔模式下记录轨迹
      const now = Date.now()
      if (now - this._lastRecordTime > this._recordInterval) {
        const wxy = this.viewport.toWorld(e.offsetX, e.offsetY)
        this.linePoints.push({ x: wxy.x, y: wxy.y })
        this._lastRecordTime = now
      }
      this._updateTemporary()
    }

    // 实时更新轨迹预览或十字准星（两种模式都支持）
    this._updateTemporary()
  }

  /**
   * 鼠标抬起事件
   */
  _onMouseUp(e) {
    console.log('[DrawMode] 鼠标抬起', e.button, e.offsetX, e.offsetY)

    if (e.button === 0) {
      this.leftMouseHold = false

      // 如果不是在移动视图，则处理点击添加点（仅鼠标模式）
      if (!this.isPanning && !this.isPenMode) {
        const limit = 4
        if (
          Math.abs(this.leftMouseClick.x - e.offsetX) < limit &&
          Math.abs(this.leftMouseClick.y - e.offsetY) < limit
        ) {
          // 鼠标按下和抬起是同一个点，视为新增点操作
          const wxy = this.viewport.toWorld(e.offsetX, e.offsetY)
          const length = this.linePoints.length
          if (length === 0) {
            this.linePoints.push({ x: wxy.x, y: wxy.y })
          } else if (
            wxy.x !== this.linePoints[length - 1].x ||
            wxy.y !== this.linePoints[length - 1].y
          ) {
            // 不添加重复点
            this.linePoints.push({ x: wxy.x, y: wxy.y })
          }
          this._updateTemporary()
        }
      }
    }

    if (e.button === 2 && this.isPenMode && this.rightMouseHold) {
      // 笔模式结束绘制
      this.rightMouseHold = false
      if (this.linePoints.length < 2) {
        this.linePoints = []
        this._updateTemporary()
        return
      }

      // 平滑处理并完成线条
      this.linePoints = this._smoothLine2(this.linePoints)
      this._finishLine()
    }
  }

  /**
   * 鼠标滚轮事件
   */
  _onWheel(e) {
    e.preventDefault()
    if (!this.viewport) return
    const delta = e.deltaY > 0 ? 1 : -1
    const newScale = getNextScale(this.viewport.scale, delta)
    // 计算缩放中心在世界坐标系中的位置
    const wxy = this.viewport.toWorld(e.offsetX, e.offsetY)
    // 更新viewport
    this.eventEmitter.emit('updateViewport', { scale: newScale })
    const wxy2 = this.viewport.toWorld(e.offsetX, e.offsetY)
    const dxoffset = wxy2.x - wxy.x
    const dyoffset = wxy2.y - wxy.y
    this.eventEmitter.emit('updateViewport', {
      xoffset: this.viewport.xoffset - dxoffset,
      yoffset: this.viewport.yoffset - dyoffset
    })
  }

  /**
   * 键盘按下事件
   */
  _onKeyDown(e) {
    // Q键切换笔模式
    if (e.key === 'q' || e.key === 'Q') {
      // 切换前如果有未完成的绘制，丢弃
      if (this.linePoints.length > 0) {
        this.linePoints = []
        this._updateTemporary()
      }
      this.isPenMode = !this.isPenMode
      // 不清空绘制点，保持现有状态
      console.log('[DrawMode] 切换笔模式:', this.isPenMode)
      this._updateTemporary()
    }

    // Ctrl+V 从剪贴板读取图片
    if (e.ctrlKey && (e.key === 'v' || e.key === 'V')) {
      this._pasteImageFromClipboard()
    }

    // 旋转视图
    if (e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      if (!this.viewport) return

      let R = this.viewport.rotate
      switch (e.key) {
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
      if (Math.abs(R) < 1e-6) R = 0
      this.eventEmitter.emit('updateViewport', { rotate: R })
    }

    // Ctrl+Z 撤销
    if (e.ctrlKey && (e.key === 'z' || e.key === 'Z')) {
      if (this.isPenMode) {
        // 笔模式：清空当前绘制
        this.linePoints = []
      } else {
        // 鼠标模式：撤销一个点
        this.linePoints.pop()
      }
      this._updateTemporary()
    }

    // Ctrl+S 保存
    if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
      this.eventEmitter.emit('saveAll')
      e.preventDefault()
    }

    // Enter/双击结束绘制
    if (!this.isPenMode && e.key === 'Enter') {
      this._finishLine()
    }

    // Esc取消绘制
    if (e.key === 'Escape') {
      this.linePoints = []
      this._updateTemporary()
    }
  }

  /**
   * 键盘抬起事件
   */
  _onKeyUp(e) {}

  /**
   * 双击事件
   */
  _onDoubleClick(e) {
    if (!this.isPenMode && e.button === 0) {
      this._finishLine()
    }
  }

  /**
   * 完成线条绘制
   */
  _finishLine() {
    if (this.linePoints.length >= 2) {
      let element

      if (this.isPenMode) {
        // 笔模式：创建PathElement
        element = new PathElement()
        element.geometies = [...this.linePoints]
        element.color = '#3b82f6'
        element.width = 2
        element.smooth = true
      } else {
        // 鼠标模式：创建LineElement
        element = new LineElement()
        element.geometies = [...this.linePoints]
      }

      // 使用命令模式添加元素
      if (this.commandManager) {
        const command = new AddElementCommand(this.dataManager, element)
        this.commandManager.execute(command)
      } else {
        // 直接添加（兼容性处理）
        this.dataManager.addElement(element)
      }

      console.log(
        '[DrawMode] 完成线条绘制，模式:',
        this.isPenMode ? '笔模式' : '鼠标模式',
        '点数:',
        this.linePoints.length
      )
    }

    // 清空绘制点，但保持鼠标位置，让十字准星继续跟随鼠标
    this.linePoints = []
    // 不清空mousePos，让十字准星继续跟随鼠标位置
    this._updateTemporary()
  }

  /**
   * 平滑算法（简单贝塞尔平滑，保证连续性）
   */
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

  /**
   * 改进的平滑算法
   */
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

  /**
   * 添加DOM事件监听器
   */
  _addDOMEventListeners() {
    if (!this.canvasArea) {
      console.warn('[DrawMode] canvasArea未初始化')
      return
    }

    const canvas = this.canvasArea.dataCanvas
    if (!canvas) {
      console.warn('[DrawMode] dataCanvas未找到')
      return
    }

    console.log('[DrawMode] 添加DOM事件监听器到canvas:', canvas)
    canvas.addEventListener('mousedown', this._boundMouseDown)
    canvas.addEventListener('mousemove', this._boundMouseMove)
    canvas.addEventListener('mouseup', this._boundMouseUp)
    canvas.addEventListener('wheel', this._boundWheel)
    canvas.addEventListener('dblclick', this._boundDoubleClick)
    canvas.addEventListener('pointerdown', this._boundPointerDown)
    canvas.addEventListener('pointermove', this._boundPointerMove)
    canvas.addEventListener('pointerup', this._boundPointerUp)

    document.addEventListener('keydown', this._boundKeyDown)
    document.addEventListener('keyup', this._boundKeyUp)

    console.log('[DrawMode] DOM事件监听器添加完成')
  }

  /**
   * 移除DOM事件监听器
   */
  _removeDOMEventListeners() {
    if (!this.canvasArea) return

    const canvas = this.canvasArea.dataCanvas
    if (!canvas) return

    console.log('[DrawMode] 移除DOM事件监听器')
    canvas.removeEventListener('mousedown', this._boundMouseDown)
    canvas.removeEventListener('mousemove', this._boundMouseMove)
    canvas.removeEventListener('mouseup', this._boundMouseUp)
    canvas.removeEventListener('wheel', this._boundWheel)
    canvas.removeEventListener('dblclick', this._boundDoubleClick)
    canvas.removeEventListener('pointerdown', this._boundPointerDown)
    canvas.removeEventListener('pointermove', this._boundPointerMove)
    canvas.removeEventListener('pointerup', this._boundPointerUp)

    document.removeEventListener('keydown', this._boundKeyDown)
    document.removeEventListener('keyup', this._boundKeyUp)
  }

  /**
   * 从剪贴板粘贴图片
   */
  async _pasteImageFromClipboard() {
    try {
      console.log('[DrawMode] 开始从剪贴板读取图片')

      // 检查是否有鼠标位置
      if (!this.mousePos) {
        console.warn('[DrawMode] 鼠标位置未初始化，无法确定图片位置')
        return
      }

      // 从剪贴板读取图片
      const imgdata = await getImageBitmapFromClipboard()
      if (!imgdata) {
        console.warn('[DrawMode] 剪贴板中没有图片数据')
        return
      }

      // 将鼠标位置转换为世界坐标
      const worldPos = this.viewport.toWorld(this.mousePos.x, this.mousePos.y)

      // 创建ImgElement
      const imgElement = new ImgElement(
        imgdata,
        worldPos.x,
        worldPos.y,
        this.viewport.rotate // 初始角度为viewport当前rotate
      )

      // 使用命令模式添加元素
      if (this.commandManager) {
        const command = new AddElementCommand(this.dataManager, imgElement)
        this.commandManager.execute(command)
      } else {
        // 直接添加（兼容性处理）
        await this.dataManager.addElement(imgElement)
      }

      console.log('[DrawMode] 图片粘贴成功:', imgElement.id)
    } catch (e) {
      console.error('[DrawMode] 从剪贴板粘贴图片失败:', e)
    }
  }

  _onPointerDown(e) {
    if (!this.isPenMode) return
    if (e.pointerType !== 'pen') return
    this.penDrawing = true
    this.lastPointerId = e.pointerId
    this.linePoints = []
    const wxy = this.viewport.toWorld(e.offsetX, e.offsetY)
    this.linePoints.push({ x: wxy.x, y: wxy.y, pressure: e.pressure })
    this._updateTemporary()
  }

  _onPointerMove(e) {
    if (!this.isPenMode || !this.penDrawing) return
    if (e.pointerType !== 'pen' || e.pointerId !== this.lastPointerId) return
    const wxy = this.viewport.toWorld(e.offsetX, e.offsetY)
    this.linePoints.push({ x: wxy.x, y: wxy.y, pressure: e.pressure })
    this.mousePos = { x: e.offsetX, y: e.offsetY }
    this._updateTemporary()
  }

  _onPointerUp(e) {
    if (!this.isPenMode || !this.penDrawing) return
    if (e.pointerType !== 'pen' || e.pointerId !== this.lastPointerId) return
    this.penDrawing = false
    if (this.linePoints.length >= 2) {
      // 创建PathElement，带pressure信息
      const element = new PathElement()
      element.geometies = [...this.linePoints]
      element.color = '#3b82f6'
      element.width = this._pressureToLineWidth(e.pressure)
      element.smooth = true
      if (this.commandManager) {
        const command = new AddElementCommand(this.dataManager, element)
        this.commandManager.execute(command)
      } else {
        this.dataManager.addElement(element)
      }
    }
    this.linePoints = []
    this._updateTemporary()
  }

  // pressure映射线宽
  _pressureToLineWidth(pressure) {
    return 1 + pressure * 4 // 线宽1~5
  }
}
