// viewEditHelpers.js - ViewEditMode相关辅助方法

/**
 * 计算点(x0, y0)到线段(x1, y1)-(x2, y2)的距离
 */
export function pointToSegmentDistance(x0, y0, x1, y1, x2, y2) {
  const A = x0 - x1
  const B = y0 - y1
  const C = x2 - x1
  const D = y2 - y1
  const dot = A * C + B * D
  const len_sq = C * C + D * D
  let param = -1
  if (len_sq !== 0) param = dot / len_sq
  let xx, yy
  if (param < 0) {
    xx = x1
    yy = y1
  } else if (param > 1) {
    xx = x2
    yy = y2
  } else {
    xx = x1 + param * C
    yy = y1 + param * D
  }
  const dx = x0 - xx
  const dy = y0 - yy
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * 判断元素是否在矩形区域内
 */
export function isElementInRect(element, rect, viewport) {
  if (!element || !viewport) return false

  let elementBBox = {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity
  }

  if (element.type === 'ImgElement' && element.imgdata) {
    const center = viewport.toCanvas(element.x, element.y)
    const [w, h] = [element.imgdata.width / viewport.scale, element.imgdata.height / viewport.scale]
    // Note: This doesn't account for image rotation for simplicity.
    // A more accurate method would be to transform all 4 corners.
    elementBBox = {
      minX: center.x - w / 2,
      minY: center.y - h / 2,
      maxX: center.x + w / 2,
      maxY: center.y + h / 2
    }
  } else if (element.geometies && element.geometies.length > 0) {
    for (const point of element.geometies) {
      const canvasPoint = viewport.toCanvas(point.x, point.y)
      elementBBox.minX = Math.min(elementBBox.minX, canvasPoint.x)
      elementBBox.minY = Math.min(elementBBox.minY, canvasPoint.y)
      elementBBox.maxX = Math.max(elementBBox.maxX, canvasPoint.x)
      elementBBox.maxY = Math.max(elementBBox.maxY, canvasPoint.y)
    }
  } else {
    return false // No geometry to check
  }

  // Selection rectangle in standard x1,y1,x2,y2 format
  const selectionBBox = {
    minX: rect.x,
    minY: rect.y,
    maxX: rect.x + rect.w,
    maxY: rect.y + rect.h
  }

  // Check for intersection (no overlap)
  if (
    elementBBox.maxX < selectionBBox.minX ||
    elementBBox.minX > selectionBBox.maxX ||
    elementBBox.maxY < selectionBBox.minY ||
    elementBBox.minY > selectionBBox.maxY
  ) {
    return false
  }

  return true // Bounding boxes intersect
}

/**
 * 判断点是否在元素上（支持容差，canvas坐标判断）
 */
export function isPointOnElement(element, x, y, viewport) {
  if (!element || !viewport) return false
  // 支持图片元素点选
  if (element.type === 'ImgElement' && element.imgdata) {
    // 获取图片中心在canvas坐标
    const center = viewport.toCanvas(element.x, element.y)
    const [w, h] = [element.imgdata.width / viewport.scale, element.imgdata.height / viewport.scale]
    // 逆向旋转点击点到图片本地坐标
    const angle = -(viewport.rotate - (element.oA || 0))
    const dx = x - center.x
    const dy = y - center.y
    const cosA = Math.cos(-angle)
    const sinA = Math.sin(-angle)
    const localX = dx * cosA - dy * sinA
    const localY = dx * sinA + dy * cosA
    // 判断是否在图片矩形内
    if (localX >= -w / 2 && localX <= w / 2 && localY >= -h / 2 && localY <= h / 2) {
      return true
    }
    return false
  }
  // 线/路径元素
  if (!element.geometies) return false
  const tolerance = 8 // 容差像素
  // 1. 判断点是否在元素的点上
  for (let i = 0; i < element.geometies.length; i++) {
    const pt = viewport.toCanvas(element.geometies[i].x, element.geometies[i].y)
    const dist = Math.sqrt((pt.x - x) ** 2 + (pt.y - y) ** 2)
    if (dist <= tolerance) {
      return true
    }
  }
  // 2. 判断点是否在线段上（LineElement/PathElement）
  if (element.geometies.length >= 2) {
    for (let i = 0; i < element.geometies.length - 1; i++) {
      const p1 = viewport.toCanvas(element.geometies[i].x, element.geometies[i].y)
      const p2 = viewport.toCanvas(element.geometies[i + 1].x, element.geometies[i + 1].y)
      // 点到线段距离
      const d = pointToSegmentDistance(x, y, p1.x, p1.y, p2.x, p2.y)
      if (d <= tolerance) {
        return true
      }
    }
  }
  return false
}

export function getPointAt(line, x, y, viewport) {
  if (!viewport || line.type !== 'LineElement') return -1

  const tolerance = 8
  for (let i = 0; i < line.geometies.length; i++) {
    const pt = viewport.toCanvas(line.geometies[i].x, line.geometies[i].y)
    const distance = Math.sqrt((pt.x - x) ** 2 + (pt.y - y) ** 2)
    if (distance < tolerance) {
      return i
    }
  }
  return -1
}

export function getClosestSegment(line, x, y, viewport) {
  if (!line || line.type !== 'LineElement' || line.geometies.length < 2) {
    return -1
  }

  let minDistance = Infinity
  let insertIndex = -1

  for (let i = 0; i < line.geometies.length - 1; i++) {
    const p1 = viewport.toCanvas(line.geometies[i].x, line.geometies[i].y)
    const p2 = viewport.toCanvas(line.geometies[i + 1].x, line.geometies[i + 1].y)
    const d = pointToSegmentDistance(x, y, p1.x, p1.y, p2.x, p2.y)
    if (d < minDistance) {
      minDistance = d
      insertIndex = i + 1
    }
  }

  // Add a tolerance check
  const tolerance = 8 // Same as point selection
  if (minDistance < tolerance) {
    return insertIndex
  }

  return -1
}
