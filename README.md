[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/NXIAOXIAO/CopyDraw)

## CopyDraw

尝试实现一个完整的纯 js 项目，目前代码稀烂，持续修改中

main 分支，基于面向对象，进行重构
好像和想象的不太一样

对手绘板的事件支持好像有点奇怪，需要再研究下

func 分支，基于函数式编程，进行重构，todo

---

# CopyDraw 重构版

一个基于 Canvas 的绘图应用，支持多种绘图模式和渲染效果。

## 功能特性

### 核心功能

- **多模式支持**：查看编辑模式、绘制模式、渲染模式
- **元素管理**：支持线条元素和图片元素
- **数据持久化**：使用 IndexedDB 存储数据
- **命令模式**：支持撤销/重做操作
- **事件驱动**：基于 EventEmitter 的解耦架构

### ViewEditMode（查看编辑模式）

- **鼠标左键点选**：选择单个元素
- **右键框选**：框选多个元素
- **Shift+点击**：减少选择
- **Ctrl+点击**：增加选择
- **M 键移动**：选中元素后按 M 键可整体移动
- **Delete 键删除**：删除选中的元素或点
- **双击添加点**：在 LineElement 上双击可添加新点
- **空格键平移**：按下空格键鼠标变为手掌，可拖动画布
- **滚轮缩放**：鼠标滚轮进行视图缩放
- **Shift+箭头旋转**：键盘 Shift+左右箭头进行视图旋转

### 元素类型

- **LineElement**：线条元素，支持多点绘制
- **ImgElement**：图片元素，支持位置和角度调整

## 项目结构

```
src/
├── commands/          # 命令模式实现
├── common/            # 通用工具类
├── core/              # 核心模块
├── elements/          # 元素定义
├── modes/             # 模式实现
├── renders/           # 渲染器
├── ui/                # UI组件
└── utils/             # 工具函数
```

### 核心模块说明

- **EventEmitter**：事件发布/订阅机制
- **Viewport**：视图变换器，负责坐标转换
- **DataManager**：数据管理器，负责元素的增删改查
- **CommandManager**：命令管理器，实现撤销/重做
- **ModeManager**：模式管理器，管理不同操作模式
- **Render**：渲染器，负责元素的可视化

### 元素系统

- **Element**：基类，提供通用属性和方法
- **LineElement**：线条元素，支持多点绘制和编辑
- **ImgElement**：图片元素，支持位置和角度调整

### 渲染系统

- **Render**：主渲染器
- **Selector**：选择器，用于元素选择
- **多种渲染策略**：支持不同的渲染效果

## 技术栈

- **原生 JavaScript**：ES6+语法
- **Canvas API**：绘图和交互
- **IndexedDB**：数据存储

## 扩展方向

- **新增元素类型**：继承 Element，完善 Render/selectorRender
- **新增渲染效果**：实现 IRenderStrategy 接口
- **新增操作模式**：继承 BaseMode，实现 activate/deactivate
- **新增命令**：继承 Command，实现 execute/undo
