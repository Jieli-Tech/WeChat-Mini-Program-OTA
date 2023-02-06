//connect.ts
export const UUID_SERVICE = "0000ae00-0000-1000-8000-00805f9b34fb";
export const UUID_WRITE = "0000ae01-0000-1000-8000-00805f9b34fb";
export const UUID_NOTIFY = "0000ae02-0000-1000-8000-00805f9b34fb";

import { logGroup, logGroupEnd, logv, logd, logi, logw, loge } from "./log";

export class ConnectImpl {
  private status = 0//0:断开 1：连接中 2：
  private callback: ConnectCallback | null = null
  private currentDevice: WechatMiniprogram.BlueToothDevice | null = null
  private communicationService: WechatMiniprogram.BLEService | null = null
  private communicationWriteCharacteristic: WechatMiniprogram.BLECharacteristic | null = null
  private mtu: number = 0;
  private disconnectTime: number = 0;
  private maxMTU: number = 512;
  constructor() {
  }
  setMaxMTU(mtu: number) {
    this.maxMTU = mtu
  }
  connect(device: WechatMiniprogram.BlueToothDevice, isOTA: boolean): boolean {
    let date = new Date()
    let currentTime = date.getTime();
    if ((currentTime - this.disconnectTime < 2000) && !isOTA) {//频繁断开连接设备，会导致认证失败。原因是频繁连接操作，BLE实际没有断开，设备无法进行认证。OTA的时候不需要这样
      loge("connect failed interval time <2000")
      return false
    }
    if (this.isConnectedOrConnecting()) {
      loge("connect failed is connected Or connecting")
      return false;
    }
    this.status = 1
    this.currentDevice = device;
    logi('开始连接设备 ' + JSON.stringify(device));
    wx.createBLEConnection({
      // 这里的 deviceId 需要已经通过 createBLEConnection 与对应设备建立链接
      deviceId: device.deviceId,
      success: res => {
        logi('连接蓝牙成功:' + JSON.stringify(res.errMsg));
        // 连接设备后断开搜索 并且不能搜索设备
        this.status = 2;
        let system = wx.getSystemInfoSync();
        if (system.platform == 'android') {
          wx.setBLEMTU({
            deviceId: device.deviceId,
            mtu: this.maxMTU,
            success: res => {
              logi('调节MTU成功，' + res.mtu);
              this.mtu = res.mtu
              if (this.callback && this.callback.onMTUChange && this.currentDevice) {
                this.callback.onMTUChange(this.currentDevice, this.mtu)
              }
              this._getBLEDeviceServices();
              this._registerConnStatusListener()
            },
            fail: (res) => {
              logi('调节失败，直接获取MTU，' + JSON.stringify(res));
              wx.getBLEMTU({
                deviceId: device.deviceId, success: res => {
                  logi('调节MTU成功，' + JSON.stringify(res.mtu));
                  this.mtu = res.mtu
                  if (this.callback && this.callback.onMTUChange && this.currentDevice) {
                    this.callback.onMTUChange(this.currentDevice, this.mtu)
                  }
                  this._getBLEDeviceServices();
                  this._registerConnStatusListener()
                }, fail: res => {
                  loge('调节MTU失败，' + JSON.stringify(res));
                  this.disconnect()
                  this._connectFailed()
                }
              })
            }
          })
        } else {
          setTimeout(() => {
            wx.getBLEMTU({
              writeType: 'writeNoResponse',
              deviceId: device.deviceId, success: res => {
                logi('iOS调节MTU成功，api的mtu' + JSON.stringify(res.mtu));
                if (res.mtu == 23 ) {//代表该mtu 的api不可用，认为设备mtu为123
                  this.mtu = 128               
                } else {
                  this.mtu = res.mtu
                }
                logi('iOS调节MTU成功，最终的mtu' + JSON.stringify(res.mtu));
  
                if (this.callback && this.callback.onMTUChange && this.currentDevice) {
                  logi('iOS调节MTU成功回调');
                  this.callback.onMTUChange(this.currentDevice, this.mtu)
                }
                this._getBLEDeviceServices();
                this._registerConnStatusListener()
              }, fail: res => {
                loge('调节MTU失败，' + JSON.stringify(res));
                this.disconnect()
                this._connectFailed()
              }
            })
          }, 100);
          // this._getBLEDeviceServices();
          // this._registerConnStatusListener()
        }
      },
      fail: e => {
        loge('连接失败，' + e.errCode);
        if (this.status == 2) {
          loge('连接失败，已在onBLEConnectionStateChange处理，所以不做回调');
          return;
        } else {
          this._connectFailed()
        }
      }
    });
    return true;
  }

  disconnect() {
    if (this.isConnectedOrConnecting() && this.currentDevice) {
      wx.closeBLEConnection({
        deviceId: this.currentDevice.deviceId,
      })
    }
  }

  setCallback(callback: ConnectCallback | null) {
    this.callback = callback
  }

  getConnectedDevice(): WechatMiniprogram.BlueToothDevice | null {
    if (this.isConnected()) {
      return this.currentDevice
    } else {
      return null
    }
  }

  getCommunicationService(): WechatMiniprogram.BLEService | null {
    return this.communicationService
  }

  getCommunicationWriteCharacteristic(): WechatMiniprogram.BLECharacteristic | null {
    return this.communicationWriteCharacteristic
  }

  getMTU(): number | undefined {
    if (this.isConnected()) {
      return this.mtu
    }
    return undefined
  }

  isConnectedOrConnecting() {
    return this.isConnected() || this.isConnecting()
  }

  isConnecting() {
    return this.status == 1 || this.status == 2;
  }

  isConnected() {
    return this.status == 3;
  }

  private _registerConnStatusListener() {
    logv("注册连接状态回调");
    let that = this;
    let resFun = function (res: WechatMiniprogram.OnBLEConnectionStateChangeCallbackResult) {
      // 该方法回调中可以用于处理连接意外断开等异常情况
      logi("蓝牙连接状态变化" + JSON.stringify(res));
      if (that.currentDevice && that.currentDevice.deviceId != res.deviceId) {
        logi("不是同一设备" + JSON.stringify(res));
        logi("不是同一设备1" + JSON.stringify(that.currentDevice));
        return
      }
      if (res.connected) {
        // that.status = 2;
        // that._getBLEDeviceServices();
      } else {
        wx.offBLEConnectionStateChange(resFun)
        if (that.status == 3) {
          let date = new Date()
          that.disconnectTime = date.getTime()
          that._disconnect()
        } else {
          that._connectFailed()
        }
      }
    }
    wx.onBLEConnectionStateChange(resFun);
  }

  /**
 * 获取所有服务
 */
  private _getBLEDeviceServices() {
    if (this.currentDevice) {
      let deviceId = this.currentDevice.deviceId;
      logd('获取所有服务的 uuid:' + deviceId);
      wx.getBLEDeviceServices({
        // 这里的 deviceId 需要已经通过 createBLEConnection 与对应设备建立链接
        deviceId,
        success: res => {
          logd('获取设备服务成功:' + JSON.stringify(res.services));
          var list = res.services;
          if (list.length <= 0) {
            this._connectFailed()
            return;
          }
          let hasUUIDSERVICE = false;
          list.forEach((s) => {
            logd('设备服务:' + s.uuid.toLowerCase());
            if (s.uuid.toLowerCase() == UUID_SERVICE) {
              this.communicationService = s;
              this._getBLEDeviceCharacteristics(deviceId, s.uuid);
              hasUUIDSERVICE = true;
            }
            // if (s.uuid.toLocaleUpperCase() == "0000180A-0000-1000-8000-00805F9B34FB" ) {//拉起系统的配对窗体
            //   this._getBLEDeviceCharacteristics(deviceId, s.uuid);
            // }
          })
          if (!hasUUIDSERVICE) {
            //未能找到对应的service uuid
            this._connectFailed()
          }
        },
        fail: e => {
          loge('获取设备服务失败，错误码：' + e.errCode);
          this._connectFailed()

        }
      });
    }
  }
  /**
 * 获取某个服务下的所有特征值
 */
  private _getBLEDeviceCharacteristics(deviceId: string, serviceId: string) {
    logi("获取某个服务下的所有特征值" + "\tdeviceId=" + deviceId + "\tserviceId=" + serviceId);
    wx.getBLEDeviceCharacteristics({
      // 这里的 deviceId 需要已经通过 createBLEConnection 与对应设备建立链接
      deviceId,
      // 这里的 serviceId 需要在 getBLEDeviceServices 接口中获取
      serviceId,
      success: res => {
        let list = res.characteristics;
        logi("getBLEDeviceCharacteristics" + "\tlist=" + JSON.stringify(list));
        if (list.length <= 0) {
          this._connectFailed()
          return;
        }
        let hasNotifyUUID = false;
        list.forEach((c) => {
        //   if (c.properties.read) {// 可以拉起Android系统的配对窗体，对应的serviceId：180A，characterId：2A50
        //     console.log(" serviceId : " + serviceId + " characteristicId: " + c.uuid);
        //     wx.readBLECharacteristicValue({
        //         deviceId,
        //         serviceId,
        //         characteristicId: c.uuid,
        //     })
        // }
          if (c.uuid.toLowerCase() == UUID_NOTIFY) {
            this._notifyBLECharacteristicValueChange({
              deviceId: deviceId,
              serviceId: serviceId,
              characteristicId: c.uuid,
            })
            hasNotifyUUID = true;
          } else if (c.uuid.toLowerCase() == UUID_WRITE) {
            this.communicationWriteCharacteristic = c;
          }
        })
        if (!hasNotifyUUID) {
          loge('未能找到Notify特征值！');
          this._connectFailed();
        }
      },
      fail: e => {
        loge('获取特征值失败，错误码：' + e.errCode);
        this._connectFailed()
      }
    });
  }
  /**
  * 订阅操作成功后需要设备主动更新特征值的 value，才会触发 wx.onBLECharacteristicValueChange 回调。
  */
  private _notifyBLECharacteristicValueChange(obj: {
    deviceId: string,
    serviceId: string,
    characteristicId: string
  }) {
    wx.notifyBLECharacteristicValueChange({
      state: true, // 启用 notify 功能
      // 这里的 deviceId 需要已经通过 createBLEConnection 与对应设备建立链接
      deviceId: obj.deviceId,
      // 这里的 serviceId 需要在 getBLEDeviceServices 接口中获取
      serviceId: obj.serviceId,
      // 这里的 characteristicId 需要在 getBLEDeviceCharacteristics 接口中获取
      characteristicId: obj.characteristicId,
      success: (res) => {
        logi('使能通知成功：' + JSON.stringify(res));
        this._connectSuccsed()
      },
      fail: (err) => {
        loge('使能通知失败' + JSON.stringify(err));
        this._connectFailed()
      }
    });
  }

  private _disconnect() {
    this.status = 0
    if (this.callback && this.callback.onDisconnect && this.currentDevice) {
      this.callback.onDisconnect(this.currentDevice)
    }
  }
  private _connectFailed() {
    this.status = 0
    if (this.callback && this.callback.onFailed && this.currentDevice) {
      this.callback.onFailed(this.currentDevice)
    }
  }
  private _connectSuccsed() {
    this.status = 3;
    if (this.callback && this.callback.onSuccess && this.currentDevice) {
      this.callback.onSuccess(this.currentDevice)
    }
  }
}
/** 设备连接的回调 */
export interface ConnectCallback {
  onDisconnect?: ConnectDisconnectCallback,
  onFailed?: ConnectFailedCallback,
  onSuccess?: ConnectSuccessCallback,
  onMTUChange?: DeviceMTUChangeCallback,
}
/** 设备断开的回调函数 */
type ConnectDisconnectCallback = (
  result: WechatMiniprogram.BlueToothDevice
) => void
/** 设备连接失败的回调函数 */
type ConnectFailedCallback = (
  result: WechatMiniprogram.BlueToothDevice
) => void
/** 设备连接成功的回调函数 */
type ConnectSuccessCallback = (
  result: WechatMiniprogram.BlueToothDevice
) => void
/** 设备MTU改变的回调函数 */
type DeviceMTUChangeCallback = (
  result: WechatMiniprogram.BlueToothDevice,
  mtu: number
) => void