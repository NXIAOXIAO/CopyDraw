// RenderHelper：渲染同步辅助类
export class RenderHelper {
  constructor({ eventEmitter, dataManager }) {
    this.eventEmitter = eventEmitter
    this.dataManager = dataManager
  }

  reRender(excludeIds = []) {
    const elements = this.dataManager.getAllElements()
    this.eventEmitter.emit('renderElements', elements, excludeIds)
  }

  updateTemporary(temporary) {
    this.eventEmitter.emit('setTemporary', temporary)
  }
}
