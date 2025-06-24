//生成唯一id方案
export function generateId(type) {
  const randomStr = Math.random().toString(36).substring(2, 8)
  return type + Date.now() + '-' + randomStr
}
