// app.ts

import { IAppOption } from "../typings/index";
import { BluetoothOTAManager } from "./lib/bluetoothOTAManager";
import { setLogger as setOTALogger, setLogGrade as setOTALoggerGrade } from "./lib/jl_lib/jl_ota_2.1.1";
import { setLogger as setRCSPLogger, setLogGrade as setRCSPLoggerGrade } from "./lib/jl_lib/jl_rcsp_ota_2.1.1";
import { setLogger as setAppLogger, setLogGrade as setAppLoggerGrade } from "./lib/log";
import { getLogger, setLogEnable, setLogGrade as setLogManagerGrade } from "./lib/logger";


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
      setLogEnable(cacheIsEnableDebug)
    }
    //打印设置
    {
      const logger = getLogger()
      setOTALogger(logger)
      setRCSPLogger(logger)
      setAppLogger(logger)
      const logGrade = wx.getStorageSync("LogGrade")
      if (logGrade != "") {
        setLogManagerGrade(logGrade)
      }
      //单独限制部分打印等级
      // const logGrade = 1
      // setLogManagerGrade(logGrade)
      // setAppLoggerGrade(logGrade)
      // setRCSPLoggerGrade(logGrade)
      // setOTALoggerGrade(logGrade)
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

    const sysinfo = wx.getSystemInfoSync()
    this.globalData.bluetoothManager = new BluetoothOTAManager(sysinfo.platform);
    const configure = this.globalData.bluetoothManager.getConfigure()
    configure.isUseAuth = this.globalData.gbIsHandshake
    configure.changeMTU = this.globalData.gbMtuNum
    //todo 目前未实现自动化测试OTA
    configure.isAutoTestOTA = false;
    configure.autoTestOTACount = 20;
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