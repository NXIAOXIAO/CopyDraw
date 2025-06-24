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
const appManager = new AppManager({ debug: true })
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

// 监听 window resize，动态调整 viewport 和 canvas 尺寸
function updateViewportAndCanvas() {
  // 以 #main 区域为基准
  const main = document.getElementById('main')
  const rect = main.getBoundingClientRect()
  const width = rect.width
  const height = rect.height
  // 更新 viewport 参数（如有 setSize 方法可用，否则直接赋值）
  if (appManager.viewport) {
    appManager.viewport.width = width
    appManager.viewport.height = height
    // 如有 setSize 方法可用可调用
    if (typeof appManager.viewport.setSize === 'function') {
      appManager.viewport.setSize(width, height)
    }
  }
  canvasArea.resizeCanvases(width, height)
}
window.addEventListener('resize', updateViewportAndCanvas)
// 首次初始化时也调用一次
updateViewportAndCanvas()

// AppManager 绑定 UI 层事件流入口（监听 document，确保冒泡事件能收到）
appManager.bindUI(document)
console.log('[CopyDraw] AppManager bindUI(document) done.')

// ====== 渲染器绑定 ======
// 注意：Render 需要在 CanvasArea 初始化后再创建，且只传入 canvasArea
const render = new Render(canvasArea)
console.log('[CopyDraw] Render instance created:', render)

// 元素变更时渲染
appManager.dataManager.on('elementsChanged', () => {
  if (canvasArea && appManager.dataManager && appManager.viewport && render) {
    console.log('[CopyDraw] elementsChanged: 调用 canvasArea.render', {
      elements: appManager.dataManager.getAllElements(),
      viewport: appManager.viewport,
      render
    })
  }
  canvasArea.render(appManager.dataManager, appManager.viewport, render)
})

// 模式切换时调整渲染表现
appManager.on('modeChange', ({ mode }) => {
  console.log('[CopyDraw] modeChange:', mode)
  if (render) console.log('[CopyDraw] 调用 render.setMode:', mode)
  render.setMode(mode)
  if (canvasArea && appManager.dataManager && appManager.viewport && render) {
    console.log('[CopyDraw] 调用 canvasArea.render', {
      elements: appManager.dataManager.getAllElements(),
      viewport: appManager.viewport,
      render
    })
  }
  canvasArea.render(appManager.dataManager, appManager.viewport, render)
  // 激活左侧按钮样式
  leftBar.setActive(mode)
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
  appManager.dataManager.getAllElements().forEach((ele) => (ele.selected = ele.id === id))
  canvasArea.render(appManager.dataManager, appManager.viewport, render)
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
// 用 hasInit 标记只执行一次初始化渲染，避免多次重复渲染
let hasInit = false
appManager.dataManager.on('elementsLoaded', () => {
  if (!hasInit) {
    hasInit = true
    appManager.switchMode('edit-view')
    canvasArea.render(appManager.dataManager, appManager.viewport, render)
  }
})

// 元素变更时渲染（排除初始化阶段）
appManager.dataManager.on('elementsChanged', () => {
  if (!hasInit) return // 初始化阶段不渲染
  canvasArea.render(appManager.dataManager, appManager.viewport, render)
})

// 额外调试输出
console.log('[CopyDraw] index.js bootstrap complete')
