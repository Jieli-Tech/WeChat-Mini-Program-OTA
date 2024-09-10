import { logv, logd, logi, logw, loge, ab2hex } from "./log";

export namespace BTBean {
    export class BluetoothDevice {
        /** 当前蓝牙设备的信号强度，单位 dBm */
        RSSI: number = 0
        /** 当前蓝牙设备的广播数据段中的 ManufacturerData 数据段。 */
        advertisData?: ArrayBuffer
        /** 当前蓝牙设备的广播数据段中的 ServiceUUIDs 数据段 */
        advertisServiceUUIDs?: string[]
        /** 当前蓝牙设备是否可连接（ Android 8.0 以下不支持返回该值 ） */
        connectable: boolean = true
        /** 蓝牙设备 id */
        deviceId: string = ""
        /** 当前蓝牙设备的广播数据段中的 LocalName 数据段 */
        localName: string = ""
        /** 蓝牙设备名称，某些设备可能没有 */
        name?: string
        /** 当前蓝牙设备的广播数据段中的 ServiceData 数据段 */
        serviceData: any
        /** 是不是系统已连接设备 */
        isSystem: boolean = false
        public equals(o: BluetoothDevice | null): boolean {
            if (o == null) return false;
            if (this == o) return true;
            return this.deviceId == o.deviceId;
        }
    }
    export class BluetoothError {
        errCode: BluetoothErrorConstant = BluetoothErrorConstant.ERROR_NONE
        errMsg?: string
        constructor(errorCode: BluetoothErrorConstant, errMsg?: string) {
            this.errCode = errorCode
            this.errMsg = errMsg
        }
    }
    export enum BluetoothErrorConstant {
        //微信的api错误
        ERROR_NONE = 0, //ok | 正常 |adapter
        ERROR_CONNECTED = - 1,// already connect | 已连接 |
        ERROR_ADAPTER_NOT_INIT = 10000, // not init | 未初始化蓝牙适配器 |
        ERROR_ADAPTER_NOT_AVAILABLE = 10001, // not available | 当前蓝牙适配器不可用 |
        ERROR_NO_DEV = 10002,// no device | 没有找到指定设备 |
        ERROR_CONNECTION_FAIL = 10003,// connection fail | 连接失败 |
        ERROR_NO_SERVICE = 10004,// no service | 没有找到指定服务 |
        ERROR_NO_CHARACTERISTIC = 10005,// no characteristic | 没有找到指定特征 |
        ERROR_NO_CONNECTION = 10006,// no connection | 当前连接已断开 |
        ERROR_PROPERTY_NOT_SUPOORT = 10007,// property not support | 当前特征不支持此操作 |
        ERROR_SYSTEM_ERROR = 10008,// system error | 其余所有系统上报的异常 |
        ERROR_SYSTEM_NOT_SUPPORT = 10009,// system not support | Android 系统特有，系统版本低于 4.3 不支持 BLE |
        ERROR_EPERATE_TIME_OUT = 10012,// operate time out | 连接超时 |
        ERROR_INVALID_DATA = 10013,// invalid_data | 连接 deviceId 为空或者是格式不正确 |
        //自定义的蓝牙错误
        ERROR_INIT_MTU_FAIL = 20000,// init mtu fail | 初始化MTU失败 |
        ERROR_GET_SERVICE_FAIL = 20001,// get service fail | 获取服务失败 |
        ERROR_NOTIFY_NECESSRY_CHARATERISTIC_FAIL = 20002,// notify necessary charateristic fail | 使能必须的特征失败 |
        ERROR_IS_CONNECTING = 20003,// is connecting | 正在连接 |
    }
}
export namespace BTConnect {
    export interface IConnect {
        /**设置连接配置*/
        setConnectSettingConfigure(config: ConnectSettingConfigure): void
        /*添加回调*/
        addConnectCallback(callback: ConnectImplCallback): void
        /*移除回调*/
        removeConnectCallback(callback: ConnectImplCallback): void
        /** 连接设备*/
        // connectDevice(device: BTBean.BluetoothDevice, connectCallback: ConnectCallback): boolean
        connect(option: {
            device: BTBean.BluetoothDevice,
            success?: (info: BluetoothDeviceInfo | undefined) => void,
            fail?: (e: BTBean.BluetoothError) => void,
        }): void
        /** 断开已连接设备 */
        disconnect(device: BTBean.BluetoothDevice): void
        /** 获取已连接设备列表*/
        getConnectedDevice(): Array<BTBean.BluetoothDevice> | null
        /** 获取设备MTU*/
        getMTU(device: BTBean.BluetoothDevice): number | undefined
        /** 是否正在连接*/
        isConnecting(device: BTBean.BluetoothDevice): boolean
        /** 是否已连接*/
        isConnected(device: BTBean.BluetoothDevice): boolean
    }
    export class ConnectSettingConfigure {
        /**连接超时*/
        timeout?: number
        /**mtu 23~512*/
        mtu: number = 512
        /**使能的service*/
        notifyServiceArray: Array<BluetoothService> = new Array()
        // /**必须使能的service*/
        // necessaryNotifyServiceArray: Array<BluetoothService> = new Array()
    }
    export class BluetoothService {
        UUID: string = ""
        isPrimary: boolean = false
        characteristicInfos = new Array<BluetoothCharacteristic>()
    }
    export class BluetoothCharacteristic {
        UUID: string = ""
        properties = { /** 该特征是否支持 indicate 操作 */
            indicate: false,
            /** 该特征是否支持 notify 操作 */
            notify: false,
            /** 该特征是否支持 read 操作 */
            read: false,
            /** 该特征是否支持 write 操作 */
            write: false,
            /** 该特征是否支持有回复写操作 */
            writeDefault: false,
            /** 该特征是否支持无回复写操作 */
            writeNoResponse: false
        }
        /** 该特征值是否 启用notify*/
        isNotify: boolean = false
        /** 该特征值是否 必须使能。必须使能的特征值使能失败时，即连接失败*/
        isNecessary: boolean = false
    }
    export class BluetoothDeviceInfo {
        mtu = -1
        bluetoothServices = new Array<BluetoothService>()
    }
    export class ConnectImplCallback {
        // /**适配器发生变化*/
        // onBluetoothAdapterAvailable?: (available: boolean) => void
        /** MTU改变*/
        onMTUChange?: (device: BTBean.BluetoothDevice, mtu: number) => void
        /** 连接成功*/
        onConnectSuccess?: (device: BTBean.BluetoothDevice) => void
        /** 连接失败*/
        onConnectFailed?: (device: BTBean.BluetoothDevice, error: BTBean.BluetoothError) => void
        /** 连接断开*/
        onConnectDisconnect?: (device: BTBean.BluetoothDevice) => void
    }
    export class ConnectCallback {
        /** MTU改变*/
        onMTUChange?: (device: BTBean.BluetoothDevice, mtu: number) => void
        /** 连接成功*/
        onConnectSuccess?: (device: BTBean.BluetoothDevice) => void
        /** 连接失败*/
        onConnectFailed?: (device: BTBean.BluetoothDevice, error: BTBean.BluetoothError) => void
    }
    export class ConnectImpl implements IConnect {
        private _platform = 'android'
        private _connectConfigure: ConnectSettingConfigure = new ConnectSettingConfigure()
        private _callbacks: Array<ConnectImplCallback> = new Array<ConnectImplCallback>()
        private _connectingDeviceArray = new Array<BTBean.BluetoothDevice>()
        private _connectedDeviceArray = new Array<BTBean.BluetoothDevice>()
        private _bluetoothDeviceInfoMap = new Map<string, BluetoothDeviceInfo>()
        constructor(platform: string) {
            this._platform = platform
            this._registerConnStatusListener()
            this._registerMTUChangeListener()
        }
        /**设置连接配置*/
        setConnectSettingConfigure(config: ConnectSettingConfigure) {
            this._connectConfigure = config
        }
        /*添加回调*/
        addConnectCallback(callback: ConnectImplCallback) {
            if (this._callbacks.indexOf(callback) == -1) {
                this._callbacks.push(callback);
            }
        }
        /*移除回调*/
        removeConnectCallback(callback: ConnectImplCallback) {
            var index = this._callbacks.indexOf(callback);
            if (index != -1) {
                this._callbacks.splice(index, 1);
            }
        }
        connect(option: {
            device: BTBean.BluetoothDevice,
            success?: (info: BluetoothDeviceInfo | undefined) => void,
            fail?: (e: BTBean.BluetoothError) => void,
        }) {
            const device = option.device
            if (this.isConnected(device)) {//已连接
                option.success?.(this.getConnectedDeviceInfo(device))
                return
            }
            if (this.isConnecting(device)) {//正在连接
                const error: BTBean.BluetoothError = {
                    errCode: BTBean.BluetoothErrorConstant.ERROR_IS_CONNECTING,
                    errMsg: 'is connecting'
                }
                option.fail?.(error)
                return
            }
            this._addConnectingDeviceId(device)
            const connectOption: WechatMiniprogram.CreateBLEConnectionOption = {
                deviceId: device.deviceId
            }
            if (this._connectConfigure.timeout) {
                connectOption.timeout = this._connectConfigure.timeout
            }
            const initBluetooth = (res: any) => {
                if (this._updateDeviceIdMtu(device.deviceId, res.mtu)) {
                    this._onMTUChange(device, res.mtu)
                }
                this._getBLEDeviceServices(device).then((value) => {
                    this._updateDeviceBluetoothService(device.deviceId, value)
                    option.success?.(this.getConnectedDeviceInfo(device))
                    this._onConnectSuccess(device)
                }).catch((e) => {
                    this.disconnect(device)
                    option.fail?.(e)
                    this._onConnectFailed(device, e)
                })
            }
            const getBLEMTU = () => {
                const bleMTUOption: any = {
                    deviceId: device.deviceId, success: (res: any) => {
                        logv('调节MTU成功，' + JSON.stringify(res.mtu));
                        initBluetooth(res)
                    }, fail: (res: any) => {
                        loge('调节MTU失败，' + JSON.stringify(res));
                        this.disconnect(device)
                        const error: BTBean.BluetoothError = {
                            errCode: BTBean.BluetoothErrorConstant.ERROR_INIT_MTU_FAIL,
                            errMsg: 'init mtu fail'
                        }
                        option.fail?.(error)
                        this._onConnectFailed(device, error)
                    }
                }
                if (this._platform !== 'android') {
                    bleMTUOption.writeType = "writeNoResponse"
                }
                wx.getBLEMTU(bleMTUOption)
            }
            connectOption.success = () => {
                if (this._platform == 'android') {//Android获取MTU
                    wx.setBLEMTU({
                        deviceId: device.deviceId,
                        mtu: this._connectConfigure.mtu,
                        success: res => {
                            logv('调节MTU成功，' + res.mtu);
                            initBluetooth(res)
                        },
                        fail: (_res) => {
                            getBLEMTU()
                        }
                    })
                } else {//iOS获取MTU
                    setTimeout(() => {
                        getBLEMTU()
                    }, 100);
                }
            }
            connectOption.fail = (e) => {//还是在这里监听连接失败，可以抛连接失败的异常原因
                loge('连接失败，' + e.errCode);
                if (this.isConnecting(device)) {
                    option.fail?.(e)
                    this._onConnectFailed(device, e)
                }
            }
            wx.createBLEConnection(connectOption)
        }
        /** 断开已连接设备 */
        disconnect(device: BTBean.BluetoothDevice): void {
            //todo 大概率三星手机有问题，蓝牙断开不会回调
            // if (this.isConnected(device)) {

            // }
            wx.closeBLEConnection({
                deviceId: device.deviceId,
            })
        }
        getConnectedDeviceInfo(device: BTBean.BluetoothDevice) {
            return this._getBluetoothDeviceInfo(device.deviceId)
        }
        /** 获取已连接设备列表*/
        getConnectedDevice(): Array<BTBean.BluetoothDevice> | null {
            return this._connectedDeviceArray
        }
        /** 获取设备MTU*/
        getMTU(device: BTBean.BluetoothDevice): number | undefined {
            if (this.isConnected(device)) {
                return this._bluetoothDeviceInfoMap.get(device.deviceId)?.mtu
            }
            return undefined
        }
        /** 是否正在连接*/
        isConnecting(device: BTBean.BluetoothDevice): boolean {
            var position = -1
            for (let index = 0; index < this._connectingDeviceArray.length; index++) {
                const element = this._connectingDeviceArray[index];
                if (element.deviceId.toLowerCase() === device.deviceId.toLowerCase()) {
                    position = index
                    break
                }
            }
            // logv("isConnecting : " + (position != -1));
            return position != -1
        }
        /** 是否已连接*/
        isConnected(device: BTBean.BluetoothDevice): boolean {
            var position = -1
            for (let index = 0; index < this._connectedDeviceArray.length; index++) {
                const element = this._connectedDeviceArray[index];
                if (element.deviceId.toLowerCase() === device.deviceId.toLowerCase()) {
                    position = index
                    break
                }
            }
            // logv("isConnected : " + (position != -1));
            return position != -1
        }
        private _registerConnStatusListener() {
            // logv("注册连接状态回调");
            let that = this;
            //@ts-ignore
            let resFun = (res: WechatMiniprogram.OnBLEConnectionStateChangeListenerResult) => {
                // 该方法回调中可以用于处理连接意外断开等异常情况
                logv("蓝牙连接状态变化" + JSON.stringify(res));
                if (res.connected == false) {
                    const dev = new BTBean.BluetoothDevice()
                    dev.deviceId = res.deviceId
                    if (this.isConnected(dev)) {
                        that._onConnectDisconnect(dev)
                    }
                }
            }
            wx.onBLEConnectionStateChange(resFun);
        }
        private _registerMTUChangeListener() {
            wx.onBLEMTUChange((res) => {
                const dev = new BTBean.BluetoothDevice()
                dev.deviceId = res.deviceId
                if (this.isConnected(dev)) {
                    if (this._updateDeviceIdMtu(res.deviceId, res.mtu)) {
                        this._onMTUChange(dev, res.mtu)
                    }
                }
            });
        }
        /**
       * 获取所有服务
       */
        private _getBLEDeviceServices(device: BTBean.BluetoothDevice) {
            logv('获取所有服务的 uuid:' + device.deviceId);
            return new Promise<Array<BluetoothService>>((resolve, reject) => {
                wx.getBLEDeviceServices({
                    deviceId: device.deviceId,
                    success: async res => {
                        if (res.services.length <= 0) {
                            reject(new BTBean.BluetoothError(BTBean.BluetoothErrorConstant.ERROR_NO_SERVICE, "no service"))
                            return;
                        } else {
                            const notifyUUIDMap = new Map<string, boolean>()
                            const bluetoothServiceInfos = new Array<BluetoothService>()
                            for (const service of res.services) {
                                const bluetoothServiceInfo = new BluetoothService()
                                bluetoothServiceInfo.UUID = service.uuid
                                bluetoothServiceInfo.isPrimary = service.isPrimary
                                let notifyCharacteristicInfos = new Array<BluetoothCharacteristic>()
                                // todo 没找对应的服务/特征值
                                for (let index = 0; index < this._connectConfigure.notifyServiceArray.length; index++) {
                                    const element = this._connectConfigure.notifyServiceArray[index];
                                    if (service.uuid.toLowerCase() === element.UUID.toLowerCase()) {
                                        notifyCharacteristicInfos = element.characteristicInfos
                                        break
                                    }
                                }
                                try {
                                    const characteristicInfos = await this._getBLEDeviceCharacteristics(device, service.uuid, notifyCharacteristicInfos)
                                    bluetoothServiceInfo.characteristicInfos = characteristicInfos
                                    for (const characteristicInfo of characteristicInfos) {
                                        const key = service.uuid + "_" + characteristicInfo.UUID
                                        notifyUUIDMap.set(key.toLocaleUpperCase(), true)
                                    }
                                } catch (error) {//有必须使能的特征没使能
                                    return reject(error)
                                }
                                bluetoothServiceInfos.push(bluetoothServiceInfo)
                            }
                            for (let index = 0; index < this._connectConfigure.notifyServiceArray.length; index++) {
                                const element = this._connectConfigure.notifyServiceArray[index];
                                for (let j = 0; j < element.characteristicInfos.length; j++) {
                                    const characteristicInfo = element.characteristicInfos[j];
                                    if (characteristicInfo.isNecessary) {//该 characteristicInfo 必须使能
                                        const key = element.UUID + "_" + characteristicInfo.UUID
                                        const isNotify = notifyUUIDMap.get(key.toLocaleUpperCase())
                                        if (isNotify != true) {//没有使能
                                            return reject(new BTBean.BluetoothError(BTBean.BluetoothErrorConstant.ERROR_NOTIFY_NECESSRY_CHARATERISTIC_FAIL, "notify necessary charateristic fail"))
                                        }
                                    }
                                }
                            }
                            resolve(bluetoothServiceInfos)
                        }
                    }, fail: error => {
                        loge('获取设备服务失败，错误码：' + error.errCode);
                        reject(new BTBean.BluetoothError(BTBean.BluetoothErrorConstant.ERROR_GET_SERVICE_FAIL, "get service fail"))
                    }
                })
            })
        }
        /**
       * 获取某个服务下的所有特征值
       */
        private _getBLEDeviceCharacteristics(device: BTBean.BluetoothDevice, serviceId: string, characteristics: Array<BluetoothCharacteristic>) {
            logv("获取某个服务下的所有特征值" + "\tdeviceId=" + device.deviceId + "\tserviceId=" + serviceId);
            return new Promise<Array<BluetoothCharacteristic>>((resolve, reject) => {
                const characteristicInfos = new Array<BluetoothCharacteristic>()
                wx.getBLEDeviceCharacteristics({
                    // 这里的 deviceId 需要已经通过 createBLEConnection 与对应设备建立链接
                    deviceId: device.deviceId,
                    // 这里的 serviceId 需要在 getBLEDeviceServices 接口中获取
                    serviceId,
                    success: async res => {
                        logv("getBLEDeviceCharacteristics" + "\tlist=" + JSON.stringify(res.characteristics));
                        for (const c of res.characteristics) {
                            const characteristicInfo = new BluetoothCharacteristic()
                            characteristicInfo.UUID = c.uuid
                            Object.assign(characteristicInfo.properties, c.properties)
                            for (let index = 0; index < characteristics.length; index++) {
                                const charateristic = characteristics[index];
                                if (charateristic.UUID === c.uuid.toLowerCase()) {
                                    const notifyRes = await this._notifyBLECharacteristicValueChange({
                                        deviceId: device.deviceId,
                                        serviceId: serviceId,
                                        characteristicId: c.uuid,
                                    })
                                    characteristicInfo.isNotify = notifyRes
                                    if (!notifyRes && charateristic.isNecessary == true) {//必须使能的特征使能失败
                                        return reject(new BTBean.BluetoothError(BTBean.BluetoothErrorConstant.ERROR_NOTIFY_NECESSRY_CHARATERISTIC_FAIL, "notify necessary charateristic fail"))
                                    }
                                }
                            }
                            characteristicInfos.push(characteristicInfo)
                        }
                        resolve(characteristicInfos)
                    },
                    fail: e => {
                        loge('获取特征值失败，错误码：' + e.errCode);
                        for (let index = 0; index < characteristics.length; index++) {
                            const charateristic = characteristics[index];
                            if (charateristic.isNecessary == true) {//必须使能的特征使能失败
                                return reject(new BTBean.BluetoothError(BTBean.BluetoothErrorConstant.ERROR_NOTIFY_NECESSRY_CHARATERISTIC_FAIL, "notify necessary charateristic fail"))
                            }
                        }
                        resolve(characteristicInfos)
                    }
                });
            })
        }
        /**
        * 订阅操作成功后需要设备主动更新特征值的 value，才会触发 wx.onBLECharacteristicValueChange 回调。
        */
        private _notifyBLECharacteristicValueChange(obj: {
            deviceId: string,
            serviceId: string,
            characteristicId: string
        }) {
            return new Promise<boolean>((resolve, reject) => {
                wx.notifyBLECharacteristicValueChange({
                    state: true, // 启用 notify 功能
                    // 这里的 deviceId 需要已经通过 createBLEConnection 与对应设备建立链接
                    deviceId: obj.deviceId,
                    // 这里的 serviceId 需要在 getBLEDeviceServices 接口中获取
                    serviceId: obj.serviceId,
                    // 这里的 characteristicId 需要在 getBLEDeviceCharacteristics 接口中获取
                    characteristicId: obj.characteristicId,
                    success: (res) => {
                        logv('使能通知成功：' + JSON.stringify(res) + " characteristicId : " + obj.characteristicId);
                        resolve(true)
                    },
                    fail: (err) => {
                        loge('使能通知失败' + JSON.stringify(err));
                        resolve(false)
                    }
                });
            })
        }
        private _addConnectingDeviceId(device: BTBean.BluetoothDevice) {
            this._connectingDeviceArray.push(device)
        }
        private _deleteConnectingDeviceId(device: BTBean.BluetoothDevice) {
            var position = -1
            for (let index = 0; index < this._connectingDeviceArray.length; index++) {
                const element = this._connectingDeviceArray[index];
                if (element.deviceId.toLowerCase() === device.deviceId.toLowerCase()) {
                    position = index
                    break
                }
            }
            if (position != -1) {
                this._connectingDeviceArray.splice(position, 1);
            }
        }
        private _addConnectedDeviceId(device: BTBean.BluetoothDevice) {
            this._connectedDeviceArray.push(device)
        }
        private _deleteConnectedDeviceId(device: BTBean.BluetoothDevice) {
            var position = -1
            for (let index = 0; index < this._connectedDeviceArray.length; index++) {
                const element = this._connectedDeviceArray[index];
                if (element.deviceId.toLowerCase() === device.deviceId.toLowerCase()) {
                    position = index
                    break
                }
            }
            if (position != -1) {
                this._connectedDeviceArray.splice(position, 1);
            }
        }
        private _getBluetoothDeviceInfo(deviceId: string) {
            return this._bluetoothDeviceInfoMap.get(deviceId)
        }
        private _updateDeviceBluetoothService(deviceId: string, bluetoothServices: BluetoothService[]) {
            let info = this._getBluetoothDeviceInfo(deviceId)
            if (info == undefined) {
                info = new BluetoothDeviceInfo()
                this._bluetoothDeviceInfoMap.set(deviceId, info)
            }
            info.bluetoothServices = bluetoothServices
        }
        private _updateDeviceIdMtu(deviceId: string, mtu: number) {
            let info = this._getBluetoothDeviceInfo(deviceId)
            if (info == undefined) {
                info = new BluetoothDeviceInfo()
                this._bluetoothDeviceInfoMap.set(deviceId, info)
            } else if (info.mtu == mtu) {
                return false//相同
            }
            info.mtu = mtu
            return true//不同
        }
        private _deleteDeviceInfo(deviceId: string) {
            this._bluetoothDeviceInfoMap.delete(deviceId)
        }
        private _onMTUChange(device: BTBean.BluetoothDevice, mtu: number) {
            this._callbacks.forEach(c => {
                if (c.onMTUChange) {
                    c.onMTUChange(device, mtu);
                }
            });
        }
        private _onConnectSuccess(device: BTBean.BluetoothDevice) {
            logv("_onConnectSuccess : " + device.deviceId)
            this._deleteConnectingDeviceId(device)
            this._addConnectedDeviceId(device)
            this._callbacks.forEach(c => {
                if (c.onConnectSuccess) {
                    c.onConnectSuccess(device);
                }
            });
        }
        private _onConnectFailed(device: BTBean.BluetoothDevice, error: BTBean.BluetoothError) {
            this._deleteConnectingDeviceId(device)
            this._callbacks.forEach(c => {
                if (c.onConnectFailed) {
                    c.onConnectFailed(device, error);
                }
            });
        }
        private _onConnectDisconnect(device: BTBean.BluetoothDevice) {
            this._deleteConnectedDeviceId(device)
            this._deleteDeviceInfo(device.deviceId)
            this._callbacks.forEach(c => {
                if (c.onConnectDisconnect) {
                    c.onConnectDisconnect(device);
                }
            });
        }
    }
}
export namespace BTScan {
    export class ScanCallback {
        /** 开始扫描设备*/
        onScanStart?: () => void
        /** 扫描失败*/
        onScanFailed?: (error: BTBean.BluetoothError) => void
        /** 扫描结束*/
        onScanFinish?: () => void
        /** 发送设备*/
        onFound?: (devs: BTBean.BluetoothDevice[]) => void
    }
    export class ScanSettingConfigure {
        /**是否包含系统设备*/
        public isContainSystemsConnectedDevice: boolean = false
        /** 是否打开扫描超时 todo 后续拓展*/
        public isOpenScanTimeout: boolean = true
        /** 扫描超时时间*/
        public scanTimeOut: number = 30000
        /** 过滤Services，要搜索的蓝牙设备主服务的 UUID 列表（支持 16/32/128 位 UUID）。
         * 某些蓝牙设备会广播自己的主 service 的 UUID。如果设置此参数，则只搜索广播包有对应 UUID 的主服务的蓝牙设备。
         * 建议通过该参数过滤掉周边不需要处理的其他蓝牙设备。*/
        public filterServic?: Array<string>
        /** 允许重复上报同一个设备*/
        public allowDuplicatesKey: boolean = true
        /** 上报设备的间隔，单位 ms。0 表示找到新设备立即上报，其他数值根据传入的间隔上报。*/
        public interval: number = 0
        /** 扫描模式*/
        public powerLevel: 'low' | 'medium' | 'high' = 'medium'
    }
    export interface IScan {
        /*是否正在扫描*/
        isScanning(): boolean
        /*添加回调*/
        addScanCallback(callback: ScanCallback): void
        /*移除回调*/
        removeScanCallback(callback: ScanCallback): void
        /*开始扫描*/
        startScan(scanTimeOut?: number): void
        /*刷新扫描*/
        refreshScan(): void
        /*停止扫描*/
        stopScan(): void
        /*获取扫描配置*/
        getScanSettingConfigure(): ScanSettingConfigure
        /*设置扫描配置*/
        setScanSettingConfigure(scanSettingConfigure: ScanSettingConfigure): void
    }
    export class ScanImpl implements IScan {
        private _platform: string = "android"
        private _isScanning: boolean = false
        /**扫描配置*/
        private _scanSettingConfigure: ScanSettingConfigure
        private _callbacks: Array<ScanCallback> = new Array<ScanCallback>()
        private _scanDevList: Array<BTBean.BluetoothDevice> = new Array()
        private _scanTimeoutID?: number
        private _scanSystemConnectedDevInterval?: number
        constructor(platform: string) {
            this._platform = platform
            this._scanSettingConfigure = new ScanSettingConfigure()
        }
        /*是否正在扫描*/
        isScanning(): boolean {
            return this._isScanning
        }
        /*添加回调*/
        addScanCallback(callback: ScanCallback): void {
            if (this._callbacks.indexOf(callback) == -1) {
                this._callbacks.push(callback);
            }
        }
        /*移除回调*/
        removeScanCallback(callback: ScanCallback): void {
            var index = this._callbacks.indexOf(callback);
            if (index != -1) {
                this._callbacks.splice(index, 1);
            }
        }
        /*开始扫描*/
        startScan(scanTimeOut?: number) {
            if (scanTimeOut) {//更新扫描时间
                this._scanSettingConfigure.scanTimeOut = scanTimeOut
            }
            if (this._isScanning) {//正在扫描中		
                this.refreshScan()
            } else {
                this._scanDevList = new Array()
                this._stopTiming()
                this._startTiming()
                this._startScan()
            }
        }
        /*刷新扫描*/
        refreshScan() {
            if (this._isScanning) {//正在扫描
                this._scanDevList = new Array()
                this._stopTiming()
                this._startTiming()
            }
        }
        /*停止扫描*/
        stopScan() {
            this._stopTiming()
            if (this._scanSystemConnectedDevInterval) {
                clearInterval(this._scanSystemConnectedDevInterval)
            }
            this._stopScan()
        }
        /*获取扫描配置*/
        getScanSettingConfigure() {
            return this._scanSettingConfigure
        }
        /*设置扫描配置*/
        setScanSettingConfigure(scanSettingConfigure: ScanSettingConfigure) {
            this._scanSettingConfigure = scanSettingConfigure
        }
        private _startScan() {
            logi("开始搜索蓝牙设备");
            wx.startBluetoothDevicesDiscovery({
                services: this._scanSettingConfigure.filterServic,
                allowDuplicatesKey: this._scanSettingConfigure.allowDuplicatesKey,
                interval: this._scanSettingConfigure.interval,
                powerLevel: this._scanSettingConfigure.powerLevel,
                success: e => {
                    logi('开始搜索蓝牙设备成功:' + e.errMsg);
                    this._isScanning = true
                    this._onScanStart()
                    this._onBluetoothDeviceFound();
                    if (this._scanSettingConfigure.isContainSystemsConnectedDevice) {
                        this._onSystemConnectedDeviceFound()
                    }
                },
                fail: e => {
                    loge('搜索蓝牙设备失败，错误码：' + e.errCode);
                    this._stopTiming()
                    this._onScanFailed(e)
                }
            });
        }
        private _stopScan() {
            this._isScanning = false
            wx.stopBluetoothDevicesDiscovery()
            //@ts-ignore
            wx.offBluetoothDeviceFound()
            this._onScanFinish()
        }
        private _onBluetoothDeviceFound() {
            wx.onBluetoothDeviceFound((res) => {
                // logv(" _onBluetoothDeviceFound 1: " + JSON.stringify(res))
                const scanDevs = new Array()
                res.devices.forEach(device => {
                    scanDevs.push(Object.assign(new BTBean.BluetoothDevice(), device))
                })
                this._handlerFoundDevcie(scanDevs)
            })
        }
        private _handlerFoundDevcie(scanDevs: BTBean.BluetoothDevice[]) {
            let isChange = false
            for (let i = 0; i < scanDevs.length; i++) {
                const scanDevice = scanDevs[i];
                let isContain = false
                for (let y = 0; y < this._scanDevList.length; y++) {
                    const element = this._scanDevList[y];
                    if (scanDevice.deviceId === element.deviceId) {
                        isContain = true
                        if (scanDevice.RSSI !== element.RSSI || (ab2hex(scanDevice.advertisData) !== ab2hex(element.advertisData))) {
                            this._scanDevList[y] = scanDevice
                            isChange = true
                        }
                        break
                    }
                }
                if (!isContain) {
                    isChange = true
                    this._scanDevList.push(scanDevice)
                }
            }
            if (isChange) {
                this._onFound(this._scanDevList)
            }
        }
        /** 系统已连接设备*/
        private _onSystemConnectedDeviceFound() {
            this._scanSystemConnectedDevInterval = setInterval(() => {
                this._getSystemConnectedDevice({
                    success: (scanDevices: Array<BTBean.BluetoothDevice>) => {
                        this._handlerFoundDevcie(scanDevices)
                    }, fail: (error: BTBean.BluetoothError) => {
                        loge("_onSystemConnectedDeviceFound errCode: " + error.errCode + "  errMsg:" + error.errMsg)
                    }
                })
            }, 500)
        }
        private _getSystemConnectedDevice(callback: { success: (scanDevs: Array<BTBean.BluetoothDevice>) => void, fail: (error: BTBean.BluetoothError) => void }) {
            const obj: WechatMiniprogram.GetConnectedBluetoothDevicesOption = { services: [] }
            if (this._scanSettingConfigure.filterServic != undefined) {
                obj.services = this._scanSettingConfigure.filterServic
            } else {
                if (this._platform == 'ios') {
                    obj.services = ['1800']
                    // obj.services = ['AE00']
                    // obj.services = ['1812']
                } else {
                    obj.services = new Array()
                }
            }
            obj.success = (res) => {
                // logv("getConnectedBluetoothDevices : " ,res)
                const resultArray = new Array()
                for (let index = 0; index < res.devices.length; index++) {
                    const device = res.devices[index];
                    const blueToothDevice = new BTBean.BluetoothDevice()
                    blueToothDevice.deviceId = device.deviceId
                    blueToothDevice.localName = device.name
                    blueToothDevice.name = device.name
                    blueToothDevice.serviceData = {}
                    blueToothDevice.advertisData = new ArrayBuffer(0)
                    blueToothDevice.advertisServiceUUIDs = []
                    blueToothDevice.isSystem = true
                    resultArray.push(blueToothDevice)
                }
                callback.success(resultArray)
            }
            obj.fail = (res) => {
                callback.fail(res)
            }
            wx.getConnectedBluetoothDevices(obj)
        }
        private _stopTiming() {
            if (this._scanTimeoutID) {
                clearTimeout(this._scanTimeoutID)
            }
            this._scanTimeoutID = undefined;
        }
        private _startTiming(): boolean {
            let result = false
            if (!this._scanTimeoutID) {
                this._scanTimeoutID = setTimeout(() => {
                    if (this._scanSystemConnectedDevInterval) {
                        clearInterval(this._scanSystemConnectedDevInterval)
                    }
                    this._stopScan();
                }, this._scanSettingConfigure.scanTimeOut)
                result = true
            } else {//扫描定时器不为空
            }
            return result
        }
        private _onScanStart() {
            loge("_onScanStart")
            this._callbacks.forEach(c => {
                if (c.onScanStart) {
                    c.onScanStart();
                }
            });
        }
        private _onScanFailed(error: BTBean.BluetoothError) {
            loge("_onScanFailed:" + JSON.stringify(error))
            this._callbacks.forEach(c => {
                if (c.onScanFailed) {
                    c.onScanFailed(error);
                }
            });
        }
        private _onScanFinish() {
            loge("_onScanFinish")
            this._callbacks.forEach(c => {
                if (c.onScanFinish) {
                    c.onScanFinish();
                }
            });
        }
        private _onFound(devices: BTBean.BluetoothDevice[]) {
            this._callbacks.forEach(c => {
                if (c.onFound) {
                    c.onFound(devices);
                }
            });
        }
    }
}
export namespace BTAdapter {
    export interface BTAdapterListenner {
        /**蓝牙适配器状态发送变化
         * @param availableBluetooth 蓝牙是否可用，true：可用，false:不可用
         * @param btAdapterInfo 蓝牙适配器信息
        */
        onBluetoothAdapter(availableBluetooth: boolean, btAdapterInfo?: BTAdapterInfo): void
        /**位置信息状态发送变化
         * @param availableLocation 位置信息是否可用，true：可用，false:不可用
         * @param locationAdapterInfo 位置信息状态信息
         */
        onLocation(availableLocation: boolean, locationAdapterInfo?: LocationAdapterInfo): void
    }
    export class LocationAdapterInfo {
        /**位置信息是否打开*/
        locationEnabled: boolean = false
        /**位置信息-微信App权限*/
        locationAuthorized: boolean = false
        /**位置信息-小程序权限*/
        locationSetting: boolean = false
    }
    export class BTAdapterInfo {
        /**不支持蓝牙功能*/
        bluetoothSupport: boolean = true
        /**蓝牙适配器初始化*/
        bluetoothInit: boolean = true
        /**蓝牙是否打开*/
        bluetoothEnabled: boolean = false
        /**蓝牙小程序权限*/
        bluetoothSetting: boolean = false
        constructor(bluetoothEnabled: boolean, bluetoothSetting: boolean) {
            this.bluetoothEnabled = bluetoothEnabled
            this.bluetoothSetting = bluetoothSetting
        }
    }
    //适配器，蓝牙状态，权限
    /**
     * 微信的扫描权限，小程序授权，系统蓝牙有没有打开
     * 有没有打开位置信息
     * 位置信息和蓝牙适配器是分开的
    */
    export class BluetoothAdapter {
        private _availableBluetooth: boolean = false
        private _availableLocation: boolean = false
        private _listeners = new Array<BTAdapterListenner>()
        constructor() {
            //监听蓝牙适配器状态
            this._registerAdapterStatusListener()
        }
        registerBluetoothAdapterListener(listener: BTAdapterListenner) {
            if (this._listeners.indexOf(listener) == -1) {
                this._listeners.push(listener);
            }
        }
        unregisterBluetoothAdapterListener(listener: BTAdapterListenner) {
            var index = this._listeners.indexOf(listener);
            if (index != -1) {
                this._listeners.splice(index, 1);
            }
        }
        checkBluetoothAdapter() {
            return new Promise<boolean>((resolve, reject) => {
                const errFun = async () => {
                    const systemInfo = wx.getSystemInfoSync()
                    //蓝牙是否可用
                    systemInfo.bluetoothEnabled
                    //小程序授权-蓝牙授权
                    const bluetoothSetting = await this._getBluetoothSettingStatus()
                    const info = new BTAdapterInfo(systemInfo.bluetoothEnabled, bluetoothSetting)
                    return info
                }
                wx.getBluetoothAdapterState({
                    success: async (res) => {
                        if (res.available) {
                            this._onBluetoothAdapter(true)
                            resolve(true)
                        } else {
                            const info = await errFun()
                            this._onBluetoothAdapter(false, info)
                            reject(info)
                        }
                    },
                    fail: async (e) => {
                        // loge("err ", e);
                        const info = await errFun()
                        if (e.errCode == 10000) {//蓝牙未初始化
                            info.bluetoothInit = false
                        } else if (e.errCode == undefined) {//没有错误code，暗示不支持蓝牙功能
                            info.bluetoothSupport = false
                        } else {
                        }
                        this._onBluetoothAdapter(false, info)
                        reject(info)
                    }
                })
            })
        }
        /**
         * 打开蓝牙适配器
         */
        openBluetoothAdapter(callback?: { success: () => void, fail: () => void }) {
            wx.openBluetoothAdapter({
                success: () => {
                    callback?.success()
                },
                fail: (_error) => {
                    callback?.fail()
                }
            })
        }
        closeBluetoothAdapter(callback?: { success: () => void, fail: () => void }) {
            wx.closeBluetoothAdapter({
                success: () => {
                    callback?.success()
                },
                fail: (_error) => {
                    callback?.fail()
                }
            })
        }
        checkLocation() {
            return new Promise<boolean>((resolve, reject) => {
                wx.getLocation({
                    type: 'wgs84',
                    success: (res) => {//定位正常
                        resolve(true)
                        this._onLocation(true)
                    }, fail: async (err) => {//定位异常
                        const systemInfo = wx.getSystemInfoSync()
                        systemInfo.locationAuthorized
                        const info = new LocationAdapterInfo()
                        //定位权限是否授权
                        info.locationAuthorized = systemInfo.locationAuthorized
                        //位置信息是否可用
                        info.locationEnabled = systemInfo.locationEnabled
                        //小程序授权-位置信息授权
                        const locationSetting = await this._getLocationSettingStatus()
                        info.locationSetting = locationSetting
                        reject(info)
                        this._onLocation(false, info)
                    }
                })
            })
        }
        /**
         * 授权小程序-蓝牙授权
        */
        authorizeBluetooth() {
            return this._authorizeSetting('scope.bluetooth')
        }
        /**
         * 授权小程序-定位授权
        */
        authorizeLocation() {
            return this._authorizeSetting('scope.userLocation')
        }
        private _authorizeSetting(setting: "scope.userLocation" | "scope.bluetooth") {
            return new Promise<boolean>((resolve, reject) => {
                this._getSettingStatus(setting).then((status) => {
                    if (status == false) {//未授权
                        wx.authorize({
                            scope: setting,
                            success: () => {//授权成功
                                resolve(true)
                            },
                            fail: (e) => {//授权失败
                                // loge("授权失败", e);
                                resolve(false)
                            }
                        })
                    } else {//已授权
                        resolve(true)
                    }
                }).catch((e) => {
                    reject(e)
                })
            })
        }
        private _registerAdapterStatusListener() {
            //在小程序的设置界面修改权限，这里无法监听到
            wx.onBluetoothAdapterStateChange((res) => {
                // loge("onBluetoothAdapterStateChange, available=" + res.available);
                loge("onBluetoothAdapterStateChange, available=" + res.available)
                if (res.available == false) {
                    this.checkBluetoothAdapter()
                } else {
                    this._onBluetoothAdapter(true)
                }
            })
        }
        /**
         * 获取小程序蓝牙授权状态
        */
        private _getBluetoothSettingStatus() {
            return this._getSettingStatus("scope.bluetooth")
        }
        /**
         * 获取小程序定位授权状态
        */
        private _getLocationSettingStatus() {
            return this._getSettingStatus("scope.userLocation")
        }
        /**
        * 获取小程序授权状态
        */
        private _getSettingStatus(setting: "scope.userLocation" | "scope.bluetooth") {
            return new Promise<boolean>((resolve, reject) => {
                wx.getSetting({
                    success(res) {
                        //@ts-ignore
                        const status = res.authSetting[setting]
                        if (status) {
                            resolve(status)
                        } else {
                            resolve(false)
                        }
                    }, fail(e) {
                        reject(e)
                    }
                })
            })
        }
        private _onBluetoothAdapter(availableBluetooth: boolean, btAdapterInfo?: BTAdapterInfo) {
            if (availableBluetooth == this._availableBluetooth) {
                return
            }
            this._availableBluetooth = availableBluetooth
            this._listeners.forEach(element => {
                element.onBluetoothAdapter(availableBluetooth, btAdapterInfo)
            });
        }
        private _onLocation(availableLocation: boolean, info?: LocationAdapterInfo) {
            if (availableLocation == this._availableLocation) {
                return
            }
            this._availableLocation = availableLocation
            this._listeners.forEach(element => {
                element.onLocation(availableLocation, info)
            });
        }
    }
}
export namespace BTManager {
    export class BluetoothImpl implements BTScan.IScan, BTConnect.IConnect {
        private _btScan: BTScan.IScan
        private _btConnect: BTConnect.IConnect
        private _btAdapter: BTAdapter.BluetoothAdapter
        protected _platform
        constructor() {
            // wx.getLocation({})//让微信申请扫描权限
            this._platform = wx.getSystemInfoSync().platform
            this._btScan = new BTScan.ScanImpl(this._platform)
            this._btConnect = new BTConnect.ConnectImpl(this._platform)
            this._btAdapter = new BTAdapter.BluetoothAdapter()
        }

        /************************************  扫描   *********************************/
        /*是否正在扫描*/
        isScanning(): boolean {
            return this._btScan.isScanning()
        }
        /*添加回调*/
        addScanCallback(callback: BTScan.ScanCallback): void {
            this._btScan.addScanCallback(callback)
        }
        /*移除回调*/
        removeScanCallback(callback: BTScan.ScanCallback): void {
            this._btScan.removeScanCallback(callback)
        }
        /*开始扫描*/
        startScan(scanTimeOut?: number): void {
            this._btAdapter.checkBluetoothAdapter().then((res) => {
                if (res) {
                    this._btScan.startScan(scanTimeOut)
                }
            }).catch((e) => {
                throw (e)
            })
        }
        /*刷新扫描*/
        refreshScan(): void {
            this._btAdapter.checkBluetoothAdapter().then((res) => {
                if (res) {
                    this._btScan.refreshScan()
                }
            }).catch((e) => {
                throw (e)
            })
        }
        /*停止扫描*/
        stopScan(): void {
            this._btScan.stopScan()
        }
        /*获取扫描配置*/
        getScanSettingConfigure(): BTScan.ScanSettingConfigure {
            return this._btScan.getScanSettingConfigure()
        }
        /*设置扫描配置*/
        setScanSettingConfigure(scanSettingConfigure: BTScan.ScanSettingConfigure) {
            this._btScan.setScanSettingConfigure(scanSettingConfigure)
        }
        /************************************  连接   *********************************/
        /**设置连接配置*/
        setConnectSettingConfigure(config: BTConnect.ConnectSettingConfigure): void {
            this._btConnect.setConnectSettingConfigure(config)
        }
        /*添加回调*/
        addConnectCallback(callback: BTConnect.ConnectImplCallback): void {
            this._btConnect.addConnectCallback(callback)
        }
        /*移除回调*/
        removeConnectCallback(callback: BTConnect.ConnectImplCallback): void {
            this._btConnect.removeConnectCallback(callback)
        }
        /** 连接设备*/
        connect(option: {
            device: BTBean.BluetoothDevice,
            success?: (info: BTConnect.BluetoothDeviceInfo | undefined) => void,
            fail?: (e: BTBean.BluetoothError) => void,
        }): void {
            this._btAdapter.checkBluetoothAdapter().then((res) => {
                if (res) {
                    this._btConnect.connect(option)
                }
            }).catch((e) => {
                throw (e)
            })
        }
        /** 断开已连接设备 */
        disconnect(device: BTBean.BluetoothDevice): void {
            this._btConnect.disconnect(device)
        }
        /** 获取已连接设备列表*/
        getConnectedDevice(): Array<BTBean.BluetoothDevice> | null {
            return this._btConnect.getConnectedDevice()
        }
        /** 获取设备MTU*/
        getMTU(device: BTBean.BluetoothDevice): number | undefined {
            return this._btConnect.getMTU(device)
        }
        /** 是否正在连接*/
        isConnecting(device: BTBean.BluetoothDevice): boolean {
            return this._btConnect.isConnecting(device)
        }
        /** 是否已连接*/
        isConnected(device: BTBean.BluetoothDevice): boolean {
            return this._btConnect.isConnected(device)
        }
        /************************************  适配器   *********************************/
        registerBluetoothAdapterListenner(listener: BTAdapter.BTAdapterListenner) {
            this._btAdapter.registerBluetoothAdapterListener(listener)
        }
        unregisterBluetoothAdapterListenner(listener: BTAdapter.BTAdapterListenner) {
            this._btAdapter.unregisterBluetoothAdapterListener(listener)
        }
        /** 打开蓝牙适配器*/
        openBluetoothAdapter(callback?: { success: () => void, fail: () => void }) {
            return this._btAdapter.openBluetoothAdapter(callback)
        }
        /** 检查蓝牙适配器*/
        checkBluetoothAdapter() {
            return this._btAdapter.checkBluetoothAdapter()
        }
        /** 检查位置信息*/
        checkLocation() {
            return this._btAdapter.checkLocation()
        }
        /** 授权小程序-蓝牙授权*/
        authorizeBluetooth() {
            return this._btAdapter.authorizeBluetooth()
        }
        /** 授权小程序-定位授权*/
        authorizeLocation() {
            return this._btAdapter.authorizeLocation()
        }
        /** 跳转到系统微信授权管理页面*/
        openAppAuthorizeSetting(option?: WechatMiniprogram.OpenAppAuthorizeSettingOption) {
            wx.openAppAuthorizeSetting(option)
        }
        /** 跳转到系统微信授权管理页面*/
        openSystemBluetoothSetting(option?: WechatMiniprogram.OpenSystemBluetoothSettingOption) {
            wx.openSystemBluetoothSetting(option)
        }
    }
}

// export var BluetoothInstance = new BTManager.BluetoothImpl()
