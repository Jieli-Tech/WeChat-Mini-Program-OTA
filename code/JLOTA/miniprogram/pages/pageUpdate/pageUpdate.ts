// pages/pageUpdate/pageUpdate.ts

import { IAppOption } from "../../../typings/index"
import { BluetoothEventCallback, BluetoothManager } from "../../lib/bluetoothManager"
import { OTAConfig, ReConnectMsg, UpgradeType } from "../../lib/rcsp-protocol/jl-ota/jl_ota_2.0.0"

const app = getApp<IAppOption>()
var sBluetoothManager: BluetoothManager

Page({

  /**
   * 页面的初始数据
   */
  data: {
    isBleConnect:false,

    fileArray:<any>[],
    fileIndex:-1,
    // fileInfo :{id:0,fileItem:<any>null,crc:<any>null},

    fileOTA: <any>null,
    fileSize: 0,
    fileCrc: 0,
    showOta: false,

    isShowProgress:false,     //展示OTA升级界面
    mValue:0,                 //进度 0-100
    mNumber:0,                //完成次数
    mTimes:0,                 //测试总次数
    mOtaFile:"otaUpdate.ufw", //OTA文件名
    mFailReason:"ota Fail",   //失败原因 
    mOtaResult:0,             //0:成功 1:失败
    mStatus:0,                 //0:检验中 1:升级中 2:回连设备 3:升级成功 4:升级失败

    isShowLoading:false,
    mLoadingText:"加载升级文件"
  },
  upgradeData: new Uint8Array(0),

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad() {
    sBluetoothManager = app.globalData.bluetoothManager
    const bluetoothEventCallback = new BluetoothEventCallback();
      /** 设备断开 */
    bluetoothEventCallback.onDevStatusDisconnect = (dev: WechatMiniprogram.BlueToothDevice)=> { 
      this.setData({
        isBleConnect:false
      })
    };
    /** 设备连接失败 */
    bluetoothEventCallback.onDevStatusFailed = (dev: WechatMiniprogram.BlueToothDevice)=> {
      this.setData({
        isBleConnect:false
      })
     };
    /** 设备连接成功*/
    bluetoothEventCallback.onDevStatusSuccess = (dev: WechatMiniprogram.BlueToothDevice)=> {
      this.setData({
        isBleConnect:true
      })
     };
    sBluetoothManager.addBluetoothEventCallback(bluetoothEventCallback)
  },
  onShow(){
    var vl = sBluetoothManager.isConnected()
    this.setData({
      isBleConnect:vl
    })
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 1,
        // enable:false //todo 暂时性处理，应该让弹窗遮罩罩住整个小程序的
      })
      this.getTabBar
    }
  },

  showLoadingView: function() {
    this.setData({
      isShowLoading:true
    })
  },

  dismissLoadingView: function() {
    this.setData({
      isShowLoading:false
    })
  },

  onAddOTAFile: function() {

    // if (!this.data.isBleConnect) {
    //   wx.showToast({
    //     title: '请先连接的设备',
    //     icon: 'none'
    //   })
    //   return;
    // }

    console.log("读取文件...")
    wx.chooseMessageFile({
      count: 10,
      type: 'file',
      success: res => {
        var myFileArray = this.data.fileArray

        for (var i = 0; i<res.tempFiles.length; i++) {
          let file = res.tempFiles[i]
          console.log("--->"+file.name)
          myFileArray.push({id:myFileArray.length,fileItem:file,crc:0})
        }
        this.setData({
          fileArray:myFileArray
        })
      },
      fail: e => {
        console.error(e)
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

  onSelectedFile: function(e:any){
    if (this.data.fileIndex == e.currentTarget.dataset.index) {
      this.setData({
        fileIndex: -1,
        fileOTA: null,
        fileSize: 0,
        fileCrc:  0,
        mOtaFile: "",
      })
      return;
    }
    
    console.log("File"+e.currentTarget.dataset.index)
    let oneFile = this.data.fileArray[e.currentTarget.dataset.index]
    let fileContext = oneFile.fileItem

    this.showLoadingView()

        let fs = wx.getFileSystemManager()
        let path = fileContext.path;
        let fd = fs.openSync({
          filePath: path
        })
        let uint8 = new Uint8Array(fileContext.size);

        fs.read({
          fd: fd,
          arrayBuffer: uint8.buffer,
          length: fileContext.size,
          success: _res => {
            let tmp_crc = 0;
            uint8.forEach(it => {
              tmp_crc += it;
            })
            console.log(fileContext)
          
            this.upgradeData = uint8
            console.log("------------读取文件成功------------")

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

    this.upgradeData = oneFile.fileData
    this.setData({
      fileIndex: e.currentTarget.dataset.index,
      fileOTA: fileContext,
      fileSize: fileContext.size,
      fileCrc:  oneFile.crc,
      mOtaFile: fileContext.name,
    })
  },

  onUpdate: function(){

    // console.log("按钮升级")
    // this.setData({
    //   isShowProgress : true,
    //   mValue:60,
    //   mStatus:0,
    //   mNumber:10,                //完成次数
    //   mTimes:10
    // })
    // return

    console.log("按钮升级")
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


    console.log("按钮升级")
    this.setData({
      isShowProgress : true
    })

    /*--- 开始执行OTA升级 ---*/
    const otaConfig: OTAConfig = new OTAConfig()
    otaConfig.isSupportNewRebootWay = true
    otaConfig.updateFileData = this.upgradeData
    console.log("upgradeData size: " + this.upgradeData.length);
    sBluetoothManager.startOTA(otaConfig,{
      onStartOTA: () => {
        this.setData({
          isShowProgress : true,
          mStatus:0
        })
        setTimeout(() => {
          if (typeof this.getTabBar === 'function' && this.getTabBar()) {
            this.getTabBar().setData({
              enable:false //todo 暂时性处理，应该让弹窗遮罩罩住整个小程序的
            })
          }
        }, 100);
      },
      onNeedReconnect: (reConnectMsg: ReConnectMsg) => {
        this.setData({
          mValue : 0,
          mStatus: 2
        })
      },
      onProgress: (type: UpgradeType, progress: number) => {
        if (type == UpgradeType.UPGRADE_TYPE_CHECK_FILE) {
          this.setData({
            mValue : progress,
            mStatus: 0
          })
        }
        if (type == UpgradeType.UPGRADE_TYPE_FIRMWARE) {
          this.setData({
            mValue : progress,
            mStatus: 1
          })
        }
      },
      onStopOTA: () => {
        if (typeof this.getTabBar === 'function' && this.getTabBar()) {
          this.getTabBar().setData({
            enable:true //todo 暂时性处理，应该让弹窗遮罩罩住整个小程序的
          })
        }
        this.setData({
          mValue : 0,
          mOtaResult:0,
          mStatus: 3
        })
      },
      onCancelOTA: () => {
        if (typeof this.getTabBar === 'function' && this.getTabBar()) {
          this.getTabBar().setData({
            enable:true //todo 暂时性处理，应该让弹窗遮罩罩住整个小程序的
          })
        }
        this.setData({
          mValue : 0,
          mOtaResult:1,
          mStatus: 4,
          mFailReason:"升级被取消."
        })
      },
      onError: (error: number, message: string) => {
        if (typeof this.getTabBar === 'function' && this.getTabBar()) {
          this.getTabBar().setData({
            enable:true //todo 暂时性处理，应该让弹窗遮罩罩住整个小程序的
          })
        }
        this.setData({
          mValue : 0,
          mOtaResult:1,
          mStatus: 4,
          mFailReason:message
        })
      },
    })
  },

  onOtaProgressViewConfirm:function(){
    this.setData({
      isShowProgress : false
    })
  },

})