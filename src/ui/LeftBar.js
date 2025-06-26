// LeftBar：左侧工具栏
// 用途：负责左侧工具栏UI及事件绑定，支持模式切换
// 参数：app(AppController)
// 方法：init()
// 异常：接口内部有try-catch

export class LeftBar {
  /**
   * @param {Object} options
   * @param {AppController} options.app
   */
  constructor(eventEmitter) {
    this.eventEmitter = eventEmitter
    this.el = document.getElementById('leftbar')
    this.btnViewEdit = document.getElementById('edit-view')
    this.btnDraw = document.getElementById('draw')
    this.btnRender = document.getElementById('render')
    this.currentMode = null
    this.addEvent()
    this.btnViewEdit.click()
    console.log('[LeftBar] 左侧工具栏初始化完成', this.currentMode)
  }

  //添加按钮点击事件
  addEvent() {
    this.btnViewEdit.addEventListener('click', () => {
      this.updateButtonState('view-edit')
    })
    this.btnDraw.addEventListener('click', () => {
      this.updateButtonState('draw')
    })
    this.btnRender.addEventListener('click', () => {
      this.updateButtonState('render')
    })
  }

  /**
   * 更新按钮状态
   * @param {string} mode
   */
  updateButtonState(mode) {
    try {
      if (this.currentMode === mode) {
        return
      }

      //移除所有按钮的active类
      ;[this.btnViewEdit, this.btnDraw, this.btnRender].forEach((btn) => {
        if (btn) btn.classList.remove('active')
      })
      //添加当前模式的active类
      switch (mode) {
        case 'view-edit':
          this.btnViewEdit.classList.add('active')
          break
        case 'draw':
          this.btnDraw.classList.add('active')
          break
        case 'render':
          this.btnRender.classList.add('active')
          break
      }
      this.currentMode = mode
      this.eventEmitter.emit('modeChange', mode)
    } catch (e) {
      console.error('[LeftBar] 更新按钮状态失败:', e)
    }
  }
}
