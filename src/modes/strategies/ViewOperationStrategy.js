// ViewOperationStrategy：视图操作策略
// 负责视图平移、缩放、旋转等交互
export class ViewOperationStrategy {
  constructor({ mode, eventEmitter, viewport, canvasArea, maxScale = 30 }) {
    this.mode = mode
    this.eventEmitter = eventEmitter
    this.viewport = viewport
    this.canvasArea = canvasArea
    this.isPanning = false
    this.lastMouse = null
    this._pendingViewportUpdate = false
    this._pendingViewportMove = null
    this.maxScale = maxScale
  }

  activate() {
    this.isPanning = false
    this.lastMouse = null
    this._pendingViewportUpdate = false
    this._pendingViewportMove = null
  }

  deactivate() {
    this.isPanning = false
    this.lastMouse = null
    this._pendingViewportUpdate = false
    this._pendingViewportMove = null
  }

  handleEvent(e) {
    switch (e.type) {
      case 'mousedown':
        this._onMouseDown(e)
        break
      case 'mousemove':
        this._onMouseMove(e)
        break
      case 'mouseup':
        this._onMouseUp(e)
        break
      case 'wheel':
        this._onWheel(e)
        break
      default:
        break
    }
  }

  _onMouseDown(e) {
    if (e.button === 0) {
      this.lastMouse = { x: e.offsetX, y: e.offsetY }
    }
  }

  _onMouseMove(e) {
    if (!this.lastMouse) return

    if (!this.isPanning) {
      const dx = e.offsetX - this.lastMouse.x
      const dy = e.offsetY - this.lastMouse.y
      if (Math.sqrt(dx * dx + dy * dy) <= 3) {
        return
      }
      this.isPanning = true
      this.eventEmitter.emit('cursorChange', 'grabbing')
    }

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

  _onMouseUp(e) {
    if (e.button === 0) {
      if (this.isPanning) {
        this.eventEmitter.emit('cursorChange', 'default')
      }
      this.isPanning = false
      this.lastMouse = null
    }
  }

  _onWheel(e) {
    // 只有非被动事件时才调用preventDefault
    if (e.cancelable) e.preventDefault()
    if (!this.viewport) return
    const delta = e.deltaY > 0 ? 1 : -1
    let zoomAmount
    if (this.viewport.scale <= 1) {
      zoomAmount = 0.1
    } else {
      zoomAmount = 0.15 * this.viewport.scale
    }
    let newScale = this.viewport.scale + delta * zoomAmount
    newScale = Math.min(Math.max(newScale, 0.1), this.maxScale)
    const rect = this.canvasArea.dataCanvas.getBoundingClientRect()
    const offsetX = e.clientX - rect.left
    const offsetY = e.clientY - rect.top
    const worldPos = this.viewport.toWorld(offsetX, offsetY)
    this.eventEmitter.emit('updateViewport', {
      scale: newScale,
      xoffset: worldPos.x - (worldPos.x - this.viewport.xoffset) * (newScale / this.viewport.scale),
      yoffset: worldPos.y - (worldPos.y - this.viewport.yoffset) * (newScale / this.viewport.scale)
    })
  }

  handleRotation(key) {
    let R = this.viewport.rotate
    if (key === 'ArrowLeft') R += Math.PI / 8
    if (key === 'ArrowRight') R -= Math.PI / 8
    R = Math.min(Math.max(R, -Math.PI * 2), Math.PI * 2)
    if (Math.abs(R) < 1e-6) R = 0
    this.eventEmitter.emit('updateViewport', { rotate: R })
  }
}
