function openDatabase(dbName) {
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

async function saveDataToDB(dbName, storeName, data) {
  const db = await openDatabase(dbName)
  return await new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.clear() // 先清空现有数据，再插入新的数据

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

    request.onerror = (event_1) => {
      reject(event_1.target.error)
    }
  })
}

async function getDataFromDB(dbName, storeName) {
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

export { saveDataToDB, getDataFromDB }
