import { IAppOption } from "../../../typings/index"
import { BluetoothEventCallback, BluetoothManager } from "../../lib/bluetoothManager"

// pages/pageConnect/pageConnect.ts
const app = getApp<IAppOption>()
var sBluetoothManager: BluetoothManager
var sBluetoothEventCallback: BluetoothEventCallback

Page({

  /**
   * 页面的初始数据
   */
  data: {
    hiddenmodalput: true,
    triggerde: true,
    Isfreshing: false,
    connectedDevice: <any>null,
    deviceList: <any>[
      {id:0,name:"device 1", status:0},
      {id:1,name:"device 2", status:0},
      {id:2,name:"device 3", status:1}
    ],
    nameText:""
  },
  
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad() {
    sBluetoothManager = app.globalData.bluetoothManager
    sBluetoothEventCallback = new BluetoothEventCallback();
    sBluetoothEventCallback.onFoundDev = this._OnFoundDevs
    sBluetoothEventCallback.onDevStatusSuccess = this._onDevConnectSuccess
    sBluetoothEventCallback.onDevStatusDisconnect = this._onDevDisconnect
    sBluetoothEventCallback.onDevStatusFailed = this._onDevConnectFailed
    sBluetoothManager.addBluetoothEventCallback(sBluetoothEventCallback)
    this._scanDevice()
  },
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 0
      })
    }
  },
  onUnload() {
    sBluetoothManager.removeBluetoothEventCallback(sBluetoothEventCallback)
  },
  onFilterContent: function (e: any) {
    console.log(e)
    this.setData({
      hiddenmodalput: !this.data.hiddenmodalput
    })
  },

  onSelectedDevice: function (e: any) {
    console.log(e.target.dataset.index)
    // if (e.target.dataset.index >= 0) {
    //   wx.showToast({
    //     title: 'Click ' + e.target.dataset.index,
    //     icon: 'none'
    //   })
    let device = e.currentTarget.dataset.item;
      let connectedDevice = sBluetoothManager.getConnectedDevice();
      if (connectedDevice != null) {
        if (device.deviceId !== connectedDevice.deviceId) {
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
                sBluetoothManager.disconnectDevice()
              } else if (res.cancel) {
                console.log('用户点击取消')
              }
            }
          })
        }
      } else {
        if (sBluetoothManager.connectDevice(device, false)) {
          wx.showLoading({
            title: '连接中',
          })
        } else {
          wx.showModal({
            title: '提示',
            content: "请不要频繁断开连接设备",
            showCancel:true
          });
        }
      }
    // }
  },

  onScrollviewRefresh() {

    if (this.data.Isfreshing) return;
    this.setData({
      Isfreshing: true
    })
    if (!this.data.triggerde) {
      this.setData({
        triggerde: true
      })
    }//保证刷新状态下，triggered为true  

    console.log("搜索设备...")
    this._scanDevice()


    setTimeout(() => {
      console.log("超时处理")
      this.setData({
        triggerde: false,//触发onRestore，关闭刷新图标  
        Isfreshing: false
      })
    }, 1500);
  },

  //取消按钮
  onCancel: function () {
    this.setData({
      hiddenmodalput: true,
      modalContent: ""
    });
  },
  //确认
  onConfirm: function () {
    this.setData({
      hiddenmodalput: true,
      modalContent: ""
    })
  },
  onInput: function (e: any) {
    console.log("打卡内容：" + e.detail.value)
    this.setData({
      nameText:e.detail.value
    })
    this._scanDevice()
  },
  _scanDevice() {
    //Android平台检测是否有开启位置权限，
    let info = wx.getSystemInfoSync()
    console.error(info)
    //检测是否有位置权限
    if (info.platform == "android" && !info.locationAuthorized) {
      wx.showToast({
        title: '请授予微信位置权限(GPS)',
        icon: 'none'
      })
      return
    }
    //检测是否打开gps位置开关
    if (info.platform == "android" && !info.locationEnabled) {
      wx.showToast({
        title: '请打开位置信息(GPS)',
        icon: 'none'
      })
      return
    }
    sBluetoothManager.sanDevice();
  },
  _OnFoundDevs(devices: WechatMiniprogram.BlueToothDevice[]) {
    let devicesTemp: WechatMiniprogram.BlueToothDevice[] = new Array(devices.length + 1);
    let isContainConnected: boolean = false
    let isConnected = sBluetoothManager.isConnected()
    if (isConnected) {
      let connectedDevice = sBluetoothManager.getConnectedDevice()!;
      devicesTemp[0] = connectedDevice;
      for (let index = 0; index < devices.length; index++) {
        devicesTemp[index + 1] = devices[index]
        if (connectedDevice.deviceId == devices[index].deviceId) {
          isContainConnected = true
        }
      }
    }

    var devicesShow = new Array();

    if (!isContainConnected && isConnected) {
      if (this.data.nameText.length > 0) {
        for(let i = 0; i < devicesTemp.length; i++){
          let tmp = devicesTemp[i]
          let upName = tmp.name.toUpperCase()
          let upNameText = this.data.nameText.toUpperCase()
          if (upName.indexOf(upNameText)>=0) {
              devicesShow.push(tmp)
          }
        }
        this.setData({
          deviceList: devicesShow
        })
      }else{
        this.setData({
          deviceList: devicesTemp
        })
      }
    } else {
      if (this.data.nameText.length > 0) {
        for(let i = 0; i < devices.length; i++){
          let tmp = devices[i]
          let upName = tmp.name.toUpperCase()
          let upNameText = this.data.nameText.toUpperCase()
          if (upName.indexOf(upNameText)>=0) {
              devicesShow.push(tmp)
          }
        }
        this.setData({
          deviceList: devicesShow
        })
      }else{
        this.setData({
          deviceList: devices
        })
      }
    }
  },
  _onDevDisconnect: function (result: WechatMiniprogram.BlueToothDevice) {
    this.setData({
      connectedDevice: null
    })
  },
  _onDevConnectFailed: function (result: WechatMiniprogram.BlueToothDevice) {
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
  _onDevConnectSuccess: function (device: WechatMiniprogram.BlueToothDevice) {
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