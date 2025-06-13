//generate by chatggpt

import logger from './logger.js'

class CanvasSelector {
  constructor() {
    this.colorToIdMap = new Map()
    this.canvas = document.createElement('canvas')
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })
    this.canvas.style.position = 'absolute'
    //document.body.appendChild(this.canvas) // For debugging
  }

  // 初始化
  init(width, height) {
    this.canvas.width = width
    this.canvas.height = height
    this.clearCanvas()
  }

  // 生成随机颜色
  generateRandomColor() {
    let color
    do {
      color = `rgba(${Math.floor(Math.random() * 256)},${Math.floor(
        Math.random() * 256
      )},${Math.floor(Math.random() * 256)},1)`
    } while (this.colorToIdMap.has(color))
    return color
  }

  // 添加新的对象
  addObject(id, drawCallback) {
    const color = this.generateRandomColor()
    this.colorToIdMap.set(color, id)
    this.ctx.fillStyle = color
    this.ctx.strokeStyle = color
    drawCallback(this.ctx)
  }

  // 清除 canvas
  clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.colorToIdMap.clear()
  }

  // 通过坐标获取ID
  getIdFromCoordinates(x, y) {
    const imageData = this.ctx.getImageData(x, y, 1, 1).data
    const color = `rgba(${imageData[0]},${imageData[1]},${imageData[2]},${
      imageData[3] / 255
    })`
    return this.colorToIdMap.get(color)
  }

  getIdsFromRect(x1, y1, x2, y2) {
    // 确保坐标顺序正确
    const left = Math.min(x1, x2)
    const top = Math.min(y1, y2)
    const right = Math.max(x1, x2)
    const bottom = Math.max(y1, y2)
    // 计算区域宽度和高度
    const width = right - left
    const height = bottom - top

    // 获取区域像素数据 包含RGBA值的Uint8ClampedArray
    const imageData = this.ctx.getImageData(left, top, width, height).data
    // 创建Set来存储唯一颜色值
    let ids = new Set()

    // 遍历所有像素(每4个元素表示一个像素的RGBA值)
    for (let i = 0; i < imageData.length; i += 4) {
      const r = imageData[i]
      const g = imageData[i + 1]
      const b = imageData[i + 2]
      const a = imageData[i + 3] / 255
      if (a != 1) continue
      // 将RGBA值转换为字符串格式，如"rgba(255,0,0,1)"
      const color = `rgba(${r},${g},${b},${a})`
      let id = this.colorToIdMap.get(color)
      if (id) {
        ids.add(id)
      }
    }
    return [...ids]
  }

  // 输出图片
  exportCanvas() {
    const link = document.createElement('a')
    link.href = this.canvas.toDataURL('image/png')
    link.download = 'canvas.png'
    link.click()
  }
}

// 使用示例
// const selector = new CanvasSelector();
// selector.init(800, 600);
// selector.addObject('exampleId', (ctx) => {
//     ctx.fillRect(50, 50, 100, 100); // 绘制一个矩形
// });
// console.log(selector.getIdFromCoordinates(60, 60)); // 获取坐标点 (60, 60) 对应的 ID
// selector.exportCanvas(); // 导出 canvas 图片
// selector.clearCanvas(); // 清空 canvas

export default CanvasSelector
