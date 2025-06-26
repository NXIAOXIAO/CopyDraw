import { BaseMode } from './BaseMode.js'
import { ViewOperationStrategy } from './strategies/ViewOperationStrategy.js'
import { CopyPasteStrategy } from './strategies/CopyPasteStrategy.js'
import { DrawStrategy } from './strategies/DrawStrategy.js'
import { DrawKeyboardStrategy } from './strategies/DrawKeyboardStrategy.js'

/**
 * DrawMode：线条绘制模式（重构版）
 * 通过组合不同的策略（Strategy）来处理交互。
 */
export class DrawMode extends BaseMode {
  constructor(eventEmitter, viewport, dataManager, canvasArea, commandManager) {
    super(eventEmitter)

    this.viewport = viewport
    this.dataManager = dataManager
    this.canvasArea = canvasArea
    this.commandManager = commandManager
    this.isActive = false
    this.isPanning = false
    this.lastMouse = null
    this._pendingViewportUpdate = false
    this._pendingViewportMove = null

    // Interaction Strategies
    this.strategies = {
      draw: new DrawStrategy({ mode: this, eventEmitter, viewport, dataManager, commandManager }),
      view: new ViewOperationStrategy({
        mode: this,
        eventEmitter,
        viewport,
        canvasArea,
        maxScale: 30
      }),
      copyPaste: new CopyPasteStrategy({
        mode: this,
        eventEmitter,
        dataManager,
        commandManager,
        viewport,
        canvasArea
      })
    }
    this.strategies.keyboard = new DrawKeyboardStrategy({
      mode: this,
      eventEmitter,
      commandManager,
      strategies: this.strategies
    })

    // Bind event handlers
    this._boundHandleEvent = this._handleEvent.bind(this)
  }

  activate() {
    super.activate()
    this.isActive = true
    console.log('[DrawMode] a new version, a new look')

    Object.values(this.strategies).forEach((strategy) => strategy.activate && strategy.activate())

    this._addDOMEventListeners()

    // Initial render for mouse cursor
    this.eventEmitter.emit('renderMousePos', {
      mousePos: this.mousePos,
      isPenMode: this.strategies.draw.isPenMode
    })
  }

  deactivate() {
    super.deactivate()
    this.isActive = false

    Object.values(this.strategies).forEach(
      (strategy) => strategy.deactivate && strategy.deactivate()
    )

    this._removeDOMEventListeners()
    this.eventEmitter.emit('setTemporary', {}) // Clear temporary layer
  }

  _addDOMEventListeners() {
    const canvas = this.canvasArea.dataCanvas
    const eventTypes = [
      'mousedown',
      'mousemove',
      'mouseup',
      'wheel',
      'dblclick',
      'pointerdown',
      'pointermove',
      'pointerup',
      'keydown',
      'keyup'
    ]
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
    const eventTypes = [
      'mousedown',
      'mousemove',
      'mouseup',
      'wheel',
      'dblclick',
      'pointerdown',
      'pointermove',
      'pointerup',
      'keydown',
      'keyup'
    ]
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

    if (e.type.includes('mouse') || e.type.includes('pointer')) {
      this.mousePos = { x: e.offsetX, y: e.offsetY }
      this.eventEmitter.emit('renderMousePos', {
        mousePos: this.mousePos,
        isPenMode: this.strategies.draw.isPenMode
      })
    }

    if (e.type.startsWith('key')) {
      this.strategies.keyboard.handleEvent(e)
      return
    }

    // wheel is handled by view strategy
    if (e.type === 'wheel') {
      this.strategies.view.handleEvent(e)
      return
    }

    // pointer events are for pen, pass to draw strategy
    if (e.type.startsWith('pointer')) {
      this.strategies.draw.handleEvent(e)
      return
    }

    // Special handling for left-click drag to pan vs click to add point
    if (e.type === 'mousedown' && e.button === 0) {
      if (this.strategies.draw.isPenMode) {
        // 笔模式下左键拖动平移
        this.strategies.draw.leftMouseHold = true
        this.lastMouse = { x: e.offsetX, y: e.offsetY }
        return
      } else {
        // 鼠标模式下左键绘制
        this.strategies.draw.leftMouseHold = true
        this.strategies.draw.leftMouseClick = { x: e.offsetX, y: e.offsetY }
        this.lastMouse = { x: e.offsetX, y: e.offsetY }
        return
      }
    }

    if (e.type === 'mousemove' && this.strategies.draw.leftMouseHold) {
      if (this.strategies.draw.isPenMode) {
        // 笔模式下左键拖动平移
        const dx = e.offsetX - this.lastMouse.x
        const dy = e.offsetY - this.lastMouse.y
        if (Math.sqrt(dx * dx + dy * dy) > 2) {
          this.isPanning = true
        }
        if (this.isPanning) {
          this._pendingViewportMove = { x: e.offsetX, y: e.offsetY }
          if (!this._pendingViewportUpdate) {
            this._pendingViewportUpdate = true
            requestAnimationFrame(() => {
              if (!this._pendingViewportMove || !this.lastMouse) {
                this._pendingViewportUpdate = false
                return
              }
              const move = {
                x: this._pendingViewportMove.x - this.lastMouse.x,
                y: this._pendingViewportMove.y - this.lastMouse.y
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
              this.lastMouse = { ...this._pendingViewportMove }
              this._pendingViewportUpdate = false
            })
          }
        }
        return
      } else {
        // 鼠标模式下左键绘制
        const dx = e.offsetX - this.lastMouse.x
        const dy = e.offsetY - this.lastMouse.y
        if (Math.sqrt(dx * dx + dy * dy) > 2) {
          this.isPanning = true
        }
        if (this.isPanning) {
          this._pendingViewportMove = { x: e.offsetX, y: e.offsetY }
          if (!this._pendingViewportUpdate) {
            this._pendingViewportUpdate = true
            requestAnimationFrame(() => {
              if (!this._pendingViewportMove || !this.lastMouse) {
                this._pendingViewportUpdate = false
                return
              }
              const move = {
                x: this._pendingViewportMove.x - this.lastMouse.x,
                y: this._pendingViewportMove.y - this.lastMouse.y
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
              this.lastMouse = { ...this._pendingViewportMove }
              this._pendingViewportUpdate = false
            })
          }
        }
        // Also update draw strategy preview
        this.strategies.draw.handleEvent(e)
        return
      }
    }

    if (e.type === 'mouseup' && e.button === 0) {
      if (this.strategies.draw.isPenMode) {
        this.strategies.draw.leftMouseHold = false
        this.isPanning = false
        this.lastMouse = null
        return
      } else {
        if (!this.isPanning) {
          // It was a click, not a drag
          this.strategies.draw.handleEvent(e)
        }
        this.strategies.draw.leftMouseHold = false
        this.isPanning = false
        this.lastMouse = null
        return
      }
    }

    // For other events (right click, dblclick), pass to draw strategy
    this.strategies.draw.handleEvent(e)
  }
}
