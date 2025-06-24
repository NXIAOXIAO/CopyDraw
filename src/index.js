/**
 * CopyDraw 入口文件
 * 负责初始化各层，挂载 UI 组件、AppManager，注册模式，建立事件流。
 * 加入详细的 console.log，便于排查初始化、事件流和模式切换问题。
 */

import { AppManager } from './core/AppManager.js'
import { DrawMode } from './mode/DrawMode.js'
import { ViewEditMode } from './mode/ViewEditMode.js'
import { RenderMode as RenderModeClass } from './mode/RenderMode.js'
import { TopBar } from './ui/TopBar.js'
import { LeftBar } from './ui/LeftBar.js'
import { CanvasArea } from './ui/CanvasArea.js'
import { Render } from './render/Render.js'

console.log('[CopyDraw] index.js loaded')

// ===== 初始化核心层 =====
const appManager = new AppManager()
window.AppManager = appManager
console.log('[CopyDraw] AppManager created:', appManager)

// ====== 初始化模式层 ======
const modes = [new DrawMode(), new ViewEditMode(), new RenderModeClass()]
appManager.registerModes(modes)
console.log(
  '[CopyDraw] Modes registered:',
  modes.map((m) => m.name)
)

// ====== 初始化 UI 层 ======
const root = document.body
console.log('[CopyDraw] TopBar init...')
const topBar = new TopBar(document.getElementById('topbar'))
console.log('[CopyDraw] LeftBar init...')
const leftBar = new LeftBar(document.getElementById('leftbar'))
console.log('[CopyDraw] CanvasArea init...')
const canvasArea = new CanvasArea(document.getElementById('main'))

// AppManager 绑定 UI 层事件流入口（监听 document，确保冒泡事件能收到）
appManager.bindUI(document)
console.log('[CopyDraw] AppManager bindUI(document) done.')

// ====== 渲染器绑定 ======
const dataCanvas = document.getElementById('dataCanvas')
const render = new Render(dataCanvas.getContext('2d'), appManager.viewport)
console.log('[CopyDraw] Render instance created:', render)

// 元素变更时渲染
appManager.dataManager.on('elementsChanged', ({ elements }) => {
  console.log('[CopyDraw] elementsChanged:', elements)
  canvasArea.render(elements, render)
})

// 模式切换时调整渲染表现
appManager.on('modeChange', ({ mode }) => {
  console.log('[CopyDraw] modeChange:', mode)
  render.setMode(mode)
  canvasArea.render(appManager.dataManager.getAllElements(), render)
})

// 临时绘制
appManager.on('tempDraw', (drawState) => {
  console.log('[CopyDraw] tempDraw:', drawState)
  canvasArea.renderTemp(drawState)
})
appManager.on('tempDrawEnd', () => {
  console.log('[CopyDraw] tempDrawEnd')
  canvasArea.renderTemp(null)
})

// 选中变化时刷新
appManager.on('selectionChanged', ({ id }) => {
  console.log('[CopyDraw] selectionChanged:', id)
  appManager.dataManager.getAllElements().forEach((ele) => (ele.selected = ele.id === id))
  canvasArea.render(appManager.dataManager.getAllElements(), render)
})

// 撤销、重做、模式切换
document.addEventListener('uievent', async (e) => {
  const { type } = e.detail
  console.log('[CopyDraw] uievent:', type, e.detail)
  if (type === 'undo') await appManager.commandInvoker.undo()
  if (type === 'redo') await appManager.commandInvoker.redo()
  if (type === 'switchMode') {
    const { mode } = e.detail.payload
    appManager.switchMode(mode)
  }
  // 可扩展保存、导出等
})

// ===== 初始化默认模式 =====
// 等 DataManager 数据加载后再切换默认模式，否则所有数据未加载会导致 UI 不刷新
appManager.dataManager.on('elementsLoaded', () => {
  console.log('[CopyDraw] elementsLoaded, switching to default mode: edit-view')
  appManager.switchMode('edit-view')
  // 首次刷新
  canvasArea.render(appManager.dataManager.getAllElements(), render)
})

// 模式切换时调整渲染表现
appManager.on('modeChange', ({ mode }) => {
  console.log('[CopyDraw] modeChange:', mode)
  render.setMode(mode)
  canvasArea.render(appManager.dataManager.getAllElements(), render)

  // 激活左侧按钮样式
  leftBar.setActive(mode)
})

// 额外调试输出
console.log('[CopyDraw] index.js bootstrap complete')
