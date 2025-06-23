// IndexedDB工具，迁移自ref/common/indexedDB.js
export function openDatabase(dbName) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1)
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains('imgs')) {
        db.createObjectStore('imgs', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('lines')) {
        db.createObjectStore('lines', { keyPath: 'id' })
      }
    }
    request.onsuccess = (event) => {
      resolve(event.target.result)
    }
    request.onerror = (event) => {
      reject(event.target.error)
    }
  })
}
export async function saveDataToDB(dbName, storeName, data) {
  const db = await openDatabase(dbName)
  return await new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.clear()
    request.onsuccess = () => {
      data.forEach((item) => {
        store.add(item)
      })
      transaction.oncomplete = () => {
        resolve()
      }
      transaction.onerror = (event) => {
        reject(event.target.error)
      }
    }
    request.onerror = (event) => {
      reject(event.target.error)
    }
  })
}
export async function getDataFromDB(dbName, storeName) {
  const db = await openDatabase(dbName)
  return await new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly')
    const store = transaction.objectStore(storeName)
    const request = store.getAll()
    request.onsuccess = () => {
      resolve(request.result)
    }
    request.onerror = (event) => {
      reject(event.target.error)
    }
  })
}
