import { hexToBytes } from "../../../lib/util";
import { IAppOption } from "../../../../typings/index"
import { BluetoothOTAManager } from "../../../lib/bluetoothOTAManager"
import { OTAWrapperListenner } from "../../../lib/otaWrapper";
import { BTBean } from "../../../lib/bluetooth";
import { formatTime, string2buffer, byteArrayToHex } from "../../../utils/util";
import * as RCSPProtocol from "../../../lib/jl_lib/jl_rcsp_ota_2.1.1"
import { loge } from "../../../lib/log";
import { BleDataHandler } from "../../../lib/ble-data-handler";

// pages/pageSetting/pageCustomCmd/pageCustomCmd.ts
const app = getApp<IAppOption>()
var sBluetoothManager: BluetoothOTAManager
var sOTAWrapperListenner: OTAWrapperListenner
var sTargetDev: BTBean.BluetoothDevice | null
Page({

  /**
   * 页面的初始数据
   */
  data: {
    isShowSendDialog: false,
    // dataObj
    dataType: ['ByteArray', '文本'],
    dataObjArr: new Array(),//[{ dataType: 0, value: "4455" }, { dataType: 1, value: "天气" }]
    // 发送数据
    sendDataUpdateTime: "",
    sendDataHexStr: "",
    // 接收数据
    receiveDataUpdateTime: "",
    receiveDataHexStr: "",
  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad() {
    sBluetoothManager = app.globalData.bluetoothManager
    const cacheDataObjArrStr = wx.getStorageSync('CacheDataObjArr')
    if (cacheDataObjArrStr === "") {
      this.setData({
        dataObjArr: []
      })
    } else {
      this.setData({
        dataObjArr: cacheDataObjArrStr
      })
    }
    this.registerRcspCallback()
    let connectedDevices = sBluetoothManager.getConnectedDevice();
    if (connectedDevices != null && connectedDevices.length > 0) {
      sTargetDev = connectedDevices[0]
    } else {
      wx.showToast({ icon: 'none', title: "蓝牙未连接,请先连接蓝牙设备" })
    }
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    wx.setStorageSync('CacheDataObjArr', this.data.dataObjArr)
    this.unregisterRcspCallback()
  },
  /**
   * 发送自定义命令
   * */
  onSendData() {
    const dataObjArr = this.data.dataObjArr;
    let dataCacheArray = new Uint8Array()
    for (let index = 0; index < dataObjArr.length; index++) {//累加数据
      const element = dataObjArr[index];
      if (element.dataType == 0) {//byteArray
        if (element.value == undefined || (element.value.length % 2 != 0 || !this._isHexadecimal(element.value))) {//数据不合法
          wx.showToast({ title: "ByteArray类型数据不合法" })
          return
        } else {
          const tempBytes = hexToBytes(element.value)
          const tempUnit8Array = new Uint8Array(dataCacheArray.length + tempBytes.length)
          tempUnit8Array.set(dataCacheArray, 0)
          tempUnit8Array.set(tempBytes, dataCacheArray.length)
          dataCacheArray = tempUnit8Array
        }
      } else if (element.dataType == 1) {//文本类型
        if (element.value != undefined && element.value.length != 0) {
          const tempBytes = new Uint8Array(string2buffer(element.value))
          const tempUnit8Array = new Uint8Array(dataCacheArray.length + tempBytes.length)
          tempUnit8Array.set(dataCacheArray, 0)
          tempUnit8Array.set(tempBytes, dataCacheArray.length)
          dataCacheArray = tempUnit8Array
        }
      }
    }
    if (sTargetDev == null || !sBluetoothManager.isConnected(sTargetDev)) {
      wx.showToast({ title: "蓝牙未连接" })
      return
    }
    const commandCallback: RCSPProtocol.CommandCallback<RCSPProtocol.CmdCustom> = {
      onCmdResponse: (_device, command) => {
        if (command.getStatus() == RCSPProtocol.ResponseBase.STATUS_SUCCESS) {
          const response = command.getResponse()
          if (response != null) {
            const payload = response.getPayload()
            const receiveDataHexStr = byteArrayToHex(payload)
            loge("cmd response,payload:" + receiveDataHexStr)
          }
        }
      },
      onError: (_device, code, message) => {
        wx.showToast({ icon: 'none', title: "error，" + message })
        switch (code) {
          case RCSPProtocol.ErrorCode.ERROR_RESPONSE_TIMEOUT://命令超时

            break;
          default:
            break;
        }
        loge("cmd error,code:" + RCSPProtocol.toHexWithPrefix(code) + ",message:" + message)
      }
    }
    if (sBluetoothManager.sendCustomCmd(sTargetDev, dataCacheArray, commandCallback)) {
      const time = formatTime(new Date())
      const sendDataHexStr = byteArrayToHex(dataCacheArray)
      this.setData({
        sendDataUpdateTime: time,
        sendDataHexStr: sendDataHexStr,
        isShowSendDialog: false
      })
      wx.setStorageSync('CacheDataObjArr', this.data.dataObjArr)
    }
  },
  registerRcspCallback() {
    sOTAWrapperListenner = new OTAWrapperListenner()
    sOTAWrapperListenner.onConnectStateChange = (_device, _status) => {
      if (_status == RCSPProtocol.Connection.CONNECTION_DISCONNECT && (sTargetDev?.deviceId != undefined && _device?.deviceId === sTargetDev?.deviceId)) {
        wx.showToast({ title: "蓝牙已断开" })
      }
    }
    sOTAWrapperListenner.onRcspCommand = (device, command) => {
      if (device != null && device.deviceId === sTargetDev?.deviceId) {//是否为同一个设备
        switch (command.getOpCode()) {
          case RCSPProtocol.CmdOpCodeBase.CMD_EXTRA_CUSTOM://自定义命令
            const cmdCustom = command as RCSPProtocol.CmdCustom
            const paramCustom = cmdCustom.getParam()
            if (paramCustom != null) {
              const payload = paramCustom.getData()
              const receiveDataHexStr = byteArrayToHex(payload)
              const time = formatTime(new Date())
              loge("设备->手机,推送自定义命令，payload:" + receiveDataHexStr)
              this.setData({
                receiveDataUpdateTime: time,
                receiveDataHexStr: receiveDataHexStr
              })
            }
            break;
        }
      }
    }
    sOTAWrapperListenner.onRcspResponse = (device, command) => {
      if (device != null && device.deviceId === sTargetDev?.deviceId) {//是否为同一个设备
        switch (command.getOpCode()) {
          case RCSPProtocol.CmdOpCodeBase.CMD_EXTRA_CUSTOM://自定义命令回复
            const cmdCustom = command as RCSPProtocol.CmdCustom
            const responseCustom = cmdCustom.getResponse()
            if (responseCustom != null) {
              const payload = responseCustom.getPayload()
              const receiveDataHexStr = byteArrayToHex(payload)
              const time = formatTime(new Date())
              loge("设备->手机,回复自定义命令，payload:" + receiveDataHexStr)
              this.setData({
                receiveDataUpdateTime: time,
                receiveDataHexStr: receiveDataHexStr
              })
            }
            break;
        }
      }
    }
    sBluetoothManager.registerRcspCallback(sOTAWrapperListenner)
  },
  unregisterRcspCallback() {
    sBluetoothManager.unregisterRcspCallback(sOTAWrapperListenner)
  },
  onShowSendDialog() {
    this.setData({
      isShowSendDialog: true
    })
  },
  onHideSendDialog() {
    this.setData({
      isShowSendDialog: false
    })
    wx.setStorageSync('CacheDataObjArr', this.data.dataObjArr)
  },
  onInputDataObj(e: WechatMiniprogram.CustomEvent) {
    const tempArr = this.data.dataObjArr
    const index = e.currentTarget.dataset.index
    const tempDataObj = tempArr[index]
    tempDataObj.value = e.detail.value
    this.setData({ dataObjArr: tempArr })
  },
  onDataObTypePickerChange(e: WechatMiniprogram.CustomEvent) {
    const tempArr = this.data.dataObjArr
    const index = e.currentTarget.dataset.index
    const tempDataObj = tempArr[index]
    tempDataObj.dataType = e.detail.value
    this.setData({ dataObjArr: tempArr })
  },
  onDeleteDataObj(e: WechatMiniprogram.CustomEvent) {
    const tempArr = this.data.dataObjArr
    const index = e.currentTarget.dataset.index
    tempArr.splice(index, 1)
    this.setData({ dataObjArr: tempArr })
  },
  onAddDataType() {
    const tempList = this.data.dataObjArr;
    tempList.push({ dataType: 0, value: undefined })
    this.setData({
      dataObjArr: tempList
    })
  },
  _isHexadecimal(str: string) {
    const regex = /^[0-9A-Fa-f]+$/;
    return regex.test(str);
  }
})