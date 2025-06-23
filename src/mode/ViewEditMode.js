/**
 * 默认的查看编辑模式
 * 鼠标左键点选，右键框选，选择要素后按下M键可整体移动，delete键进行删除
 * 选择要素线上的点，可单独移动和删除，双击选择线可新增点，在首尾点附近新增无效
 * 元素缩放和旋转暂不支持
 * 按下空格键鼠标变为手掌，此时可进行视图的移动，鼠标滚轮进行视图缩放，键盘shift+箭头可以进行视图旋转
 */

import { Constants } from '../common/Constants.js'
import { Selector } from '../common/Selector.js'
import { BaseMode } from './BaseMode.js'

export class ViewEditMode extends BaseMode {
  constructor(eventListeners, dom, viewport, render, dataManager) {
    super(Constants.MODE_VIEW_EDIT, eventListeners, dom)
    this.viewport = viewport
    this.selector = new Selector(viewport)
    this.render = render
    this.dataManager = dataManager
    //辅助变量
    this.isPanning = false //是否在移动viewport
    this.mousePos = null //始终跟随鼠标的位置
    this.lastMouse = null
    this.leftMouseHold = false //为true 代表鼠标鼠标左键按下没有松开
    this.leftMouseClick = null //记录鼠标按下点

    this.selectedElements = [] //记录多选，用于批量移动和删除
    this.selectElement = null //记录当前选择元素
    this.selectedPointIdx = -1 //记录当前选择的点

    this.dragBox = false //添加框选支持
    this.boxStart = null
    this.boxEnd = null

    this.isMovingElement = false //为元素移动提供支持
    this.moveBegin = null //移动的起始点
  }

  //计划保存
  // _scheduleSave() {
  //   //if (this.saveTimeout) clearTimeout(this.saveTimeout)
  //   this.saveTimeout = setInterval(() => {
  //     this.dataManager.saveData()
  //   }, 30000)
  // }

  getPointAt(line, x, y) {
    for (let i = 0; i < line.geometies.length; i++) {
      const pt = this.viewport.worldToViewport(line.geometies[i].x, line.geometies[i].y)
      if (Math.abs(pt.x - x) < 4 && Math.abs(pt.y - y) < 4) return i
    }
    return -1
  }

  reRender() {
    this.render.renderAll()
    this.selector.clearCanvas()
    this.dataManager.imgs.forEach((img) => {
      this.selector.addObject(img)
    })
    this.dataManager.lines.forEach((line) => {
      this.selector.addObject(line)
    })
  }

  enter() {
    console.log('Entering View/Edit Mode')
    this.reRender()
    this._addEventListeners()
  }

  exit() {
    this._removeEventListeners()
  }

  //实现事件
  _onMouseDown(e) {
    if (e.button === 0) {
      if (this.isPanning) {
        this.lastMouse = { x: e.offsetX, y: e.offsetY }
      }
      if (this.isMovingElement) {
        this.isMovingElement = false
      }
      this.leftMouseHold = true
      this.leftMouseClick = { x: e.offsetX, y: e.offsetY }
    } else if (e.button === 2) {
      //在空白处右键单击被视作取消选择
      this.selectedElements = []
      this.selectElement = null
      this.selectedPointIdx = -1
      //右键框选支持
      // 右键框选
      this.dragBox = true
      this.boxStart = { x: e.offsetX, y: e.offsetY }
      this.boxEnd = { x: e.offsetX, y: e.offsetY }
    }
  }
  _onMouseMove(e) {
    this.mousePos = { x: e.offsetX, y: e.offsetY }
    this.render.tempPoint = { x: e.offsetX, y: e.offsetY }
    if (
      this.leftMouseHold &&
      this.selectElement &&
      this.selectElement.type === 'line' &&
      this.selectedPointIdx !== -1
    ) {
      // 拖动线上的点
      const wpt = this.viewport.viewportToWorld(e.offsetX, e.offsetY)
      this.selectElement.geometies[this.selectedPointIdx] = { x: wpt.x, y: wpt.y }
      this.reRender()
    } else if (this.isMovingElement && this.selectedElements.length > 0) {
      // 移动元素
      const dx = (e.offsetX - this.moveBegin.x) * this.viewport.scale
      const dy = (e.offsetY - this.moveBegin.y) * this.viewport.scale
      this.selectedElements.forEach((el) => {
        if (el.type === 'line') {
          el.geometies.forEach((pt) => {
            pt.x += dx
            pt.y += dy
          })
        } else if (el.type === 'img') {
          el.x += dx
          el.y += dy
        }
      })
      this.moveBegin = { x: e.offsetX, y: e.offsetY }
      this.reRender()
    } else if (this.isPanning && this.leftMouseHold && this.lastMouse) {
      const viewport = this.viewport
      // 拖动画布
      const move = {
        x: e.offsetX - this.lastMouse.x,
        y: e.offsetY - this.lastMouse.y
      }
      const cosTheta = Math.cos(viewport.rotate)
      const sinTheta = Math.sin(viewport.rotate)
      const movebyrotate = {
        x: move.x * cosTheta - move.y * sinTheta,
        y: move.x * sinTheta + move.y * cosTheta
      }
      viewport.xoffset = viewport.xoffset - movebyrotate.x * viewport.scale
      viewport.yoffset = viewport.yoffset - movebyrotate.y * viewport.scale
      this.lastMouse = { x: e.offsetX, y: e.offsetY }
      this.reRender()
    } else if (this.dragBox) {
      this.boxEnd = { x: e.offsetX, y: e.offsetY }
      this.render.selectBox = { start: this.boxStart, end: this.boxEnd }
      this.render.renderTemporary()
    } else {
      this.render.renderTemporary()
    }
  }
  _onMouseUp(e) {
    if (e.button === 0) {
      this.leftMouseHold = false
      if (
        !this.isPanning &&
        e.offsetX === this.leftMouseClick.x &&
        e.offsetY === this.leftMouseClick.y
      ) {
        //点击到同一处时 点选
        let element = this.selector.getIdFromCoordinates(e.offsetX, e.offsetY)
        if (element) {
          this.selectElement = element
          if (e.shiftKey) {
            //减少选择
            this.selectedElements = this.selectedElements.filter((el) => el.id !== element.id)
          } else if (e.ctrlKey) {
            //增加选择
            this.selectedElements.push(element)
          } else {
            //在已经选择的线上点击，即选择点
            if (
              element.type === 'line' &&
              this.selectedElements.findIndex((e) => e.id === element.id) !== -1
            ) {
              this.selectedPointIdx = this.getPointAt(element, e.offsetX, e.offsetY)
            } else {
              //默认单选
              this.selectedElements = []
              this.selectedElements.push(element)
              this.selectedPointIdx = -1
            }
          }
        } else {
          //没有选择到元素，清空选择
          this.selectedElements = []
          this.selectElement = null
          this.selectedPointIdx = -1
        }
        this.render.selectedElements = this.selectedElements
        this.render.selectedLine = this.selectElement
        this.render.selectedPointIdx = this.selectedPointIdx
        this.render.renderTemporary()
      } else {
        this.selectedElements = []
        this.selectElement = null
        this.selectedPointIdx = -1
        this.render.renderTemporary()
      }
    } else if (e.button === 2) {
      if (this.dragBox) {
        this.dragBox = false
        this.render.selectBox = null
        //实现框选逻辑
        const x = Math.min(this.boxStart.x, this.boxEnd.x)
        const y = Math.min(this.boxStart.y, this.boxEnd.y)
        const w = Math.abs(this.boxEnd.x - this.boxStart.x)
        const h = Math.abs(this.boxEnd.y - this.boxStart.y)
        this.selectedElements = this.selector.getElementsFromRect(x, y, w, h)
        this.render.selectedElements = this.selectedElements
        this.selectElement = null
        this.selectedPointIdx = -1
        this.render.renderTemporary()
      }
    }
  }

  //缩放逻辑 已实现
  _onWheel(e) {
    e.preventDefault()
    const viewport = this.viewport
    let wxy = viewport.viewportToWorld(e.offsetX, e.offsetY)
    let delta = e.deltaY > 0 ? 1.11 : 0.9
    let dscale = viewport.scale
    dscale *= delta
    dscale = Math.min(Math.max(dscale, 0.01), 30) // 限制在 0.1 到 30 之间
    //计算新的viewport参数，确保以鼠标为中心缩放
    //原理是修改xyoffset wxy2-wxy1
    viewport.scale = dscale
    let wxy2 = viewport.viewportToWorld(e.offsetX, e.offsetY)
    let dxoffset = wxy2.x - wxy.x
    let dyoffset = wxy2.y - wxy.y
    viewport.xoffset = viewport.xoffset - dxoffset
    viewport.yoffset = viewport.yoffset - dyoffset
    this.reRender()
  }

  _onKeyDown(e) {
    if ((e.ctrlKey && e.key === 's') || e.key === 'S') {
      //改成手动保存
      this.dataManager.saveData()
    }

    if ((e.key === 'm' || e.key === 'M') && this.selectedElements.length > 0) {
      this.isMovingElement = true
      this.moveBegin = { x: this.mousePos.x, y: this.mousePos.y }
    }

    if (e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      let R = this.viewport.rotate
      switch (e.key) {
        case 'ArrowLeft':
          R += Math.PI / 8
          break
        case 'ArrowRight':
          R -= Math.PI / 8
          break
        default:
          break
      }
      R = Math.min(Math.max(R, -Math.PI * 2), Math.PI * 2)
      if (Math.abs(R) < 1e-6) R = 0
      //if (R === 2 * Math.PI || R === -2 * Math.PI) R = 0
      this.viewport.rotate = R
      this.reRender()
    }

    if (e.key === ' ') {
      if (this.isPanning !== true) {
        this.isPanning = true
        this.dom.style.cursor = 'grab'
      }
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (
        this.selectElement &&
        this.selectElement.type === 'line' &&
        this.selectedPointIdx !== -1
      ) {
        //代表删除点
        this.selectElement.geometies.splice(this.selectedPointIdx, 1)
        this.selectedPointIdx !== -1
      } else if (this.selectedElements.length > 0) {
        //删除元素
        this.selectedElements.forEach((el) => {
          this.dataManager.removeElement(el)
        })
        this.dataManager.saveData()
        this.render.selectedElements = []
        this.render.selectedPointIdx = -1
        this.render.selectedLine = null
        this.reRender()
      }
    }
  }
  _onKeyUp(e) {
    if (e.key === ' ') {
      this.isPanning = false
      this.dom.style.cursor = 'default'
    }
  }
  _ondbClick(e) {
    if (e.button === 0 && this.selectElement && this.selectElement.type === 'line') {
      //新增点
      const viewport = this.viewport
      const selectedLine = this.selectElement
      let insertIdx = -1
      let insertPt = null
      let point = { x: e.offsetX, y: e.offsetY }
      let length = selectedLine.geometies.length
      const pstart = viewport.viewportToWorld(
        selectedLine.geometies[0].x,
        selectedLine.geometies[0].y
      )
      const pend = viewport.viewportToWorld(
        selectedLine.geometies[length - 1].x,
        selectedLine.geometies[length - 1].y
      )
      if (
        (Math.abs(point.x - pstart.x) < 4 && Math.abs(point.y - pstart.y) < 4) ||
        (Math.abs(point.x - pend.x) < 4 && Math.abs(point.y - pend.y) < 4)
      )
        return //如果插入点等于首尾结点则不能插入

      for (let i = 0; i < length - 1; i++) {
        const p1 = viewport.worldToViewport(
          selectedLine.geometies[i].x,
          selectedLine.geometies[i].y
        )
        const p2 = viewport.worldToViewport(
          selectedLine.geometies[i + 1].x,
          selectedLine.geometies[i + 1].y
        )
        const t =
          ((e.offsetX - p1.x) * (p2.x - p1.x) + (e.offsetY - p1.y) * (p2.y - p1.y)) /
          ((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2)
        if (t >= 0 && t <= 1) {
          const proj = {
            x: p1.x + t * (p2.x - p1.x),
            y: p1.y + t * (p2.y - p1.y)
          }
          const dist = Math.hypot(proj.x - e.offsetX, proj.y - e.offsetY)
          if (dist < 8) {
            insertIdx = i + 1
            insertPt = viewport.viewportToWorld(proj.x, proj.y)
            break
          }
        }
      }

      if (insertIdx >= 0) {
        selectedLine.geometies.splice(insertIdx, 0, insertPt)
        this.selectedPointIdx = insertIdx
        this.render.selectedPointIdx = this.selectedPointIdx
        this.reRender()
      }
    }
  }
}
