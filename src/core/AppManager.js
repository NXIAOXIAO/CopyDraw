import { Viewport } from './Viewport.js'
import { DataManager } from './DataManager.js'
import { Render } from '../render/Render.js'
import { ViewEditMode } from '../mode/ViewEditMode.js'
import { CanvasArea } from '../ui/CanvasArea.js'
import { LeftBar } from '../ui/LeftBar.js'
import { EventListeners } from '../common/EventListeners.js'
import { Constants } from '../common/Constants.js'
import { DrawMode } from '../mode/DrawMode.js'
import { RenderMode } from '../mode/RenderMode.js'

/**
 * @class AppManager
 * @classdesc 应用生命周期协调器，负责初始化和管理各核心模块。
 */
export class AppManager {
  /**
   * @param {HTMLElement} [container=document.body] - 应用挂载容器
   */
  constructor(container) {
    this.container = container
    /** @type {DataManager} 数据管理*/
    this.dataManager = new DataManager()
    /** @type {Viewport} 唯一视图*/
    this.viewport = new Viewport()
    /** @type {EventListeners} 事件跟踪*/
    this.eventListeners = new EventListeners()

    /** @type {CanvasArea} */
    this.canvasArea = new CanvasArea(this.container, this.eventEmitter, this.viewport)

    /** @type {Render} */
    this.render = new Render(this.canvasArea, this.dataManager, this.viewport)

    //默认是查看/编辑模式
    this.mode = new ViewEditMode(
      this.eventListeners,
      this.canvasArea.getDataCanvas(),
      this.viewport,
      this.render,
      this.dataManager
    )

    this.leftBar = new LeftBar({
      onModeChange: (mode) => this.switchMode(mode)
    })

    // 仅调试用
    window.AppManager = this
  }

  async start() {
    await this.dataManager.loadFromIndexedDB()
    this.mode.enter()
    // 监听窗口resize
    window.addEventListener('resize', () => {
      const rect = this.container.getBoundingClientRect()
      this.viewport.width = rect.width
      this.viewport.height = rect.height
      this.canvasArea.resizeCanvases(this.viewport.width, this.viewport.height)
      this.render.renderAll()
    })
    // 阻止浏览器默认右键菜单的显示
    document.addEventListener('contextmenu', function (event) {
      event.preventDefault()
    })
  }

  switchMode(mode) {
    if (mode === this.mode.name) {
      return
    }
    this.mode.exit() //切换模式时需退出当前模式
    switch (mode) {
      case Constants.MODE_VIEW_EDIT:
        this.mode = new ViewEditMode(
          this.eventListeners,
          this.canvasArea.getDataCanvas(),
          this.viewport,
          this.render,
          this.dataManager
        )
        this.mode.enter() //进入模式
        break
      case Constants.MODE_DRAW:
        this.mode = new DrawMode(
          this.eventListeners,
          this.canvasArea.getDataCanvas(),
          this.viewport,
          this.render,
          this.dataManager
        )
        this.mode.enter()
        break
      case Constants.MODE_RENDER:
        this.mode = new RenderMode(
          this.eventListeners,
          this.canvasArea.getDataCanvas(),
          this.viewport,
          this.render,
          this.dataManager
        )
        this.mode.enter()
        break
      default:
    }
  }
}
