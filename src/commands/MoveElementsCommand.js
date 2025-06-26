import { Command } from './Command.js'

export class MoveElementsCommand extends Command {
  constructor(dataManager, elements, startPositions, endPositions) {
    super()
    this.dataManager = dataManager
    this.elements = elements.map((el) => ({
      id: el.id,
      type: el.type,
      startState: this._getElementStateFromPositions(el, startPositions[el.id]),
      endState: this._getElementStateFromPositions(el, endPositions[el.id])
    }))
  }

  /**
   * 根据位置信息获取元素状态
   */
  _getElementStateFromPositions(element, positions) {
    if (!positions) return null

    if (element.type === 'LineElement' || element.type === 'PathElement') {
      return {
        geometies: positions.geometies || element.geometies.map((p) => ({ x: p.x, y: p.y }))
      }
    } else if (element.type === 'ImgElement') {
      return {
        x: positions.x !== undefined ? positions.x : element.x,
        y: positions.y !== undefined ? positions.y : element.y
      }
    }
    return null
  }

  async execute() {
    try {
      for (const elementInfo of this.elements) {
        const element = this.dataManager.getElement(elementInfo.id)
        if (!element || !elementInfo.endState) continue

        // 直接应用结束状态
        if (element.type === 'LineElement' || element.type === 'PathElement') {
          element.geometies = elementInfo.endState.geometies.map((p) => ({ x: p.x, y: p.y }))
          await this.dataManager.updateElement(elementInfo.id, { geometies: element.geometies })
        } else if (element.type === 'ImgElement') {
          element.x = elementInfo.endState.x
          element.y = elementInfo.endState.y
          await this.dataManager.updateElement(elementInfo.id, { x: element.x, y: element.y })
        }
      }
      console.log('[MoveElementsCommand] 执行移动元素', this.elements.length)
    } catch (e) {
      console.error('[MoveElementsCommand] 执行异常', e)
    }
  }

  async undo() {
    try {
      for (const elementInfo of this.elements) {
        const element = this.dataManager.getElement(elementInfo.id)
        if (!element || !elementInfo.startState) continue

        // 直接恢复到开始状态
        if (element.type === 'LineElement' || element.type === 'PathElement') {
          element.geometies = elementInfo.startState.geometies.map((p) => ({ x: p.x, y: p.y }))
          await this.dataManager.updateElement(elementInfo.id, { geometies: element.geometies })
        } else if (element.type === 'ImgElement') {
          element.x = elementInfo.startState.x
          element.y = elementInfo.startState.y
          await this.dataManager.updateElement(elementInfo.id, { x: element.x, y: element.y })
        }
      }
      console.log('[MoveElementsCommand] 撤销移动元素', this.elements.length)
    } catch (e) {
      console.error('[MoveElementsCommand] 撤销异常', e)
    }
  }
}
