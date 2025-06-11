import { globalData } from '../core/globalData.js'
import Logger from '../common/logger.js'
import { installDefaultOp } from '../operations/default.js'
import { installLineDrawOp } from '../operations/lineDraw.js'
import { viewport } from '../core/viewport.js'
const tools = [
  {
    tooltip: '默认浏览模式',
    icon: '../public/icon/arrow_icon.ico',
    listener: () => {
      globalData.renderModer = 'default'
      installDefaultOp()
      Logger.info('当前是默认浏览模式')
    }
  },
  {
    tooltip: '鼠标绘制模式',
    icon: '../public/icon/line_icon.ico',
    listener: () => {
      globalData.renderModer = 'mouseDraw'
      installLineDrawOp()
      Logger.info('当前是鼠标绘制模式')
    }
  },
  {
    tooltip: '画笔绘制模式',
    icon: '../public/icon/pen.png',
    listener: () => {
      globalData.renderModer = 'penDraw'
      Logger.info('当前是画笔绘制模式')
    }
  },
  {
    tooltip: '渲染模式',
    icon: '../public/icon/render-icon.png',
    listener: () => {
      globalData.renderModer = 'Render'
      Logger.info('当前渲染模式')
    }
  }
]

const toolbar = document.createElement('div')
toolbar.style.zIndex = '999'
toolbar.style.userSelect = 'none'
toolbar.className = 'toolbar'

export function setupToolbar() {
  const icons = [] // 保存所有icon引用
  tools.forEach((tool) => {
    const item = document.createElement('div')
    item.className = 'toolbar-item'
    item.setAttribute('data-tooltip', tool.tooltip)
    // 修改listener，处理active class
    item.addEventListener('click', (e) => {
      if (typeof tool.listener === 'function') {
        tool.listener(e)
      }
    })

    const icon = document.createElement('img')
    icon.classList.add('color-filter')
    icon.src = tool.icon
    icon.alt = tool.tooltip
    icon.addEventListener('click', () => {
      icons.forEach((i) => i.classList.remove('active'))
      icon.classList.add('active')
    })

    item.appendChild(icon)
    toolbar.appendChild(item)
    icons.push(icon) // 保存引用
  })
  icons[0].click() //初始默认模式设置
  document.body.appendChild(toolbar)
}

const functionTools = [
  {
    tooltip: '重置视口',
    icon: '../public/icon/reset.png',
    listener: () => {
      viewport.update({
        xoffset: 0,
        yoffset: 0,
        scale: 1,
        rotate: 0
      })
    }
  },
  {
    tooltip: '导出图片',
    icon: '../public/icon/export.png',
    listener: () => {}
  }
]
export function setupFunc() {
  functionTools.forEach((tool) => {
    const item = document.createElement('div')
    item.className = 'toolbar-item'
    item.setAttribute('data-tooltip', tool.tooltip)
    // 修改listener，处理active class
    item.addEventListener('click', (e) => {
      if (typeof tool.listener === 'function') {
        tool.listener(e)
      }
    })
    const icon = document.createElement('img')
    icon.classList.add('color-filter')
    icon.src = tool.icon
    icon.alt = tool.tooltip
    item.appendChild(icon)
    toolbar.appendChild(item)
  })
}
