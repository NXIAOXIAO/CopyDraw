import { BaseMode } from './BaseMode.js'
import { ImgElement } from '../elements/ImgElement.js'
import { LineElement } from '../elements/LineElement.js'
import { getImageBitmapFromClipboard } from '../utils/clipboard.js'
import { debounce } from '../utils/debounce.js'

/**
 * DrawMode
 * 支持两种绘制模式：
 * 1. line模式：鼠标左键点击绘制折线，Enter结束，Esc取消
 * 2. pen模式：鼠标右键拖拽自由绘制，自动平滑和去重
 * Q键切换模式，支持撤销重做，视图操作等
 */
export class DrawMode extends BaseMode {
  constructor() {
    super()
    this.name = 'draw'

    // 常量定义
    this.CONSTANTS = {
      CLICK_THRESHOLD: 4,
      PEN_RECORD_INTERVAL: 16, // ~60fps
      MIN_ZOOM: 0.01,
      MAX_ZOOM: 30,
      ZOOM_FACTOR_IN: 1.1,
      ZOOM_FACTOR_OUT: 0.9,
      SMOOTHING_ITERATIONS: 2,
      POINT_DISTANCE_THRESHOLD: 2,
      PAN_SPEED: 1,
      ROTATE_SPEED: 0.01
    }

    // 状态管理
    this.state = {
      mode: 'line', // 'line' | 'pen'
      isDrawing: false,
      currentPoints: [],
      unsavedCount: 0,
      lastSaveTime: Date.now()
    }

    // 鼠标状态
    this.mouseState = {
      isLeftDown: false,
      isRightDown: false,
      isMiddleDown: false,
      lastPosition: null,
      clickStartPosition: null,
      dragStartPosition: null
    }

    // 临时绘制状态
    this.tempDrawing = {
      points: [],
      lastRecordTime: 0
    }

    // 防抖函数
    this.debouncedAddPoint = debounce(this._addPenPoint.bind(this), 16)

    // 绑定事件处理器
    this._bindEventHandlers()

    console.log('[DrawMode] 初始化完成', {
      mode: this.state.mode,
      constants: this.CONSTANTS
    })
  }

  _bindEventHandlers() {
    this._onMouseDown = this._onMouseDown.bind(this)
    this._onMouseMove = this._onMouseMove.bind(this)
    this._onMouseUp = this._onMouseUp.bind(this)
    this._onWheel = this._onWheel.bind(this)
    this._onKeyDown = this._onKeyDown.bind(this)
    this._onPaste = this._onPaste.bind(this)
    this._onDblClick = this._onDblClick.bind(this)
    this._onContextMenu = this._onContextMenu.bind(this)
  }

  activate() {
    console.log('[DrawMode] 激活模式')

    const canvas = document.getElementById('dataCanvas')
    if (!canvas) {
      console.error('[DrawMode] 未找到 dataCanvas 元素')
      return
    }

    // 添加事件监听器
    this._addEventListeners(canvas)
    this._canvas = canvas

    // 初始化状态
    this._resetDrawingState()
    this._updateUI()

    console.log('[DrawMode] 模式激活完成', {
      mode: this.state.mode,
      canvas: canvas.id
    })
  }

  deactivate() {
    console.log('[DrawMode] 停用模式')

    // 清理未完成的绘制
    this._cancelCurrentDrawing()

    // 移除事件监听器
    this._removeEventListeners()

    // 清理状态
    this._resetDrawingState()

    console.log('[DrawMode] 模式停用完成')
  }

  _addEventListeners(canvas) {
    canvas.addEventListener('mousedown', this._onMouseDown)
    canvas.addEventListener('mousemove', this._onMouseMove)
    canvas.addEventListener('mouseup', this._onMouseUp)
    canvas.addEventListener('wheel', this._onWheel, { passive: false })
    canvas.addEventListener('dblclick', this._onDblClick)
    canvas.addEventListener('contextmenu', this._onContextMenu)

    window.addEventListener('keydown', this._onKeyDown)
    window.addEventListener('paste', this._onPaste)

    console.log('[DrawMode] 事件监听器已添加')
  }

  _removeEventListeners() {
    if (this._canvas) {
      this._canvas.removeEventListener('mousedown', this._onMouseDown)
      this._canvas.removeEventListener('mousemove', this._onMouseMove)
      this._canvas.removeEventListener('mouseup', this._onMouseUp)
      this._canvas.removeEventListener('wheel', this._onWheel)
      this._canvas.removeEventListener('dblclick', this._onDblClick)
      this._canvas.removeEventListener('contextmenu', this._onContextMenu)
    }

    window.removeEventListener('keydown', this._onKeyDown)
    window.removeEventListener('paste', this._onPaste)

    console.log('[DrawMode] 事件监听器已移除')
  }

  // ==================== 鼠标事件处理 ====================

  _onMouseDown(e) {
    const worldPos = this._getWorldPosition(e)
    const viewportPos = { x: e.offsetX, y: e.offsetY }

    console.log('[DrawMode] 鼠标按下', {
      button: e.button,
      mode: this.state.mode,
      worldPos,
      viewportPos
    })

    this.mouseState.lastPosition = viewportPos
    this.mouseState.clickStartPosition = viewportPos

    switch (e.button) {
      case 0: // 左键
        this._handleLeftMouseDown(worldPos, viewportPos)
        break
      case 1: // 中键
        this._handleMiddleMouseDown(worldPos, viewportPos)
        break
      case 2: // 右键
        this._handleRightMouseDown(worldPos, viewportPos)
        break
    }
  }

  _onMouseMove(e) {
    const worldPos = this._getWorldPosition(e)
    const viewportPos = { x: e.offsetX, y: e.offsetY }

    // 更新鼠标位置
    this.mouseState.lastPosition = viewportPos

    // 处理绘制
    if (this.state.isDrawing) {
      this._handleDrawingMove(worldPos, viewportPos)
    }

    // 处理视图操作
    if (this.mouseState.isMiddleDown) {
      this._handleViewPan(viewportPos)
    }
  }

  _onMouseUp(e) {
    const worldPos = this._getWorldPosition(e)
    const viewportPos = { x: e.offsetX, y: e.offsetY }

    console.log('[DrawMode] 鼠标释放', {
      button: e.button,
      mode: this.state.mode,
      isDrawing: this.state.isDrawing
    })

    switch (e.button) {
      case 0: // 左键
        this._handleLeftMouseUp(worldPos, viewportPos)
        break
      case 1: // 中键
        this._handleMiddleMouseUp()
        break
      case 2: // 右键
        this._handleRightMouseUp(worldPos, viewportPos)
        break
    }
  }

  _onWheel(e) {
    e.preventDefault()

    const zoomData = this._calculateZoom(e)
    this._applyZoom(zoomData)
    this._updateViewportInfo()

    console.log('[DrawMode] 滚轮缩放', {
      delta: e.deltaY,
      newScale: zoomData.newScale,
      worldPos: zoomData.worldPos
    })
  }

  _onContextMenu(e) {
    e.preventDefault() // 阻止右键菜单
  }

  // ==================== 绘制处理 ====================

  _handleLeftMouseDown(worldPos, viewportPos) {
    if (this.state.mode === 'line') {
      this.mouseState.isLeftDown = true
      this._startLineDrawing(worldPos)
    }
  }

  _handleLeftMouseUp(worldPos, viewportPos) {
    if (this.state.mode === 'line' && this.mouseState.isLeftDown) {
      this.mouseState.isLeftDown = false
      this._addLinePoint(worldPos, viewportPos)
    }
  }

  _handleRightMouseDown(worldPos, viewportPos) {
    if (this.state.mode === 'pen') {
      this.mouseState.isRightDown = true
      this._startPenDrawing(worldPos)
    }
  }

  _handleRightMouseUp(worldPos, viewportPos) {
    if (this.state.mode === 'pen' && this.mouseState.isRightDown) {
      this.mouseState.isRightDown = false
      this._finishPenDrawing()
    }
  }

  _handleMiddleMouseDown(worldPos, viewportPos) {
    this.mouseState.isMiddleDown = true
    this.mouseState.dragStartPosition = viewportPos
  }

  _handleMiddleMouseUp() {
    this.mouseState.isMiddleDown = false
    this.mouseState.dragStartPosition = null
  }

  _handleDrawingMove(worldPos, viewportPos) {
    if (this.state.mode === 'pen' && this.mouseState.isRightDown) {
      this.debouncedAddPoint(worldPos)
    }
  }

  _handleViewPan(viewportPos) {
    if (!this.mouseState.dragStartPosition) return

    const dx = viewportPos.x - this.mouseState.dragStartPosition.x
    const dy = viewportPos.y - this.mouseState.dragStartPosition.y

    const viewport = this.context.viewport
    viewport.xoffset += (dx * this.CONSTANTS.PAN_SPEED) / viewport.scale
    viewport.yoffset += (dy * this.CONSTANTS.PAN_SPEED) / viewport.scale

    this.mouseState.dragStartPosition = viewportPos
    this._updateViewportInfo()
  }

  // ==================== 线条绘制 ====================

  _startLineDrawing(worldPos) {
    if (!this.state.isDrawing) {
      this.state.isDrawing = true
      this.state.currentPoints = []
      console.log('[DrawMode] 开始线条绘制')
    }

    this._addPointToLine(worldPos)
  }

  _addLinePoint(worldPos, viewportPos) {
    const clickStart = this.mouseState.clickStartPosition
    const isClick =
      Math.abs(viewportPos.x - clickStart.x) < this.CONSTANTS.CLICK_THRESHOLD &&
      Math.abs(viewportPos.y - clickStart.y) < this.CONSTANTS.CLICK_THRESHOLD

    if (isClick) {
      this._addPointToLine(worldPos)
    }
  }

  _addPointToLine(worldPos) {
    if (!this._isPointUnique(this.state.currentPoints, worldPos)) {
      return
    }

    this.state.currentPoints.push({ ...worldPos })
    this._updateTemporaryCanvas()

    console.log('[DrawMode] 添加线条点', {
      point: worldPos,
      totalPoints: this.state.currentPoints.length
    })
  }

  _finishLineDrawing() {
    if (!this.state.isDrawing || this.state.currentPoints.length < 2) {
      console.log('[DrawMode] 线条点数不足，取消绘制')
      this._cancelCurrentDrawing()
      return
    }

    const lineElement = new LineElement({
      points: [...this.state.currentPoints]
    })

    this._addElementToCanvas(lineElement)
    this._resetDrawingState()

    console.log('[DrawMode] 完成线条绘制', {
      points: lineElement.points.length
    })
  }

  // ==================== 画笔绘制 ====================

  _startPenDrawing(worldPos) {
    this.state.isDrawing = true
    this.state.currentPoints = [{ ...worldPos }]
    this.tempDrawing.lastRecordTime = Date.now()

    this._updateTemporaryCanvas()

    console.log('[DrawMode] 开始画笔绘制', { startPoint: worldPos })
  }

  _addPenPoint(worldPos) {
    if (!this.state.isDrawing) return

    const now = Date.now()
    if (now - this.tempDrawing.lastRecordTime < this.CONSTANTS.PEN_RECORD_INTERVAL) {
      return
    }

    if (
      this._isPointUnique(
        this.state.currentPoints,
        worldPos,
        this.CONSTANTS.POINT_DISTANCE_THRESHOLD
      )
    ) {
      this.state.currentPoints.push({ ...worldPos })
      this.tempDrawing.lastRecordTime = now
      this._updateTemporaryCanvas()
    }
  }

  _finishPenDrawing() {
    if (!this.state.isDrawing || !this.state.currentPoints || this.state.currentPoints.length < 2) {
      console.log('[DrawMode] 画笔点数不足，取消绘制')
      this._cancelCurrentDrawing()
      return
    }

    // 平滑和去重处理
    const smoothedPoints = this._smoothLine(this.state.currentPoints)
    const optimizedPoints = this._optimizePoints(smoothedPoints)

    const lineElement = new LineElement({
      points: optimizedPoints
    })

    this._addElementToCanvas(lineElement)
    this._resetDrawingState()

    console.log('[DrawMode] 完成画笔绘制', {
      originalPoints: this.state.currentPoints.length,
      smoothedPoints: smoothedPoints.length,
      finalPoints: optimizedPoints.length
    })
  }
  // ==================== 键盘事件处理 ====================

  _onKeyDown(e) {
    console.log('[DrawMode] 键盘按下', {
      key: e.key,
      ctrl: e.ctrlKey,
      shift: e.shiftKey,
      mode: this.state.mode
    })

    // 阻止默认行为的按键
    if (
      ['q', 'Q', 'Enter', 'Escape'].includes(e.key) ||
      (e.ctrlKey && ['z', 'Z', 's', 'S', 'y', 'Y'].includes(e.key))
    ) {
      e.preventDefault()
    }

    // 模式切换
    if (e.key === 'q' || e.key === 'Q') {
      this._toggleDrawMode()
      return
    }

    // 绘制控制
    if (this.state.mode === 'line') {
      if (e.key === 'Enter') {
        this._finishLineDrawing()
      } else if (e.key === 'Escape') {
        this._cancelCurrentDrawing()
      }
    }

    // 撤销重做
    if (e.ctrlKey) {
      if (e.key === 'z' || e.key === 'Z') {
        if (e.shiftKey) {
          this._handleRedo()
        } else {
          this._handleUndo()
        }
      } else if (e.key === 'y' || e.key === 'Y') {
        this._handleRedo()
      } else if (e.key === 's' || e.key === 'S') {
        this._handleSave()
      }
    }

    // 视图旋转
    if (e.key === 'r' || e.key === 'R') {
      this._rotateView(e.shiftKey ? -Math.PI / 4 : Math.PI / 4)
    }
  }

  _onDblClick(e) {
    if (this.state.mode === 'line' && e.button === 0) {
      this._finishLineDrawing()
    }
  }

  async _onPaste(e) {
    try {
      console.log('[DrawMode] 处理粘贴事件')
      const imgBitmap = await getImageBitmapFromClipboard()

      if (imgBitmap) {
        const viewport = this.context.viewport
        const centerX = viewport.width / 2
        const centerY = viewport.height / 2
        const worldPos = viewport.viewportToWorld(centerX, centerY)

        const imgElement = new ImgElement(imgBitmap, worldPos.x, worldPos.y, 0)
        this._addElementToCanvas(imgElement)

        console.log('[DrawMode] 粘贴图片成功', {
          size: { width: imgBitmap.width, height: imgBitmap.height },
          position: worldPos
        })

        e.preventDefault()
      }
    } catch (error) {
      console.error('[DrawMode] 粘贴图片失败:', error)
    }
  }

  // ==================== 模式管理 ====================

  _toggleDrawMode() {
    // 切换模式前先完成当前绘制
    if (this.state.isDrawing) {
      if (this.state.mode === 'line') {
        this._finishLineDrawing()
      } else {
        this._cancelCurrentDrawing()
      }
    }

    this.state.mode = this.state.mode === 'line' ? 'pen' : 'line'
    this._updateUI()

    console.log('[DrawMode] 切换绘制模式', {
      newMode: this.state.mode
    })
  }

  // ==================== 撤销重做 ====================

  _handleUndo() {
    if (this.state.isDrawing) {
      // 绘制中的撤销
      if (this.state.mode === 'line') {
        // line模式：撤销最后一个点
        if (this.state.currentPoints.length > 0) {
          this.state.currentPoints.pop()
          this._updateTemporaryCanvas()
          console.log('[DrawMode] 撤销线条点', {
            remainingPoints: this.state.currentPoints.length
          })
        }
      } else if (this.state.mode === 'pen') {
        // pen模式：取消当前绘制
        this._cancelCurrentDrawing()
        console.log('[DrawMode] 撤销画笔绘制')
      }
    } else {
      // 全局撤销
      this.context.commandInvoker.undo()
      this._updateUnsavedCount()
      console.log('[DrawMode] 执行全局撤销')
    }

    this._updateUI()
  }

  _handleRedo() {
    if (!this.state.isDrawing) {
      this.context.commandInvoker.redo()
      this._updateUnsavedCount()
      this._updateUI()
      console.log('[DrawMode] 执行重做')
    }
  }

  _handleSave() {
    // 触发保存事件
    this.context.appManager.notifyUI('saveRequested')
    this.state.lastSaveTime = Date.now()
    this.state.unsavedCount = 0
    this._updateUI()

    console.log('[DrawMode] 执行保存')
  }

  // ==================== 视图操作 ====================

  _calculateZoom(e) {
    const viewport = this.context.viewport
    const worldPos = viewport.viewportToWorld(e.offsetX, e.offsetY)
    const zoomFactor = e.deltaY > 0 ? this.CONSTANTS.ZOOM_FACTOR_OUT : this.CONSTANTS.ZOOM_FACTOR_IN
    const newScale = Math.min(
      Math.max(viewport.scale * zoomFactor, this.CONSTANTS.MIN_ZOOM),
      this.CONSTANTS.MAX_ZOOM
    )

    return {
      worldPos,
      newScale,
      mouseX: e.offsetX,
      mouseY: e.offsetY,
      zoomFactor
    }
  }

  _applyZoom({ worldPos, newScale, mouseX, mouseY }) {
    const viewport = this.context.viewport
    const oldScale = viewport.scale
    viewport.scale = newScale

    // 调整偏移以保持鼠标位置不变
    const newWorldPos = viewport.viewportToWorld(mouseX, mouseY)
    viewport.xoffset -= newWorldPos.x - worldPos.x
    viewport.yoffset -= newWorldPos.y - worldPos.y

    this.context.appManager.notifyUI('viewportChanged', {
      viewport: { ...viewport },
      zoomChanged: true
    })
  }

  _rotateView(angle) {
    const viewport = this.context.viewport
    viewport.rotate = (viewport.rotate + angle) % (2 * Math.PI)

    this.context.appManager.notifyUI('viewportChanged', {
      viewport: { ...viewport },
      rotateChanged: true
    })

    this._updateViewportInfo()

    console.log('[DrawMode] 旋转视图', {
      angle: (angle * 180) / Math.PI,
      totalRotation: (viewport.rotate * 180) / Math.PI
    })
  }

  // ==================== 辅助方法 ====================

  _getWorldPosition(e) {
    if (!e || typeof e.offsetX !== 'number' || typeof e.offsetY !== 'number') {
      console.warn('[DrawMode] 无效的鼠标事件:', e)
      return { x: 0, y: 0 }
    }

    const viewport = this.context?.viewport
    if (!viewport || typeof viewport.viewportToWorld !== 'function') {
      console.error('[DrawMode] 无效的视口上下文')
      return { x: 0, y: 0 }
    }

    return viewport.viewportToWorld(e.offsetX, e.offsetY)
  }

  _isPointUnique(points, newPoint, threshold = 0.1) {
    if (points.length === 0) return true

    const lastPoint = points[points.length - 1]
    const distance = Math.sqrt(
      Math.pow(newPoint.x - lastPoint.x, 2) + Math.pow(newPoint.y - lastPoint.y, 2)
    )

    return distance > threshold
  }

  _smoothLine(points) {
    if (!points || points.length < 3) return points

    let smoothed = [...points]

    for (let iteration = 0; iteration < this.CONSTANTS.SMOOTHING_ITERATIONS; iteration++) {
      const newPoints = [smoothed[0]]

      for (let i = 1; i < smoothed.length - 1; i++) {
        const prev = smoothed[i - 1]
        const curr = smoothed[i]
        const next = smoothed[i + 1]

        const smoothedPoint = {
          x: (prev.x + 2 * curr.x + next.x) / 4,
          y: (prev.y + 2 * curr.y + next.y) / 4
        }

        newPoints.push(smoothedPoint)
      }

      newPoints.push(smoothed[smoothed.length - 1])
      smoothed = newPoints
    }

    return smoothed
  }

  _optimizePoints(points) {
    if (!points || points.length < 3) return points

    const optimized = [points[0]]

    for (let i = 1; i < points.length - 1; i++) {
      const prev = optimized[optimized.length - 1]
      const curr = points[i]
      const next = points[i + 1]

      // 计算角度变化
      const angle1 = Math.atan2(curr.y - prev.y, curr.x - prev.x)
      const angle2 = Math.atan2(next.y - curr.y, next.x - curr.x)
      const angleDiff = Math.abs(angle2 - angle1)

      // 如果角度变化足够大或距离足够远，保留点
      const distance = Math.sqrt(Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2))

      if (angleDiff > 0.1 || distance > this.CONSTANTS.POINT_DISTANCE_THRESHOLD * 2) {
        optimized.push(curr)
      }
    }

    optimized.push(points[points.length - 1])
    return optimized
  }

  _addElementToCanvas(element) {
    this.context.commandInvoker.executeAdd(element)
    this.state.unsavedCount++
    this._updateUI()

    console.log('[DrawMode] 添加元素到画布', {
      type: element.type,
      unsavedCount: this.state.unsavedCount
    })
  }

  _updateTemporaryCanvas() {
    this.context.appManager.notifyUI('temporaryDrawing', {
      points: [...this.state.currentPoints],
      mode: this.state.mode,
      isDrawing: this.state.isDrawing
    })
  }

  _resetDrawingState() {
    this.state.isDrawing = false
    this.state.currentPoints = []
    this.tempDrawing.points = []
    this.tempDrawing.lastRecordTime = 0

    // 清理鼠标状态
    this.mouseState.isLeftDown = false
    this.mouseState.isRightDown = false
    this.mouseState.isMiddleDown = false
    this.mouseState.lastPosition = null
    this.mouseState.clickStartPosition = null
    this.mouseState.dragStartPosition = null

    this._updateTemporaryCanvas()

    console.log('[DrawMode] 重置绘制状态')
  }

  _cancelCurrentDrawing() {
    console.log('[DrawMode] 取消当前绘制', {
      mode: this.state.mode,
      points: this.state.currentPoints.length
    })

    this._resetDrawingState()
    this._updateUI()
  }

  _updateUnsavedCount() {
    // 这里可以通过比较当前状态和上次保存状态来计算未保存数量
    // 简化实现，可以根据实际需求调整
    const elements = this.context.dataManager.getAllElements()
    this.state.unsavedCount = Math.max(0, elements.length - this.state.unsavedCount)
  }

  _updateViewportInfo() {
    const viewport = this.context.viewport
    this.context.appManager.notifyUI('viewportInfo', {
      scale: viewport.scale,
      rotation: (viewport.rotate * 180) / Math.PI,
      offset: { x: viewport.xoffset, y: viewport.yoffset },
      unsavedCount: this.state.unsavedCount
    })
  }

  _updateUI() {
    // 更新顶部工具栏按钮状态
    this.context.appManager.notifyUI('drawModeState', {
      mode: this.state.mode,
      isDrawing: this.state.isDrawing,
      canUndo:
        this.context.commandInvoker.undoStack.length > 0 ||
        (this.state.isDrawing && this.state.currentPoints.length > 0),
      canRedo: this.context.commandInvoker.redoStack.length > 0,
      unsavedCount: this.state.unsavedCount
    })

    // 更新视口信息
    this._updateViewportInfo()

    // 更新临时绘制
    this._updateTemporaryCanvas()
  }

  // ==================== 公共接口 ====================

  handleUIEvent(eventType, payload) {
    console.log('[DrawMode] 处理UI事件', { eventType, payload })

    switch (eventType) {
      case 'undo':
        this._handleUndo()
        break
      case 'redo':
        this._handleRedo()
        break
      case 'save':
        this._handleSave()
        break
      case 'toggleMode':
        this._toggleDrawMode()
        break
      default:
        console.log('[DrawMode] 未处理的UI事件:', eventType)
    }
  }

  // 获取当前状态信息（用于调试）
  getDebugInfo() {
    return {
      mode: this.state.mode,
      isDrawing: this.state.isDrawing,
      currentPoints: this.state.currentPoints.length,
      unsavedCount: this.state.unsavedCount,
      mouseState: { ...this.mouseState },
      viewport: this.context?.viewport
        ? {
            scale: this.context.viewport.scale,
            rotation: this.context.viewport.rotate,
            offset: {
              x: this.context.viewport.xoffset,
              y: this.context.viewport.yoffset
            }
          }
        : null
    }
  }
}
