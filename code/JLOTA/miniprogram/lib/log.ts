const TAG = "杰理-OTA"
function formatLog(msg: string) {
  let date = new Date()
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()
  const mill = date.getMilliseconds()

  let timeString = `${[year, month, day].map(formatNumber).join('/')} ${[hour, minute, second, mill].map(formatNumber).join(':')}`

  return timeString + ":" + TAG + "-->" + msg;
}
const formatNumber = (n: any) => {
  n = n.toString()
  return n[1] ? n : `0${n}`
}
export function setLogGrade(grade: number) {
  logGrade = grade
}
export function logGroup(label: string) {
  console.group(label);
}
export function logGroupEnd() {
  console.groupEnd();
}
var logGrade: number = 1;
export function logv(msg: string) {
  if (logGrade <= 1) {
    console.log(formatLog(msg));
  }
}
export function logd(msg: string) {
  if (logGrade <= 2) {
    console.debug(formatLog(msg));
  }
}
export function logi(msg: string) {
  if (logGrade <= 3) {
    console.info(formatLog(msg));
  }
}
export function logw(msg: string) {
  if (logGrade <= 4) {
    console.warn(formatLog(msg));
  }
}
export function loge(msg: string) {
  if (logGrade <= 5) {
    console.error(formatLog(msg));
  }
}

/** arraybuffer 转字符串*/
export function ab2hex(buffer: ArrayBuffer) {
  const hexArr = Array.prototype.map.call(
    new Uint8Array(buffer),
    function (bit) {
      return ('00' + bit.toString(16)).slice(-2)
    }
  )
  return hexArr.join('')
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
