//scan.ts
import { logGroup, logGroupEnd, logv, logd, logi, logw, loge } from "./log";
export class ScanImpl {
  private scanList: WechatMiniprogram.BlueToothDevice[] = []
  private timeoutId: number | null = null
  private callback: ScanCallback | null = null
  constructor() {
    this._onBluetoothDeviceFound();
    wx.onBluetoothAdapterStateChange(res => {
      logw("蓝牙适配器状态改变：" + JSON.stringify(res))
      this._onAdapter(res)
      if (!res.available) {
        if (res.discovering) {
          this.stopScan();
        }
        this.scanList = [];
      } else if (res.available && res.discovering) {
        this.scanList = [];
        this._onFound(this.scanList)
      }
    })
  }
  setCallback(callback: ScanCallback | null) {
    this.callback = callback;
  }
  startScan() {
    logw("---搜索蓝牙设备--")
    this._stopTiming();
    this.scanList = [];
    this._getAdapterStatus({
      fail: () => { this._openAdapter() }
    });
  }
  stopScan() {
    logw("---停止搜索蓝牙设备--")
    this._stopTiming();
    wx.stopBluetoothDevicesDiscovery({
      success: e => {
        logv('停止搜索蓝牙设备:' + e.errMsg);
      },
      fail: e => {
        loge('停止搜索蓝牙设备失败，错误码：' + e.errCode);
      }
    });
  }
  /**
   * 发现外围设备
   */
  private _onBluetoothDeviceFound() {
    wx.onBluetoothDeviceFound(res => {
      var devices = res.devices
      if (!devices || devices.length < 1) {
        return;
      }
      var device = devices[0];
      if (!device.name || device.name.length < 1) {
        return
      }
      for (var i = 0; i < this.scanList.length; i++) {
        if (this.scanList[i].deviceId == device.deviceId) {
          return;
        }
      }

      logi("发现设备：" + device.name)
      this.scanList.push(device);
      this._onFound(this.scanList)
    });
  }
  /**
  * 打开适配器
  */
  private _openAdapter() {
    wx.openBluetoothAdapter({
      fail: (res) => {
        loge("初始化蓝牙适配器失败:" + JSON.stringify(res));
        this._onFailed(res)
      },
      success: () => {
        logi("初始化蓝牙适配器成功:");
        this._getAdapterStatus(null);
      }
    });
  }

  private _getAdapterStatus(callback: { fail: Function } | null) {
    wx.getBluetoothAdapterState({
      success: (res) => {
        logi("获取蓝牙适配器状态成功:" + JSON.stringify(res));
        if (res.available && res.discovering) {
          logi('已经处于搜索状态:');
          this._startTiming();
          this._onFound(this.scanList);
          this._onSuccess();
          return;
        }
        this._startScan();
      },
      fail: e => {
        loge('获取蓝牙适配器状态失败，错误码：' + e.errCode);
        if (callback != null && callback.fail) {
          callback.fail(e)
        } else {
          this._onFailed(e)
        }
      }
    });
  }
  private _startScan() {
    logi("开始搜索蓝牙设备");
    wx.startBluetoothDevicesDiscovery({
      allowDuplicatesKey: true,
      success: e => {
        logi('开始搜索蓝牙设备成功:' + e.errMsg);
        this._onBluetoothDeviceFound();
        this._startTiming();
        this._onSuccess()
      },
      fail: e => {
        loge('搜索蓝牙设备失败，错误码：' + e.errCode);
        this._onFailed(e)
      }
    });
  }

  private _stopTiming() {
    if (this.timeoutId != null) {
      clearTimeout(this.timeoutId)
    }
    this.timeoutId = null;
  }

  private _startTiming() {
    this.timeoutId = setTimeout(() => {
      this.stopScan();
    }, 30000)
  }
  private _onAdapter(res: WechatMiniprogram.OnBluetoothAdapterStateChangeCallbackResult) {
    if (this.callback && this.callback.onAdapter) {
      this.callback.onAdapter(res)
    }
  }
  private _onSuccess() {
    if (this.callback && this.callback.onSuccess) {
      this.callback.onSuccess()
    }
  }
  private _onFailed(res: WechatMiniprogram.BluetoothError) {
    if (this.callback && this.callback.onFailed) {
      this.callback.onFailed(res)
    }
  }
  private _onFound(devices: WechatMiniprogram.BlueToothDevice[]) {
    if (this.callback && this.callback.onFound) {
      this.callback.onFound(devices)
    }
  }
}



export interface ScanCallback {
  onAdapter?: ScanOnAdapterCallback,
  onSuccess?: ScanSuccessCallback,
  onFailed?: ScanFailedCallback,
  onFound?: ScanOnFoundCallback
}


/** 蓝牙适配器发生变化的回调函数 */
type ScanOnAdapterCallback = (res: WechatMiniprogram.OnBluetoothAdapterStateChangeCallbackResult) => void
/** 启动扫描成功的回调函数 */
type ScanSuccessCallback = () => void
/** 启动扫描失败的回调函数 */
type ScanFailedCallback = (res: WechatMiniprogram.BluetoothError) => void
/** 扫描发现设备的回调函数 */
type ScanOnFoundCallback = (devices: WechatMiniprogram.BlueToothDevice[]) => void
