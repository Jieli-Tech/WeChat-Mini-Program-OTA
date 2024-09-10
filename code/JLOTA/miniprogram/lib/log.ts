const TAG = "杰理-OTA-App"
var logGrade: number = 1;
var logger: Logger | undefined;
export interface Logger {
  logv: (tag: string, ...args: any[]) => void
  logd: (tag: string, ...args: any[]) => void
  logi: (tag: string, ...args: any[]) => void
  logw: (tag: string, ...args: any[]) => void
  loge: (tag: string, ...args: any[]) => void
}
export function setLogGrade(grade: number) {
  logGrade = grade
}
export function setLogger(log: Logger) {
  logger = log
}

export function logv(...args: any[]) {
  if (logGrade <= 1) {
    if (logger != undefined) {
      logger.logv(TAG, ...args);
    }
  }
}
export function logd(...args: any[]) {
  if (logGrade <= 2) {
    if (logger != undefined) {
      logger.logd(TAG, ...args);
    }
  }
}
export function logi(...args: any[]) {
  if (logGrade <= 3) {
    if (logger != undefined) {
      logger.logi(TAG, ...args);
    }
  }
}
export function logw(...args: any[]) {
  if (logGrade <= 4) {
    if (logger != undefined) {
      logger.logw(TAG, ...args);
    }
  }
}
export function loge(...args: any[]) {
  if (logGrade <= 5) {
    if (logger != undefined) {
      logger.loge(TAG, ...args);
    }
  }
}

/** arraybuffer 转字符串*/
export function ab2hex(buffer?: ArrayBuffer) {
  if (buffer) {
    const hexArr = Array.prototype.map.call(
      new Uint8Array(buffer),
      function (bit) {
        return ('00' + bit.toString(16)).slice(-2)
      }
    )
    return hexArr.join('')
  }
  return ''
}

/** 16进制数据转蓝牙地址 */
export function hexDataCovetToAddress(dataArray: Uint8Array) {
  let address = ""
  for (let index = 0; index < dataArray.length; index++) {
    const element = dataArray[index];
    address += ('00' + element.toString(16)).slice(-2)
    if (index != dataArray.length - 1) {
      address += ":"
    }
  }
  return address.toUpperCase()
}
