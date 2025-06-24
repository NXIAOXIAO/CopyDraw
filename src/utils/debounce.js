/**
 * 防抖
 * @param {Function} fn
 * @param {number} delay
 */
export function debounce(fn, delay) {
  let t = null
  return (...args) => {
    if (t) clearTimeout(t)
    t = setTimeout(() => fn(...args), delay)
  }
}
