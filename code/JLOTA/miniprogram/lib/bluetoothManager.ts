import { BleDataCallback, BleDataHandler, BleSendDataHandler } from "./ble-data-handler"
import { ConnectCallback, ConnectImpl } from "./connect"
import { Auth, AuthListener } from "./rcsp-protocol/jl_auth_2.0.0"
import { OnUpgradeCallback, OTAConfig, OTAImpl, ReConnectMsg, UpgradeType } from "./rcsp-protocol/jl-ota/jl_ota_2.0.0"
import { RcspOTAManager } from "./rcsp-protocol/jl-ota/ota-rcsp"
import { RcspOpImpl, Device, OnRcspCallback, Connection, CommandBase } from "./rcsp-protocol/jl-rcsp/jl_rcsp_ota_2.0.0"
import { ab2hex } from "./log"
import { Reconnect, ReconnectCallback, ReconnectOp } from "./reconnect"
import { ScanCallback, ScanImpl } from "./scan"
import { hex2Mac } from "./util"
let that: BluetoothManager; //todo 后续优化，这里因为callback缘故，所以只能声明一个全局变量
export class BluetoothManager {
    private _Platform = "android"
    private _ConnectImpl: ConnectImpl
    private _ScanImpl: ScanImpl
    private _RcspOpImpl: RcspOpImpl
    private _BluetoothCallbackManager: BluetoothCallbackManager
    private _Reconnect: Reconnect | null = null
    private _BluetoothConfigure: BluetoothConfigure = new BluetoothConfigure()
    /**
     * platform 手机系统 android/iOS
    */
    constructor(platform: string) {
        this._Platform = platform
        console.log(" 初始化BluesManager  :" + this._Platform);
        that = this
        this._BluetoothCallbackManager = new BluetoothCallbackManager()
        console.log(" 初始化BluesManager" + this._BluetoothCallbackManager);
        this._ScanImpl = new ScanImpl()
        this._ConnectImpl = new ConnectImpl()
        this._RcspOpImpl = new RcspOpImpl()
        //todo 后续可优化，可能未openBluetoothAdapter
        BleDataHandler.init()
        this.init()
    }
    private init() {
        const that = this
        let scanCallback: ScanCallback = { onFound: this._onScanFound, onAdapter: this._onScanAdapter, onSuccess: this._onScanSuccess, onFailed: this._onScanFailed }
        this._ScanImpl.setCallback(scanCallback)
        let connectCallback: ConnectCallback = { onDisconnect: this._onConnectStateDisconnect, onFailed: this._onConnectStateFailed, onSuccess: this._onConnectStateSuccess, onMTUChange: this._onConnectStateMTUChange }
        this._ConnectImpl.setCallback(connectCallback)
        this._RcspOpImpl.setOnSendDataCallback({
            sendDataToDevice: (device: Device, data: Uint8Array): boolean => {
                console.log("发送数据： " + ab2hex(data));
                return this._SendData(device.mac, data)
            }
        })
        const bleDataCallback = {
            onReceiveData(res: WechatMiniprogram.OnBLECharacteristicValueChangeCallbackResult) {
                console.log("接收到数据： " + ab2hex(res.value));
                that._RcspOpImpl.transmitDeviceData(new Device(res.deviceId), new Uint8Array(res.value))
            }
        }
        BleDataHandler.addCallbacks(bleDataCallback)
        const onRcspCallback: OnRcspCallback = { onRcspInit: this._onRcspInit, onRcspCommand: this._onRcspCommand, onRcspDataCmd: this._onRcspDataCmd, onConnectStateChange: this._onConnectStateChange, onRcspError: this._onRcspError, onMandatoryUpgrade: this._onMandatoryUpgrade }
        this._RcspOpImpl.addOnRcspCallback(onRcspCallback)
    }
    /**
     * 添加事件回调
     */
    public addBluetoothEventCallback(callback: BluetoothEventCallback) {
        this._BluetoothCallbackManager.addCallbacks(callback)
    }
    /**
     * 移除事件回调
    */
    public removeBluetoothEventCallback(callback: BluetoothEventCallback) {
        this._BluetoothCallbackManager.removeCallbacks(callback)
    }
    /**
     * 设置配置
     */
    public setConfigure(bluetoothConfigure: BluetoothConfigure) {
        this._BluetoothConfigure = bluetoothConfigure
        this._ConnectImpl.setMaxMTU(bluetoothConfigure.changeMTU)
    }
    /**
     * 开始扫描设备
     */
    public sanDevice() {
        //Android平台检测是否有开启位置权限，
        let info = wx.getSystemInfoSync()
        console.error(info)
        //检测是否有位置权限
        if (info.platform == "android" && !info.locationAuthorized) {
            return
        }
        //检测是否打开gps位置开关
        if (info.platform == "android" && !info.locationEnabled) {
            return
        }
        this._ScanImpl.startScan()
    }
    /**
     * 是否已连接
     */
    public isConnected(): boolean {
        return this._ConnectImpl.isConnected()
    }

    /**
     * 已连接设备
     */
    public getConnectedDevice(): WechatMiniprogram.BlueToothDevice | null {
        return this._ConnectImpl.getConnectedDevice()
    }

    /**
     * 连接设备
     */
    public connectDevice(device: WechatMiniprogram.BlueToothDevice, isOTA: boolean): boolean {
        return this._ConnectImpl.connect(device, isOTA)
    }
    /**
     * 断开设备
     */
    public disconnectDevice() {
        this._ConnectImpl.disconnect()
    }

    /**
     * 开始升级
     */
    public startOTA(otaConfig: OTAConfig, onUgradeCallback: OnUpgradeCallback) {
        if (otaConfig.updateFileData == undefined || otaConfig.updateFileData.length == 0) {
            return
        }
        const that = this;
        const rcspOTAManager = new RcspOTAManager(this._RcspOpImpl)
        rcspOTAManager.startOTA(otaConfig, {
            onStartOTA: () => {
                onUgradeCallback.onStartOTA()
            },
            onNeedReconnect: (reConnectMsg: ReConnectMsg) => {
                onUgradeCallback.onNeedReconnect(reConnectMsg)
                console.log("onNeedReconnect: ");
                //###实现回连，这一部分可以自己实现
                const op: ReconnectOp = {
                    startScanDevice(): any {//开始扫描设备
                        that._ScanImpl.startScan()
                    },
                    isReconnectDevice(scanDevice: WechatMiniprogram.BlueToothDevice): boolean { //判断是不是回连设备
                        let result = false;
                        const oldDevice = rcspOTAManager.getCurrentOTADevice()
                        const oldDeviceMac = rcspOTAManager.getCurrentOTADeviceMac()
                        if (oldDeviceMac != undefined) {
                            if (reConnectMsg.isSupportNewReconnectADV) {//使用新回连方式-广播包广播BLE地址
                                const advertisStr = ab2hex(scanDevice.advertisData).toUpperCase()
                                const index = advertisStr.indexOf("D60541544F4C4A");
                                if (index != -1) {
                                    const unit8Array = new Uint8Array(scanDevice.advertisData)
                                    const macArray = unit8Array.slice(index + 8, index + 14).reverse()
                                    console.log("新回连广播包 newMAC : " + ab2hex(macArray).toUpperCase())
                                    result = oldDeviceMac.toUpperCase() == hex2Mac(macArray).toUpperCase()
                                }
                                console.log("新回连广播包 oldMAC : " + oldDeviceMac + " scanMAC: " + scanDevice.deviceId + " result: " + result + " rawData: " + ab2hex(scanDevice.advertisData));
                            } else {//旧方式回连-匹配BLE地址
                                result = oldDevice!.mac == scanDevice.deviceId
                                console.log("旧方式回连 : oldMAC: " + oldDevice!.mac + " scanMAC: " + scanDevice.deviceId + " result: " + result);
                            }
                        }
                        return result
                    },
                    connectDevice(device: WechatMiniprogram.BlueToothDevice): any {//连接设备
                        that._ConnectImpl.connect(device, true)
                    }
                }
                const callback: ReconnectCallback = {
                    onReconnectSuccess(device: Device) {
                        console.error("onReconnectSuccess : " + device);
                        /todo 回连成功应该把新设备和连接状态同步给 rcspOTA/
                        rcspOTAManager.updateOTADevice(device)
                        that._Reconnect = null;
                    },
                    onReconnectFailed() {//不用处理，库里会自动超时
                        console.error("onReconnectFailed : ");
                        that._Reconnect = null;
                    }
                }
                that._Reconnect = new Reconnect(op, callback)
                that._Reconnect.startReconnect(OTAImpl.RECONNECT_DEVICE_TIMEOUT);
            },
            onProgress: (type: UpgradeType, progress: number) => {
                onUgradeCallback.onProgress(type, progress)
                //   if (this.data.showOta == false) {
                //     this.setData({
                //       showOta: true
                //     })
                //   }
                //   let msg = type == UpgradeType.UPGRADE_TYPE_FIRMWARE ? '发送sdk升级数据' : '发送uboot升级数据'
                //   this.setData({
                //     otaProgress: Math.round(progress),
                //     otaMsg: msg
                //   })
            },
            onStopOTA: () => {
                onUgradeCallback.onStopOTA()
                //   this.setData({
                //     showOta: false
                //   })
                //   wx.showModal({
                //     title: '提示',
                //     content: '升级成功',
                //   })
                rcspOTAManager.release()
                //重新扫描设备
                this.disconnectDevice()
                this._ScanImpl.startScan()
            },
            onCancelOTA: () => {
                onUgradeCallback.onCancelOTA()
                //   wx.showModal({
                //     title: '提示',
                //     content: '升级取消',
                //   })
            },
            onError: (error: number, message: string) => {
                onUgradeCallback.onError(error, message)
                if (that._Reconnect != null) {
                    that._Reconnect.stopReconnect()
                }
                console.error('升级失败: 错误code：' + error + " 信息：" + message)
                //   this.setData({
                //     showOta: false,
                //     otaProgress: 0,
                //   })
                // wx.showModal({
                //     title: '提示',
                //     content: '升级失败: 错误code：' + error + " 信息：" + message,
                // })
                that._ConnectImpl.disconnect()
                rcspOTAManager.release()
            }
        })
    }

    private _SendData(deviceId: string, data: Uint8Array): boolean {
        if (that._ConnectImpl.isConnected() && that._ConnectImpl.getConnectedDevice()?.deviceId == deviceId) {
            // console.log("device : " + JSON.stringify(this.bleConnect.getConnectedDevice()));
            BleSendDataHandler.sendData(deviceId, that._ConnectImpl.getCommunicationService()!.uuid, that._ConnectImpl.getCommunicationWriteCharacteristic()!.uuid, data)
            return true
        }
        return false
    }
    private isUseAuth(): boolean {
        return that._BluetoothConfigure.isUseAuth
    }
    /***************************扫描回调ScanCallback*******************************/
    private _onScanFound(devices: WechatMiniprogram.BlueToothDevice[]) {
        if (that._Reconnect != null) {
            that._Reconnect.onDiscoveryDevices(devices)
        }
        that._BluetoothCallbackManager.onFoundDev(devices)
    }
    private _onScanAdapter(res: WechatMiniprogram.OnBluetoothAdapterStateChangeCallbackResult) {
        if (that._Reconnect != null && !res.discovering) { 
            that._Reconnect.onScanStop() 
        }        
	    that._BluetoothCallbackManager.onAdapter(res)
    }
    private _onScanSuccess() {
        that._BluetoothCallbackManager.onScanSuccess()
    }
    private _onScanFailed(res: WechatMiniprogram.BluetoothError) {
        console.log(" _onScanFailed _Platform : " + that._Platform);

        console.log(" _onScanFailed" + that._BluetoothCallbackManager);
        that._BluetoothCallbackManager.onScanFailed(res)
    }
    /***************************连接回调ScanCallback*******************************/
    private _onConnectStateDisconnect(dev: WechatMiniprogram.BlueToothDevice) {
        that._RcspOpImpl.transmitDeviceStatus(new Device(dev.deviceId), Connection.CONNECTION_DISCONNECT)
        that._BluetoothCallbackManager.onDevStatusDisconnect(dev)
    }
    private _onConnectStateFailed(dev: WechatMiniprogram.BlueToothDevice) {
        if (that._Reconnect != null) {//正在回连
            that._ScanImpl.startScan()
        }
        that._BluetoothCallbackManager.onDevStatusFailed(dev)
    }
    private _onConnectStateSuccess(dev: WechatMiniprogram.BlueToothDevice) {
        //认证
        if (that.isUseAuth()) {
            let auth = new Auth()
            let bleDataCallback: BleDataCallback = {
                onReceiveData(res: WechatMiniprogram.OnBLECharacteristicValueChangeCallbackResult) {
                    auth.handlerAuth(res.deviceId, res.value)
                }
            }
            let authListener: AuthListener = {
                onSendData: (deviceId: string, data: ArrayBuffer) => {
                    that._SendData(deviceId, new Uint8Array(data))
                },
                onAuthSuccess: () => {
                    BleDataHandler.removeCallbacks(bleDataCallback)
                    if (that._Reconnect != null) {
                        that._Reconnect.onDeviceConnected(new Device(dev.deviceId))
                    }
                    that._RcspOpImpl.transmitDeviceStatus(new Device(dev.deviceId), Connection.CONNECTION_CONNECTED)
                },
                onAuthFailed: () => {
                    BleDataHandler.removeCallbacks(bleDataCallback)
                    that._ConnectImpl.disconnect()
                },
            }
            BleDataHandler.addCallbacks(bleDataCallback)
            auth.startAuth(dev.deviceId, authListener)
        } else {
            if (that._Reconnect != null) {
                that._Reconnect.onDeviceConnected(new Device(dev.deviceId))
            }
            that._RcspOpImpl.transmitDeviceStatus(new Device(dev.deviceId), Connection.CONNECTION_CONNECTED)
        }
        that._BluetoothCallbackManager.onDevStatusSuccess(dev)
    }
    private _onConnectStateMTUChange(dev: WechatMiniprogram.BlueToothDevice, mtu: number) {
        BleSendDataHandler.setMtu(dev.deviceId, mtu)
        that._BluetoothCallbackManager.onDevStatusMTUChange(dev, mtu)
    }
    /***************************Rcsp回调*******************************/

    // Rcsp回调-初始化成功
    _onRcspInit(device?: Device | null, isInit?: boolean): void {
        if (!isInit) {
            wx.showToast({
                title: 'Rcsp初始化失败，请断开设备',
                icon: 'none'
            })
        } else {
            console.log(" Rcsp回调-初始化成功" + JSON.stringify(that._RcspOpImpl.getDeviceInfo(that._RcspOpImpl.getUsingDevice()!)));
        }
    }
    // Rcsp回调-设备发送命令
    _onRcspCommand(device: Device | null, command: CommandBase): void {
    }
    // Rcsp回调-设备发送data命令
    _onRcspDataCmd(device: Device | null, dataCmd: CommandBase): void {
    }
    // Rcsp回调-连接状态发生变化
    _onConnectStateChange(device: Device | null, status: Connection): void {
    }
    // Rcsp回调-异常报错
    _onRcspError(device: Device | null, error: number, message: string): void { }
    // Rcsp回调-是否需要强制升级
    _onMandatoryUpgrade(device: Device | null): void { }
}

export class BluetoothConfigure {
    public isUseAuth: boolean = true;
    /**暂不支持自动化测试OTA */
    public isAutoTestOTA: boolean = false;
    public autoTestOTACount: number = 1;
    public changeMTU = 512;
}

export class BluetoothCallbackManager {
    private callbacks = Array<BluetoothEventCallback>()
    public addCallbacks(callback: BluetoothEventCallback) {
        if (this.callbacks.indexOf(callback) == -1) {
            this.callbacks.push(callback);
        }
    }
    public removeCallbacks(callback: BluetoothEventCallback) {
        var index = this.callbacks.indexOf(callback);
        if (index != -1) {
            this.callbacks.splice(index, 1);
        }
    }
    //蓝牙适配器发生变化，外部实现wx.onBluetoothAdapterStateChange，则该回调无效
    public onAdapter(res: WechatMiniprogram.OnBluetoothAdapterStateChangeCallbackResult) {
        this._doAction({
            action: function (c) {
                if (c.onAdapter) {
                    c.onAdapter(res);
                }
            }
        });
    }
    //发现设备
    public onFoundDev(devices: WechatMiniprogram.BlueToothDevice[]) {
        this._doAction({
            action: function (c) {
                if (c.onFoundDev) {
                    c.onFoundDev(devices);
                }
            }
        });
    }
    //扫描设备成功
    public onScanSuccess() {
        this._doAction({
            action: function (c) {
                if (c.onScanSuccess) {
                    c.onScanSuccess();
                }
            }
        });
    }
    //扫描设备失败
    public onScanFailed(err: WechatMiniprogram.BluetoothError) {
        this._doAction({
            action: function (c) {
                if (c.onScanFailed) {
                    c.onScanFailed(err);
                }
            }
        });
    }
    /** 设备断开 */
    public onDevStatusDisconnect(dev: WechatMiniprogram.BlueToothDevice) {
        this._doAction({
            action: function (c) {
                if (c.onDevStatusDisconnect) {
                    c.onDevStatusDisconnect(dev);
                }
            }
        });
    }
    /** 设备连接失败 */
    public onDevStatusFailed(dev: WechatMiniprogram.BlueToothDevice) {
        this._doAction({
            action: function (c) {
                if (c.onDevStatusFailed) {
                    c.onDevStatusFailed(dev);
                }
            }
        });
    }
    /** 设备连接成功*/
    public onDevStatusSuccess(dev: WechatMiniprogram.BlueToothDevice) {
        this._doAction({
            action: function (c) {
                if (c.onDevStatusSuccess) {
                    c.onDevStatusSuccess(dev);
                }
            }
        });
    }
    /** 设备MTU改变 */
    public onDevStatusMTUChange(dev: WechatMiniprogram.BlueToothDevice, mtu: number) {
        this._doAction({
            action: function (c) {
                if (c.onDevStatusMTUChange) {
                    c.onDevStatusMTUChange(dev, mtu);
                }
            }
        });
    }
    private _doAction(obj: { action: (c: BluetoothEventCallback) => void }) {
        this.callbacks.forEach(c => {
            obj.action(c)
        });
    }
}

export class BluetoothEventCallback {
    //蓝牙适配器发生变化，外部实现wx.onBluetoothAdapterStateChange，则该回调无效
    onAdapter(res: WechatMiniprogram.OnBluetoothAdapterStateChangeCallbackResult) { }
    //发现设备
    onFoundDev(devices: WechatMiniprogram.BlueToothDevice[]) { }
    //扫描设备成功
    onScanSuccess() { }
    //扫描设备失败
    onScanFailed(err: WechatMiniprogram.BluetoothError) { }
    /** 设备断开 */
    onDevStatusDisconnect(dev: WechatMiniprogram.BlueToothDevice) { }
    /** 设备连接失败 */
    onDevStatusFailed(dev: WechatMiniprogram.BlueToothDevice) { }
    /** 设备连接成功*/
    onDevStatusSuccess(dev: WechatMiniprogram.BlueToothDevice) { }
    /** 设备MTU改变 */
    onDevStatusMTUChange(dev: WechatMiniprogram.BlueToothDevice, mtu: number) { }
}

