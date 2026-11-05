// pages/pageSetting/pageSetting.ts

import { IAppOption } from "../../../typings/index"
import { Constant } from "../../lib/AppConstant"
import { BluetoothConfigure, BluetoothOTAManager } from "../../lib/bluetoothOTAManager"
import Log from "../../lib/common/Log"
import { JL_OTA } from "../../lib/lib_rcsp"
import { compareVersion } from "../../utils/util"

const app = getApp<IAppOption>()
const sBluetoothManager: BluetoothOTAManager = app.globalData.bluetoothManager
const TAG = "pageSetting"
Page({

  /**
   * 页面的初始数据
   */
  data: {
    isTimesView: false,
    mStatusTimesView: 0,//0:测试数量弹窗 1:MTU弹窗
    isHandshake: true,//是否需要认证
    isAutoTest: false,
    isEnableDebug: false,//是否打开开发调试
    logViewVisible: false,//显示上传log弹窗
    logGradeArray: ['logd', 'logi', 'logw', 'loge'],
    logGrade: 0,
    developMode: false,
    mTestNum: 1,
    mMtuNum: 23,
    mPlatform: 'android',
    appVersion: "",
    sdkVersion:""
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad() {
    // const logGrade = getLogGrade()
    const logGrade = Log.level
    let platform = 'android'
    const version = wx.getAppBaseInfo().SDKVersion
    if (compareVersion(version, '2.20.1') >= 0) {
      const sysinfo = wx.getDeviceInfo()
      platform = sysinfo.platform
    } else {//从基础库 2.20.1 开始，getSystemInfoSync接口停止维护
      const sysinfo = wx.getSystemInfoSync()
      platform = sysinfo.platform
    }
    this.setData({
      isHandshake: app.globalData.gbIsHandshake,
      isAutoTest: app.globalData.gbIsAutoTest,
      mTestNum: app.globalData.gbTestNum,
      mMtuNum: app.globalData.gbMtuNum,
      isEnableDebug: app.globalData.gbEnableDebug,
      developMode: app.globalData.gbDevelop,
      mPlatform: platform,
      logGrade: (logGrade),
      appVersion:Constant.APP_VERSION_NAME,
      sdkVersion:JL_OTA.OTASdkVersion.VersionName
    })
  },
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 2
      })
    }
  },
  onShareAppMessage() {
    return {
      title: '杰理OTA升级',
      path: '/pages/pageConnect/pageConnect',
    }
  },
  // 设备认证
  onIsHandshakeDevice(e: any) {
    Log.d(TAG, "认证设备：" + e.detail.value)
    const isHandshake = e.detail.value
    this.setData({
      isHandshake: isHandshake
    })
    app.globalData.gbIsHandshake = isHandshake;
    wx.setStorageSync("IsHandshake", isHandshake)
    this._saveSettings()
  },
  //自动化测试
  onIsAutoTestDevice(e: any) {
    Log.d(TAG, "自动化测试：" + e.detail.value)
    const isAutoTest = e.detail.value
    this.setData({
      isAutoTest: isAutoTest
    })
    if (this.data.isAutoTest == false) {
      this.setData({
        mTestNum: 1,
        mMtuNum: 23
      })
    }
    app.globalData.gbIsAutoTest = isAutoTest;
    wx.setStorageSync("IsAutoTest", isAutoTest)
    app.globalData.gbTestNum = this.data.mTestNum;
    app.globalData.gbMtuNum = this.data.mMtuNum;
    this._saveSettings()
  },

  //测试次数弹窗
  onShowTestNumberView() {
    this.setData({
      mStatusTimesView: 0,
      isTimesView: !this.data.isTimesView
    })
  },
  //MTU设置弹窗
  onShowMtuNumberView: function () {
    this.setData({
      mStatusTimesView: 1,
      isTimesView: !this.data.isTimesView
    })
  },
  onUploadLogFile: function () {
    // this.setData({
    //   logViewVisible: true
    // })
    wx.navigateTo({
      url: '/pages/pageSetting/pageLogFile/pageLogFile',
    })
  },
  onCancelUploadLog() {
    this.setData({
      logViewVisible: false
    })
  },
  onConfirmUploadLog() {
    this.setData({
      logViewVisible: false
    })
  },
  //Log文件 
  onShowLogFileView: function () {
    Log.d(TAG, " onShowLogFileView");
    //展示log界面
    wx.navigateTo({
      url: '/pages/pageSetting/pageLogFileList/pageLogFileList',
    })
  },
  onLogGradePickerChange(e: WechatMiniprogram.CustomEvent) {
    Log.d(TAG, "onLogGradePickerChange", e.detail);
    const logGrade: number = Number.parseInt(e.detail.value)
    this.setData({ logGrade: e.detail.value })
    wx.setStorageSync("LogGrade", logGrade)
    Log.level = (logGrade)
  },
  // 开发调试
  onEnableDebug: function (e: any) {
    const enableDebug = e.detail.value
    wx.setStorageSync("IsEnableDebug", enableDebug)
    setTimeout(() => {
      wx.setEnableDebug({ enableDebug: enableDebug })
    }, 100);
  },
  // BLE通讯配置
  onBLEDataSetting: function () {
    wx.navigateTo({
      url: '/pages/pageSetting/pageBLEDataSet/pageBLEDataSet',
    })
  },
  onTimesSelectTestNumber: function (e: any) {
    Log.d(TAG, "测试次数：" + e.detail)
    var num = e.detail;
    if (e.detail == 0) num = 1;

    this.setData({
      mTestNum: num,
      isTimesView: !this.data.isTimesView
    })
    this._saveSettings()
  },
  onTimesSelectMTU: function (e: any) {
    Log.d(TAG, "MTU：" + e.detail)
    this.setData({
      mMtuNum: e.detail,
      isTimesView: !this.data.isTimesView
    })
    app.globalData.gbMtuNum = e.detail
    wx.setStorageSync("MtuNum", e.detail)
    this._saveSettings()
  },
  onTimesSelectCancel: function (e: any) {
    Log.d(TAG, "取消" + e.detail)
    //测试次数
    if (e.detail == 0) {
      this.setData({
        mTestNum: this.data.mTestNum,
        isTimesView: !this.data.isTimesView
      })
    }
    //MTU设置
    if (e.detail == 1) {
      this.setData({
        mMtuNum: this.data.mMtuNum,
        isTimesView: !this.data.isTimesView
      })
    }
  },
  onTestCustomCmd() {
    wx.navigateTo({
      url: '/pages/pageSetting/pageCustomCmd/pageCustomCmd',
    })
  },
  onDevelopMode() {
    if (this.data.developMode) {
      wx.showToast({ title: "退出开发者模式" })
      if (this.data.isEnableDebug) {
        wx.setStorageSync("IsEnableDebug", false)
        setTimeout(() => {
          wx.setEnableDebug({ enableDebug: false })
        }, 100);
      }
      wx.setStorageSync("DevelopMode", false)
      this.setData({
        developMode: false,
        isEnableDebug: false,
      })
    } else {
      wx.showToast({ title: "进入开发者模式" })
      wx.setStorageSync("DevelopMode", true)
      this.setData({
        developMode: true
      })
    }
  },
  _saveSettings() {
    const configure = new BluetoothConfigure()
    configure.isUseAuth = this.data.isHandshake
    configure.changeMTU = this.data.mMtuNum
    //todo 目前未实现自动化测试OTA
    configure.isAutoTestOTA = false;
    configure.autoTestOTACount = 20;
    sBluetoothManager.setConfigure(configure)
  },
})