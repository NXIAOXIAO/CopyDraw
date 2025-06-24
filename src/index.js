/**
 * CopyDraw 入口文件
 * 负责初始化各层，挂载 UI 组件、AppManager，注册模式，建立事件流。
 */

import { AppManager } from './core/AppManager.js'
import { DrawMode } from './mode/DrawMode.js'
import { ViewEditMode } from './mode/ViewEditMode.js'
import { RenderMode as RenderModeClass } from './mode/RenderMode.js'
import { TopBar } from './ui/TopBar.js'
import { LeftBar } from './ui/LeftBar.js'
import { CanvasArea } from './ui/CanvasArea.js'
import { Render } from './render/Render.js'

// ===== 初始化核心层 =====
const appManager = new AppManager()
window.AppManager = appManager // 方便调试

// ====== 初始化模式层 ======
const modes = [new DrawMode(), new ViewEditMode(), new RenderModeClass()]
appManager.registerModes(modes)

// ====== 初始化 UI 层 ======
const root = document.body
const topBar = new TopBar(root)
const leftBar = new LeftBar(root)
const canvasArea = new CanvasArea(document.getElementById('main'))

// AppManager 绑定 UI 层事件流入口
appManager.bindUI(root)

// UI 层 emit 事件流转到 AppManager
// TopBar、LeftBar 内部 emit uievent，已自动挂载
// CanvasArea 鼠标事件交给模式层绑定

// ====== 渲染器绑定 ======
const dataCanvas = document.getElementById('dataCanvas')
const render = new Render(dataCanvas.getContext('2d'), appManager.viewport)

// ====== 业务状态变更 -> UI 层被动刷新 ======
// 元素变更时渲染
appManager.dataManager.on('elementsChanged', ({ elements }) => {
  canvasArea.render(elements, render)
})

// 模式切换时调整渲染表现
appManager.on('modeChange', ({ mode }) => {
  render.setMode(mode)
  // 立即刷新
  canvasArea.render(appManager.dataManager.getAllElements(), render)
})

// 临时绘制（如 DrawMode）
appManager.on('tempDraw', (drawState) => {
  canvasArea.renderTemp(drawState)
})
appManager.on('tempDrawEnd', () => {
  canvasArea.renderTemp(null)
})

// 选中变化时刷新
appManager.on('selectionChanged', ({ id }) => {
  // 仅一个元素高亮
  appManager.dataManager.getAllElements().forEach((ele) => (ele.selected = ele.id === id))
  canvasArea.render(appManager.dataManager.getAllElements(), render)
})

// 监听撤销/重做命令
root.addEventListener('uievent', async (e) => {
  const { type } = e.detail
  if (type === 'undo') await appManager.commandInvoker.undo()
  if (type === 'redo') await appManager.commandInvoker.redo()
  if (type === 'switchMode') {
    const { mode } = e.detail.payload
    appManager.switchMode(mode)
  }
  // 可扩展：保存、导出等
})

// 初始模式
appManager.switchMode('edit-view')
