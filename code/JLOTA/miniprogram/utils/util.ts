export const formatTime = (date: Date) => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return (
    [year, month, day].map(formatNumber).join('/') +
    ' ' +
    [hour, minute, second].map(formatNumber).join(':')
  )
}


const formatNumber = (n: number) => {
  const s = n.toString()
  return s[1] ? s : '0' + s
}

export function byteArrayToHex(buffer: any) {
  const hexArr = Array.prototype.map.call(
    new Uint8Array(buffer),
    function (bit) {
      return ('00' + bit.toString(16)).slice(-2)
    }
  )
  return hexArr.join('-').toUpperCase()
}
/**
 * unicode编码
*/
export function string2buffer(str: string) {
  let val = ""
  for (let i = 0; i < str.length; i++) {
    val += ',' + code2utf8(str.charCodeAt(i))
  }
  // val += ',00';
  const regExpMatchArray = val.match(/[\da-f]{2}/gi)
  // 将16进制转化为ArrayBuffer
  if (regExpMatchArray != null) {
    return new Uint8Array(regExpMatchArray.map(function (h) {
      return parseInt(h, 16)
    })).buffer
  } else {
    return new Uint8Array(0)
  }
}
function code2utf8(uni: any) {
  let uni2 = uni.toString(2)
  if (uni < 128) {
    return uni.toString(16);
  } else if (uni < 2048) {
    uni2 = ('00000000000000000' + uni2).slice(-11);
    const s1 = parseInt("110" + uni2.substring(0, 5), 2);
    const s2 = parseInt("10" + uni2.substring(5), 2);
    return s1.toString(16) + ',' + s2.toString(16)
  } else {
    uni2 = ('00000000000000000' + uni2).slice(-16);
    const s1 = parseInt('1110' + uni2.substring(0, 4), 2);
    const s2 = parseInt('10' + uni2.substring(4, 10), 2);
    const s3 = parseInt('10' + uni2.substring(10), 2);
    return s1.toString(16) + ',' + s2.toString(16) + ',' + s3.toString(16)
  }
}
