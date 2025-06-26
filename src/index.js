// 主入口文件：负责初始化所有 canvas、数据、模式、UI 绑定与全局事件
import { EventEmitter } from './common/EventEmitter.js'
import { Info } from './ui/Info.js'
import { LeftBar } from './ui/LeftBar.js'
import { CanvasArea } from './ui/CanvasArea.js'
import { Viewport } from './core/Viewport.js'
import { DataManager } from './core/DataManager.js'
import { CommandManager } from './core/CommandManager.js'
import { ModeManager } from './core/ModeManager.js'
import { Render } from './renders/Render.js'
import { TopBar } from './ui/TopBar.js'

// 0. 全局事件派发器
const eventEmitter = new EventEmitter()

// 1. 准备好core模块
const viewport = new Viewport(eventEmitter)

// 2. 准备好ui对象
const info = new Info(eventEmitter)
const topBar = new TopBar(eventEmitter)
const leftBar = new LeftBar(eventEmitter)

const canvasContainer = document.getElementById('canvasContainer')
const canvasArea = new CanvasArea(canvasContainer, eventEmitter)

const commandManager = new CommandManager(eventEmitter)
// 3. 准备好Render
const render = new Render(canvasArea, eventEmitter, viewport)

const dataManager = new DataManager(eventEmitter)
window.dataManager = dataManager

// 5. 等待DataManager初始化完成后初始化模式管理器
let modeManager = null

eventEmitter.on('elementsLoaded', async (data) => {
  console.log('[index.js] DataManager初始化完成，开始创建ModeManager')

  // 创建模式管理器
  modeManager = new ModeManager(eventEmitter, viewport, dataManager, canvasArea, commandManager)

  // 重新绘制元素
  eventEmitter.emit('renderElements', data.elements, [])

  // ModeManager初始化完成后，注册渲染策略相关的事件监听器
  eventEmitter.on('modeChange', (modeName) => {
    if (modeName === 'render' && modeManager) {
      const renderMode = modeManager.getCurrentMode()
      if (renderMode && typeof renderMode.getAvailableStrategies === 'function') {
        const strategies = renderMode.getAvailableStrategies()
        topBar.updateRenderStrategies(strategies)
        topBar.setCurrentRenderStrategy(renderMode.getCurrentStrategy())
      } else {
        console.warn('[index.js] RenderMode未正确初始化或缺少getAvailableStrategies方法')
      }
    }
  })
})

// 6. 注册事件处理器
eventEmitter.on('executeCommand', (command) => {
  commandManager.execute(command)
})

eventEmitter.on('updateViewport', (newData) => {
  viewport.update(newData)
})

eventEmitter.on('setTemporary', (temporary) => {
  dataManager.setTemporary(temporary)
})

eventEmitter.on('getAllElements', (callback) => {
  callback(dataManager.getAllElements())
})

eventEmitter.on('saveAll', () => {
  // 保存操作由DataManager处理
  console.log('[index.js] 触发保存操作')
})

eventEmitter.on('saveCompleted', () => {
  // 保存成功后重置命令栈
  commandManager.clear()
  console.log('[index.js] 保存成功，命令栈已重置')
})

eventEmitter.on('saveFailed', (error) => {
  console.error('[index.js] 保存失败:', error)
})

eventEmitter.on('deleteElement', (elementId) => {
  dataManager.deleteElement(elementId)
})

// 渲染策略相关事件
eventEmitter.on('renderStrategyChange', (strategyName) => {
  console.log('[index.js] 渲染策略切换:', strategyName)
  // 事件会由RenderMode处理
})

// 7. 事件监听
eventEmitter.on('elementsChanged', async (data) => {
  // 只有在非Render模式下才使用Render.js渲染
  if (modeManager && modeManager.getCurrentMode()) {
    const currentMode = modeManager.getCurrentMode()
    // 新增：如果是ViewEditMode且正在移动元素，禁止主层重绘
    if (currentMode.constructor.name === 'ViewEditMode' && currentMode.isMovingElement) {
      // 只更新临时层
      eventEmitter.emit('renderTemporary', dataManager.temporary)
      return
    }
    if (currentMode.constructor.name !== 'RenderMode') {
      eventEmitter.emit('renderElements', data.elements, [])
    }
  } else {
    // 如果ModeManager还没初始化，使用默认渲染
    eventEmitter.emit('renderElements', data.elements, [])
  }
})

eventEmitter.on('viewportChange', () => {
  // 只有在非Render模式下才使用Render.js重新渲染
  if (modeManager && modeManager.getCurrentMode()) {
    const currentMode = modeManager.getCurrentMode()
    // 新增：如果是ViewEditMode且正在移动元素，禁止主层重绘
    if (currentMode.constructor.name === 'ViewEditMode' && currentMode.isMovingElement) {
      // 只更新临时层
      eventEmitter.emit('renderTemporary', dataManager.temporary)
      return
    }
    if (currentMode.constructor.name !== 'RenderMode') {
      const elements = dataManager.getAllElements()
      eventEmitter.emit('renderElements', elements, [])
      const temporary = dataManager.temporary
      eventEmitter.emit('renderTemporary', temporary)
    }
  } else {
    // 如果ModeManager还没初始化，使用默认渲染
    const elements = dataManager.getAllElements()
    eventEmitter.emit('renderElements', elements, [])
    const temporary = dataManager.temporary
    eventEmitter.emit('renderTemporary', temporary)
  }
})

eventEmitter.on('temporaryChange', (temporary) => {
  eventEmitter.emit('renderTemporary', temporary)
})

// 8. 监听窗口大小变化
window.addEventListener('resize', () => {
  canvasArea.resizeCanvases(canvasContainer.clientWidth, canvasContainer.clientHeight)
})

// 9. 快捷键支持模式切换（数字键1/2/3）
document.addEventListener('keydown', (e) => {
  if (e.key === '1') leftBar.btnViewEdit.click()
  if (e.key === '2') leftBar.btnDraw.click()
  if (e.key === '3') leftBar.btnRender.click()
  if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
    eventEmitter.emit('saveAll')
    e.preventDefault()
  }
  if (e.ctrlKey && (e.key === 'z' || e.key === 'Z')) {
    commandManager.undo()
  }
  if (e.ctrlKey && (e.key === 'y' || e.key === 'Y')) {
    commandManager.redo()
  }
})

// 10. 阻止默认右键菜单
document.addEventListener('contextmenu', (e) => e.preventDefault())
