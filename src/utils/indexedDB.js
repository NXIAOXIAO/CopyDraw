/**
 * IndexedDB 工具：所有元素存储在 elements 表
 */
const DB_NAME = 'CopyDrawDB'
const STORE_NAME = 'elements'
const DB_VERSION = 1

/**
 * 等待数据库操作完成
 * @param {IDBRequest} request
 * @returns {Promise<any>}
 */
function waitForRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 等待事务完成
 * @param {IDBTransaction} tx
 * @returns {Promise<void>}
 */
function waitForTransaction(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/**
 * 打开数据库
 * @returns {Promise<IDBDatabase>}
 */
export function openDB() {
  return new Promise((resolve, reject) => {
    let hasUpgraded = false;
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[IndexedDB] 打开数据库失败:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      const db = request.result;
      
      // 如果没有经过升级且存储不存在，说明数据库结构不正确
      if (!hasUpgraded && !db.objectStoreNames.contains(STORE_NAME)) {
        db.close();
        // 删除错误的数据库并重试
        const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
        deleteRequest.onsuccess = () => {
          // 递归调用，但只重试一次
          openDB().then(resolve).catch(reject);
        };
        deleteRequest.onerror = () => reject(deleteRequest.error);
        return;
      }
      
      console.log('[IndexedDB] 数据库打开成功');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      hasUpgraded = true;
      console.log('[IndexedDB] 数据库升级中...');
      const db = event.target.result;

      // 创建对象存储空间
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        console.log('[IndexedDB] 创建存储空间成功');
      }
    };
  });
}

/**
 * 保存元素
 * @param {IDBDatabase} db
 * @param {object} element
 */
export async function saveElement(db, element) {
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    await waitForRequest(store.put(element));
    await waitForTransaction(tx);
  } catch (e) {
    console.error('[IndexedDB] 保存元素失败:', e);
    throw e;
  }
}

/**
 * 删除元素
 * @param {IDBDatabase} db
 * @param {string} id
 */
export async function deleteElement(db, id) {
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    await waitForRequest(store.delete(id));
    await waitForTransaction(tx);
  } catch (e) {
    console.error('[IndexedDB] 删除元素失败:', e);
    throw e;
  }
}

/**
 * 加载所有元素
 * @param {IDBDatabase} db
 * @returns {Promise<Array>}
 */
export async function loadAllElements(db) {
  try {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const result = await waitForRequest(store.getAll());
    await waitForTransaction(tx);
    return result || [];
  } catch (e) {
    console.error('[IndexedDB] 加载元素失败:', e);
    throw e;
  }
}
