import { BaseMode } from './BaseMode.js'
import { DefaultRenderStrategy } from '../renders/strategies/DefaultRenderStrategy.js'
import { SketchRenderStrategy } from '../renders/strategies/SketchRenderStrategy.js'
import { OilPaintRenderStrategy } from '../renders/strategies/OilPaintRenderStrategy.js'
import { ThickPaintRenderStrategy } from '../renders/strategies/ThickPaintRenderStrategy.js'
import { CartoonRenderStrategy } from '../renders/strategies/CartoonRenderStrategy.js'
import { TransparentRenderStrategy } from '../renders/strategies/TransparentRenderStrategy.js'
import { GrowthRenderStrategy } from '../renders/strategies/GrowthRenderStrategy.js'
import { getNextScale } from '../utils/zoom.js'

export class RenderMode extends BaseMode {
  constructor(eventEmitter, viewport, dataManager, canvasArea) {
    super(eventEmitter)
    this.viewport = viewport
    this.dataManager = dataManager
    this.canvasArea = canvasArea
    this.mousePos = null // 跟踪鼠标位置
    this.isActive = false // 跟踪模式是否激活
    this.isPanning = false // 是否正在拖拽视图
    this.lastMouse = null // 记录上次鼠标位置
    this._boundMouseMove = this._onMouseMove.bind(this)
    this._boundMouseDown = this._onMouseDown.bind(this)
    this._boundMouseUp = this._onMouseUp.bind(this)
    this._boundKeyDown = this._onKeyDown.bind(this)
    this._boundWheel = this._onWheel.bind(this)

    // 初始化渲染策略
    this.renderStrategies = {
      default: new DefaultRenderStrategy({ viewport, dataManager, canvases: null }),
      sketch: new SketchRenderStrategy(),
      oilPaint: new OilPaintRenderStrategy(),
      thickPaint: new ThickPaintRenderStrategy(),
      cartoon: new CartoonRenderStrategy(),
      transparent: new TransparentRenderStrategy(),
      growth: new GrowthRenderStrategy()
    }

    this.currentStrategy = 'default'
    this.currentStrategyInstance = this.renderStrategies[this.currentStrategy]

    // 注册事件监听器
    this._registerEventListeners()
  }

  _registerEventListeners() {
    // 监听viewport变化
    this.eventEmitter.on('viewportChange', () => {
      // 只有在RenderMode激活时才重新渲染
      if (this.isActive) {
        this.render()
      }
    })

    // 监听元素变化
    this.eventEmitter.on('elementsChanged', () => {
      // 只有在RenderMode激活时才重新渲染
      if (this.isActive) {
        this.render()
      }
    })

    // 监听渲染策略切换
    this.eventEmitter.on('renderStrategyChange', (strategyName) => {
      this.setRenderStrategy(strategyName)
    })
  }

  activate() {
    super.activate()
    this.isActive = true
    console.log('[RenderMode] 进入渲染模式')

    // 添加事件监听器
    document.addEventListener('mousemove', this._boundMouseMove)
    document.addEventListener('mousedown', this._boundMouseDown)
    document.addEventListener('mouseup', this._boundMouseUp)
    document.addEventListener('keydown', this._boundKeyDown)
    document.addEventListener('wheel', this._boundWheel)

    // 执行初始渲染
    this.render()
  }

  deactivate() {
    super.deactivate()
    this.isActive = false
    console.log('[RenderMode] 退出渲染模式')

    // 移除事件监听器
    document.removeEventListener('mousemove', this._boundMouseMove)
    document.removeEventListener('mousedown', this._boundMouseDown)
    document.removeEventListener('mouseup', this._boundMouseUp)
    document.removeEventListener('keydown', this._boundKeyDown)
    document.removeEventListener('wheel', this._boundWheel, { passive: true })

    // 停止动画
    if (this.currentStrategyInstance && this.currentStrategyInstance.stopAnimation) {
      this.currentStrategyInstance.stopAnimation()
    }

    // 清空dataCanvas，为其他模式做准备
    if (this.canvasArea && this.canvasArea.dataCanvas) {
      const ctx = this.canvasArea.dataCanvas.getContext('2d')
      ctx.clearRect(0, 0, this.canvasArea.dataCanvas.width, this.canvasArea.dataCanvas.height)
    }

    // 触发重新渲染，让其他模式能够正确显示
    if (this.dataManager) {
      const elements = this.dataManager.getAllElements()
      this.eventEmitter.emit('renderElements', elements)
    }
  }

  /**
   * 设置渲染策略
   */
  setRenderStrategy(strategyName) {
    if (this.renderStrategies[strategyName]) {
      // 停止当前动画
      if (this.currentStrategyInstance && this.currentStrategyInstance.stopAnimation) {
        this.currentStrategyInstance.stopAnimation()
      }

      this.currentStrategy = strategyName
      this.currentStrategyInstance = this.renderStrategies[strategyName]

      console.log('[RenderMode] 切换渲染策略:', strategyName)

      // 重新渲染
      this.render()
    } else {
      console.warn('[RenderMode] 未知的渲染策略:', strategyName)
    }
  }

  /**
   * 获取当前渲染策略
   */
  getCurrentStrategy() {
    return this.currentStrategy
  }

  /**
   * 获取所有可用的渲染策略
   */
  getAvailableStrategies() {
    return Object.keys(this.renderStrategies).map((key) => ({
      key,
      name: this.renderStrategies[key].getName(),
      description: this.renderStrategies[key].getDescription()
    }))
  }

  /**
   * 执行渲染
   */
  render() {
    if (!this.canvasArea || !this.dataManager || !this.viewport) {
      console.warn('[RenderMode] 渲染依赖未初始化')
      return
    }

    try {
      this.currentStrategyInstance.render(this.canvasArea, this.dataManager, this.viewport)
    } catch (e) {
      console.error('[RenderMode] 渲染异常:', e)
    }
  }

  /**
   * 鼠标移动事件 - 跟踪位置和拖拽视图
   */
  _onMouseMove(e) {
    // 获取相对于canvas的位置
    if (this.canvasArea && this.canvasArea.dataCanvas) {
      const rect = this.canvasArea.dataCanvas.getBoundingClientRect()
      this.mousePos = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      }
    }

    // 处理拖拽视图
    if (this.isPanning && this.lastMouse && this.viewport) {
      const move = {
        x: this.mousePos.x - this.lastMouse.x,
        y: this.mousePos.y - this.lastMouse.y
      }

      // 计算旋转后的移动向量
      const cosTheta = Math.cos(this.viewport.rotate)
      const sinTheta = Math.sin(this.viewport.rotate)
      const movebyrotate = {
        x: move.x * cosTheta - move.y * sinTheta,
        y: move.x * sinTheta + move.y * cosTheta
      }

      // 更新viewport
      this.eventEmitter.emit('updateViewport', {
        xoffset: this.viewport.xoffset - movebyrotate.x * this.viewport.scale,
        yoffset: this.viewport.yoffset - movebyrotate.y * this.viewport.scale
      })

      this.lastMouse = { ...this.mousePos }
    }
  }

  /**
   * 鼠标按下事件 - 开始拖拽视图
   */
  _onMouseDown(e) {
    if (e.button === 0) {
      // 左键
      this.isPanning = true
      this.lastMouse = this.mousePos
    }
  }

  /**
   * 鼠标抬起事件 - 结束拖拽视图
   */
  _onMouseUp(e) {
    if (e.button === 0) {
      // 左键
      this.isPanning = false
    }
  }

  /**
   * 键盘事件 - 支持数字键快速切换渲染策略
   */
  _onKeyDown(e) {
    let strategyChanged = false
    let newStrategy = null

    switch (e.key) {
      case 'A':
      case 'a':
        newStrategy = 'default'
        strategyChanged = true
        break
      case 'S':
      case 's':
        newStrategy = 'sketch'
        strategyChanged = true
        break
      case 'D':
      case 'd':
        newStrategy = 'oilPaint'
        strategyChanged = true
        break
      case 'F':
      case 'f':
        newStrategy = 'thickPaint'
        strategyChanged = true
        break
      case 'G':
      case 'g':
        newStrategy = 'cartoon'
        strategyChanged = true
        break
      case 'H':
      case 'h':
        newStrategy = 'transparent'
        strategyChanged = true
        break
      case 'J':
      case 'j':
        newStrategy = 'growth'
        strategyChanged = true
        break
    }

    if (strategyChanged && newStrategy) {
      this.setRenderStrategy(newStrategy)
      // 通知TopBar更新下拉菜单的值
      this.eventEmitter.emit('renderStrategyChanged', newStrategy)
    }
  }

  /**
   * 鼠标滚轮事件 - 支持缩放
   */
  _onWheel(e) {
    if (!this.viewport) return
    const delta = e.deltaY > 0 ? 1 : -1
    const newScale = getNextScale(this.viewport.scale, delta)
    // 计算缩放中心在世界坐标系中的位置
    let wxy = this.viewport.toWorld(e.offsetX, e.offsetY)
    // 更新viewport
    this.eventEmitter.emit('updateViewport', { scale: newScale })
    let wxy2 = this.viewport.toWorld(e.offsetX, e.offsetY)
    let dxoffset = wxy2.x - wxy.x
    let dyoffset = wxy2.y - wxy.y
    this.eventEmitter.emit('updateViewport', {
      xoffset: this.viewport.xoffset - dxoffset,
      yoffset: this.viewport.yoffset - dyoffset
    })
  }
}
