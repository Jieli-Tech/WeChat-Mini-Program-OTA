import { JL_RCSP, JL_OTA } from '../lib_rcsp';
import { getLogger } from "./logger";

export function initLog() {
  const logOption = {
    output: (level: string, module: string, tag: string, message: string, ...args: any[]) => {
      Log.logout(level, module, tag, message, ...args)
    }
  }
  JL_OTA.OtaLog.setLogOption(logOption)
  JL_RCSP.RcspLog.setLogOption(logOption)
  const logger = getLogger()
  Log.logOptions = logger
}

export interface ILogOption {
  output(level: string, ...args: any[]): void
}

export default class Log {
  static prefix: string = "zhjieli"
  protected static module: string = 'App'
  static logOptions?: ILogOption
  static level: number = 0
  static saveLog: boolean = false
  static d(tag: string, message: string, ...args: any[]) {
    this.logout('d', this.module, tag, message, ...args)
  }

  static i(tag: string, message: string, ...args: any[]) {
    this.logout('i', this.module, tag, message, ...args)
  }

  static w(tag: string, message: string, ...args: any[]) {
    this.logout('w', this.module, tag, message, ...args)
  }

  static e(tag: string, message: string, ...args: any[]) {
    this.logout('e', this.module, tag, message, ...args)
  }
  static getLogLevelValue(level: string) {
    let value = 0
    switch (level) {
      case 'e':
        value = 3
        break
      case 'w':
        value = 2
        break
      case 'i':
        value = 1
        break
      case 'd':
        value = 0
        break
      default:
        break;
    }
    return value
  }
  static logout(level: string, module: string, tag: string, message: string, ...args: any[]) {
    const logPrefix = this.createLogPrefix(module, tag)
    const timeStr = this.createTimeString()
    if (this.getLogLevelValue(level) < this.level) {
      return
    }
    if (this.saveLog) {
      this.logOptions?.output(level, `${timeStr} ${logPrefix} ` + message, ...args)
    }
    switch (level) {
      case 'e':
        console.error(`${timeStr} ${logPrefix} ` + message, ...args)
        break
      case 'w':
        console.warn(`${timeStr} ${logPrefix} ` + message, ...args)
        break
      case 'i':
        console.info(`${timeStr} ${logPrefix} ` + message, ...args)
        break
      case 'd':
        console.debug(`${timeStr} ${logPrefix} ` + message, ...args)
        break
      default:
        break;
    }
  }
  private static createTimeString() {
    const date = new Date()
    const time = date.getFullYear() + Log.add0(date.getMonth() + 1) + Log.add0(date.getDate())
      + ' ' + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds() + '.' + date.getMilliseconds();
    return time
  }
  private static createLogPrefix(module: string, tag: string) {
    // const logPrefix = (tag ? tag : Log.prefix) + ": ";
    // return logPrefix
    let m = module ? `${module}:` : ''
    const logPrefix = m + tag + ": ";
    return logPrefix
  }
  private static add0(value: number) {
    return (value > 9 ? '' : '0') + value
  }


}
