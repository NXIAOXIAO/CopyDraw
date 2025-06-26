// TopBar：顶部工具栏
// 用途：负责顶部工具栏UI及事件绑定，支持撤销、重做、保存、导出
// 异常：接口内部有try-catch

export class TopBar {
  constructor(eventEmitter) {
    this.eventEmitter = eventEmitter
    this.el = document.getElementById('topbar')
    this.btnUndo = document.getElementById('btn-undo')
    this.btnRedo = document.getElementById('btn-redo')
    this.btnSave = document.getElementById('btn-save')
    this.btnExport = document.getElementById('btn-export')

    // 渲染策略选择器
    this.renderStrategySelect = document.getElementById('render-strategy-select')

    this.addEvent()
    this.eventEmitter.on('modeChange', (modeName) => {
      console.log('[TopBar] 模式改变', modeName)
      this.updateButtonVisibility(modeName)
    })
    this.eventEmitter.on('commandStackChanged', (state) => {
      console.log('[TopBar] 命令栈改变', state)
      if (state.canUndo) {
        this.btnUndo.classList.remove('disabled')
      } else {
        this.btnUndo.classList.add('disabled')
      }
      if (state.canRedo) {
        this.btnRedo.classList.remove('disabled')
      } else {
        this.btnRedo.classList.add('disabled')
      }
    })

    // 监听渲染策略变化事件（用于快捷键切换时的同步）
    this.eventEmitter.on('renderStrategyChanged', (strategyKey) => {
      console.log('[TopBar] 渲染策略变化', strategyKey)
      this.setCurrentRenderStrategy(strategyKey)
    })

    console.log('[TopBar] 顶部工具栏初始化完成')
  }

  addEvent() {
    this.btnUndo.onclick = () => {
      this.eventEmitter.emit('topbar-undo')
    }
    this.btnRedo.onclick = () => {
      this.eventEmitter.emit('topbar-redo')
    }
    this.btnSave.onclick = () => {
      this.eventEmitter.emit('saveAll')
    }
    this.btnExport.onclick = () => {
      this._exportImage()
    }

    // 渲染策略选择事件
    if (this.renderStrategySelect) {
      this.renderStrategySelect.addEventListener('change', (e) => {
        const selectedStrategy = e.target.value
        console.log('[TopBar] 选择渲染策略:', selectedStrategy)
        this.eventEmitter.emit('renderStrategyChange', selectedStrategy)
      })
    }
  }

  /**
   * 根据模式动态显示/隐藏按钮
   */
  updateButtonVisibility(mode) {
    if (!this.btnUndo || !this.btnRedo || !this.btnSave || !this.btnExport) return

    // 先淡出
    this.el.classList.remove('fade-in')
    this.el.classList.add('fade-out')

    setTimeout(() => {
      if (mode === 'render') {
        // 添加render-mode类，让CSS控制显示/隐藏
        this.el.classList.add('render-mode')
      } else {
        // 移除render-mode类
        this.el.classList.remove('render-mode')
      }

      // 再淡入
      this.el.classList.remove('fade-out')
      this.el.classList.add('fade-in')
    }, 200)
  }

  /**
   * 更新渲染策略选项
   */
  updateRenderStrategies(strategies) {
    if (!this.renderStrategySelect) return

    // 清空现有选项
    this.renderStrategySelect.innerHTML = ''

    // 添加新选项
    strategies.forEach((strategy) => {
      const option = document.createElement('option')
      option.value = strategy.key
      option.textContent = strategy.name
      option.title = strategy.description
      this.renderStrategySelect.appendChild(option)
    })

    // 设置默认选择
    if (strategies.length > 0) {
      this.renderStrategySelect.value = strategies[0].key
    }
  }

  /**
   * 设置当前渲染策略
   */
  setCurrentRenderStrategy(strategyKey) {
    if (this.renderStrategySelect) {
      this.renderStrategySelect.value = strategyKey
    }
  }

  /**
   * 导出图片
   */
  _exportImage() {
    try {
      const dataCanvas = document.getElementById('dataCanvas')
      if (!dataCanvas) return
      const url = dataCanvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = url
      a.download = 'export.png'
      a.click()
    } catch (e) {
      console.error('[TopBar] 导出图片异常', e)
    }
  }
}
