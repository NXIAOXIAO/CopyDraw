export const canvas = document.createElement('canvas')
export const ctx = canvas.getContext('2d')
export const canvas2 = document.createElement('canvas')
export const ctx2 = canvas2.getContext('2d')

export const canvas3 = document.createElement('canvas')
export const ctx3 = canvas3.getContext('2d')

export function setupCanvas(app) {
  app.appendChild(canvas)
  app.appendChild(canvas2)
  app.appendChild(canvas3)
  canvas.style.position = 'absolute'
  canvas.style.zIndex = '2'
  canvas2.style.position = 'absolute'
  canvas2.style.zIndex = '3'
  canvas2.style.pointerEvents = 'none'
  canvas3.style.position = 'absolute'
  canvas3.style.zIndex = '1'
  canvas3.style.pointerEvents = 'none'
  resizeCanvas(app)
}

export function resizeCanvas(app) {
  canvas.width = app.clientWidth
  canvas.height = app.clientHeight
  canvas2.width = app.clientWidth
  canvas2.height = app.clientHeight
  canvas3.width = app.clientWidth
  canvas3.height = app.clientHeight
}
