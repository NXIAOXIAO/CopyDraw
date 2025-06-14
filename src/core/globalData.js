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
