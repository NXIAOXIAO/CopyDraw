import { ImgElement } from '../elements/ImgElement.js'
import { LineElement } from '../elements/LineElement.js'
import { getDataFromDB, saveDataToDB } from '../utils/indexedDB.js'
// 数据管理器，负责元素的增删查改和持久化
export class DataManager {
  constructor() {
    this.imgs = []
    this.lines = []
    this.dbName = 'CopyDrawDB'
  }
  async loadFromIndexedDB() {
    try {
      const [imgs, lines] = await Promise.all([
        getDataFromDB(this.dbName, 'imgs'),
        getDataFromDB(this.dbName, 'lines')
      ])
      this.imgs = imgs.map((obj) => Object.assign(new ImgElement(), obj))
      this.lines = lines.map((obj) => Object.assign(new LineElement(), obj))
    } catch (e) {
      // fallback to localStorage
      //this.loadData()
    }
  }
  addLine(line) {
    this.lines.push(line)
  }
  addImg(img) {
    this.imgs.push(img)
  }
  removeElement(element) {
    if (element.type === 'img') {
      const idx = this.imgs.indexOf(element)
      if (idx !== -1) {
        this.imgs.splice(idx, 1)
      }
    }
    if (element.type === 'line') {
      const idx = this.lines.indexOf(element)
      if (idx !== -1) {
        this.lines.splice(idx, 1)
      }
    }
  }
  async saveData() {
    // 同步写入indexedDB和localStorage
    await Promise.all([
      saveDataToDB(this.dbName, 'imgs', this.imgs),
      saveDataToDB(this.dbName, 'lines', this.lines)
    ])
    //只保存lines供查看和备份
    localStorage.setItem('lines', JSON.stringify(this.lines))
    console.log('保存完成', this)
  }
}
