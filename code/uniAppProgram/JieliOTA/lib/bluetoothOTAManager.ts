import { BleDataCallback, BleCharacteristicValueChangeResult, BleDataHandler, BleSendDataHandler } from "./ble-data-handler"
import { JL_OTA, JL_RCSP } from "./lib_rcsp"
import { ab2hex, logv, logd, logi, logw, loge } from "./log"
import { BTAdapter, BTBean, BTConnect, BTScan } from "./bluetooth"
import { BluetoothInstance } from "./bluetoothUI";

export class BluetoothOTAManager {
    private _Platform = "android"
    private _BluetoothCallbackManager: BluetoothCallbackManager = new BluetoothCallbackManager()
    private _BluetoothConfigure: BluetoothConfigure = new BluetoothConfigure()
    private _ConnectSettingConfigure = new BTConnect.ConnectSettingConfigure()
    private _ScanSettingConfigure = new BTScan.ScanSettingConfigure()
    private _bluetoothInstance = BluetoothInstance
    private _OTAWrapper: JL_OTA.OTAWrapper
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
            this._ConnectSettingConfigure.timeout =5000 //undefined//连接超时不打开
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
            const otaWrapperOption: JL_OTA.OTAWrapperOption = {
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
                connectDevice: (device: JL_OTA.BluetoothDevice) => {
                    this.connectDevice(this._toBTTempDevice(device))
                },
                /**断开设备**/
                disconnectDevice: (device: JL_OTA.BluetoothDevice) => {
                    this.disconnectDevice(this._toBTTempDevice(device))
                },
                /**发送数据**/
                sendData: (device: JL_OTA.BluetoothDevice, data: Uint8Array) => {
                    if (this._bluetoothInstance.isConnected(this._toDevice(device.deviceId))) {
                        BleSendDataHandler.sendData(device.deviceId, this.UUID_SERVICE, this.UUID_WRITE, data)
                    }
                }
            }
            this._OTAWrapper = new JL_OTA.OTAWrapper(otaWrapperOption)
        }
    }
    private _initBluetooth() {
        this._bluetoothInstance.addConnectCallback({
            onMTUChange: (dev: any, mtu) => {
                BleSendDataHandler.setMtu(dev.deviceId, mtu)
                this._onConnectStateMTUChange(dev, mtu)
            }, onConnectSuccess: (dev: any) => {
                // 通知 OTAWrapper 蓝牙连接成功
                this._OTAWrapper.onConnectStateSuccess(this._toOtaDevice(dev))
                this._onConnectStateSuccess(dev)
            }, onConnectFailed: (dev: any, _err) => {
                // 通知 OTAWrapper 蓝牙连接失败
                this._OTAWrapper.onConnectStateFailed(this._toOtaDevice(dev))
                this._onConnectStateFailed(dev)
            }, onConnectDisconnect: (dev: any) => {
                // 通知 OTAWrapper 蓝牙连接断开
                this._OTAWrapper.onConnectStateDisconnect(this._toOtaDevice(dev))
                this._onConnectStateDisconnect(dev)
            }
        })
        this._bluetoothInstance.addScanCallback({
            onFound: (devs: BTBean.BluetoothDevice[]) => {
                // 通知 OTAWrapper 发现设备（BTBean -> SDK BluetoothDevice，字段名不同）
                const otaDevs = new Array<JL_OTA.BluetoothDevice>()
                for (let index = 0; index < devs.length; index++) {
                    otaDevs.push(this._toOtaDevice(devs[index]))
                }
                this._OTAWrapper.onScanFound(otaDevs)
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
        this._bluetoothInstance.registerBluetoothAdapterListener({
            onBluetoothAdapter: (availableBluetooth: boolean, btAdapterInfo?: BTAdapter.BTAdapterInfo) => {
                this._BluetoothCallbackManager.onBluetoothAdapter(availableBluetooth, btAdapterInfo)
            },
            onLocation: (availableLocation: boolean, locationAdapterInfo?: BTAdapter.LocationAdapterInfo) => {
                this._BluetoothCallbackManager.onLocation(availableLocation, locationAdapterInfo)
            }
        })
        const bleDataCallback: BleDataCallback = {
            onReceiveData: (res: BleCharacteristicValueChangeResult) => {
                // 通知 OTAWrapper 收到数据（V2.2 要求 Uint8Array）
                this._OTAWrapper.onReceiveData(this._toOtaDevice(res.deviceId), new Uint8Array(res.value))
            }
        }
        BleDataHandler.addCallbacks(bleDataCallback)
    }
    /**
     * 是否已初始化成功
     */
    public isInit(device: BTBean.BluetoothDevice): Promise<boolean> {
        return this._OTAWrapper.isRCSPInit(this._toOtaDevice(device))
    }
    /**
     * 是否需要强制升级
     */
    public isNeedMandatoryUpgrade(device: BTBean.BluetoothDevice): Promise<boolean> {
        return this._OTAWrapper.isNeedMandatoryUpgrade(this._toOtaDevice(device))
    }
    /**
     * 是否正在升级
     */
    public isOTAing() {
        return this._OTAWrapper.isOTA()
    }
    /**
     * 开始升级
     */
    public startOTA(device: BTBean.BluetoothDevice, otaConfig: JL_OTA.OtaConfig, onUpgradeCallback: JL_OTA.OTAUpgradeCallback) {
        this._OTAWrapper.startOTA(this._toOtaDevice(device), otaConfig, onUpgradeCallback)
    }
    /**
    * 注册RCSP事件回调
    */
    public registerRcspCallback(callback: JL_OTA.OTAWrapperListener): void {
        this._OTAWrapper.registerRcspCallback(callback)
    }
    /**
    * 注销RCSP事件回调
    */
    public unregisterRcspCallback(callback: JL_OTA.OTAWrapperListener): void {
        this._OTAWrapper.unregisterRcspCallback(callback)
    }

    /**
     * App发送自定义命令
     */
    public sendCustomCmd(device: BTBean.BluetoothDevice, data: Uint8Array, callback: JL_RCSP.CommandCallback<JL_RCSP.Command> | null) {
        return this._OTAWrapper.sendCustomCmd(this._toOtaDevice(device), data, callback)
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
    /**
     * BTBean.BluetoothDevice -> JL_OTA.BluetoothDevice
     * 注意：BTBean 字段是 advertisData，SDK 字段是 advertiseData。
     */
    private _toOtaDevice(device: BTBean.BluetoothDevice | string): JL_OTA.BluetoothDevice {
        if (typeof device === 'string') {
            return new JL_OTA.BluetoothDevice(device)
        }
        const otaDev = new JL_OTA.BluetoothDevice(device.deviceId)
        otaDev.name = device.name
        otaDev.RSSI = device.RSSI
        otaDev.localName = device.localName
        otaDev.connectable = device.connectable
        otaDev.serviceData = device.serviceData
        otaDev.advertiseServiceUUIDs = device.advertisServiceUUIDs
        otaDev.advertiseData = device.advertisData
        return otaDev
    }
    /**
     * JL_OTA.BluetoothDevice -> 最小 BTBean.BluetoothDevice（连接/断开只需要 deviceId/name）
     */
    private _toBTTempDevice(device: JL_OTA.BluetoothDevice): BTBean.BluetoothDevice {
        const tempDev = new BTBean.BluetoothDevice()
        tempDev.deviceId = device.deviceId
        tempDev.name = device.name
        return tempDev
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