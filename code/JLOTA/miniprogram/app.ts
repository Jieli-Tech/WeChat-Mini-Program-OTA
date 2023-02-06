// app.ts

import { IAppOption } from "../typings/index";
import { BluetoothManager, BluetoothConfigure } from "./lib/bluetoothManager";


App<IAppOption>({
  globalData: {
    gbIsHandshake: true,
    gbIsAutoTest: false,
    gbTestNum: 1,
    gbMtuNum: 23,
    bluetoothManager: <any>null,
  },
  onLaunch() {
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

    const sysinfo = wx.getSystemInfoSync()
    this.globalData.bluetoothManager = new BluetoothManager(sysinfo.platform);
    const configure = new BluetoothConfigure()
    configure.isUseAuth = this.globalData.gbIsHandshake
    configure.changeMTU = this.globalData.gbMtuNum
    //todo 目前未实现自动化测试OTA
    configure.isAutoTestOTA = false;
    configure.autoTestOTACount = 20;
    this.globalData.bluetoothManager.setConfigure(configure)

    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 登录
    wx.login({
      success: res => {
        console.log(res.code)
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
      },
    })

  },
})