import { BaseMode } from './BaseMode.js'
import { SelectionState } from './states/SelectionState.js'
import { DragState } from './states/DragState.js'
import { ViewOperationStrategy } from './strategies/ViewOperationStrategy.js'
import { ElementSelectionStrategy } from './strategies/ElementSelectionStrategy.js'
import { BoxSelectStrategy } from './strategies/BoxSelectStrategy.js'
import { PointOperationStrategy } from './strategies/PointOperationStrategy.js'
import { DragElementStrategy } from './strategies/DragElementStrategy.js'
import { DeleteStrategy } from './strategies/DeleteStrategy.js'
import { CopyPasteStrategy } from './strategies/CopyPasteStrategy.js'
import { KeyboardStrategy } from './strategies/KeyboardStrategy.js'
import { ImportExportStrategy } from './strategies/ImportExportStrategy.js'
import { getPointAt, isPointOnElement } from '../utils/viewEditHelpers.js'
import { getCenterToNearestElementOffset } from '../utils/viewHelpers.js'

/**
 * 查看编辑模式（重构版）
 * 通过组合不同的策略（Strategy）来处理交互，自身作为状态和策略的协调者。
 */
export class ViewEditMode extends BaseMode {
  constructor(eventEmitter, viewport, dataManager, canvasArea, commandManager) {
    super(eventEmitter)

    // Core dependencies
    this.viewport = viewport
    this.dataManager = dataManager
    this.canvasArea = canvasArea
    this.commandManager = commandManager
    this.isActive = false

    // State Management
    this.state = {
      selection: new SelectionState(),
      drag: new DragState()
    }

    // Interaction Strategies
    this.strategies = {
      view: new ViewOperationStrategy({ mode: this, eventEmitter, viewport, canvasArea }),
      elementSelection: new ElementSelectionStrategy({
        mode: this,
        state: this.state,
        eventEmitter,
        dataManager,
        viewport
      }),
      boxSelect: new BoxSelectStrategy({
        mode: this,
        state: this.state,
        eventEmitter,
        viewport,
        dataManager
      }),
      point: new PointOperationStrategy({
        mode: this,
        state: this.state,
        eventEmitter,
        viewport,
        dataManager,
        commandManager
      }),
      drag: new DragElementStrategy({
        mode: this,
        state: this.state,
        eventEmitter,
        viewport,
        dataManager,
        commandManager
      }),
      delete: new DeleteStrategy({
        mode: this,
        state: this.state,
        eventEmitter,
        dataManager,
        commandManager
      }),
      copyPaste: new CopyPasteStrategy({
        mode: this,
        state: this.state,
        eventEmitter,
        dataManager,
        commandManager,
        viewport,
        canvasArea
      }),
      importExport: new ImportExportStrategy({ mode: this, dataManager })
    }
    // Keyboard strategy requires other strategies for delegation
    this.strategies.keyboard = new KeyboardStrategy({
      mode: this,
      state: this.state,
      eventEmitter,
      commandManager,
      strategies: this.strategies
    })

    // Bind event handlers
    this._boundHandleEvent = this._handleEvent.bind(this)
    this._mouseDownPos = null // 新增：记录鼠标按下位置
    this._mouseDowning = false // 新增：标记是否在按下中
  }

  activate() {
    super.activate()
    this.isActive = true
    console.log('[ViewEditMode] a new version, a new look')

    Object.values(this.strategies).forEach((strategy) => strategy.activate && strategy.activate())

    this._addDOMEventListeners()
    this.reRender()
    this.updateTemporary()
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

  // --- Public methods for strategies to call ---

  reRender(excludeIds = []) {
    if (!this.dataManager) return
    const elements = this.dataManager.getAllElements()
    const movingIds = this.state.drag.isDragging
      ? (this.state.drag.movedElements || []).map((e) => e.id)
      : []
    const finalExcludeIds = [...new Set([...excludeIds, ...movingIds])]
    this.eventEmitter.emit('renderElements', elements, finalExcludeIds)
  }

  updateTemporary() {
    // 如果没有选中元素，强制清空移动状态
    let isMovingElement = this.state.drag.isDragging
    let movedElements = this.state.drag.movedElements
    if (
      !this.state.selection.selectedElements ||
      this.state.selection.selectedElements.length === 0
    ) {
      isMovingElement = false
      movedElements = []
    }
    const temporary = {
      selectedElements: this.state.selection.selectedElements,
      selectedElement: this.state.selection.selectedElement,
      selectedPointIdx: this.state.selection.selectedPointIdx,
      selectBox: this.strategies.boxSelect.dragBox
        ? { start: this.strategies.boxSelect.boxStart, end: this.strategies.boxSelect.boxEnd }
        : null,
      isMovingElement,
      movedElements
    }
    this.eventEmitter.emit('setTemporary', temporary)
  }

  getPointAt(line, x, y) {
    return getPointAt(line, x, y, this.viewport)
  }

  enterMoveMode() {
    this.strategies.drag.enterMoveMode()
  }

  // --- Event Handling ---

  _addDOMEventListeners() {
    const canvas = this.canvasArea.dataCanvas
    // Mousedown starts on the canvas
    canvas.addEventListener('mousedown', this._boundHandleEvent)
    canvas.addEventListener('wheel', this._boundHandleEvent, { passive: true })
    canvas.addEventListener('dblclick', this._boundHandleEvent)

    // Mousemove and mouseup are on the document to capture events that end outside the canvas
    document.addEventListener('mousemove', this._boundHandleEvent)
    document.addEventListener('mouseup', this._boundHandleEvent)

    // Keyboard events are global
    document.addEventListener('keydown', this._boundHandleEvent)
    document.addEventListener('keyup', this._boundHandleEvent)

    this.eventEmitter.on('cursorChange', this._setCursor)
  }

  _removeDOMEventListeners() {
    const canvas = this.canvasArea.dataCanvas
    canvas.removeEventListener('mousedown', this._boundHandleEvent)
    canvas.removeEventListener('wheel', this._boundHandleEvent, { passive: true })
    canvas.removeEventListener('dblclick', this._boundHandleEvent)

    document.removeEventListener('mousemove', this._boundHandleEvent)
    document.removeEventListener('mouseup', this._boundHandleEvent)

    document.removeEventListener('keydown', this._boundHandleEvent)
    document.removeEventListener('keyup', this._boundHandleEvent)

    this.eventEmitter.off('cursorChange', this._setCursor)
  }

  _setCursor = (cursor) => {
    this.canvasArea.dataCanvas.style.cursor = cursor
  }

  _handleEvent(e) {
    if (!this.isActive) return

    // 优先处理导入导出策略
    if (this.strategies.importExport.handleEvent(e)) return

    if (e.type.includes('mouse')) {
      this.mousePos = { x: e.offsetX, y: e.offsetY }
    }

    if (e.type === 'keydown' || e.type === 'keyup') {
      this.strategies.keyboard.handleEvent(e)
      return
    }

    if (e.type === 'wheel') {
      this.strategies.view.handleEvent(e)
      return
    }

    if (e.type === 'dblclick') {
      this.strategies.point.handleEvent(e)
      return
    }

    // Capture the current state of operations BEFORE handling the new event
    const wasElementDragging = this.state.drag.isDragging
    const wasPointDragging = this.strategies.point.isDragging
    const wasBoxSelecting = this.strategies.boxSelect.dragBox
    const wasViewPanning = this.strategies.view.isPanning

    // --- MOUSEMOVE ---
    if (e.type === 'mousemove') {
      // 优先：如果正在拖动线上的点，则只分发给point，不触发视图平移
      const sel = this.state.selection
      if (
        sel.selectedElement &&
        sel.selectedElement.type === 'LineElement' &&
        sel.selectedPointIdx !== -1 &&
        this.strategies.point.isDragging
      ) {
        this.strategies.point.handleEvent(e)
        return
      }
      // 新增：如果正在移动模式下拖动元素，优先分发给drag
      if (this.strategies.drag.isMovingByKey && this.state.drag.isDragging) {
        this.strategies.drag.handleEvent(e)
        return
      }
      // 新增：如果左键按下，且移动距离超过容差，则进入视图平移
      if (this._mouseDowning && this._mouseDownPos) {
        const dx = e.offsetX - this._mouseDownPos.x
        const dy = e.offsetY - this._mouseDownPos.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (!this.strategies.view.isPanning && dist > 4) {
          // 进入平移
          this.strategies.view.lastMouse = { ...this._mouseDownPos }
          this.strategies.view.isPanning = true
          this.strategies.view.handleEvent({ ...e, type: 'mousedown' }) // 触发view的mousedown
        }
        if (this.strategies.view.isPanning) {
          this.strategies.view.handleEvent(e)
          return
        }
      }
      // 其它情况保持原有逻辑
      if (this.strategies.boxSelect.dragBox) {
        this.strategies.boxSelect.handleEvent(e)
        return
      }
      return
    }

    // --- MOUSEDOWN ---
    if (e.type === 'mousedown') {
      // 新增：如果处于键盘移动模式，优先分发给 drag，无论点击位置
      if (this.strategies.drag.isMovingByKey) {
        this.strategies.drag.handleEvent(e)
        return
      }
      if (e.button === 0) {
        this._mouseDownPos = { x: e.offsetX, y: e.offsetY }
        this._mouseDowning = true
      }
      // 点操作和框选操作依然要响应（但只有mouseup时才会真正点选）
      this.strategies.point.handleEvent(e)
      this.strategies.boxSelect.handleEvent(e)
      return
    }

    // --- MOUSEUP ---
    if (e.type === 'mouseup') {
      if (e.button === 0 && this._mouseDownPos) {
        const dx = e.offsetX - this._mouseDownPos.x
        const dy = e.offsetY - this._mouseDownPos.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        this._mouseDowning = false
        // 只有点击（距离小于容差）才分发点选
        if (dist < 4) {
          this.strategies.elementSelection.handleEvent(e)
        }
        this._mouseDownPos = null
        // 鼠标抬起后，若正在平移，通知view结束
        if (this.strategies.view.isPanning) {
          this.strategies.view.handleEvent(e)
        }
        // 其它操作
        if (this.state.drag.isDragging && this.strategies.drag.isMovingByKey) {
          this.strategies.drag.handleEvent(e)
          return
        }
        if (this.strategies.point.isDragging) {
          this.strategies.point.handleEvent(e)
          return
        }
        if (this.strategies.boxSelect.dragBox) {
          this.strategies.boxSelect.handleEvent(e)
          return
        }
        return
      }
      // 非左键抬起，保持原有逻辑
      if (this.state.drag.isDragging && this.strategies.drag.isMovingByKey) {
        this.strategies.drag.handleEvent(e)
        return
      }
      if (this.strategies.point.isDragging) {
        this.strategies.point.handleEvent(e)
        return
      }
      if (this.strategies.boxSelect.dragBox) {
        this.strategies.boxSelect.handleEvent(e)
        return
      }
      if (this.strategies.view.isPanning) {
        this.strategies.view.handleEvent(e)
        return
      }
    }
  }
}
