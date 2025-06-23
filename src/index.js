import { AppManager } from './core/AppManager.js'

//这里就相当于Main入口点
const appManager = new AppManager(document.getElementById('app'))
appManager.start()
