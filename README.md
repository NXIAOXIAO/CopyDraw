[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/NXIAOXIAO/CopyDraw)

## CopyDraw
尝试实现一个完整的纯js项目，目前代码稀烂，持续修改中

main分支，基于面向对象，进行重构
好像和想象的不太一样

对手绘板的事件支持好像有点奇怪，需要再研究下

func分支，基于函数式编程，进行重构，todo

---

# AI重构生成
## 主要模块说明

- **core/AppManager**：全局业务调度，负责模式切换、事件流、通知 UI。
- **core/DataManager**：所有元素数据的唯一管理者，内部用 Map 存储，变更通知 UI，持久化用 IndexedDB。
- **core/Viewport**：视口与画布坐标变换，提供平移缩放等。
- **elements/**：`Element` 基类，派生 RectElement/LineElement/ImgElement，selectorRender 负责被选中时的高亮等辅助渲染。
- **render/Render**：负责所有元素的常规渲染，可根据 mode 调整表现，RenderMode 可扩展个性化渲染。
- **mode/**：BaseMode 统一接口，DrawMode/ViewEditMode/RenderMode 负责不同交互逻辑，所有事件注册/解绑在模式切换自动完成。
- **commands/**：Command 基类、三种命令 Add/Delete/Move、Invoker 管理撤销/重做。
- **ui/**：TopBar、LeftBar、CanvasArea 只负责显示和 emit 事件，绝不持有业务实例。
- **utils/**：ID 生成、剪贴板图片、indexedDB 工具等。
- **common/**：事件派发等常用类。

## 扩展/维护建议

- 新增元素类型：继承 Element，完善 Render/selectorRender。
- 新增渲染模式：扩展 RenderMode 并在 Render 中调用。
- 新增业务模式：继承 BaseMode，注册到 AppManager。
- 业务逻辑所有操作均通过事件和命令模式流转，便于扩展和维护。

## 错误处理

- IndexedDB/剪贴板等 API 操作都有 try-catch，UI 层 alert 友好提示。
- 业务层所有可预知异常均捕获。

## 如何启动/集成

1. 直接 clone 项目，使用支持 ES Module 的浏览器打开 `index.html`
2. 按需扩展元素、模式、渲染器
3. 只需在 `src/index.js` 集成各层模块，AppManager 统一调度

## 事件通信约定

- 所有 UI 操作 emit `uievent`，mode 监听响应
- 反向业务状态变更（如元素变化）由 core 层 emit 给 UI，UI 被动刷新
- 不允许 UI 层直接操作业务、数据、mode

## 贡献建议

- 保持分层、接口、风格一致
- 工具函数、常量等尽量抽取至 utils/common
- 编写注释、异常友好，方便二次开发
