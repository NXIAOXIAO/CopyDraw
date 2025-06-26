[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/NXIAOXIAO/CopyDraw)

## CopyDraw

尝试实现一个完整的纯 js 项目，目前代码稀烂，持续修改中

main 分支，基于面向对象，进行重构
好像和想象的不太一样

对手绘板的事件支持好像有点奇怪，需要再研究下

func 分支，基于函数式编程，进行重构，todo

---

# CopyDraw 重构

一个基于 Canvas 的绘图应用，采用“模式-策略-命令-数据-渲染”解耦架构，支持多种绘图模式和渲染效果。

## 架构概览

- **模式（Mode）**：如 ViewEditMode、DrawMode、RenderMode，负责主交互流程和状态切换。
- **策略（Strategy）**：每种模式下细分交互策略（如拖动、点操作、框选、导入导出、键盘等），单一职责，易于扩展。
- **命令（Command）**：所有数据变更均通过命令对象（如 AddElementCommand、MoveElementCommand、AddPointCommand 等）实现，支持撤销/重做。
- **数据（DataManager + IndexedDB）**：所有元素集中管理，持久化到 IndexedDB，支持批量导入导出。
- **渲染（Render + 多策略）**：主渲染器+多种渲染策略，支持不同风格和性能优化。
- **事件驱动（EventEmitter）**：全局事件解耦，模式、策略、UI、渲染等均通过事件通信。
- **辅助工具**：如 viewHelpers、viewEditHelpers 等，提供坐标、几何、批量操作等通用能力。

### Mermaid 架构图

```mermaid
flowchart TD
  subgraph UI/Canvas
    CanvasArea
  end
  subgraph 模式
    ViewEditMode
    DrawMode
    RenderMode
  end
  subgraph 策略
    DragElementStrategy
    PointOperationStrategy
    BoxSelectStrategy
    ViewOperationStrategy
    CopyPasteStrategy
    ImportExportStrategy
    KeyboardStrategy
  end
  subgraph 命令
    AddElementCommand
    MoveElementCommand
    AddPointCommand
    DeleteElementCommand
    // ...
  end
  subgraph 数据
    DataManager
    IndexedDB
  end
  subgraph 渲染
    Render
    IRenderStrategy
    DefaultRenderStrategy
    CartoonRenderStrategy
    // ...
  end
  subgraph 工具
    viewHelpers
    viewEditHelpers
  end

  CanvasArea <--> ViewEditMode
  CanvasArea <--> DrawMode
  CanvasArea <--> RenderMode
  ViewEditMode <--> DragElementStrategy
  ViewEditMode <--> PointOperationStrategy
  ViewEditMode <--> BoxSelectStrategy
  ViewEditMode <--> ViewOperationStrategy
  ViewEditMode <--> CopyPasteStrategy
  ViewEditMode <--> ImportExportStrategy
  ViewEditMode <--> KeyboardStrategy
  DrawMode <--> DrawStrategy
  DrawMode <--> ViewOperationStrategy
  DrawMode <--> CopyPasteStrategy
  DrawMode <--> KeyboardStrategy
  RenderMode <--> ViewOperationStrategy
  RenderMode <--> KeyboardStrategy
  策略 -->|命令| AddElementCommand
  策略 -->|命令| MoveElementCommand
  策略 -->|命令| AddPointCommand
  策略 -->|命令| DeleteElementCommand
  命令 --> DataManager
  DataManager <--> IndexedDB
  DataManager <--> Render
  Render <--> IRenderStrategy
  IRenderStrategy <--> DefaultRenderStrategy
  IRenderStrategy <--> CartoonRenderStrategy
  // ...
  ViewEditMode <--> viewHelpers
  ViewEditMode <--> viewEditHelpers
```

## 功能特性

### 核心功能

- **多模式解耦**：支持查看编辑、绘制、渲染等多种模式，模式切换流畅，互不干扰。
- **策略扩展**：每种模式下细分 Drag/Point/BoxSelect/View/CopyPaste/ImportExport/Keyboard 等策略，单一职责，易于扩展和维护。
- **命令模式**：所有数据变更均通过命令对象（如 AddElementCommand、MoveElementCommand、AddPointCommand 等）实现，支持撤销/重做。
- **数据持久化**：所有元素集中管理，持久化到 IndexedDB，支持批量导入导出（Ctrl+I/Ctrl+O）。
- **事件驱动**：基于 EventEmitter 的全局事件解耦，模式、策略、UI、渲染等均通过事件通信。
- **辅助工具**：如 viewHelpers、viewEditHelpers，提供坐标、几何、批量操作等通用能力。
- **高性能渲染**：主渲染器+多种渲染策略，支持不同风格和性能优化。

### 主要交互与快捷键

- **鼠标左键点选/右键框选/Shift+点击**：灵活选择和多选元素（Shift+点击支持加/减选，Ctrl+点击已移除）
- **M 键移动**：选中元素后按 M 键可整体进入移动模式
- **Delete 键删除**：
  - 选中线元素上的点时，Delete 删除该点（仅剩2点时删除整条线）
  - 选中元素时，Delete 删除元素
- **双击添加点**：在 LineElement 上双击可添加新点
- **滚轮缩放**：鼠标滚轮进行视图缩放，最大支持30倍
- **Ctrl+I/Ctrl+O**：批量导入/导出元素（JSON），支持文件选择和下载
- **P 键**：将距离当前屏幕中心最近的元素自动居中到屏幕中心，支持任意缩放/旋转状态

### 元素类型

- **LineElement**：线条元素，支持多点绘制和编辑
- **PathElement**：路径元素，支持笔模式连续绘制
- **ImgElement**：图片元素，支持位置和角度调整

### 扩展性

- 新增元素类型：继承 Element，完善 Render/selectorRender
- 新增渲染效果：实现 IRenderStrategy 接口
- 新增操作模式：继承 BaseMode，实现 activate/deactivate
- 新增命令：继承 Command，实现 execute/undo
- 新增策略：扩展各 Mode 下的策略类，实现 handleEvent