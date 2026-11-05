// app.ts

import { IAppOption } from "../typings/index";
import { BluetoothOTAManager } from "./lib/bluetoothOTAManager";
import Log, { initLog } from "./lib/common/Log";
import { compareVersion } from "./utils/util";

App<IAppOption>({
  globalData: {
    gbIsHandshake: true,
    gbIsAutoTest: false,
    gbTestNum: 1,
    gbMtuNum: 512,
    gbDevelop: false,
    gbEnableDebug: false,
    bluetoothManager: <any>null,
  },
  onLaunch() {
    // 开发者模式
    const developMode = wx.getStorageSync("DevelopMode")
    if (developMode != "") {
      this.globalData.gbDevelop = developMode
    }
    //小程序开发调试(打印)
    const cacheIsEnableDebug = wx.getStorageSync("IsEnableDebug")
    if (cacheIsEnableDebug != "") {
      this.globalData.gbEnableDebug = cacheIsEnableDebug
    }
    //打印设置
    {
            // 初始化log
            Log.saveLog =  true//this.globalData.gbEnableDebug
            initLog()
            // 打印等级 error:3,warm:2,info:1,debug:0
            const level = wx.getStorageSync("LogGrade")
            if (level != "") {
              Log.level = level
            } else {
              Log.level = 0
            }
    }

    const cacheIsHandshake = wx.getStorageSync("IsHandshake")
    if (cacheIsHandshake != "") {
      this.globalData.gbIsHandshake = cacheIsHandshake
    }
    const cacheIsAutoTest = wx.getStorageSync("IsAutoTest")
    if (cacheIsAutoTest != "") {
      this.globalData.gbIsAutoTest = cacheIsAutoTest
    }
    const cacheTestNum = wx.getStorageSync("TestNum")
    if (cacheTestNum != "") {
      this.globalData.gbTestNum = cacheTestNum
    }
    const cacheMtuNum = wx.getStorageSync("MtuNum")
    if (cacheMtuNum != "") {
      this.globalData.gbMtuNum = cacheMtuNum
    }
    const cacheServiceUUID = wx.getStorageSync("ServiceUUID")

    const cacheNotifyCharacteristicUUID = wx.getStorageSync("NotifyCharacteristicUUID")

    const cacheWriteCharacteristicUUID = wx.getStorageSync("WriteCharacteristicUUID")

    const version = wx.getAppBaseInfo().SDKVersion

    if (compareVersion(version, '2.20.1') >= 0) {
      const sysinfo = wx.getDeviceInfo()
      this.globalData.bluetoothManager = new BluetoothOTAManager(sysinfo.platform);
    } else {//从基础库 2.20.1 开始，getSystemInfoSync接口停止维护
      const sysinfo = wx.getSystemInfoSync()
      this.globalData.bluetoothManager = new BluetoothOTAManager(sysinfo.platform);
    }
    const configure = this.globalData.bluetoothManager.getConfigure()
    configure.isUseAuth = this.globalData.gbIsHandshake
    configure.changeMTU = this.globalData.gbMtuNum
    if (cacheServiceUUID != "") {
      configure.serviceUUID = cacheServiceUUID
    }
    if (cacheNotifyCharacteristicUUID != "") {
      configure.notifyCharacteristicUUID = cacheNotifyCharacteristicUUID
    }
    if (cacheWriteCharacteristicUUID != "") {
      configure.writeCharacteristicUUID = cacheWriteCharacteristicUUID
    }
    this.globalData.bluetoothManager.setConfigure(configure)

  },
})