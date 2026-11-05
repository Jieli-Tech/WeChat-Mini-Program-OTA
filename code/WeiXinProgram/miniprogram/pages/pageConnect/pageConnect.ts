import { IAppOption } from "../../../typings/index"
import { BTBean, BTAdapter } from "../../lib/bluetooth"
import { BluetoothEventCallback, BluetoothOTAManager } from "../../lib/bluetoothOTAManager"
import { BluetoothInstance } from "../../lib/bluetoothUI"
import { JL_OTA } from "../../lib/lib_rcsp"

// pages/pageConnect/pageConnect.ts
const app = getApp<IAppOption>()
var sBluetoothManager: BluetoothOTAManager
var sBluetoothEventCallback: BluetoothEventCallback

Page({

  /**
   * 页面的初始数据
   */
  data: {
    isScaning: false,
    triggered: false,
    filterDevName: '',
    connectedDevice: <any>null,
    scanDevices: <any>[],
  },
  _freshing: false,
  _isShow: false,
  _foundSrcDevlist: new Array(),
  _OtaWrapperListener: <JL_OTA.OTAWrapperListener | undefined>undefined,
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad() {
    const value = wx.getStorageSync('filterDevName')
    if (value) {
      this.setData({ filterDevName: value })
    }
    sBluetoothManager = app.globalData.bluetoothManager
    sBluetoothEventCallback = new BluetoothEventCallback();
    sBluetoothEventCallback.onBluetoothAdapter = this._onBluetoothAdapter
    sBluetoothEventCallback.onLocation = this._onLocation
    sBluetoothEventCallback.onScanStart = this._onScanStart
    sBluetoothEventCallback.onScanFailed = this._onScanFailed
    sBluetoothEventCallback.onScanFinish = this._onScanFinish
    sBluetoothEventCallback.onFoundDev = this._OnFoundDevs
    sBluetoothEventCallback.onDevStatusSuccess = this._onDevConnectSuccess
    sBluetoothEventCallback.onDevStatusDisconnect = this._onDevDisconnect
    sBluetoothEventCallback.onDevStatusFailed = this._onDevConnectFailed
    sBluetoothManager.addBluetoothEventCallback(sBluetoothEventCallback)
    this._OtaWrapperListener = new JL_OTA.OTAWrapperListener()
    this._OtaWrapperListener.onRcspInit = (_device, _isInit) => {
      if (_isInit && !sBluetoothManager.isOTAing()) {
        wx.showToast({
          title: '设备初始化成功',
          icon: 'success'
        })
      }
    }
    this._OtaWrapperListener.onMandatoryUpgrade = (_device)=>{
      if (_device!= null && !sBluetoothManager.isOTAing()) {
        if (!this._isShow) {
          return
        }
        wx.switchTab({
          url: "/pages/pageUpdate/pageUpdate", success: () => {
            wx.showToast({
              title: "设备需要强制升级",
              icon: "error",
              duration: 1500
            })
          }
        })
      }
    }
    sBluetoothManager.registerRcspCallback(this._OtaWrapperListener)
    // this._scanDevice()
    const isHasPermission = wx.getStorageSync<boolean>("IsHasPermission")//扫描成功，认为有权限（之前使用过该功能）
    if (isHasPermission) {
      sBluetoothManager.sanDevice()
    }
  },
  onShow() {
    this._isShow = true
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 0
      })
    }
  },
  onHide() {
    this._isShow = false
  },
  onUnload() {
    sBluetoothManager.removeBluetoothEventCallback(sBluetoothEventCallback)
    if (this._OtaWrapperListener) {
      sBluetoothManager.unregisterRcspCallback(this._OtaWrapperListener)
      this._OtaWrapperListener = undefined
    }
  },
  onSelectedDevice: function (e: any) {
    let device = e.currentTarget.dataset.item;
    let connectedDevices = sBluetoothManager.getConnectedDevice();
    if (connectedDevices != null && connectedDevices.length > 0) {//已连接设备
      if (!sBluetoothManager.isConnected(device)) {
        wx.showToast({
          title: '请先断开已连接的设备',
          icon: 'none'
        })
        return;
      } else {
        wx.showModal({
          title: '提示',
          content: '是否要断开该设备',
          success(res) {
            if (res.confirm) {
              sBluetoothManager.disconnectDevice(device)
            }
          }
        })
      }
    } else {
      wx.showLoading({
        title: '连接中',
        mask: true
      })
      sBluetoothManager.connectDevice(device)
    }
  },
  onPulling() {
  },
  onRestore() {
  },
  onRefresh() {
    if (this._freshing) return;
    this._freshing = true
    if (!this.data.triggered) {
      this.setData({
        triggered: true
      })
    }//保证刷新状态下，triggered为true  
    sBluetoothManager.sanDevice();
    setTimeout(() => {
      this.setData({
        triggered: false,//触发onRestore，关闭刷新图标  
      })
      this._freshing = false
    }, 1500);
  },
  onSetFilter() {
    wx.showModal({
      title: "设备过滤条件",
      editable: true,
      content: this.data.filterDevName,
      success: (res) => {
        if (res.confirm) {
          this.setData({
            filterDevName: res.content
          })
          this._filterDevName(this._foundSrcDevlist)
          wx.setStorageSync('filterDevName', res.content)
        } else if (res.cancel) {

        }
      }
    })
  },
  onShareAppMessage() {
    return {
      title: '杰理OTA升级',
      path: '/pages/pageConnect/pageConnect',
    }
  },
  _onBluetoothAdapter(_availableBluetooth: boolean, _btAdapterInfo?: BTAdapter.BTAdapterInfo) {
  },
  _onLocation(_availableLocation: boolean, _locationAdapterInfo?: BTAdapter.LocationAdapterInfo) {
  },
  _onScanStart() {
    wx.setStorageSync("IsHasPermission", true)//扫描成功，认为有权限
    this.setData({ isScaning: true })
  },
  _onScanFailed(_err: BTBean.BluetoothError) {
    this.setData({ isScaning: false })
  },
  _onScanFinish() {
    this.setData({ isScaning: false })
  },
  lastUpDateTime: 0,
  _OnFoundDevs(devices: BTBean.BluetoothDevice[]) {
    const time = new Date().getTime()
    if (time - this.lastUpDateTime < 750) {
      return
    }
    this.lastUpDateTime = time
    let devicesTemp: BTBean.BluetoothDevice[];
    devicesTemp = devices.sort(function (a, b) { return b.RSSI - a.RSSI })
    this._foundSrcDevlist = devicesTemp
    this._filterDevName(this._foundSrcDevlist)
  },
  _filterDevName(devs: BTBean.BluetoothDevice[]) {
    const filterDevName = this.data.filterDevName.toLowerCase()
    const tempList = new Array()
    const connectedDevices = sBluetoothManager.getConnectedDevice();
    if (connectedDevices != null) {
      connectedDevices.forEach(element => {
        if (element.name && element.name.toLowerCase().includes(filterDevName)) {
          tempList.push(element)
        }
      })
    }
    devs.forEach(e => {
      const devName = e.name?.toLowerCase()
      const isConnected = sBluetoothManager.isConnected(e.deviceId)//connectedDevices != null && connectedDevices.deviceId === e.deviceId
      if (e.RSSI <= 0 && devName && devName.includes(filterDevName) && !isConnected) {
        tempList.push(e)
      }
    })
    this.setData({ scanDevices: tempList })
  },
  _onDevDisconnect: function (result: BTBean.BluetoothDevice) {
    this.setData({
      connectedDevice: null
    })
  },
  _onDevConnectFailed: function (result: BTBean.BluetoothDevice) {
    this.setData({
      connectedDevice: null
    })
    wx.hideLoading({
      success: () => {
        wx.showToast({
          title: '连接失败',
          icon: 'none'
        })
      },
    })
  },
  _onDevConnectSuccess: function (device: BTBean.BluetoothDevice) {
    this.setData({
      connectedDevice: device
    })
    wx.hideLoading({
      success: () => {
        wx.showToast({
          title: '连接成功',
          icon: 'none'
        })
      },
    })
  },
})