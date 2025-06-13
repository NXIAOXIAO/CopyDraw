import { globalData } from './globalData.js'
import { canvas, ctx, ctx2, ctx3 } from '../controls/canvas.js'
import Logger from '../common/logger.js'
import { worldToCanvas } from '../common/utils.js'
import { renderSelector } from '../operations/select.js'
export function defaultRender() {
  Logger.debug('执行默认绘制')
  //绘制数据
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx2.clearRect(0, 0, canvas.width, canvas.height)
  ctx3.clearRect(0, 0, canvas.width, canvas.height)
  Logger.debug('清除现有canvas图像')
  globalData.imgs.forEach((img) => {
    Logger.debug('绘制图像')
    //尝试只在下层绘制图像
    img.render(ctx3)
  })
  ctx.strokeStyle = '#46A5F3'
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  Logger.debug(globalData)
  globalData.lines.forEach((line) => {
    Logger.debug('绘制线')
    line.render(ctx)
  })
  //绘制selector
  renderSelector()
}
