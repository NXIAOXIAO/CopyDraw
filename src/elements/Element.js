/**
 * Element 基类
 * 所有元素通用属性和方法，提供 selectorRender（被选中时渲染），默认渲染交给 Render
 */

import { generateId } from '../utils/id.js'
export class Element {
  constructor(type) {
    this.id = generateId(type) // 统一生成id
    this.type = type
    this.selected = false
  }
}
