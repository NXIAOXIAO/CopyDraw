import { BaseMode } from './BaseMode.js'
import { DefaultRenderStrategy } from '../renders/strategies/DefaultRenderStrategy.js'
import { SketchRenderStrategy } from '../renders/strategies/SketchRenderStrategy.js'
import { OilPaintRenderStrategy } from '../renders/strategies/OilPaintRenderStrategy.js'
import { ThickPaintRenderStrategy } from '../renders/strategies/ThickPaintRenderStrategy.js'
import { CartoonRenderStrategy } from '../renders/strategies/CartoonRenderStrategy.js'
import { TransparentRenderStrategy } from '../renders/strategies/TransparentRenderStrategy.js'
import { GrowthRenderStrategy } from '../renders/strategies/GrowthRenderStrategy.js'
import { ViewOperationStrategy } from './strategies/ViewOperationStrategy.js'
import { RenderKeyboardStrategy } from './strategies/RenderKeyboardStrategy.js'

export class RenderMode extends BaseMode {
  constructor(eventEmitter, viewport, dataManager, canvasArea) {
    super(eventEmitter)
    this.viewport = viewport
    this.dataManager = dataManager
    this.canvasArea = canvasArea
    this.mousePos = null
    this.isActive = false

    // Initialize rendering strategies
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

    // Initialize interaction strategies
    // 视图操作策略
    this.strategies = {
      view: new ViewOperationStrategy({
        mode: this,
        eventEmitter,
        viewport,
        canvasArea,
        maxScale: 30
      })
    }
    this.strategies.keyboard = new RenderKeyboardStrategy({
      mode: this,
      eventEmitter: this.eventEmitter,
      strategies: this.strategies
    })

    // Bind event handlers
    this._boundHandleEvent = this._handleEvent.bind(this)

    // Register event listeners
    this.eventEmitter.on('viewportChange', () => this.isActive && this.render())
    this.eventEmitter.on('elementsChanged', () => this.isActive && this.render())
    this.eventEmitter.on('renderStrategyChange', (strategyName) =>
      this.setRenderStrategy(strategyName)
    )
  }

  activate() {
    super.activate()
    this.isActive = true
    console.log('[RenderMode] (Refactored) Entered render mode')

    Object.values(this.strategies).forEach((s) => s.activate && s.activate())
    this._addDOMEventListeners()
    this.render()
  }

  deactivate() {
    super.deactivate()
    this.isActive = false
    console.log('[RenderMode] (Refactored) Exited render mode')

    Object.values(this.strategies).forEach((s) => s.deactivate && s.deactivate())
    this._removeDOMEventListeners()

    if (this.currentStrategyInstance && this.currentStrategyInstance.stopAnimation) {
      this.currentStrategyInstance.stopAnimation()
    }

    if (this.canvasArea && this.canvasArea.dataCanvas) {
      const ctx = this.canvasArea.dataCanvas.getContext('2d')
      ctx.clearRect(0, 0, this.canvasArea.dataCanvas.width, this.canvasArea.dataCanvas.height)
    }

    if (this.dataManager) {
      const elements = this.dataManager.getAllElements()
      this.eventEmitter.emit('renderElements', elements)
    }
  }

  setRenderStrategy(strategyName) {
    if (this.renderStrategies[strategyName]) {
      if (this.currentStrategyInstance && this.currentStrategyInstance.stopAnimation) {
        this.currentStrategyInstance.stopAnimation()
      }
      this.currentStrategy = strategyName
      this.currentStrategyInstance = this.renderStrategies[strategyName]
      console.log('[RenderMode] Switched render strategy to:', strategyName)
      this.render()
    } else {
      console.warn('[RenderMode] Unknown render strategy:', strategyName)
    }
  }

  getCurrentStrategy() {
    return this.currentStrategy
  }

  getAvailableStrategies() {
    return Object.keys(this.renderStrategies).map((key) => ({
      key,
      name: this.renderStrategies[key].getName(),
      description: this.renderStrategies[key].getDescription()
    }))
  }

  render() {
    if (!this.canvasArea || !this.dataManager || !this.viewport) {
      console.warn('[RenderMode] Render dependencies not initialized')
      return
    }
    try {
      this.currentStrategyInstance.render(this.canvasArea, this.dataManager, this.viewport)
    } catch (e) {
      console.error('[RenderMode] Render error:', e)
    }
  }

  _addDOMEventListeners() {
    const canvas = this.canvasArea.dataCanvas
    const eventTypes = ['mousedown', 'mousemove', 'mouseup', 'wheel', 'keydown', 'keyup']
    eventTypes.forEach((type) => {
      const target = type.startsWith('key') ? document : canvas
      if (type === 'wheel') {
        target.addEventListener(type, this._boundHandleEvent, { passive: true })
      } else {
        target.addEventListener(type, this._boundHandleEvent)
      }
    })
  }

  _removeDOMEventListeners() {
    const canvas = this.canvasArea.dataCanvas
    const eventTypes = ['mousedown', 'mousemove', 'mouseup', 'wheel', 'keydown', 'keyup']
    eventTypes.forEach((type) => {
      const target = type.startsWith('key') ? document : canvas
      if (type === 'wheel') {
        target.removeEventListener(type, this._boundHandleEvent, { passive: true })
      } else {
        target.removeEventListener(type, this._boundHandleEvent)
      }
    })
  }

  _handleEvent(e) {
    if (!this.isActive) return

    if (e.type.includes('mouse')) {
      this.mousePos = { x: e.offsetX, y: e.offsetY }
    }

    if (e.type.startsWith('key')) {
      this.strategies.keyboard.handleEvent(e)
      return
    }

    this.strategies.view.handleEvent(e)
  }
}
