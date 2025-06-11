import { saveDataToDB, getDataFromDB } from '../common/indexedDB.js'
import { viewport } from './viewport.js'
import Line from '../common/line.js'

viewport.loadFromLocalStorage()
const dbName = 'CopyDrawDB'
export const globalData = {
  renderModer: 'default',
  viewport: viewport,
  imgs: [],
  lines: [],
  addLine(line) {
    this.lines.push(line)
    viewport.update()
  },
  addImg(img) {
    this.imgs.push(img)
    viewport.update()
  }
}
window.globalData = globalData //for debug

function saveCompleteData(dbName, data) {
  return Promise.all([
    //saveDataToDB(dbName, 'imgs', data.imgs),
    saveDataToDB(dbName, 'lines', data.lines)
  ])
}

async function getCompleteData(dbName) {
  const [imgs, lines] = await Promise.all([
    //getDataFromDB(dbName, 'imgs'),
    getDataFromDB(dbName, 'lines')
  ])
  return {
    //imgs,
    lines
  }
}

export function debugData() {
  const line1 = new Line()
  line1.addPoint(100, 400)
  line1.addPoint(100, 300)
  line1.addPoint(200, 200)
  line1.addPoint(45, 45)
  globalData.lines.push(line1)
}
