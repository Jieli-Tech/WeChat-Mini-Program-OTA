/**
 * 数组转码打印
 * @param data
 * @returns
 */
export function u8ToHexStr(data: Uint8Array): string {
    let str = '';
    for (const item of data) {
      str = str + item.toString(16).padStart(2, '0') + " ";
    }
    return str;
  }