// Info：底部信息栏
// 用途：负责底部信息栏UI及友好提示
// 方法：init(), show(msg)
// 异常：接口内部有try-catch

export class Info {
  constructor(eventEmitter) {
    this.eventEmitter = eventEmitter;
    this.el = document.getElementById('info');
    this.eventEmitter.on('infoChange', this.show.bind(this));
  }

  /**
   * 显示信息
   * @param {string} msg
   */
  show(msg) {
    try {
      if (this.el) {
        this.el.textContent = msg || '';
      }
    } catch (e) {
      console.error('[Info] 显示信息异常:', e);
    }
  }
} 