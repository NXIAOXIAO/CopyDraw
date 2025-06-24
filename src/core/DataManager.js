/**
 * DataManager
 * 元素数据管理层，内部用 Map 存储所有元素，提供增删查改，所有操作通过 Command 进行，外部仅通过接口操作。
 *
 * 提供事件通知，变更时 emit('elementsChanged', {elements})
 * IndexedDB 作为持久化存储
 */
import { openIDB, saveElement, deleteElement, loadAllElements } from '../utils/indexedDB.js'
import { EventEmitter } from '../common/EventEmitter.js'

export class DataManager extends EventEmitter {
  constructor() {
    super()
    this.elements = new Map() // key: element.id, value: element
    this.db = null
    this._initDB()
  }

  async _initDB() {
    try {
      this.db = await openIDB()
      const loaded = await loadAllElements(this.db)
      loaded.forEach((ele) => this.elements.set(ele.id, ele))
      this.emit('elementsLoaded', { elements: this.getAllElements() })
    } catch (e) {
      alert('数据加载失败: ' + (e.message || e))
    }
  }

  /**
   * 新增元素
   * @param {Element} element
   */
  async addElement(element) {
    this.elements.set(element.id, element)
    try {
      await saveElement(this.db, element)
    } catch (e) {
      alert('元素保存失败:' + (e.message || e))
    }
    this.emit('elementsChanged', { elements: this.getAllElements() })
  }

  /**
   * 删除元素
   * @param {string} id
   */
  async deleteElement(id) {
    this.elements.delete(id)
    try {
      await deleteElement(this.db, id)
    } catch (e) {
      alert('元素删除失败:' + (e.message || e))
    }
    this.emit('elementsChanged', { elements: this.getAllElements() })
  }

  /**
   * 修改元素（如移动/变形）
   * @param {string} id
   * @param {object} props
   */
  async updateElement(id, props) {
    const ele = this.elements.get(id)
    if (!ele) return
    Object.assign(ele, props)
    try {
      await saveElement(this.db, ele)
    } catch (e) {
      alert('元素保存失败:' + (e.message || e))
    }
    this.emit('elementsChanged', { elements: this.getAllElements() })
  }

  /**
   * 获取单个元素
   * @param {string} id
   * @returns {Element|null}
   */
  getElement(id) {
    return this.elements.get(id) || null
  }

  /**
   * 获取所有元素（数组形式）
   * @returns {Array<Element>}
   */
  getAllElements() {
    return Array.from(this.elements.values())
  }

  /**
   * 清空所有元素
   */
  async clearAll() {
    this.elements.clear()
    try {
      const tx = this.db.transaction('elements', 'readwrite')
      await tx.objectStore('elements').clear()
      await tx.done
    } catch (e) {
      alert('清空失败:' + (e.message || e))
    }
    this.emit('elementsChanged', { elements: [] })
  }
}
