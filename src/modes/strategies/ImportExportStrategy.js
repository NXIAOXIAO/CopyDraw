// ImportExportStrategy：导入导出策略
// 负责 Ctrl+I/Ctrl+O 的 json 导入导出
export class ImportExportStrategy {
  constructor({ mode, dataManager }) {
    this.mode = mode
    this.dataManager = dataManager
  }

  handleEvent(e) {
    // Ctrl+I 导入
    if (e.type === 'keydown' && e.ctrlKey && (e.key === 'i' || e.key === 'I')) {
      e.preventDefault()
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json,application/json'
      input.onchange = async (evt) => {
        const file = evt.target.files[0]
        if (!file) return
        try {
          const text = await file.text()
          const arr = JSON.parse(text)
          if (Array.isArray(arr)) {
            for (const ele of arr) {
              await this.dataManager.addElement(ele)
            }
            this.mode.reRender()
            this.mode.updateTemporary()
            alert('导入成功！')
          } else {
            alert('JSON 格式错误，需为元素数组')
          }
        } catch (err) {
          alert('导入失败: ' + err.message)
        }
      }
      input.click()
      return true
    }
    // Ctrl+O 导出
    if (e.type === 'keydown' && e.ctrlKey && (e.key === 'o' || e.key === 'O')) {
      e.preventDefault()
      const all = this.dataManager.getAllElements()
      const filtered = all.filter((ele) => ele.type !== 'ImgElement')
      const json = JSON.stringify(filtered, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'elements.json'
      document.body.appendChild(a)
      a.click()
      setTimeout(() => {
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, 100)
      return true
    }
    return false
  }
}
