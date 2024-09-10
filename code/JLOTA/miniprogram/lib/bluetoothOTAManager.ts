import { BleDataCallback, BleDataHandler, BleSendDataHandler } from "./ble-data-handler"
import { OnUpgradeCallback, OTAConfig } from "./jl_lib/jl_ota_2.1.1"
import { ab2hex, logv, logd, logi, logw, loge } from "./log"
import { BTAdapter, BTBean, BTConnect, BTScan } from "./bluetooth"
import { BluetoothInstance } from "./bluetoothUI";
import { OTAWrapper, OTAWrapperOption, OTAWrapperListenner, BluetoothDevice } from "./otaWrapper"
import * as RCSPProtocol from "./jl_lib/jl_rcsp_ota_2.1.1";

export class BluetoothOTAManager {
    private _Platform = "android"
    private _BluetoothCallbackManager: BluetoothCallbackManager = new BluetoothCallbackManager()
    private _BluetoothConfigure: BluetoothConfigure = new BluetoothConfigure()
    private _ConnectSettingConfigure = new BTConnect.ConnectSettingConfigure()
    private _ScanSettingConfigure = new BTScan.ScanSettingConfigure()
    private _bluetoothInstance = BluetoothInstance
    private _OTAWrapper: OTAWrapper
    UUID_SERVICE = "0000ae00-0000-1000-8000-00805f9b34fb";
    UUID_WRITE = "0000ae01-0000-1000-8000-00805f9b34fb";
    UUID_NOTIFY = "0000ae02-0000-1000-8000-00805f9b34fb";
    /**
     * @param platform 手机系统 android/iOS
    */
    constructor(platform: string) {
        this._Platform = platform
        // 蓝牙接收数据处理器初始化
        BleDataHandler.init()
        {//连接配置
            this._ConnectSettingConfigure.mtu = 512//mtu默认最大值512
            this._ConnectSettingConfigure.timeout = undefined//连接超时不打开
            const dataService = new BTConnect.BluetoothService()
            dataService.UUID = this.UUID_SERVICE
            const notifyCharacteristic = new BTConnect.BluetoothCharacteristic()
            notifyCharacteristic.UUID = this.UUID_NOTIFY
            notifyCharacteristic.isNecessary = true
            dataService.characteristicInfos.push(notifyCharacteristic)
            this._ConnectSettingConfigure.notifyServiceArray.push(dataService)
            this._bluetoothInstance.setConnectSettingConfigure(this._ConnectSettingConfigure)
        }
        {//扫描配置
            this._ScanSettingConfigure.isContainSystemsConnectedDevice = true
            this._bluetoothInstance.setScanSettingConfigure(this._ScanSettingConfigure)
        }
        this._initBluetooth()
        {//OTAWrapper 初始化
            const otaWrapperOption: OTAWrapperOption = {
                /**是否需要认证**/
                isUseAuth: () => {
                    return this._BluetoothConfigure.isUseAuth
                },
                isInnerReconnect: () => {
                    return true
                },
                /**扫描设备**/
                sanDevice: () => {
                    this.sanDevice()
                },
                /**连接设备**/
                connectDevice: (device: BluetoothDevice) => {
                    const tempDev = new BTBean.BluetoothDevice()
                    Object.assign(tempDev, device)
                    this.connectDevice(tempDev)
                },
                /**断开设备**/
                disconnectDevice: (device: BluetoothDevice) => {
                    const tempDev = new BTBean.BluetoothDevice()
                    Object.assign(tempDev, device)
                    this.disconnectDevice(tempDev)
                },
                /**发送数据**/
                sendData: (device: BluetoothDevice, data: Uint8Array) => {
                    const tempDev = new BTBean.BluetoothDevice()
                    Object.assign(tempDev, device)
                    if (this._bluetoothInstance.isConnected(tempDev)) {
                        BleSendDataHandler.sendData(device.deviceId, this.UUID_SERVICE, this.UUID_WRITE, data)
                    }
                }
            }
            this._OTAWrapper = new OTAWrapper(otaWrapperOption)
        }
    }
    private _initBluetooth() {
        this._bluetoothInstance.addConnectCallback({
            onMTUChange: (dev: any, mtu) => {
                BleSendDataHandler.setMtu(dev.deviceId, mtu)
                this._onConnectStateMTUChange(dev, mtu)
            }, onConnectSuccess: (dev: any) => {
                // 通知 OTAWrapper 蓝牙连接成功
                this._OTAWrapper.onConnectStateSuccess(dev)
                this._onConnectStateSuccess(dev)
            }, onConnectFailed: (dev: any, _err) => {
                // 通知 OTAWrapper 蓝牙连接失败
                this._OTAWrapper.onConnectStateFailed(dev)
                this._onConnectStateFailed(dev)
            }, onConnectDisconnect: (dev: any) => {
                // 通知 OTAWrapper 蓝牙连接断开
                this._OTAWrapper.onConnectStateDisconnect(dev)
                this._onConnectStateDisconnect(dev)
            }
        })
        this._bluetoothInstance.addScanCallback({
            onFound: (devs: BTBean.BluetoothDevice[]) => {
                // 通知 OTAWrapper 发现设备
                this._OTAWrapper.onScanFound(devs)
                this._onScanFound(devs)
            }, onScanStart: () => {
                this._onScanStart()
            }, onScanFailed: (err: BTBean.BluetoothError) => {
                this._onScanFailed(err)
            }, onScanFinish: () => {
                // 通知 OTAWrapper 扫描设备停止
                this._OTAWrapper.onSanDeviceStop()
                this._onScanFinish()
            }
        })
        this._bluetoothInstance.registerBluetoothAdapterListenner({
            onBluetoothAdapter: (availableBluetooth: boolean, btAdapterInfo?: BTAdapter.BTAdapterInfo) => {
                this._BluetoothCallbackManager.onBluetoothAdapter(availableBluetooth, btAdapterInfo)
            },
            onLocation: (availableLocation: boolean, locationAdapterInfo?: BTAdapter.LocationAdapterInfo) => {
                this._BluetoothCallbackManager.onLocation(availableLocation, locationAdapterInfo)
            }
        })
        const bleDataCallback: BleDataCallback = {
            onReceiveData: (res: WechatMiniprogram.OnBLECharacteristicValueChangeCallbackResult) => {
                // 通知 OTAWrapper 收到数据
                this._OTAWrapper.onReceiveData(this._toDevice(res.deviceId), res.value)
            }
        }
        BleDataHandler.addCallbacks(bleDataCallback)
    }
    /**
     * 开始升级
     */
    public startOTA(device: BTBean.BluetoothDevice, otaConfig: OTAConfig, onUgradeCallback: OnUpgradeCallback) {
        this._OTAWrapper.startOTA(device, otaConfig, onUgradeCallback)
    }
    /**
    * 注册RCSP事件回调
    */
    public registerRcspCallback(callback: OTAWrapperListenner): void {
        this._OTAWrapper.registerRcspCallback(callback)
    }
    /**
    * 注销RCSP事件回调
    */
    public unregisterRcspCallback(callback: OTAWrapperListenner): void {
        this._OTAWrapper.unregisterRcspCallback(callback)
    }

    /**
     * App发送自定义命令
     */
    public sendCustomCmd(device: BTBean.BluetoothDevice, data: Uint8Array, callback: RCSPProtocol.CommandCallback<RCSPProtocol.CommandBase> | null) {
        return this._OTAWrapper.sendCustomCmd(device, data, callback)
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
        this.UUID_SERVICE = bluetoothConfigure.serviceUUID
        this.UUID_NOTIFY = bluetoothConfigure.notifyCharacteristicUUID
        this.UUID_WRITE = bluetoothConfigure.writeCharacteristicUUID
        this._ConnectSettingConfigure.mtu = bluetoothConfigure.changeMTU
        this._ConnectSettingConfigure.notifyServiceArray = new Array()
        const dataService = new BTConnect.BluetoothService()
        dataService.UUID = this.UUID_SERVICE
        const notifyCharacteristic = new BTConnect.BluetoothCharacteristic()
        notifyCharacteristic.UUID = this.UUID_NOTIFY
        notifyCharacteristic.isNecessary = true
        dataService.characteristicInfos.push(notifyCharacteristic)
        this._ConnectSettingConfigure.notifyServiceArray.push(dataService)
        this._bluetoothInstance.setConnectSettingConfigure(this._ConnectSettingConfigure)
    }
    /**
     * 获取当前配置
     */
    public getConfigure() {
        return this._BluetoothConfigure
    }
    /**
     * 开始扫描设备
     */
    public sanDevice() {
        this._bluetoothInstance.startScan(10000)
    }
    /**
     * 是否已连接
     */
    public isConnected(device: BTBean.BluetoothDevice | string): boolean {
        return this._bluetoothInstance.isConnected(this._toDevice(device))
    }

    /**
     * 已连接设备
     */
    public getConnectedDevice(): BTBean.BluetoothDevice[] | null {
        return this._bluetoothInstance.getConnectedDevice()
    }

    /**
     * 连接设备
     */
    public connectDevice(device: BTBean.BluetoothDevice) {
        return this._bluetoothInstance.connect({
            device: this._toDevice(device), fail: (e) => {
                // loge("连接失败", e)
            }
        })
    }
    /**
     * 断开设备
     */
    public disconnectDevice(device: BTBean.BluetoothDevice | string) {
        this._bluetoothInstance.disconnect(this._toDevice(device))
    }
    private _toDevice(device: BTBean.BluetoothDevice | string) {
        let dev: BTBean.BluetoothDevice
        if ((typeof device === 'string')) {
            dev = new BTBean.BluetoothDevice()
            dev.deviceId = device
        } else {
            dev = device
        }
        return dev
    }
    /***************************扫描回调ScanCallback*******************************/
    private _onScanFound(devices: BTBean.BluetoothDevice[]) {
        this._BluetoothCallbackManager.onFoundDev(devices)
    }
    private _onScanStart() {
        this._BluetoothCallbackManager.onScanStart()
    }
    private _onScanFinish() {
        this._BluetoothCallbackManager.onScanFinish()
    }
    private _onScanFailed(res: BTBean.BluetoothError) {
        loge(" _onScanFailed _Platform : " + this._Platform);
        this._BluetoothCallbackManager.onScanFailed(res)
    }
    /***************************连接回调ScanCallback*******************************/
    private _onConnectStateDisconnect(dev: BTBean.BluetoothDevice) {
        this._BluetoothCallbackManager.onDevStatusDisconnect(dev)
    }
    private _onConnectStateFailed(dev: BTBean.BluetoothDevice) {
        this._BluetoothCallbackManager.onDevStatusFailed(dev)
    }
    private _onConnectStateSuccess(dev: BTBean.BluetoothDevice) {
        this._BluetoothCallbackManager.onDevStatusSuccess(dev)
    }
    private _onConnectStateMTUChange(dev: BTBean.BluetoothDevice, mtu: number) {
        this._BluetoothCallbackManager.onDevStatusMTUChange(dev, mtu)
    }
}
export class BluetoothConfigure {
    public isUseAuth: boolean = true;
    /**暂不支持自动化测试OTA */
    public isAutoTestOTA: boolean = false;
    public autoTestOTACount: number = 1;
    public changeMTU = 512;
    public serviceUUID = "0000ae00-0000-1000-8000-00805f9b34fb"
    public notifyCharacteristicUUID = "0000ae02-0000-1000-8000-00805f9b34fb"
    public writeCharacteristicUUID = "0000ae01-0000-1000-8000-00805f9b34fb"
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
    onBluetoothAdapter(_availableBluetooth: boolean, _btAdapterInfo?: BTAdapter.BTAdapterInfo) {
        this._doAction({
            action: function (c) {
                if (c.onBluetoothAdapter) {
                    c.onBluetoothAdapter(_availableBluetooth, _btAdapterInfo);
                }
            }
        });
    }
    /**位置信息状态发送变化
     * @param availableLocation 位置信息是否可用，true：可用，false:不可用
     * @param locationAdapterInfo 位置信息状态信息
     */
    onLocation(_availableLocation: boolean, _locationAdapterInfo?: BTAdapter.LocationAdapterInfo) {
        this._doAction({
            action: function (c) {
                if (c.onLocation) {
                    c.onLocation(_availableLocation, _locationAdapterInfo);
                }
            }
        });
    }
    //发现设备
    public onFoundDev(devices: BTBean.BluetoothDevice[]) {
        this._doAction({
            action: function (c) {
                if (c.onFoundDev) {
                    c.onFoundDev(devices);
                }
            }
        });
    }
    //开始扫描设备
    public onScanStart() {
        this._doAction({
            action: function (c) {
                if (c.onScanStart) {
                    c.onScanStart();
                }
            }
        });
    }
    //结束扫描设备
    public onScanFinish() {
        this._doAction({
            action: function (c) {
                if (c.onScanFinish) {
                    c.onScanFinish();
                }
            }
        });
    }
    //扫描设备失败
    public onScanFailed(err: BTBean.BluetoothError) {
        this._doAction({
            action: function (c) {
                if (c.onScanFailed) {
                    c.onScanFailed(err);
                }
            }
        });
    }
    /** 设备断开 */
    public onDevStatusDisconnect(dev: BTBean.BluetoothDevice) {
        this._doAction({
            action: function (c) {
                if (c.onDevStatusDisconnect) {
                    c.onDevStatusDisconnect(dev);
                }
            }
        });
    }
    /** 设备连接失败 */
    public onDevStatusFailed(dev: BTBean.BluetoothDevice) {
        this._doAction({
            action: function (c) {
                if (c.onDevStatusFailed) {
                    c.onDevStatusFailed(dev);
                }
            }
        });
    }
    /** 设备连接成功*/
    public onDevStatusSuccess(dev: BTBean.BluetoothDevice) {
        this._doAction({
            action: function (c) {
                if (c.onDevStatusSuccess) {
                    c.onDevStatusSuccess(dev);
                }
            }
        });
    }
    /** 设备MTU改变 */
    public onDevStatusMTUChange(dev: BTBean.BluetoothDevice, mtu: number) {
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
    // onAdapter(res: WechatMiniprogram.OnBluetoothAdapterStateChangeCallbackResult) { }
    /**蓝牙适配器状态发送变化
     * @param availableBluetooth 蓝牙是否可用，true：可用，false:不可用
     * @param btAdapterInfo 蓝牙适配器信息
     */
    onBluetoothAdapter(_availableBluetooth: boolean, _btAdapterInfo?: BTAdapter.BTAdapterInfo) { }
    /**位置信息状态发送变化
     * @param availableLocation 位置信息是否可用，true：可用，false:不可用
     * @param locationAdapterInfo 位置信息状态信息
     */
    onLocation(_availableLocation: boolean, _locationAdapterInfo?: BTAdapter.LocationAdapterInfo) { }
    //发现设备
    onFoundDev(_devices: BTBean.BluetoothDevice[]) { }
    // 开始扫描设备
    onScanStart() { }
    // 开始扫描设备
    onScanFinish() { }
    //扫描设备失败
    onScanFailed(_err: BTBean.BluetoothError) { }
    /** 设备断开 */
    onDevStatusDisconnect(_dev: BTBean.BluetoothDevice) { }
    /** 设备连接失败 */
    onDevStatusFailed(_dev: BTBean.BluetoothDevice) { }
    /** 设备连接成功*/
    onDevStatusSuccess(_dev: BTBean.BluetoothDevice) { }
    /** 设备MTU改变 */
    onDevStatusMTUChange(_dev: BTBean.BluetoothDevice, _mtu: number) { }
}