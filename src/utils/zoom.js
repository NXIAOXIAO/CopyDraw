// 通用缩放体验优化函数
export function getNextScale(currentScale, delta) {
  let zoomAmount
  if (currentScale <= 1) {
    zoomAmount = 0.1
  } else {
    zoomAmount = 0.15 * currentScale
  }
  let newScale = currentScale + delta * zoomAmount
  newScale = Math.min(Math.max(newScale, 0.1), 10)
  return newScale
}
