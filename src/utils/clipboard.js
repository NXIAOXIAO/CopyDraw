/**
 * 从剪贴板读取图片对象
 * @returns {Promise<HTMLImageElement|null>}
 */
export async function getImageFromClipboard() {
  try {
    const clipboardItems = await navigator.clipboard.read()
    for (const item of clipboardItems) {
      for (const type of item.types) {
        if (type.startsWith('image/')) {
          const blob = await item.getType(type)
          const img = new Image()
          img.src = URL.createObjectURL(blob)
          await new Promise((res) => (img.onload = res))
          return img
        }
      }
    }
    return null
  } catch (e) {
    alert('无法从剪贴板读取图片:' + (e.message || e))
    return null
  }
}
