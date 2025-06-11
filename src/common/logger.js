const levels = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
}

//const currentLevel = levels[process.env.LOG_LEVEL || 'DEBUG']
let currentLevel = levels['DEBUG']

function setLevel(level) {
  currentLevel = levels[level]
}

function log(level, ...args) {
  if (levels[level] <= currentLevel) {
    console.log(`[${level}]`, ...args)
  }
}

function error(...args) {
  log('ERROR', ...args)
}

function warn(...args) {
  log('WARN', ...args)
}

function info(...args) {
  log('INFO', ...args)
}

function debug(...args) {
  log('DEBUG', ...args)
}

export default { setLevel, error, warn, info, debug }
