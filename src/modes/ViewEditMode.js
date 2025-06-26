import { BaseMode } from './BaseMode.js'
import { MovePointCommand } from '../commands/MovePointCommand.js'
import { MoveElementsCommand } from '../commands/MoveElementsCommand.js'
import { AddPointCommand } from '../commands/AddPointCommand.js'
import { DeletePointCommand } from '../commands/DeletePointCommand.js'
import { AddElementCommand } from '../commands/AddElementCommand.js'
import { DeleteElementCommand } from '../commands/DeleteElementCommand.js'
import { ImgElement } from '../elements/ImgElement.js'
import { getImageBitmapFromClipboard } from '../utils/clipboard.js'

/**
 * 默认的查看编辑模式
 * 鼠标左键点选，右键框选，选择要素后按下M键可整体移动，delete键进行删除
 * 选择要素线上的点，可单独移动和删除，双击选择线可新增点，在首尾点附近新增无效
 * 元素缩放和旋转暂不支持
 * 按下空格键鼠标变为手掌，此时可进行视图的移动，鼠标滚轮进行视图缩放，键盘shift+箭头可以进行视图旋转
 */
export class ViewEditMode extends BaseMode {
  constructor(eventEmitter, viewport, dataManager, canvasArea, commandManager) {
    super(eventEmitter)

    // 直接接收依赖实例
    this.viewport = viewport
    this.dataManager = dataManager
    this.canvasArea = canvasArea
    this.commandManager = commandManager

    // 调试信息
    console.log('[ViewEditMode] 构造函数参数检查:', {
      eventEmitter: !!eventEmitter,
      viewport: !!viewport,
      dataManager: !!dataManager,
      canvasArea: !!canvasArea,
      commandManager: !!commandManager
    })

    // 辅助变量
    this.isPanning = false // 是否在移动viewport
    // this.mousePos 已在 BaseMode 中初始化
    this.lastMouse = null
    this.leftMouseHold = false // 为true 代表鼠标左键按下没有松开
    this.leftMouseClick = null // 记录鼠标按下点
    this.isDragging = false // 是否正在拖动点或元素

    this.selectedElements = [] // 记录多选，用于批量移动和删除
    this.selectElement = null // 记录当前选择元素
    this.selectedPointIdx = -1 // 记录当前选择的点
    this.draggedElement = null // 记录正在拖动的元素，用于暂时从dataCanvas中移除
    this.draggedElements = [] // 记录正在拖动的多个元素，用于暂时从dataCanvas中移除
    this.movedElements = [] // 记录移动元素的深拷贝，用于临时渲染
    this.startPositions = null // 记录移动开始时的位置
    this.endPositions = null // 记录移动结束时的位置

    this.dragBox = false // 添加框选支持
    this.boxStart = null
    this.boxEnd = null

    this.isMovingElement = false // 为元素移动提供支持
    this.moveBegin = null // 移动的起始点
    this.isActive = false // 跟踪模式是否激活

    this._pendingViewportMove = null // 节流用，记录最新的鼠标位置
    this._pendingViewportUpdate = false // 节流用，是否已请求动画帧

    // 绑定事件处理器
    this._boundMouseDown = this._onMouseDown.bind(this)
    this._boundMouseMove = this._onMouseMove.bind(this)
    this._boundMouseUp = this._onMouseUp.bind(this)
    this._boundWheel = this._onWheel.bind(this)
    this._boundKeyDown = this._onKeyDown.bind(this)
    this._boundKeyUp = this._onKeyUp.bind(this)
    this._boundDoubleClick = this._onDoubleClick.bind(this)

    // 注册内部事件监听器（不包含DOM事件）
    this._registerInternalEventListeners()
  }

  /**
   * 注册内部事件监听器
   */
  _registerInternalEventListeners() {
    // 监听viewport变化
    this.eventEmitter.on('viewportChange', () => {
      // 只有在ViewEditMode激活时才重新渲染
      if (this.isActive) {
        // 如果正在移动元素，主层重绘并排除被移动元素
        if (this.isMovingElement && this.movedElements && this.movedElements.length > 0) {
          const movingIds = this.movedElements.map((e) => e.id)
          this.reRender(movingIds)
        } else {
          this.reRender()
        }
        // 更新临时层，确保选中状态正确显示
        this.updateTemporary()
      }
    })

    // 监听元素变化，但在拖动过程中禁用渲染
    this.eventEmitter.on('elementsChanged', () => {
      if (!this.isDragging && !this.isMovingElement && this.isActive) {
        this.reRender()
        // 更新临时层，确保选中状态正确显示
      }
      this.updateTemporary()
    })
  }

  /**
   * 获取指定线条上距离鼠标最近的点索引
   */
  getPointAt(line, x, y) {
    if (!this.viewport) return -1

    // PathElement不支持点编辑，直接返回-1
    if (line.type === 'PathElement') {
      return -1
    }

    const tolerance = 8 // 增加容差到8像素
    console.log(
      '[ViewEditMode] getPointAt: 检查线条',
      line.id,
      '点击位置:',
      x,
      y,
      '容差:',
      tolerance
    )

    for (let i = 0; i < line.geometies.length; i++) {
      const pt = this.viewport.toCanvas(line.geometies[i].x, line.geometies[i].y)
      const distance = Math.sqrt((pt.x - x) ** 2 + (pt.y - y) ** 2)
      console.log(`[ViewEditMode] getPointAt: 点${i}:`, pt, '距离:', distance)
      if (distance < tolerance) {
        console.log(`[ViewEditMode] getPointAt: 找到匹配点${i}`)
        return i
      }
    }
    console.log('[ViewEditMode] getPointAt: 未找到匹配点')
    return -1
  }

  /**
   * 重新渲染所有内容
   */
  reRender(excludeIds = []) {
    if (!this.dataManager) {
      console.warn('[ViewEditMode] reRender: dataManager未初始化')
      return
    }
    const elements = this.dataManager.getAllElements()
    // 如果正在移动元素，排除这些元素
    if (this.isMovingElement && this.movedElements && this.movedElements.length > 0) {
      const movingIds = this.movedElements.map((e) => e.id)
      console.log('[ViewEditMode] reRender: 当前正在移动的元素id:', movingIds)
      excludeIds = [...excludeIds, ...movingIds]
    }
    // 补充详细日志
    console.log('[ViewEditMode] reRender: 重新渲染元素', elements.length, '排除ID:', excludeIds)
    elements.forEach((el) => {
      if (excludeIds.includes(el.id)) {
        console.log('[ViewEditMode] reRender: 元素被排除', el.id, el.type)
      }
    })
    this.eventEmitter.emit('renderElements', elements, excludeIds)
  }

  /**
   * 更新temporary数据并通知渲染
   * 增强：若所有临时状态均为空，则直接清空temporary，彻底防止高亮残留
   */
  updateTemporary() {
    // 保证临时层数据与当前选择状态同步
    const temporary = {
      selectedElements: this.selectedElements ? [...this.selectedElements] : [],
      selectedElement: this.selectElement || null,
      selectedPointIdx: typeof this.selectedPointIdx === 'number' ? this.selectedPointIdx : -1,
      selectBox: this.dragBox ? { start: this.boxStart, end: this.boxEnd } : null,
      isMovingElement: this.isMovingElement,
      movedElements: this.movedElements ? [...this.movedElements] : []
    }
    this.eventEmitter.emit('setTemporary', temporary)
  }

  activate() {
    super.activate()
    this.isActive = true
    console.log('[ViewEditMode] 进入查看编辑模式')

    // 检查依赖
    console.log('[ViewEditMode] 依赖检查:', {
      viewport: !!this.viewport,
      canvasArea: !!this.canvasArea,
      dataManager: !!this.dataManager,
      commandManager: !!this.commandManager
    })

    this.reRender()
    // 重新注册DOM事件监听器
    this._addDOMEventListeners()
  }

  deactivate() {
    super.deactivate()
    this.isActive = false
    console.log('[ViewEditMode] 退出查看编辑模式')

    // 移除DOM事件监听器
    this._removeDOMEventListeners()

    // 清空temporary数据
    this.eventEmitter.emit('setTemporary', {})
  }

  /**
   * 鼠标按下事件
   */
  _onMouseDown(e) {
    console.log('[ViewEditMode] 鼠标按下', e.button, e.offsetX, e.offsetY, '事件类型:', e.type)

    if (e.button === 0) {
      // 优先处理拖动点/元素/框选
      if (this.isPanning) {
        this.lastMouse = { x: e.offsetX, y: e.offsetY }
      }
      // 点击代表移动结束并执行命令 ？
      if (this.isMovingElement && this.selectedElements.length > 0) {
        this.isMovingElement = false
        console.log('[ViewEditMode] 结束移动元素:', this.selectedElements.length)

        // 记录结束位置
        this.endPositions = {}
        this.movedElements.forEach((element) => {
          if (element.type === 'LineElement' || element.type === 'PathElement') {
            this.endPositions[element.id] = {
              geometies: element.geometies.map((p) => ({ x: p.x, y: p.y }))
            }
          } else if (element.type === 'ImgElement') {
            this.endPositions[element.id] = {
              x: element.x,
              y: element.y
            }
          }
        })

        // 执行移动元素命令
        if (this.commandManager && this.startPositions && this.endPositions) {
          const command = new MoveElementsCommand(
            this.dataManager,
            this.selectedElements,
            this.startPositions,
            this.endPositions
          )

          this.commandManager.execute(command)
        }

        // 恢复被拖动的元素到dataCanvas
        if (this.draggedElements && this.draggedElements.length > 0) {
          this._restoreElementsToDataCanvas(this.draggedElements)
          this.draggedElements = []
        }

        // 移除临时渲染，清空movedElements
        this.updateTemporary()
        this.movedElements = []
        this.startPositions = null
        this.endPositions = null

        // 重新渲染所有内容
        this.reRender()
      }

      this.leftMouseHold = true
      this.leftMouseClick = { x: e.offsetX, y: e.offsetY }

      // 检查是否点击在已选中线条的点上，如果是则设置拖动标志
      if (
        this.selectElement &&
        this.selectElement.type === 'LineElement' &&
        this.selectedPointIdx !== -1
      ) {
        const pointIdx = this.getPointAt(this.selectElement, e.offsetX, e.offsetY)
        if (pointIdx === this.selectedPointIdx) {
          this.isDragging = true
          this.draggedElement = this.selectElement
          console.log('[ViewEditMode] 开始拖动点:', this.selectedPointIdx)
          // 拖动点时主层渲染排除该元素
          this.reRender([this.draggedElement.id])
        }
      }

      // 框选不处理视图移动
      if (!this.isDragging && !this.isMovingElement && !this.dragBox) {
        this.lastMouse = { x: e.offsetX, y: e.offsetY }
      }
    } else if (e.button === 2) {
      // 在空白处右键单击被视作取消选择
      this.selectedElements = []
      this.selectElement = null
      this.selectedPointIdx = -1
      // 右键框选支持
      this.dragBox = true
      this.boxStart = { x: e.offsetX, y: e.offsetY }
      this.boxEnd = { x: e.offsetX, y: e.offsetY }
      this.updateTemporary()
    }

    // 无论是否拖动，始终初始化 lastMouse
    this.lastMouse = { x: e.offsetX, y: e.offsetY }
  }

  /**
   * 鼠标移动事件
   */
  _onMouseMove(e) {
    // 始终跟踪鼠标位置，即使不显示
    this.mousePos = { x: e.offsetX, y: e.offsetY }

    if (
      this.leftMouseHold &&
      this.selectElement &&
      this.selectElement.type === 'LineElement' &&
      this.selectedPointIdx !== -1 &&
      this.isDragging
    ) {
      // 拖动线上的点 - 直接更新位置，不执行命令
      if (!this.viewport || !this.dataManager) return

      const wpt = this.viewport.toWorld(e.offsetX, e.offsetY)
      this.selectElement.geometies[this.selectedPointIdx] = { x: wpt.x, y: wpt.y }

      // 只更新临时层显示，不触发dataCanvas渲染
      this.updateTemporary()
      // 拖动点时主层每帧都排除该元素，避免重影
      if (this.draggedElement) {
        this.reRender([this.draggedElement.id])
      }
    } else if (this.isMovingElement && this.selectedElements.length > 0) {
      if (!this.viewport || !this.dataManager) return
      if (!this.moveBegin) return

      // 计算从开始位置到当前位置的偏移量
      const move = {
        x: e.offsetX - this.moveBegin.x,
        y: e.offsetY - this.moveBegin.y
      }

      // 考虑viewport旋转，计算正确的世界坐标偏移
      const cosTheta = Math.cos(this.viewport.rotate)
      const sinTheta = Math.sin(this.viewport.rotate)
      const movebyrotate = {
        x: move.x * cosTheta - move.y * sinTheta,
        y: move.x * sinTheta + move.y * cosTheta
      }

      // 转换为世界坐标偏移
      const totalDx = movebyrotate.x * this.viewport.scale
      const totalDy = movebyrotate.y * this.viewport.scale

      // 重置movedElements到初始状态，然后应用总偏移量
      this.movedElements = this.selectedElements.map((element) => {
        if (element.type === 'ImgElement') {
          // 浅拷贝并保留imgdata
          return {
            ...element,
            x: element.x + totalDx,
            y: element.y + totalDy,
            oA: element.oA,
            imgdata: element.imgdata
          }
        } else if (element.type === 'LineElement' || element.type === 'PathElement') {
          const elementCopy = JSON.parse(JSON.stringify(element))
          elementCopy.geometies.forEach((point) => {
            point.x += totalDx
            point.y += totalDy
          })
          return elementCopy
        }
        return element
      })

      // 只更新临时层显示，主层不动
      const temporary = {
        selectedElements: this.selectedElements,
        selectedElement: this.selectElement,
        selectedPointIdx: this.selectedPointIdx,
        selectBox: this.dragBox ? { start: this.boxStart, end: this.boxEnd } : null,
        isMovingElement: this.isMovingElement,
        movedElements: this.movedElements // 添加移动后的元素拷贝
      }
      this.eventEmitter.emit('setTemporary', temporary)
      // 不再调用 this.reRender()
    } else if (
      this.leftMouseHold &&
      this.lastMouse &&
      !this.isDragging &&
      !this.isMovingElement &&
      !this.dragBox
    ) {
      // 判断是否需要进入视图移动模式
      const dx = e.offsetX - this.lastMouse.x
      const dy = e.offsetY - this.lastMouse.y
      const moveDist = Math.sqrt(dx * dx + dy * dy)
      const threshold = 2 // 拖动阈值，固定像素
      if (!this.isPanning && moveDist > threshold) {
        this.isPanning = true
      }
      if (this.isPanning) {
        // 优化：使用 requestAnimationFrame 节流视图移动
        this._pendingViewportMove = { x: e.offsetX, y: e.offsetY }
        if (!this._pendingViewportUpdate) {
          this._pendingViewportUpdate = true
          requestAnimationFrame(() => {
            if (!this._pendingViewportMove || !this.lastMouse) {
              this._pendingViewportUpdate = false
              return
            }
            const move = {
              x: this._pendingViewportMove.x - this.lastMouse.x,
              y: this._pendingViewportMove.y - this.lastMouse.y
            }
            const cosTheta = Math.cos(this.viewport.rotate)
            const sinTheta = Math.sin(this.viewport.rotate)
            const movebyrotate = {
              x: move.x * cosTheta - move.y * sinTheta,
              y: move.x * sinTheta + move.y * cosTheta
            }
            this.eventEmitter.emit('updateViewport', {
              xoffset: this.viewport.xoffset - movebyrotate.x * this.viewport.scale,
              yoffset: this.viewport.yoffset - movebyrotate.y * this.viewport.scale
            })
            this.lastMouse = { ...this._pendingViewportMove }
            this._pendingViewportMove = null
            this._pendingViewportUpdate = false
          })
        }
      }
    } else if (this.dragBox) {
      // 框选进行中：只更新boxEnd并刷新临时层，不结束框选
      this.boxEnd = { x: e.offsetX, y: e.offsetY }
      this.updateTemporary()
    }
  }

  /**
   * 鼠标抬起事件
   */
  _onMouseUp(e) {
    console.log('[ViewEditMode] 鼠标抬起', e.button, e.offsetX, e.offsetY)

    if (e.button === 0) {
      this.leftMouseHold = false

      // 如果正在拖动点，结束拖动并执行命令
      if (this.isDragging && this.selectElement && this.selectedPointIdx !== -1) {
        this.isDragging = false
        console.log('[ViewEditMode] 结束拖动点:', this.selectedPointIdx)
        if (this.commandManager) {
          const newPosition = { ...this.selectElement.geometies[this.selectedPointIdx] }
          const originalWorldPos = this.viewport.toWorld(
            this.leftMouseClick.x,
            this.leftMouseClick.y
          )
          const oldPosition = { x: originalWorldPos.x, y: originalWorldPos.y }
          const command = new MovePointCommand(
            this.dataManager,
            this.selectElement.id,
            this.selectedPointIdx,
            oldPosition,
            newPosition
          )
          this.commandManager.execute(command)
          this.reRender()
        }
        if (this.draggedElement) {
          this.draggedElement = null
          // 拖动点结束后恢复主层渲染
          this.reRender()
        }
        return
      }

      // 只有在 isPanning=false 且未拖动时才执行点选逻辑
      if (
        !this.isPanning &&
        !this.isDragging &&
        !this.isMovingElement &&
        !this.dragBox &&
        e.offsetX === this.leftMouseClick.x &&
        e.offsetY === this.leftMouseClick.y
      ) {
        // ======= 新点选逻辑 =======
        const allElements = this.dataManager.getAllElements()
        let hitElement = null
        for (let i = allElements.length - 1; i >= 0; i--) {
          if (this._isPointOnElement(allElements[i], e.offsetX, e.offsetY)) {
            hitElement = allElements[i]
            break
          }
        }
        if (hitElement) {
          this.selectElement = hitElement
          if (e.shiftKey) {
            this.selectedElements = this.selectedElements.filter((el) => el.id !== hitElement.id)
            this.selectedPointIdx = -1
          } else if (e.ctrlKey) {
            if (!this.selectedElements.find((el) => el.id === hitElement.id)) {
              this.selectedElements.push(hitElement)
            }
            this.selectedPointIdx = -1
          } else {
            const isLineElement = hitElement.type === 'LineElement'
            const isAlreadySelected =
              this.selectedElements.findIndex((el) => el.id === hitElement.id) !== -1
            if (isLineElement && isAlreadySelected) {
              const pointIdx = this.getPointAt(hitElement, e.offsetX, e.offsetY)
              if (pointIdx !== -1) {
                this.selectedPointIdx = pointIdx
              } else {
                this.selectedPointIdx = -1
              }
            } else {
              this.selectedElements = [hitElement]
              this.selectedPointIdx = -1
            }
          }
        } else {
          this.selectedElements = []
          this.selectElement = null
          this.selectedPointIdx = -1
        }
        this.updateTemporary()
      } else {
        this.selectedElements = []
        this.selectElement = null
        this.selectedPointIdx = -1
        this.movedElements = [] // 补充：清空移动元素，防止高亮残留
        this.isMovingElement = false // 补充：同步清空移动状态
        this.updateTemporary()
      }

      // 结束视图移动（无论是否拖动）
      this.isPanning = false
      this.lastMouse = null
    } else if (e.button === 2) {
      if (this.dragBox) {
        this.dragBox = false
        // ======= 新框选逻辑（修正版）=======
        const x = Math.min(this.boxStart.x, this.boxEnd.x)
        const y = Math.min(this.boxStart.y, this.boxEnd.y)
        const w = Math.abs(this.boxEnd.x - this.boxStart.x)
        const h = Math.abs(this.boxEnd.y - this.boxStart.y)
        const rect = { x, y, w, h }
        const allElements = this.dataManager.getAllElements()
        this.selectedElements = allElements.filter((el) => this._isElementInRect(el, rect))
        // === 新增：同步元素的 selected 属性 ===
        allElements.forEach((el) => {
          el.selected = this.selectedElements.includes(el)
        })
        // movedElements 只在移动时才需要深拷贝，这里不做深拷贝
        this.movedElements = []
        this.isMovingElement = false
        this.selectElement = null
        this.selectedPointIdx = -1
        this.updateTemporary()
        this.reRender() // 框选后强制重新渲染，确保高亮
      } else {
        // 补全 else 分支，右键但未进入框选时也要清空状态
        this.selectedElements = []
        this.selectElement = null
        this.selectedPointIdx = -1
        this.movedElements = []
        this.isMovingElement = false
        // === 新增：清空所有元素的 selected 属性 ===
        const allElements = this.dataManager.getAllElements()
        allElements.forEach((el) => {
          el.selected = false
        })
        this.updateTemporary()
      }
    }
  }

  /**
   * 鼠标滚轮事件
   */
  _onWheel(e) {
    e.preventDefault()

    if (!this.viewport) return

    const delta = e.deltaY > 0 ? 1 : -1
    let zoomAmount
    if (this.viewport.scale <= 1) {
      zoomAmount = 0.1
    } else {
      zoomAmount = 0.15 * this.viewport.scale // scale越大缩放越快
    }
    let newScale = this.viewport.scale + delta * zoomAmount
    newScale = Math.min(Math.max(newScale, 0.1), 10)

    // 计算缩放中心在世界坐标系中的位置
    const rect = this.canvasArea.dataCanvas.getBoundingClientRect()
    const offsetX = e.clientX - rect.left
    const offsetY = e.clientY - rect.top
    const worldPos = this.viewport.toWorld(offsetX, offsetY)

    // 更新视口
    this.eventEmitter.emit('updateViewport', {
      scale: newScale,
      xoffset: worldPos.x - (worldPos.x - this.viewport.xoffset) * (newScale / this.viewport.scale),
      yoffset: worldPos.y - (worldPos.y - this.viewport.yoffset) * (newScale / this.viewport.scale)
    })
  }

  /**
   * 键盘按下事件
   */
  _onKeyDown(e) {
    console.log('[ViewEditMode] 按键按下', e.key, '事件类型:', e.type)

    if (e.key === 'Control') {
      // 禁用Ctrl键的默认行为
      e.preventDefault()
    }

    if (this.isActive) {
      switch (e.key) {
        case 'Delete':
          // 删除选中元素
          if (this.selectedElements.length > 0 && this.commandManager) {
            const command = new DeleteElementCommand(this.dataManager, this.selectedElements)
            this.commandManager.execute(command)
            this.selectedElements = []
            this.selectElement = null
            this.selectedPointIdx = -1
            this.reRender()
          }
          break
        case 'c':
        case 'C':
          // Ctrl+C 复制选中元素
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            this._copySelectedElements()
          }
          break
        case 'v':
        case 'V':
          // Ctrl+V 粘贴元素
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            this._pasteElements()
          }
          break
        case 'm':
        case 'M':
          // 只要有选中元素，按下M键即可进入移动模式
          if (this.selectedElements && this.selectedElements.length > 0) {
            e.preventDefault()
            this._moveSelectedElements()
          }
          break
        case 'z':
        case 'Z':
          // Ctrl+Z 撤销
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            this.commandManager.undo()
          }
          break
        case 'y':
        case 'Y':
          // Ctrl+Y 重做
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            this.commandManager.redo()
          }
          break
        case ' ':
          // 空格键切换手掌工具
          this.isPanning = !this.isPanning
          this.leftMouseHold = false // 切换时确保左键抬起
          this.updateTemporary()
          break
        default:
          break
      }
    }
  }

  /**
   * 键盘抬起事件
   */
  _onKeyUp(e) {
    // console.log('[ViewEditMode] 按键抬起', e.key, '事件类型:', e.type)
  }

  /**
   * 双击事件
   */
  _onDoubleClick(e) {
    console.log('[ViewEditMode] 鼠标双击', e.button, e.offsetX, e.offsetY, '事件类型:', e.type)

    if (e.button === 0) {
      // 左键双击
      if (this.selectElement && this.selectElement.type === 'LineElement') {
        // 在选中线条上双击，尝试新增点
        const pointIdx = this.getPointAt(this.selectElement, e.offsetX, e.offsetY)
        if (pointIdx === -1) {
          // 在线段上新增点
          this._addPointToLine(this.selectElement, e.offsetX, e.offsetY)
        } else {
          // 点击已存在的点，切换为选中状态
          this.selectedPointIdx = pointIdx
          this.updateTemporary()
        }
      }
    }
  }

  /**
   * 复制选中元素
   */
  _copySelectedElements() {
    if (!this.selectedElements || this.selectedElements.length === 0) return

    // 深拷贝选中元素
    const elementsToCopy = this.selectedElements.map((element) => {
      if (element.type === 'ImgElement') {
        // 对于图片元素，单独处理imgdata
        return {
          ...element,
          imgdata: element.imgdata
        }
      } else {
        return JSON.parse(JSON.stringify(element))
      }
    })

    // 通过事件发送到主线程
    this.eventEmitter.emit('copyElements', elementsToCopy)
  }

  /**
   * 粘贴元素
   */
  async _pasteElements() {
    // 从剪贴板获取图片位图并创建元素
    const imgdata = await getImageBitmapFromClipboard()
    if (!imgdata) return

    // 创建新的图片元素
    const mouse = this.mousePos || {
      x: this.canvasArea.dataCanvas.width / 2,
      y: this.canvasArea.dataCanvas.height / 2
    }
    const worldPos = this.viewport.toWorld(mouse.x, mouse.y)
    const newElement = new ImgElement(
      imgdata,
      worldPos.x,
      worldPos.y,
      this.viewport.rotate // 初始角度为viewport当前rotate
    )

    // 添加到数据管理器
    if (this.commandManager) {
      const command = new AddElementCommand(this.dataManager, newElement)
      this.commandManager.execute(command)
    } else if (this.dataManager) {
      await this.dataManager.addElement(newElement)
      this.reRender()
    }
  }

  /**
   * 移动选中元素
   */
  _moveSelectedElements() {
    if (!this.selectedElements || this.selectedElements.length === 0) return

    // 记录开始位置
    this.startPositions = {}
    this.selectedElements.forEach((element) => {
      if (element.type === 'LineElement' || element.type === 'PathElement') {
        this.startPositions[element.id] = {
          geometies: element.geometies.map((p) => ({ x: p.x, y: p.y }))
        }
      } else if (element.type === 'ImgElement') {
        this.startPositions[element.id] = {
          x: element.x,
          y: element.y
        }
      }
    })

    this.isMovingElement = true
    this.movedElements = this.selectedElements.map((element) => {
      if (element.type === 'ImgElement') {
        // 浅拷贝并保留imgdata
        return {
          ...element
        }
      } else if (element.type === 'LineElement' || element.type === 'PathElement') {
        return JSON.parse(JSON.stringify(element))
      }
      return element
    })

    // 更新临时层显示，传递移动后的元素
    const temporary = {
      selectedElements: this.selectedElements,
      selectedElement: this.selectElement,
      selectedPointIdx: this.selectedPointIdx,
      selectBox: this.dragBox ? { start: this.boxStart, end: this.boxEnd } : null,
      isMovingElement: this.isMovingElement,
      movedElements: this.movedElements // 添加移动后的元素拷贝
    }
    this.eventEmitter.emit('setTemporary', temporary)

    // 记录移动起始点为当前鼠标位置
    if (this.mousePos) {
      this.moveBegin = { ...this.mousePos }
    } else {
      this.moveBegin = null
    }

    // 进入移动模式时，主层彻底清空再重绘，排除被移动元素
    if (this.canvasArea && this.canvasArea.backgroundCtx && this.canvasArea.dataCtx) {
      this.canvasArea.backgroundCtx.clearRect(
        0,
        0,
        this.canvasArea.backgroundCanvas.width,
        this.canvasArea.backgroundCanvas.height
      )
      this.canvasArea.dataCtx.clearRect(
        0,
        0,
        this.canvasArea.dataCanvas.width,
        this.canvasArea.dataCanvas.height
      )
    }
    const movingIds = this.movedElements.map((e) => e.id)
    this.reRender(movingIds)
  }

  /**
   * 添加点到线段
   */
  _addPointToLine(lineElement, offsetX, offsetY) {
    if (!this.commandManager || !this.dataManager) return

    // 计算新点在世界坐标系中的位置
    const worldPos = this.viewport.toWorld(offsetX, offsetY)

    // 创建添加点命令
    const command = new AddPointCommand(this.dataManager, lineElement.id, worldPos)

    // 执行命令
    this.commandManager.execute(command)
  }

  /**
   * 判断点是否在元素上（支持容差，canvas坐标判断）
   */
  _isPointOnElement(element, x, y) {
    if (!element || !this.viewport) return false
    // 支持图片元素点选
    if (element.type === 'ImgElement' && element.imgdata) {
      // 获取图片中心在canvas坐标
      const center = this.viewport.toCanvas(element.x, element.y)
      const [w, h] = [
        element.imgdata.width / this.viewport.scale,
        element.imgdata.height / this.viewport.scale
      ]
      // 逆向旋转点击点到图片本地坐标
      const angle = -(this.viewport.rotate - (element.oA || 0))
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
      const pt = this.viewport.toCanvas(element.geometies[i].x, element.geometies[i].y)
      const dist = Math.sqrt((pt.x - x) ** 2 + (pt.y - y) ** 2)
      if (dist <= tolerance) {
        return true
      }
    }
    // 2. 判断点是否在线段上（LineElement/PathElement）
    if (element.geometies.length >= 2) {
      for (let i = 0; i < element.geometies.length - 1; i++) {
        const p1 = this.viewport.toCanvas(element.geometies[i].x, element.geometies[i].y)
        const p2 = this.viewport.toCanvas(element.geometies[i + 1].x, element.geometies[i + 1].y)
        // 点到线段距离
        const d = this._pointToSegmentDistance(x, y, p1.x, p1.y, p2.x, p2.y)
        if (d <= tolerance) {
          return true
        }
      }
    }
    return false
  }

  /**
   * 计算点(x0, y0)到线段(x1, y1)-(x2, y2)的距离
   */
  _pointToSegmentDistance(x0, y0, x1, y1, x2, y2) {
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
  _isElementInRect(element, rect) {
    if (!element) return false
    if (element.type === 'ImgElement' && element.imgdata) {
      // 判断图片中心点是否在框内
      const center = this.viewport.toCanvas(element.x, element.y)
      return (
        center.x >= rect.x &&
        center.x <= rect.x + rect.w &&
        center.y >= rect.y &&
        center.y <= rect.y + rect.h
      )
    }
    if (!element.geometies) return false
    // 判断所有点的canvas坐标是否有在框内的
    for (let i = 0; i < element.geometies.length; i++) {
      const pt = this.viewport.toCanvas(element.geometies[i].x, element.geometies[i].y)
      if (pt.x >= rect.x && pt.x <= rect.x + rect.w && pt.y >= rect.y && pt.y <= rect.y + rect.h) {
        return true
      }
    }
    return false
  }

  /**
   * 暂时从dataCanvas中移除元素
   */
  _removeElementFromDataCanvas(element) {
    if (!this.dataManager || !element) return

    // 从数据管理器中移除元素
    this.dataManager.deleteElement(element.id)

    // 重新渲染
    this.reRender()
  }

  /**
   * 恢复元素到dataCanvas
   */
  _restoreElementToDataCanvas(element) {
    if (!this.dataManager || !element) return

    // 将元素添加回数据管理器
    this.dataManager.addElement(element)

    // 重新渲染
    this.reRender()
  }

  /**
   * 恢复多个元素到dataCanvas
   */
  _restoreElementsToDataCanvas(elements) {
    if (!this.dataManager || !elements || elements.length === 0) return

    elements.forEach((element) => {
      this.dataManager.addElement(element)
    })

    // 重新渲染
    this.reRender()
  }

  /**
   * 绑定DOM事件监听器
   */
  _addDOMEventListeners() {
    if (!this.canvasArea || !this.canvasArea.dataCanvas) return
    const canvas = this.canvasArea.dataCanvas
    canvas.addEventListener('mousedown', this._boundMouseDown)
    canvas.addEventListener('mousemove', this._boundMouseMove)
    canvas.addEventListener('mouseup', this._boundMouseUp)
    canvas.addEventListener('wheel', this._boundWheel)
    canvas.addEventListener('dblclick', this._boundDoubleClick)
    document.addEventListener('keydown', this._boundKeyDown)
    document.addEventListener('keyup', this._boundKeyUp)
  }

  /**
   * 解绑DOM事件监听器
   */
  _removeDOMEventListeners() {
    if (!this.canvasArea || !this.canvasArea.dataCanvas) return
    const canvas = this.canvasArea.dataCanvas
    canvas.removeEventListener('mousedown', this._boundMouseDown)
    canvas.removeEventListener('mousemove', this._boundMouseMove)
    canvas.removeEventListener('mouseup', this._boundMouseUp)
    canvas.removeEventListener('wheel', this._boundWheel)
    canvas.removeEventListener('dblclick', this._boundDoubleClick)
    document.removeEventListener('keydown', this._boundKeyDown)
    document.removeEventListener('keyup', this._boundKeyUp)
  }
}
