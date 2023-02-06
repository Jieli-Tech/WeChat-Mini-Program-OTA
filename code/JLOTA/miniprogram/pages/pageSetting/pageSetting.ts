// pages/pageSetting/pageSetting.ts

import { IAppOption } from "../../../typings/index"
import { BluetoothConfigure, BluetoothManager } from "../../lib/bluetoothManager"


const app = getApp<IAppOption>()
const sBluetoothManager: BluetoothManager = app.globalData.bluetoothManager

Page({

  /**
   * 页面的初始数据
   */
  data: {
    isTimesView: false,
    mStatusTimesView: 0,//0:测试数量弹窗 1:MTU弹窗
    isHandshake: true,//是否需要认证
    isAutoTest: false,
    mTestNum: 1,
    mMtuNum: 23,
    mPlatform: 'android',
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad() {
    this.setData({
      isHandshake: app.globalData.gbIsHandshake,
      isAutoTest: app.globalData.gbIsAutoTest,
      mTestNum: app.globalData.gbTestNum,
      mMtuNum: app.globalData.gbMtuNum
    })
    //'ios' | 'android' | 'windows' | 'mac'
    const sysinfo = wx.getSystemInfoSync()
    this.setData({
      mPlatform: sysinfo.platform
    })
  },
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 2
      })
    }
  },
  onIsHandshakeDevice(e: any) {
    console.log("认证设备：" + e.detail.value)
    const isHandshake = e.detail.value
    this.setData({
      isHandshake: isHandshake
    })
    app.globalData.gbIsHandshake = isHandshake;
    wx.setStorageSync("IsHandshake",isHandshake)
    this._saveSettings()
  },
  onIsAutoTestDevice(e: any) {
    console.log("自动化测试：" + e.detail.value)
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
    wx.setStorageSync("IsAutoTest",isAutoTest)
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


  onShowLogFileView: function () {
    //展示log界面
    wx.navigateTo({
      url: '/pages/logs/logs',
    })
  },



  onTimesSelectTestNumber: function (e: any) {
    console.log("测试次数：" + e.detail)
    var num = e.detail;
    if (e.detail == 0) num = 1;

    this.setData({
      mTestNum: num,
      isTimesView: !this.data.isTimesView
    })
    this._saveSettings()
  },
  onTimesSelectMTU: function (e: any) {
    console.log("MTU：" + e.detail)
    this.setData({
      mMtuNum: e.detail,
      isTimesView: !this.data.isTimesView
    })
    app.globalData.gbMtuNum = e.detail
    wx.setStorageSync("MtuNum",e.detail)
    this._saveSettings()
  },
  onTimesSelectCancel: function (e: any) {
    console.log("取消" + e.detail)
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