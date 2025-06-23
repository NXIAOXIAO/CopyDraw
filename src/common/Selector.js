// 选择器类，用于通过颜色反查id
export class Selector {
  constructor(viewport) {
    this.colorToIdMap = new Map()
    this.canvas = document.createElement('canvas')
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })
    this.canvas.style.position = 'absolute'
    this.viewport = viewport
    this._init()
  }

  _init() {
    this.canvas.width = this.viewport.width
    this.canvas.height = this.viewport.height
    this.clearCanvas()
  }
  generateRandomColor() {
    let color
    do {
      color = `rgba(${Math.floor(Math.random() * 256)},${Math.floor(
        Math.random() * 256
      )},${Math.floor(Math.random() * 256)},1)`
    } while (this.colorToIdMap.has(color))
    return color
  }
  addObject(element) {
    const color = this.generateRandomColor()
    this.colorToIdMap.set(color, element)
    this.ctx.fillStyle = color
    this.ctx.strokeStyle = color
    element.selectorRender(this.ctx, this.viewport)
  }
  clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.colorToIdMap.clear()
  }
  // 通过坐标获取ID
  getIdFromCoordinates(x, y) {
    const imageData = this.ctx.getImageData(x, y, 1, 1).data
    const color = `rgba(${imageData[0]},${imageData[1]},${imageData[2]},${imageData[3] / 255})`
    return this.colorToIdMap.get(color)
  }
  // 通过矩形区域获取所有被选中的元素
  getElementsFromRect(x, y, width, height) {
    const elementsSet = new Set()
    // 限制范围在canvas内
    if (width === 0 || height === 0) return []
    const imageData = this.ctx.getImageData(x, y, width, height).data
    const colorSet = new Set()
    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        const idx = (py * width + px) * 4
        const r = imageData[idx],
          g = imageData[idx + 1],
          b = imageData[idx + 2],
          a = imageData[idx + 3] / 255
        if (a !== 1) continue // 跳过透明像素,纯色叠加才能正确识别
        const color = `rgba(${r},${g},${b},${a})`
        if (!colorSet.has(color)) {
          colorSet.add(color)
          const element = this.colorToIdMap.get(color)
          if (element) elementsSet.add(element)
        }
      }
    }
    return Array.from(elementsSet)
  }
  // 输出图片
  exportCanvas() {
    const link = document.createElement('a')
    link.href = this.canvas.toDataURL('image/png')
    link.download = 'canvas.png'
    link.click()
  }
}
