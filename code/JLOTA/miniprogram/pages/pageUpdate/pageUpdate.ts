// pages/pageUpdate/pageUpdate.ts

import { IAppOption } from "../../../typings/index"
import { BTBean } from "../../lib/bluetooth"
import { BluetoothEventCallback, BluetoothOTAManager } from "../../lib/bluetoothOTAManager"
import { OTAConfig, ReConnectMsg, UpgradeType } from "../../lib/jl_lib/jl_ota_2.1.1"
import { loge, logv } from "../../lib/log"
import { UpgradeFileUtil } from "../../lib/upgradeFileUtil"

const app = getApp<IAppOption>()
var sBluetoothManager: BluetoothOTAManager

Page({

  /**
   * 页面的初始数据 
   */
  data: {
    isBleConnect: false,
    fileArray: new Array(),
    fileIndex: -1,

    fileSize: 0,
    showOta: false,

    isShowProgress: false,     //展示OTA升级界面
    mValue: 0,                 //进度 0-100
    mOtaFile: "otaUpdate.ufw", //OTA文件名
    mFailReason: "ota Fail",   //失败原因 
    mOtaResult: 0,             //0:成功 1:失败
    mStatus: 0,                 //0:检验中 1:升级中 2:回连设备 3:升级成功 4:升级失败

    isShowLoading: false,
    mLoadingText: "加载升级文件"
  },
  upgradeData: new Uint8Array(0),

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad() {
    sBluetoothManager = app.globalData.bluetoothManager
    const bluetoothEventCallback = new BluetoothEventCallback();
    /** 设备断开 */
    bluetoothEventCallback.onDevStatusDisconnect = (dev: BTBean.BluetoothDevice) => {
      this._checkIsConnected()
    };
    /** 设备连接失败 */
    bluetoothEventCallback.onDevStatusFailed = (dev: BTBean.BluetoothDevice) => {
      this._checkIsConnected()
    };
    /** 设备连接成功*/
    bluetoothEventCallback.onDevStatusSuccess = (dev: BTBean.BluetoothDevice) => {
      this._checkIsConnected()
    };
    sBluetoothManager.addBluetoothEventCallback(bluetoothEventCallback)
    this._onUpgradeFileInfoList(UpgradeFileUtil.getUpgradeFileInfos())
    UpgradeFileUtil.setListener({
      onUpgradeFileInfoList: (infoList: any[]) => {
        this._onUpgradeFileInfoList(infoList)
      }
    })
  },
  onShow() {
    this._checkIsConnected()
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 1,
        // enable:false //todo 暂时性处理，应该让弹窗遮罩罩住整个小程序的
      })
      this.getTabBar
    }
  },

  showLoadingView: function () {
    this.setData({
      isShowLoading: true
    })
  },

  dismissLoadingView: function () {
    this.setData({
      isShowLoading: false
    })
  },

  onAddOTAFile: function () {
    logv("读取文件...")
    wx.chooseMessageFile({
      count: 10,
      type: 'file',
      success: res => {
        const addFileArray = res.tempFiles
        if (addFileArray.length > 1) {//多个文件跳过重命名
          const infos = new Array()
          for (let index = 0; index < addFileArray.length; index++) {
            const element = addFileArray[index];
            infos.push({ fileName: element.name, fileSrcPath: element.path, fileSize: element.size })
          }
          UpgradeFileUtil.addUpgradeFiles(infos).then((res)=>{
            wx.showToast({
              title: '导入成功',
              icon: 'success'
            })
          }).catch((error) => {
            if (error == 1300202) {
              wx.showToast({
                title: '导入失败，小程序剩余使用空间不足(上限200MB)',
                icon: 'none'
              })
            }
          })
        } else if (addFileArray.length == 1) {//单个文件重命名
          const file = addFileArray[0]
          wx.showModal({
            title: "请输入文件名",
            content: file.name,
            editable: true,
            success: (res) => {
              if (res.confirm == true) {
                UpgradeFileUtil.addUpgradeFile(res.content, file.path, file.size).then((res) => {
                  wx.showToast({
                    title: '导入成功',
                    icon: 'success'
                  })
                }).catch((error) => {
                  if (error == 1300202) {
                    wx.showToast({
                      title: '导入失败，小程序剩余使用空间不足(上限200MB)',
                      icon: 'none'
                    })
                  }
                })
              } else if (res.cancel == true) {
                wx.showToast({
                  title: '取消保存',
                  icon: 'none'
                })
              }
            }
          })
        }
      },
      fail: e => {
        loge(e)
        this.dismissLoadingView()
        wx.hideLoading({
          success: () => {
            wx.showToast({
              title: '数据错误',
              icon: 'none'
            })
          },
        })
      }
    })
  },
  onLongTapFile(e: WechatMiniprogram.CustomEvent) {
    const index = e.currentTarget.dataset.index
    wx.showActionSheet({
      itemList: ['删除文件', '转发文件到聊天'],
      success: (res) => {
        const file = this.data.fileArray[index]
        if (res.tapIndex === 0) {
          if (this.data.fileIndex == index) {
            this.setData({
              fileIndex: -1,
              mOtaFile: "",
            })
          }
          UpgradeFileUtil.removeUpgradeFile(file)
        } else if (res.tapIndex === 1) {
          wx.shareFileMessage({
            filePath: file.filePath,
            fileName: file.fileName,
            success: (res) => {
              // wx.showToast({ title: "转发成功" })
            }, fail: (res) => {
              wx.showToast({ title: "转发失败,msg:" + res.errMsg })
            }
          })
        }
      }
    })
  },
  onSelectedFile: function (e: any) {
    if (this.data.fileIndex == e.currentTarget.dataset.index) {
      this.setData({
        fileIndex: -1,
        mOtaFile: "",
      })
      return;
    }
    const selectedFile = this.data.fileArray[e.currentTarget.dataset.index]
    this.showLoadingView()
    const fs = wx.getFileSystemManager()
    try {
      const fd = fs.openSync({
        filePath: selectedFile.filePath
      })
      const uint8 = new Uint8Array(selectedFile.fileSize);
      fs.read({
        fd: fd,
        arrayBuffer: uint8.buffer,
        length: selectedFile.fileSize,
        success: _res => {
          this.upgradeData = uint8
          logv("------------读取文件成功------------")
          setTimeout(() => {
            this.dismissLoadingView()
            wx.showToast({
              title: '加载成功',
              icon: 'none'
            })
          }, 200);
          fs.closeSync({ fd: fd })
        },
        fail: _res => {
          this.dismissLoadingView()
          wx.showToast({
            title: '加载失败',
            icon: 'none'
          })
          fs.closeSync({ fd: fd })
        }
      })
    } catch (error) {
      this.dismissLoadingView()
      wx.showToast({
        title: '文件丢失',
        icon: 'none'
      })
      if (this.data.fileIndex == e.currentTarget.dataset.index) {
        this.setData({
          fileIndex: -1,
          mOtaFile: "",
        })
      }
      UpgradeFileUtil.removeUpgradeFile(selectedFile)
      logv("error", error);
      return
    }


    this.setData({
      fileIndex: e.currentTarget.dataset.index,
      mOtaFile: selectedFile.fileName,
    })
  },
  onUpdate: function () {
    if (!this.data.isBleConnect) {
      wx.showToast({
        title: '请先连接的设备',
        icon: 'none'
      })
      return;
    }
    if (this.data.fileIndex == -1) {
      wx.showToast({
        title: '请先选择升级文件',
        icon: 'none'
      })
      return;
    }
    this.setData({
      isShowProgress: true
    })

    /*--- 开始执行OTA升级 ---*/
    const otaConfig: OTAConfig = new OTAConfig()
    otaConfig.isSupportNewRebootWay = true
    otaConfig.updateFileData = this.upgradeData
    logv("upgradeData size: " + this.upgradeData.length);
    const connectedDevices = sBluetoothManager.getConnectedDevice()
    if (connectedDevices != null && connectedDevices.length > 0) {
      const otaDev = connectedDevices[0]
      sBluetoothManager.startOTA(otaDev, otaConfig, {
        onStartOTA: () => {
          this.setData({
            isShowProgress: true,
            mStatus: 0
          })
          setTimeout(() => {
            if (typeof this.getTabBar === 'function' && this.getTabBar()) {
              this.getTabBar().setData({
                enable: false //todo 暂时性处理，应该让弹窗遮罩罩住整个小程序的
              })
            }
          }, 100);
        },
        onNeedReconnect: (reConnectMsg: ReConnectMsg) => {
          this.setData({
            mValue: 0,
            mStatus: 2
          })
        },
        onProgress: (type: UpgradeType, progress: number) => {
          if (type == UpgradeType.UPGRADE_TYPE_CHECK_FILE) {
            this.setData({
              mValue: progress,
              mStatus: 0
            })
          }
          if (type == UpgradeType.UPGRADE_TYPE_FIRMWARE) {
            this.setData({
              mValue: progress,
              mStatus: 1
            })
          }
        },
        onStopOTA: () => {
          if (typeof this.getTabBar === 'function' && this.getTabBar()) {
            this.getTabBar().setData({
              enable: true //todo 暂时性处理，应该让弹窗遮罩罩住整个小程序的
            })
          }
          this.setData({
            mValue: 0,
            mOtaResult: 0,
            mStatus: 3
          })
        },
        onCancelOTA: () => {
          if (typeof this.getTabBar === 'function' && this.getTabBar()) {
            this.getTabBar().setData({
              enable: true //todo 暂时性处理，应该让弹窗遮罩罩住整个小程序的
            })
          }
          this.setData({
            mValue: 0,
            mOtaResult: 1,
            mStatus: 4,
            mFailReason: "升级被取消."
          })
        },
        onError: (error: number, message: string) => {
          if (typeof this.getTabBar === 'function' && this.getTabBar()) {
            this.getTabBar().setData({
              enable: true //todo 暂时性处理，应该让弹窗遮罩罩住整个小程序的
            })
          }
          this.setData({
            mValue: 0,
            mOtaResult: 1,
            mStatus: 4,
            mFailReason: message
          })
        },
      })
    }
  },
  onOtaProgressViewConfirm: function () {
    this.setData({
      isShowProgress: false
    })
  },
  _onUpgradeFileInfoList(infoList: any[]) {
    const tempList = infoList.reverse()
    tempList.forEach(element => {
      element.date = this._formatTime(new Date(element.time))
      element.fileSizeStr = (element.fileSize / (1024 * 1024)).toFixed(2)
    });
    this.setData({ fileArray: tempList })
  },
  _checkIsConnected() {
    var isConnected = false
    const connectedDevices = sBluetoothManager.getConnectedDevice()
    if (connectedDevices != null && connectedDevices.length > 0) {
      isConnected = true
    }
    this.setData({
      isBleConnect: isConnected
    })
  },
  _formatTime(date: Date) {
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hour = date.getHours()
    const minute = date.getMinutes()
    const second = date.getSeconds()
    return (
      [year, month, day].map(this._formatNumber).join('/') +
      ' ' +
      [hour, minute, second].map(this._formatNumber).join(':')
    )
  },
  _formatNumber(n: number) {
    const s = n.toString()
    return s[1] ? s : '0' + s
  }
})