/**
 * 常用数据格式化工具
 */

/**
 * 格式化时间
 * @param {Date|number} date
 * @returns {string}
 */
export function formatTime(date) {
  if (!date) return ''
  if (!(date instanceof Date)) date = new Date(date)
  return date.toLocaleString()
}
