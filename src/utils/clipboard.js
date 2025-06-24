// 剪贴板相关工具
export async function getImageBitmapFromClipboard() {
  const items = await navigator.clipboard.read()
  for (let item of items) {
    if (item.types.includes('image/png')) {
      const blob = await item.getType('image/png')
      const imgdata = await createImageBitmap(blob)
      return imgdata
    } else {
      return undefined
    }
  }
}
