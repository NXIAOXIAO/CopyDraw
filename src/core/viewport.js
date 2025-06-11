import Logger from '../common/logger.js'
import { defaultRender } from './defaultRender.js'

export const viewport = {
  xoffset: 0,
  yoffset: 0,
  scale: 1,
  rotate: 0,
  width: 0,
  height: 0,
  update(
    updates,
    callback = () => {
      Logger.debug('默认绘制方法', viewport)
      defaultRender()
    }
  ) {
    objUpdate(viewport, updates)
    this.saveToLocalStorage() //更新后马上保存到localstorage
    //执行一些视图变动后的逻辑，比如重新渲染数据
    callback()
  },
  saveToLocalStorage() {
    const data = {
      xoffset: this.xoffset,
      yoffset: this.yoffset,
      scale: this.scale,
      rotate: this.rotate,
      width: this.width,
      height: this.height
    }
    localStorage.setItem('viewport', JSON.stringify(data))
  },
  loadFromLocalStorage() {
    const data = localStorage.getItem('viewport')
    if (data) {
      try {
        const obj = JSON.parse(data)
        objUpdate(this, obj)
      } catch (e) {
        Logger.error('Failed to parse viewport from localStorage', e)
      }
    }
  }
}

function objUpdate(obj, updates) {
  for (let key in updates) {
    if (obj.hasOwnProperty(key)) {
      obj[key] = updates[key]
    }
  }
}
