// viewHelpers.js - 视图相关辅助函数

/**
 * 计算并返回将最近元素居中所需的 viewport 偏移
 * @param {Array} elements - 元素数组
 * @param {object} viewport - 视口对象，需有 scale/rotate/width/height
 * @param {object} canvasArea - 画布区域，需有 dataCanvas
 * @returns {object|null} {xoffset, yoffset} 或 null
 */
export function getCenterToNearestElementOffset(elements, viewport, canvasArea) {
  if (!elements.length) return null
  const rect = canvasArea.dataCanvas.getBoundingClientRect()
  // 取canvas中心点（像素）
  const centerX = rect.width / 2
  const centerY = rect.height / 2
  // 计算当前中心点对应世界坐标
  const centerWorld = viewport.toWorld(centerX, centerY)
  let minDist = Infinity,
    targetPos = null
  for (const ele of elements) {
    let pts = ele.geometies || []
    if (!pts.length) continue
    let avg = pts.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 })
    avg.x /= pts.length
    avg.y /= pts.length
    const dist = Math.hypot(avg.x - centerWorld.x, avg.y - centerWorld.y)
    if (dist < minDist) {
      minDist = dist
      targetPos = avg
    }
  }
  if (!targetPos) return null
  // 反算xoffset/yoffset，使targetPos映射到canvas中心
  // 参考Viewport.toCanvas公式
  // x1 = (worldX - xoffset) / scale - width/2
  // y1 = (worldY - yoffset) / scale - height/2
  // x2 = x1 * cos(rotate) + y1 * sin(rotate)
  // y2 = -x1 * sin(rotate) + y1 * cos(rotate)
  // vx = x2 + width/2
  // vy = y2 + height/2
  // 反推：
  // x2 = centerX - width/2
  // y2 = centerY - height/2
  // x1 = x2 * cos(-rotate) + y2 * sin(-rotate)
  // y1 = -x2 * sin(-rotate) + y2 * cos(-rotate)
  // xoffset = worldX - (x1 + width/2) * scale
  // yoffset = worldY - (y1 + height/2) * scale
  const { scale, rotate, width, height } = viewport
  const x2 = centerX - width / 2
  const y2 = centerY - height / 2
  const cosR = Math.cos(-rotate)
  const sinR = Math.sin(-rotate)
  const x1 = x2 * cosR + y2 * sinR
  const y1 = -x2 * sinR + y2 * cosR
  const xoffset = targetPos.x - (x1 + width / 2) * scale
  const yoffset = targetPos.y - (y1 + height / 2) * scale
  return { xoffset, yoffset }
}
