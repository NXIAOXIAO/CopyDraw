/**
 * 生成唯一ID
 * @param {string} prefix
 */
export function generateId(prefix = '') {
  return prefix + '_' + Math.random().toString(36).substr(2, 9)
}
