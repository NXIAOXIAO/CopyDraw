export class BaseMode {
  constructor(eventEmitter) {
    this.eventEmitter = eventEmitter
    this.mousePos = null // 基础鼠标位置跟踪
  }
  activate() {
    console.log(`[${this.constructor.name}] 激活`)
  }
  deactivate() {
    console.log(`[${this.constructor.name}] 禁用`)
  }
}
