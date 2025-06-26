// CopyPasteStrategy：复制粘贴操作策略
import { getImageBitmapFromClipboard } from '../../utils/clipboard.js'
import { ImgElement } from '../../elements/ImgElement.js'
import { AddElementCommand } from '../../commands/AddElementCommand.js'

export class CopyPasteStrategy {
  constructor({ mode, state, eventEmitter, dataManager, commandManager, viewport, canvasArea }) {
    this.mode = mode
    this.state = state
    this.eventEmitter = eventEmitter
    this.dataManager = dataManager
    this.commandManager = commandManager
    this.viewport = viewport
    this.canvasArea = canvasArea
  }

  activate() {}
  deactivate() {}

  handleCopy() {
    if (
      !this.state.selection.selectedElements ||
      this.state.selection.selectedElements.length === 0
    )
      return
    const elementsToCopy = this.state.selection.selectedElements.map((element) => {
      if (element.type === 'ImgElement') {
        return { ...element, imgdata: element.imgdata }
      } else {
        return JSON.parse(JSON.stringify(element))
      }
    })
    this.eventEmitter.emit('copyElements', elementsToCopy)
  }

  async handlePaste() {
    const imgdata = await getImageBitmapFromClipboard()
    if (!imgdata) return
    const mouse = this.mode.mousePos || {
      x: this.canvasArea.dataCanvas.width / 2,
      y: this.canvasArea.dataCanvas.height / 2
    }
    const worldPos = this.viewport.toWorld(mouse.x, mouse.y)
    const newElement = new ImgElement(imgdata, worldPos.x, worldPos.y, this.viewport.rotate)
    if (this.commandManager) {
      const command = new AddElementCommand(this.dataManager, newElement)
      this.commandManager.execute(command)
    } else if (this.dataManager) {
      await this.dataManager.addElement(newElement)
    }
  }
}
