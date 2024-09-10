// pages/pageSetting/pageBLEDataSet/pageBLEDataSet.ts
import { IAppOption } from "../../../../typings/index"
const app = getApp<IAppOption>()

Page({

  /**
   * 页面的初始数据
   */
  data: {
    serviceUUID: "0000ae00-0000-1000-8000-00805f9b34fb",
    notifyCharacteristicUUID: "0000ae00-0000-1000-8000-00805f9b34fb",
    writeCharacteristicUUID: "0000ae00-0000-1000-8000-00805f9b34fb"
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad() {
    const configure = app.globalData.bluetoothManager.getConfigure()
    this.setData({
      serviceUUID: configure.serviceUUID,
      notifyCharacteristicUUID: configure.notifyCharacteristicUUID,
      writeCharacteristicUUID: configure.writeCharacteristicUUID
    })
  },
  onEditService() {
    wx.showModal({
      title: "Service",
      content: this.data.serviceUUID,
      editable: true,
      success: (res) => {
        if (res.confirm) {
          const isValid = this._isValidBluetoothUUID(res.content)
          if (!isValid) {
            wx.showToast({ title: "uuid格式错误", icon: 'error' })
          } else {
            // wx.showToast({ title: "修改成功，请重新连接设备", icon: 'success' })
            this.setData({
              serviceUUID: res.content
            })
          }
        }
      }
    })
  },
  onEditNotifyCharacteristic() {
    wx.showModal({
      title: "Notify Characteristic",
      content: this.data.notifyCharacteristicUUID,
      editable: true,
      success: (res) => {
        if (res.confirm) {
          const isValid = this._isValidBluetoothUUID(res.content)
          if (!isValid) {
            wx.showToast({ title: "uuid格式错误", icon: 'error' })
          } else {
            // wx.showToast({ title: "修改成功，请重新连接设备", icon: 'success' })
            this.setData({
              notifyCharacteristicUUID: res.content
            })
          }
        }
      }
    })
  },
  onEditWriteCharacteristic() {
    wx.showModal({
      title: "Write Characteristic",
      content: this.data.writeCharacteristicUUID,
      editable: true,
      success: (res) => {
        if (res.confirm) {
          const isValid = this._isValidBluetoothUUID(res.content)
          if (!isValid) {
            wx.showToast({ title: "uuid格式错误", icon: 'error' })
          } else {
            // wx.showToast({ title: "修改成功，请重新连接设备", icon: 'success' })
            this.setData({
              writeCharacteristicUUID: res.content
            })
          }
        }
      }
    })
  },
  onSave() {
    wx.showToast({ title: "修改成功，请断开设备后重新连接", icon: 'success' })
    wx.setStorageSync("ServiceUUID", this.data.serviceUUID)
    wx.setStorageSync("NotifyCharacteristicUUID", this.data.notifyCharacteristicUUID)
    wx.setStorageSync("WriteCharacteristicUUID", this.data.writeCharacteristicUUID)
    const configure = app.globalData.bluetoothManager.getConfigure()
    configure.serviceUUID = this.data.serviceUUID
    configure.writeCharacteristicUUID = this.data.writeCharacteristicUUID
    configure.notifyCharacteristicUUID = this.data.notifyCharacteristicUUID
    app.globalData.bluetoothManager.setConfigure(configure)
  },
  _isValidBluetoothUUID(uuidStr: string) {
    const uuid = uuidStr.toLocaleUpperCase()
    const regex16 = /^[0-9A-F]{4}$/;
    const regex32 = /^[0-9A-F]{8}$/;
    const regex128 = /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/;
    return regex16.test(uuid) || regex32.test(uuid) || regex128.test(uuid);
  }
})