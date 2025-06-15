import { saveDataToDB, getDataFromDB } from '../common/indexedDB.js'
import { viewport } from './viewport.js'
import Line from '../common/line.js'
import Img from '../common/img.js'
import logger from '../common/logger.js'

viewport.loadFromLocalStorage()
const dbName = 'CopyDrawDB'
export const globalData = {
  imgs: [],
  lines: [],
  addLine(line) {
    this.lines.push(line)
    viewport.update()
    this.save()
  },
  addImg(img) {
    this.imgs.push(img)
    viewport.update()
    this.save()
  },
  async save() {
    await saveCompleteData(dbName, this)
    logger.info('已存储到数据库中')
  },
  async load() {
    await getCompleteData(dbName)
    logger.info('已从数据库中加载')
  },
  export() {
    const headers = ['id', 'points']
    const rows = this.lines.map((line) => {
      const id = line.id || ''
      const points = Array.isArray(line.geometies)
        ? line.geometies.map((pt) => `${pt.x},${pt.y}`).join(';')
        : ''
      return [id, points]
    })
    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(',')
      )
      .join('\r\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'lines.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  },
  importLinesFromCSV() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.csv'
    input.onchange = (e) => {
      const file = e.target.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (event) => {
        const text = event.target.result
        const lines = text.split(/\r?\n/).filter(Boolean)
        if (lines.length < 2) return
        // 跳过表头
        for (let i = 1; i < lines.length; i++) {
          const row = lines[i]
          // 兼容逗号包裹的内容
          const match = row.match(/^"([^"]*)","([^"]*)"$/)
          if (!match) continue
          const id = match[1]
          const pointsStr = match[2]
          const points = pointsStr
            .split(';')
            .map((pt) => {
              const [x, y] = pt.split(',').map(Number)
              if (isNaN(x) || isNaN(y)) return null
              return { x, y }
            })
            .filter(Boolean)
          if (points.length > 1) {
            const line = new Line()
            line.id = id
            line.geometies = points
            this.lines.push(line)
          }
        }
        viewport.update()
        this.save()
        logger.info('已从CSV导入Line数据')
      }
      reader.readAsText(file)
    }
    input.click()
  }
}
window.globalData = globalData //for debug

function saveCompleteData(dbName, data) {
  return Promise.all([
    saveDataToDB(dbName, 'imgs', data.imgs),
    saveDataToDB(dbName, 'lines', data.lines)
  ])
}

async function getCompleteData(dbName) {
  const [imgs, lines] = await Promise.all([
    getDataFromDB(dbName, 'imgs'),
    getDataFromDB(dbName, 'lines')
  ])
  // 假设有 Img 类和 Line 类，需将 plain object 转为实例
  globalData.imgs = imgs
    ? imgs.map((obj) => {
        const img = Object.assign(new Img(), obj)
        if (isNaN(img.x)) img.x = 0
        if (isNaN(img.y)) img.y = 0
        return img
      })
    : []
  globalData.lines = lines
    ? lines.map((obj) => Object.assign(new Line(), obj))
    : []
}

export function debugData() {
  const line1 = new Line()
  line1.addPoint(100, 400)
  line1.addPoint(100, 300)
  line1.addPoint(200, 200)
  line1.addPoint(45, 45)
  globalData.lines.push(line1)
}
