/**
 * IndexedDB 工具：所有元素存储在 elements 表
 */
const DB_NAME = 'CopyDrawDB'
const STORE_NAME = 'elements'
const DB_VERSION = 1

/**
 * 打开数据库
 */
export function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = function (e) {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = (e) => reject(e.target.error)
  })
}

/**
 * 保存元素
 * @param {IDBDatabase} db
 * @param {object} element
 */
export function saveElement(db, element) {
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).put(element)
      tx.oncomplete = () => resolve()
      tx.onerror = (e) => reject(e.target.error)
    } catch (e) {
      reject(e)
    }
  })
}

/**
 * 删除元素
 * @param {IDBDatabase} db
 * @param {string} id
 */
export function deleteElement(db, id) {
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).delete(id)
      tx.oncomplete = () => resolve()
      tx.onerror = (e) => reject(e.target.error)
    } catch (e) {
      reject(e)
    }
  })
}

/**
 * 加载所有元素
 * @param {IDBDatabase} db
 * @returns {Promise<Array>}
 */
export function loadAllElements(db) {
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.getAll()
      req.onsuccess = () => resolve(req.result)
      req.onerror = (e) => reject(e.target.error)
    } catch (e) {
      reject(e)
    }
  })
}
