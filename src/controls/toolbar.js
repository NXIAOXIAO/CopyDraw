import Logger from '../common/logger.js'
import { installDefaultOp } from '../operations/default.js'
import { installLineDrawOp } from '../operations/lineDraw.js'
import { installSelectOp } from '../operations/select.js'
import { viewport } from '../core/viewport.js'
import { canvas } from './canvas.js'
import {
  defaultRendering,
  installRendingOp,
  stopRendering
} from '../operations/redering.js'

const tools = [
  {
    tooltip: '默认浏览模式',
    icon: '../public/icon/arrow.png',
    listener: () => {
      stopRendering()
      installDefaultOp()
      Logger.info('当前是默认浏览模式')
      Logger.info('尝试兼容选择编辑模式')
    }
  },
  {
    tooltip: '鼠标绘制模式',
    icon: '../public/icon/line_icon.ico',
    listener: () => {
      stopRendering()
      installLineDrawOp()
      Logger.info('当前是鼠标绘制模式')
    }
  },
  {
    tooltip: '选择编辑模式',
    icon: '../public/icon/select.png',
    listener: () => {
      stopRendering()
      installSelectOp()
      Logger.info('当前是选择编辑模式')
    }
  },
  {
    tooltip: '渲染模式',
    icon: '../public/icon/render-icon.png',
    listener: () => {
      installRendingOp()
      defaultRendering()
      Logger.info('当前渲染模式')
    }
  }
]

const toolbar = document.createElement('div')
toolbar.style.zIndex = '999'
toolbar.style.userSelect = 'none'
toolbar.className = 'toolbar'
const icons = [] // 保存所有icon引用

export function setupToolbar() {
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
  resetToolbar()
  document.body.appendChild(toolbar)
}

export function resetToolbar() {
  icons[0].click() //初始默认模式设置
}

export function switchSelect() {
  icons[2].click()
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
    listener: () => {
      //selector.exportCanvas() //for debug
      exportImg()
    }
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

function exportImg() {
  const link = document.createElement('a')
  link.href = canvas.toDataURL('image/png')
  link.download = 'canvas.png'
  link.click()
}
