import { ab2hex, hexToBytes } from "./util";
import { logv, logd, logi, logw, loge } from "./log";

/** 处理收到数据 */
export var BleDataHandler = {
  callbacks: Array<BleDataCallback>(),
  init() {
    wx.onBLECharacteristicValueChange(res => {
      logv("收到数据 serviceId uuid:" + res.serviceId + "  characteristicId: " + res.characteristicId)
      logv("收到数据:" + ab2hex(res.value))
      this._handlerData(res);
    })
  },
  addCallbacks(callback: BleDataCallback) {
    if (this.callbacks.indexOf(callback) == -1) {
      this.callbacks.push(callback);
    }
  },
  removeCallbacks(callback: BleDataCallback) {
    var index = this.callbacks.indexOf(callback);
    if (index != -1) {
      this.callbacks.splice(index, 1);
    }
  },
  _handlerData(res: WechatMiniprogram.OnBLECharacteristicValueChangeCallbackResult) {
    this._doAction({
      action: (c) => {
        if (c.onReceiveData) {
          c.onReceiveData(res);
        }
      }
    });
  },
  _handlerConnectState(res: WechatMiniprogram.OnBLEConnectionStateChangeCallbackResult) {
    this._doAction({
      action: (c) => {
        if (c.onConnectStateChange) {
          c.onConnectStateChange(res);
        }
      }
    });
  },
  _doAction(obj: { action: (c: BleDataCallback) => void }) {
    this.callbacks.forEach(c => {
      obj.action(c)
    });
  },
}
export interface BleDataCallback {
  onReceiveData?: (res: WechatMiniprogram.OnBLECharacteristicValueChangeCallbackResult) => void
  /** 废弃*/
  onConnectStateChange?: (res: WechatMiniprogram.OnBLEConnectionStateChangeCallbackResult) => void
}

/todo 后续优化，1.阻塞式发送数据，2.区分设备/
/** 队列式-分包发送数据 */
export var BleSendDataHandler = {
  mtuMap: new Map<string, number>(),
  sendInfoArray: new Array<SendDataTask>(),
  retryNum: 0,
  setMtu(deviceId: string, mtu: number) {
    this.mtuMap.set(deviceId, mtu)
  },
  sendData(deviceId: string, serviceId: string, characteristicId: string, data: Uint8Array): boolean {
    const mtu = this.mtuMap.get(deviceId)
    let realMTU = 20;
    if (mtu != undefined && mtu > 512) {
      realMTU = 509
    } else {
      if (mtu != undefined) realMTU = mtu - 3
    }
    const dataLen = data.byteLength;
    const blockCount = Math.floor(dataLen / realMTU);
    let ret = false;
    for (let i = 0; i < blockCount; i++) {
      const mBlockData = new Uint8Array(realMTU);
      mBlockData.set(data.slice(i * realMTU, i * realMTU + mBlockData.length))
      ret = this._addSendData(deviceId, serviceId, characteristicId, mBlockData);
    }
    if (0 != dataLen % realMTU) {
      const noBlockData = new Uint8Array(dataLen % realMTU);
      noBlockData.set(data.slice(dataLen - dataLen % realMTU, dataLen))
      ret = this._addSendData(deviceId, serviceId, characteristicId, noBlockData);
    }
    return ret
  },
  _addSendData(deviceId: string, serviceId: string, characteristicId: string, data: Uint8Array): boolean {
    const sendDataTask = new SendDataTask(deviceId, serviceId, characteristicId, data)
    this.sendInfoArray.push(sendDataTask)
    if (this.sendInfoArray.length > 1) {
      return true
    }
    const handleCallback = {
      complete: () => {
        this._writeDataToDevice(this.sendInfoArray, handleCallback)
      }
    }
    this._writeDataToDevice(this.sendInfoArray, handleCallback)
    return true
  },
  _writeDataToDevice(dataInfoArray: Array<SendDataTask>, callback: { complete?: Function }) {
    const dataInfo = dataInfoArray.shift()
    if (dataInfo == undefined) {
      if (dataInfoArray.length == 0) return
      callback.complete?.()
      return
    }
    this._sendData(dataInfo, callback);
  },
  _sendData(sendDataTask: SendDataTask, callback: { complete?: Function }): boolean {
    // 发送失败重发三次
    logv("开始发送数据：->" + ab2hex(sendDataTask.data.buffer) + " serviceId:" + sendDataTask.serviceId)
    wx.writeBLECharacteristicValue({
      deviceId: sendDataTask.deviceId,
      serviceId: sendDataTask.serviceId.toLocaleUpperCase(),
      characteristicId: sendDataTask.characteristicId.toLocaleUpperCase(),
      value: sendDataTask.data.buffer,
      fail: (err) => {
        this.retryNum++
        if (this.retryNum <= 3) {
          logw("发送失败，重发数据：->" + "\terr=" + JSON.stringify(err) + " retryNum = " + this.retryNum)
          this._sendData(sendDataTask, callback)
        } else {
          this.retryNum = 0;
          callback.complete?.()
        }
        loge("发送数据失败：->" + "\terr=" + JSON.stringify(err))
      },
      success: () => {
        logv("发送数据成功：->" + ab2hex(sendDataTask.data.buffer) + " serviceId:" + sendDataTask.serviceId)
        this.retryNum = 0;
        callback.complete?.()
      }
    })
    return true
  }
}
class SendDataTask {
  public deviceId: string
  public serviceId: string
  public characteristicId: string
  public data: Uint8Array
  constructor(deviceId: string, serviceId: string, characteristicId: string, data: Uint8Array) {
    this.deviceId = deviceId
    this.serviceId = serviceId
    this.characteristicId = characteristicId
    this.data = data
  }
}