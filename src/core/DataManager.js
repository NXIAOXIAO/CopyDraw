import { openDB, saveElement, deleteElement, loadAllElements } from '../utils/indexedDB.js'
import { EventEmitter } from '../common/EventEmitter.js'
import { LineElement } from '../elements/LineElement.js'
import { ImgElement } from '../elements/ImgElement.js'
import { PathElement } from '../elements/PathElement.js'

function restoreElement(obj) {
  if (!obj || !obj.type) return obj
  if (obj.type === 'LineElement' || obj.type === 'line') {
    const inst = Object.assign(new LineElement(), obj)
    inst.type = 'LineElement' // 强制修正type
    return inst
  }
  if (obj.type === 'PathElement') {
    return Object.assign(new PathElement(), obj)
  }
  if (obj.type === 'ImgElement') return Object.assign(new ImgElement(), obj)
  return obj
}

// 新增：ImageBitmap <-> Blob 转换工具
async function imageBitmapToBlob(imageBitmap) {
  const canvas = document.createElement('canvas')
  canvas.width = imageBitmap.width
  canvas.height = imageBitmap.height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(imageBitmap, 0, 0)
  return new Promise((resolve) => canvas.toBlob(resolve))
}

async function restoreImgElementImgdata(element) {
  if (element.type === 'ImgElement' && element.imgdata instanceof Blob) {
    element.imgdata = await createImageBitmap(element.imgdata)
  }
}

/**
 * 数据管理器
 * 负责元素的增删改查，以及数据库的读写
 */
export class DataManager {
  constructor(eventEmitter) {
    this.elements = new Map()
    this.temporary = {}
    this.db = null
    this.eventEmitter = eventEmitter
    this.eventEmitter.on('saveAll', async () => {
      try {
        await this.saveAll()
        this.eventEmitter.emit('saveCompleted')
      } catch (e) {
        console.error('[DataManager] 保存失败:', e)
        this.eventEmitter.emit('saveFailed', e)
      }
    })
    this.init()
  }

  setTemporary(temporary) {
    this.temporary = temporary
    this.eventEmitter.emit('temporaryChange', temporary)
  }

  /**
   * 初始化数据管理器
   * @returns {Promise<void>}
   */
  async init() {
    try {
      console.log('[DataManager] 开始初始化数据库...')

      // 打开数据库（如果不存在会自动创建）
      this.db = await openDB('CopyDrawDB')
      console.log('[DataManager] 数据库打开成功，开始加载元素...')

      const loaded = await loadAllElements(this.db)
      console.log('[DataManager] 元素加载成功，数量:', loaded.length)

      // 新增：还原图片元素的imgdata为ImageBitmap
      for (const ele of loaded) {
        await restoreImgElementImgdata(ele)
        this.elements.set(ele.id, restoreElement(ele))
      }

      console.log('[DataManager] 初始化完成')
      this.eventEmitter.emit('elementsLoaded', { elements: this.getAllElements() })
    } catch (e) {
      console.error('[DataManager] 数据初始化失败:', e)
      console.error('[DataManager] 错误详情:', {
        message: e.message,
        name: e.name,
        stack: e.stack
      })
      throw new Error('数据初始化失败: ' + (e.message || e))
    }
  }

  /**
   * 新增元素，element 必须有 type 字段
   */
  async addElement(element) {
    // 保证存的是实例
    const ele = restoreElement(element)
    // 如果 imgdata 是 Blob，先还原为 ImageBitmap
    if (ele.type === 'ImgElement' && ele.imgdata instanceof Blob) {
      ele.imgdata = await createImageBitmap(ele.imgdata)
    }
    this.elements.set(ele.id, ele)
    // 存库时用副本，imgdata为Blob
    let dbEle = ele
    if (ele.type === 'ImgElement' && ele.imgdata instanceof ImageBitmap) {
      dbEle = { ...ele, imgdata: await imageBitmapToBlob(ele.imgdata) }
    }
    try {
      await saveElement(this.db, dbEle)
    } catch (e) {
      console.error('[DataManager] 元素保存失败:', e)
      throw new Error('元素保存失败: ' + (e.message || e))
    }
    this.eventEmitter.emit('elementsChanged', { elements: this.getAllElements() })
  }

  /**
   * 删除元素
   */
  async deleteElement(id) {
    this.elements.delete(id)
    try {
      await deleteElement(this.db, id)
    } catch (e) {
      console.error('[DataManager] 元素删除失败:', e)
      throw new Error('元素删除失败: ' + (e.message || e))
    }
    this.eventEmitter.emit('elementsChanged', { elements: this.getAllElements() })
  }

  /**
   * 修改元素（如移动/变形等）
   */
  async updateElement(id, props) {
    let ele = this.elements.get(id)
    if (!ele) return
    Object.assign(ele, props)
    // 如果 imgdata 是 Blob，先还原为 ImageBitmap
    if (ele.type === 'ImgElement' && ele.imgdata instanceof Blob) {
      ele.imgdata = await createImageBitmap(ele.imgdata)
    }
    // 存库时用副本，imgdata为Blob
    let dbEle = ele
    if (ele.type === 'ImgElement' && ele.imgdata instanceof ImageBitmap) {
      dbEle = { ...ele, imgdata: await imageBitmapToBlob(ele.imgdata) }
    }
    try {
      await saveElement(this.db, dbEle)
    } catch (e) {
      console.error('[DataManager] 元素保存失败:', e)
      throw new Error('元素保存失败: ' + (e.message || e))
    }
    this.eventEmitter.emit('elementsChanged', { elements: this.getAllElements() })
  }

  getElement(id) {
    return this.elements.get(id) || null
  }

  getAllElements() {
    return Array.from(this.elements.values())
  }

  async saveAll() {
    if (!this.db) return
    try {
      for (const ele of this.elements.values()) {
        await saveElement(this.db, ele)
      }
      console.log('[DataManager] 保存成功')
    } catch (e) {
      console.error('[DataManager] 保存失败:', e)
      throw new Error('保存失败: ' + (e.message || e))
    }
  }
}
