import { RcspOTAManager, OTAConfig, OTAImpl, ReConnectMsg, UpgradeType, OnResultCallback, OTAError, getErrorDesc, ab2hex, logv, logd, logi, logw, loge } from "./jl_lib/jl_ota_2.1.1"
import { Reconnect, ReconnectCallback, ReconnectOp } from "./reconnect"
import { Auth, AuthListener } from "./jl_lib/jl_auth_2.0.0"
import * as RCSPProtocol from "./jl_lib/jl_rcsp_ota_2.1.1";
// 可能在上层有一个回连机制，需要兼容处理两个回连机制
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
    constructor(deviceId: string) {
        this.deviceId = deviceId
    }
    public equals(o: BluetoothDevice | null): boolean {
        if (o == null) return false;
        if (this == o) return true;
        return this.deviceId == o.deviceId;
    }
}
export interface OTAWrapperOption {
    /**是否需要认证。 在上层已经认证过，就不需要认证。**/
    isUseAuth(): boolean
    /**是否需要回连。 在上层进行回连，就不需要内部回连。**/
    isInnerReconnect(): boolean
    /**扫描设备**/
    sanDevice(): void;
    /**连接设备**/
    connectDevice(device: BluetoothDevice): void
    /**断开设备**/
    disconnectDevice(device: BluetoothDevice): void
    /**发送数据(非必须实现)，
     * 必须实现的情况：
     * - 1.内部创建并管理RCSPImpl, 即OTAWrapperOption.getRCSPImpl未实现
     * - 2.需要进行认证, 即OTAWrapperOption.isUseAuth返回false
     * **/
    sendData?(device: BluetoothDevice, data: Uint8Array): void
    /**获取RCSPImpl(非必须实现)。
     * - 上层管理RCSPImpl则需要实现,如使用jl-rcsp-op时需要实现。
     * - 上层不管理RCSPImpl则不需要实现，由内部创建并管理RCSPImpl
     *  **/
    getRCSPImpl?(device: BluetoothDevice): RCSPProtocol.RcspImpl | undefined
}
export interface IOTAWrapper {
    /**初始化成功**/
    isRCSPInit(device: BluetoothDevice): Promise<boolean>
    /**是否需要强制升级**/
    isNeedMandatoryUpgrade(device: BluetoothDevice): Promise<boolean>
    /**开始升级**/
    startOTA(device: BluetoothDevice, otaConfig: OTAConfig, onUgradeCallback: OTAUpgradeCallback): void
    /** 取消升级（仅双备份支持）*/
    cancelOTA(device: BluetoothDevice): void
    /**是否正在升级**/
    isOTA(device: BluetoothDevice): boolean | undefined
    /**发送自定义命令**/
    sendCustomCmd(device: BluetoothDevice, data: Uint8Array, callback: RCSPProtocol.CommandCallback<RCSPProtocol.CommandBase> | null): boolean
    /**获取设备信息**/
    getDeviceInfo(device: BluetoothDevice): RCSPProtocol.DeviceInfo | undefined
    /**注册RCSP回调**/
    registerRcspCallback(callback: OTAWrapperListenner): void
    /**注销RCSP回调**/
    unregisterRcspCallback(callback: OTAWrapperListenner): void
    /**扫描设备停止**/
    onSanDeviceStop(): void;
    /**发现设备**/
    onScanFound(devices: BluetoothDevice[]): void
    /**蓝牙连接成功-内部管理RCSPImpl调用**/
    onConnectStateSuccess(dev: BluetoothDevice): void
    /**蓝牙连接断开**/
    onConnectStateDisconnect(dev: BluetoothDevice): void
    /**蓝牙连接失败**/
    onConnectStateFailed(dev: BluetoothDevice): void
    /**RCSP初始化成功-外部管理RCSPImpl调用**/
    onRcspInitSuccess(dev: BluetoothDevice): void
    /**收到数据**/
    onReceiveData(dev: BluetoothDevice, data: ArrayBuffer): void
    /** 释放 */
    release(): void
}
export class OTAWrapperListenner extends RCSPProtocol.OnRcspCallback {
}
export class OTAUpgradeCallback {
    /** OTA开始*/
    onStartOTA(): void { }
    /**需要回连的回调
     * <p>
     * 注意: 1.仅连接通讯通道（BLE or  SPP）
     * 2.用于单备份OTA</p>
     *
     * @param reConnectMsg 回连设备信息
     * @param reconnectCallback 回连结果。
     */
    onNeedReconnect(reConnectMsg: ReConnectMsg, reconnectCallback: OnResultCallback<string>): void { }
    /** 进度回调
     *
     * @param type     类型
     * @param progress 进度
     */
    onProgress(type: UpgradeType, progress: number): void { }

    /** OTA结束*/
    onStopOTA(): void { }

    /** OTA取消*/
    onCancelOTA(): void { }

    /** OTA失败
     * @param error   错误码
     * @param message 错误信息
     */
    onError(error: number, message: string): void { }
}
export class OTAWrapper implements OTAWrapperOption, IOTAWrapper {
    private _RcspOTAManagerMap = new Map<string, RcspOTAManager>()
    private _RcspImplMap = new Map<string, RCSPProtocol.RcspImpl>()
    private _ReconnectMap = new Map<string, Reconnect>()
    private _AuthMap = new Map<string, Auth>()
    private _RcspCallbackManager = new RCSPProtocol.RcspCallbackManager()
    private _OTAWrapperOption: OTAWrapperOption
    constructor(otaWrapperOption: OTAWrapperOption) {
        this._OTAWrapperOption = otaWrapperOption
    }
    /**初始化成功**/
    isRCSPInit(device: BluetoothDevice): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            const rcspImpl = this._getRCSPImpl(device.deviceId)
            if (rcspImpl) {
                if (rcspImpl.getDeviceInfo(device)) {
                    resolve(true)
                } else {
                    reject(new RCSPProtocol.RCSPError(RCSPProtocol.RCSPErrorCode.ERR_OTHER, "No DeviceInfo."))
                }
            } else {
                reject(new RCSPProtocol.RCSPError(RCSPProtocol.RCSPErrorCode.ERR_OTHER, "No has RCSPImpl."))
            }
        })
    }
    /**是否需要强制升级**/
    isNeedMandatoryUpgrade(device: BluetoothDevice): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            const rcspImpl = this._getRCSPImpl(device.deviceId)
            if (rcspImpl) {
                const deviceInfo = rcspImpl.getDeviceInfo(device)
                if (deviceInfo) {
                    resolve(deviceInfo.mandatoryUpgradeFlag == RCSPProtocol.CmdGetTargetInfo.FLAG_MANDATORY_UPGRADE)
                } else {
                    reject(new RCSPProtocol.RCSPError(RCSPProtocol.RCSPErrorCode.ERR_OTHER, "No DeviceInfo."))
                }
            } else {
                reject(new RCSPProtocol.RCSPError(RCSPProtocol.RCSPErrorCode.ERR_OTHER, "No has RCSPImpl."))
            }
        })
    }
    /**
     * 开始升级
     */
    public startOTA(device: BluetoothDevice, otaConfig: OTAConfig, onUgradeCallback: OTAUpgradeCallback) {
        const rcspImpl = this._getRCSPImpl(device.deviceId)
        if (rcspImpl == undefined) {
            loge('rcspImpl undefined')
            return
        }
        const usingDevice = rcspImpl.getUsingDevice()
        loge('rcspImpl usingDevice')
        if (usingDevice == null) return
        // fixme 考虑到后续开发人员可能不会注意有没有初始化成功，可能需要处理
        if (rcspImpl.getDeviceInfo(usingDevice) == undefined) {
            loge('rcspImpl 没有初始化成功')
            return
        }
        if (otaConfig.updateFileData == undefined || otaConfig.updateFileData.length == 0) {
            return
        }
        const OTAManager = new RcspOTAManager(rcspImpl)
        this._RcspOTAManagerMap.set(device.deviceId, OTAManager)
        try {
            OTAManager.startOTA(otaConfig, {
                onStartOTA: () => {
                    onUgradeCallback.onStartOTA()
                },
                onNeedReconnect: (reConnectMsg: ReConnectMsg) => {
                    const reconnectResultCallback: OnResultCallback<string> = {
                        onResult: (deviceId) => {
                            // 回连成功应该把新设备和连接状态同步给 rcspOTA
                            this._ReconnectMap.delete(deviceId)
                            const rcspImpl = this._getRCSPImpl(deviceId)
                            if (rcspImpl) {
                                OTAManager.updateRcspOpImpl(rcspImpl)
                            }
                        },
                        onError: (code: number, message: string) => {//不用处理，库里会自动超时
                        }
                    }
                    onUgradeCallback.onNeedReconnect(reConnectMsg, reconnectResultCallback)
                    logi("onNeedReconnect: " + JSON.stringify(reConnectMsg));
                    logd(" reConnectMsg.isSupportNewReconnectADV : " + reConnectMsg.isSupportNewReconnectADV);
                    if (this._OTAWrapperOption.isInnerReconnect()) {//使用内部回连
                        // const oldDeviceMac = OTAManager?.getCurrentOTADeviceMac()?.toUpperCase().replace(/:/g, "")
                        const oldDeviceMac = reConnectMsg.deviceBleMac?.toUpperCase().replace(/:/g, "")
                        const oldDeviceMacReverse = oldDeviceMac?.split('')?.reverse()?.join('')//mac反转
                        const oldDeviceMacPrefix = oldDeviceMac?.substring(0, 10)
                        logd(" oldDeviceMac " + oldDeviceMac);
                        //###实现回连，这一部分可以自己实现
                        const op: ReconnectOp = {
                            startScanDevice: () => {//开始扫描设备
                                this.sanDevice()
                            },
                            isReconnectDevice: (scanDevice: BluetoothDevice) => { //判断是不是回连设备
                                let result = false;
                                const oldDevice = OTAManager?.getCurrentOTADevice()
                                if (reConnectMsg.isSupportNewReconnectADV) {//使用新回连方式，需要通过rcsp协议获取到设备的ble地址
                                    if (oldDeviceMac != undefined && oldDeviceMac !== "") {
                                        const advertisStr = ab2hex(scanDevice.advertisData).toUpperCase()
                                        const index = advertisStr.indexOf("D60541544F4C4A");
                                        if (index != -1 && scanDevice.advertisData) {
                                            const unit8Array = new Uint8Array(scanDevice.advertisData)
                                            const macArray = unit8Array.slice((index / 2) + 8, (index / 2) + 14).reverse()
                                            // logd("新回连广播包 newMAC : " + ab2hex(macArray).toUpperCase())
                                            result = oldDeviceMac == hex2Mac(macArray).toUpperCase()
                                        }
                                        //优化打印
                                        if (advertisStr.includes(oldDeviceMac) || (oldDeviceMacReverse != undefined && advertisStr.includes(oldDeviceMacReverse))) {//模糊匹配(广播包中包含旧设备地址)，回连打印太多有问题
                                            logv("newReconnect,mac:" + scanDevice.deviceId + ", result: " + result + ",rawData:" + ab2hex(scanDevice.advertisData))
                                        } else if (oldDeviceMacPrefix != undefined && scanDevice.deviceId.toUpperCase().includes(oldDeviceMacPrefix)) {//模糊匹配(mac地址中部分相似)，回连打印太多有问题
                                            logv("newReconnect,mac:" + scanDevice.deviceId + ", result: " + result + ",rawData:" + ab2hex(scanDevice.advertisData))
                                        }
                                        // logd("新回连广播包 oldMAC : " + oldDeviceMac + " scanMAC: " + scanDevice.deviceId + " result: " + result + " rawData: " + ab2hex(scanDevice.advertisData));
                                    } else {
                                        // loge("RCSP协议未拿到设备的BLE地址")
                                    }
                                } else {//旧回连方式，deviceId相同即可
                                    // result = oldDevice!.deviceId == scanDevice.deviceId
                                    if (oldDevice != undefined) {
                                        if (oldDevice.deviceId == scanDevice.deviceId) {
                                            result = true
                                        }
                                        const oldDeviceDeviceIdPrefix = oldDevice.deviceId.substring(0, 10)
                                        if (oldDeviceDeviceIdPrefix != undefined && scanDevice.deviceId.toUpperCase().includes(oldDeviceDeviceIdPrefix)) {//模糊匹配(mac地址中部分相似)，回连打印太多有问题
                                            logv("oldReconnect,mac:" + scanDevice.deviceId + ", result: " + result)
                                        }
                                    }
                                    // logd("旧方式回连 : oldMAC: " + oldDevice!.deviceId + " scanMAC: " + scanDevice.deviceId + " result: " + result);
                                }
                                return result
                            },
                            connectDevice: (device: BluetoothDevice) => {//连接设备
                                this.connectDevice(device)
                            }
                        }
                        const callback: ReconnectCallback = {
                            onReconnectSuccess: (device: BluetoothDevice) => {
                                logi("onReconnectSuccess : " + device);
                                reconnectResultCallback.onResult(device.deviceId)
                            },
                            onReconnectFailed: () => {//不用处理，库里会自动超时
                                loge("onReconnectFailed : ");
                                this._ReconnectMap.delete(device.deviceId)
                                reconnectResultCallback.onError(OTAError.ERROR_OTA_RECONNECT_DEVICE_TIMEOUT, getErrorDesc(OTAError.ERROR_OTA_RECONNECT_DEVICE_TIMEOUT, ""))
                            },
                            onDeviceConnectFailed: (dev) => {//连接失败，刷新扫描
                                this.sanDevice()
                            },
                            onDeviceConnectDisconnected: (dev) => {//连接断开，刷新扫描
                                this.sanDevice()
                            }
                        }
                        const reconnect = new Reconnect(op, callback)
                        this._ReconnectMap.set(device.deviceId, reconnect)
                        reconnect.startReconnect(OTAImpl.RECONNECT_DEVICE_TIMEOUT);
                    }
                },
                onProgress: (type: UpgradeType, progress: number) => {
                    onUgradeCallback.onProgress(type, progress)
                },
                onStopOTA: () => {
                    onUgradeCallback.onStopOTA()
                    OTAManager.release()
                    //重新扫描设备
                    const deviceId = OTAManager.getCurrentOTADevice()?.deviceId
                    if (deviceId) {
                        this.disconnectDevice(new BluetoothDevice(deviceId))
                    }
                    this.sanDevice()
                    this._RcspOTAManagerMap.delete(device.deviceId)
                },
                onCancelOTA: () => {
                    onUgradeCallback.onCancelOTA()
                    OTAManager.release()
                    const deviceId = OTAManager.getCurrentOTADevice()?.deviceId
                    if (deviceId) {
                        this.disconnectDevice(new BluetoothDevice(deviceId))
                    }
                    this.sanDevice()
                    this._RcspOTAManagerMap.delete(device.deviceId)
                },
                onError: (error: number, message: string) => {
                    onUgradeCallback.onError(error, message)
                    const reconnect = this._ReconnectMap.get(device.deviceId)
                    reconnect?.stopReconnect()
                    loge('升级失败: 错误code：' + RCSPProtocol.toHexWithPrefix(error) + " 信息：" + message)
                    const deviceId = OTAManager.getCurrentOTADevice()?.deviceId
                    if (deviceId) {
                        this.disconnectDevice(new BluetoothDevice(deviceId))
                    }
                    OTAManager.release()
                    this._RcspOTAManagerMap.delete(device.deviceId)
                }
            })
        } catch (error: any) {
            let errorString = error.stack
            loge('升级异常闪退，' + errorString)
        }
    }
    /**
     * 取消升级（仅双备份支持）
     */
    public cancelOTA(device: BluetoothDevice) {
        const OTAManager = this._RcspOTAManagerMap.get(device.deviceId)
        OTAManager?.cancelOTA()
    }
    /**
     * 是否正在升级
     */
    public isOTA(device: BluetoothDevice) {
        const OTAManager = this._RcspOTAManagerMap.get(device.deviceId)
        return OTAManager?.isOTA()
    }
    /**
     * 发自定义命令
     */
    public sendCustomCmd(device: BluetoothDevice, data: Uint8Array, callback: RCSPProtocol.CommandCallback<RCSPProtocol.CommandBase> | null) {
        const rcspImpl = this._getRCSPImpl(device.deviceId)
        if (rcspImpl == undefined) {
            return false
        }
        const usingDevice = rcspImpl.getUsingDevice()
        if (usingDevice == null) return false
        if (rcspImpl.getDeviceInfo(usingDevice) == undefined) {
            loge('rcspImpl 没有初始化成功')
            return false
        }
        const customParam = new RCSPProtocol.ParamBase()
        customParam.setData(data)
        const customCmd = new RCSPProtocol.CmdCustom(customParam);
        rcspImpl.sendRCSPCommand(usingDevice, customCmd, 20 * 1000, callback)
        return true
    }
    /**获取设备信息**/
    getDeviceInfo(device: BluetoothDevice): RCSPProtocol.DeviceInfo | undefined {
        const rcspImpl = this._getRCSPImpl(device.deviceId)
        return rcspImpl?.getDeviceInfo(device)
    }
    /**
    * 注册RCSP回调
    */
    public registerRcspCallback(callback: OTAWrapperListenner): void {
        this._RcspCallbackManager.registerRcspCallback(callback)
    }
    /**
     * 注销RCSP回调
     */
    public unregisterRcspCallback(callback: OTAWrapperListenner): void {
        this._RcspCallbackManager.unregisterRcspCallback(callback)
    }
    /**
     * 释放
     */
    public release() {
        this._RcspOTAManagerMap.forEach(element => {
            element.release()
        });
        this._RcspOTAManagerMap.clear()
        if (this._OTAWrapperOption.getRCSPImpl == undefined) {//内部实现管理RCSPImpl
            this._RcspImplMap.forEach(element => {
                element.destroy()
            });
            this._RcspImplMap.clear()
        }
        this._ReconnectMap.forEach(element => {
            element.stopReconnect()
        });
        this._ReconnectMap.clear()
        this._AuthMap.clear()
        this._RcspCallbackManager.release()
    }
    /**************************** OTAWrapperOption  ****************************/
    /**是否需要认证**/
    isUseAuth(): boolean {
        return this._OTAWrapperOption.isUseAuth()
    }
    /**是否需要回连。 在上层进行回连，就不需要内部回连。**/
    isInnerReconnect(): boolean {
        return this._OTAWrapperOption.isInnerReconnect()
    }
    /**扫描设备**/
    sanDevice(): void {
        this._OTAWrapperOption.sanDevice()
    }
    /**连接设备**/
    connectDevice(device: BluetoothDevice): void {
        this._OTAWrapperOption.connectDevice(device)
    }
    /**断开设备**/
    disconnectDevice(device: BluetoothDevice): void {
        this._OTAWrapperOption.disconnectDevice(device)
    }
    /**发送数据**/
    sendData(device: BluetoothDevice, data: Uint8Array): void {
        this._OTAWrapperOption.sendData?.(device, data)
    }
    /**************************** 事件触发  ****************************/

    /**扫描设备停止**/
    onSanDeviceStop(): void {
        this._ReconnectMap.forEach(reconnect => {
            reconnect.onScanStop()
        })
    }
    /**发现设备**/
    onScanFound(devices: BluetoothDevice[]): void {
        this._ReconnectMap.forEach(reconnect => {
            reconnect.onDiscoveryDevices(devices)
        })
    }
    /**蓝牙连接成功**/
    onConnectStateSuccess(dev: BluetoothDevice): void {
        if (this.isUseAuth()) {
            const cacheAuth = this._AuthMap.get(dev.deviceId)
            if (cacheAuth == undefined) {//没有缓存
                let auth = new Auth()
                this._AuthMap.set(dev.deviceId, auth)
                let authListener: AuthListener = {
                    onSendData: (deviceId: string, data: ArrayBuffer) => {
                        this.sendData(new BluetoothDevice(deviceId), new Uint8Array(data))
                    },
                    onAuthSuccess: () => {
                        logi(" 认证成功");
                        // @note 等设备初始化成功
                        this._onDeviceConnected(dev)
                        this._AuthMap.delete(dev.deviceId)
                    },
                    onAuthFailed: () => {
                        this._onDeviceConnected(dev)
                        this._AuthMap.delete(dev.deviceId)
                    },
                }
                auth.startAuth(dev.deviceId, authListener)
            }
        } else {
            this._onDeviceConnected(dev)
        }
    }
    /**蓝牙连接断开**/
    onConnectStateDisconnect(dev: BluetoothDevice): void {
        this._onDeviceDisconnected(dev)
        if (this._OTAWrapperOption.getRCSPImpl == undefined) {//内部实现管理RCSPImpl
            Array.from(this._RcspImplMap.values()).forEach(element => {
                element.transmitDeviceStatus(new RCSPProtocol.Device(dev.deviceId), RCSPProtocol.Connection.CONNECTION_DISCONNECT)
            });
        }
        this._ReconnectMap.forEach(reconnect => {
            reconnect.onDeviceConnectDisconnected(dev)
        })
    }
    /**蓝牙连接失败**/
    onConnectStateFailed(dev: BluetoothDevice): void {
        this._ReconnectMap.forEach(reconnect => {
            reconnect.onDeviceConnectFailed(dev)
        })
    }
    /**RCSP初始化成功**/
    onRcspInitSuccess(dev: BluetoothDevice): void {
        if (this._OTAWrapperOption.getRCSPImpl != undefined) {//外部实现管理RCSPImpl
            this._getRCSPImpl(dev.deviceId)?.addOnRcspCallback(this._RcspCallbackManager)
            this._onRcspInit(dev, true)
        }
    }
    /**收到数据**/
    onReceiveData(dev: BluetoothDevice, data: ArrayBuffer): void {
        this._AuthMap.forEach(auth => {
            auth.handlerAuth(dev.deviceId, data)
        })
        this._getRCSPImpl(dev.deviceId)?.transmitDeviceData(new RCSPProtocol.Device(dev.deviceId), new Uint8Array(data))
    }
    private _getRCSPImpl(deviceId: string) {
        if (this._OTAWrapperOption.getRCSPImpl == undefined) {//内部实现管理RCSPImpl
            return this._RcspImplMap.get(deviceId)
        } else {
            return this._OTAWrapperOption.getRCSPImpl(new BluetoothDevice(deviceId))
        }
    }
    private _onDeviceConnected(device: BluetoothDevice) {//蓝牙已连接,已认证
        if (this._OTAWrapperOption.getRCSPImpl == undefined) {//内部实现管理RCSPImpl
            const rcspImpl = new RCSPProtocol.RcspImpl()
            this._RcspImplMap.set(device.deviceId, rcspImpl)
            rcspImpl.setOnSendDataCallback({
                sendDataToDevice: (device: RCSPProtocol.Device, data: Uint8Array): boolean => {
                    this.sendData(new BluetoothDevice(device.deviceId), data)
                    return true
                }
            })
            const onRcspCallback: RCSPProtocol.OnRcspCallback = new RCSPProtocol.OnRcspCallback()
            onRcspCallback.onRcspInit = (device?: RCSPProtocol.Device | null, isInit?: boolean) => {
                this._onRcspInit(device, isInit)
            }
            rcspImpl.addOnRcspCallback(onRcspCallback)
            rcspImpl.addOnRcspCallback(this._RcspCallbackManager)
            rcspImpl.transmitDeviceStatus(new RCSPProtocol.Device(device.deviceId, device.name), RCSPProtocol.Connection.CONNECTION_CONNECTED)
        } else {
            // 这里有异步问题可能不一定能addOnRcspCallback。如果getRCSPImpl 是空。
            //有一种情况，OTAWrapper和 外面sdk一直被初始化。另一边还没把RcspImpl初始化，这边就调用了
            // rcspImpl.addOnRcspCallback(this._RcspCallbackManager)
            // this._getRCSPImpl(device.deviceId)?.addOnRcspCallback(this._RcspCallbackManager)
        }
    }
    private _onDeviceDisconnected(device: BluetoothDevice) {
        if (this._OTAWrapperOption.getRCSPImpl == undefined) {//内部实现管理RCSPImpl
            const rcspImpl = this._RcspImplMap.get(device.deviceId)
            if (rcspImpl) {
                rcspImpl.transmitDeviceStatus(new RCSPProtocol.Device(device.deviceId, device.name), RCSPProtocol.Connection.CONNECTION_DISCONNECT)
                rcspImpl.setOnSendDataCallback(undefined)
                rcspImpl.destroy()
                this._RcspImplMap.delete(device.deviceId)
            }
            this._AuthMap.delete(device.deviceId)
        } else {
        }
    }
    // Rcsp回调-初始化成功
    private _onRcspInit(device?: RCSPProtocol.Device | null, isInit?: boolean): void {
        const deviceId = device?.deviceId
        if (deviceId && device) {
            const dev = new BluetoothDevice(deviceId)
            if (isInit == true) {
                // const rcspImpl = this._RcspImplMap.get(deviceId)
                const rcspImpl = this._getRCSPImpl(deviceId)
                if (rcspImpl) {
                    const deviceInfo = rcspImpl?.getDeviceInfo(device)
                    logi(" Rcsp回调-初始化成功" + JSON.stringify(deviceInfo));
                    this._ReconnectMap.forEach(reconnect => {
                        reconnect.onDeviceConnected(dev)
                    })

                    // const rcspImpl = this._getRCSPImpl(device.deviceId)
                    //                 if (rcspImpl) {
                    //                     OTAManager.updateRcspOpImpl(rcspImpl)
                    // }
                } else {//没有设备信息
                    loge(" Rcsp初始化失败，没有设备信息,断开设备");
                    this.disconnectDevice(dev)
                }
            } else {//未初始化成功
                loge(" Rcsp初始化失败，断开设备");
                this.disconnectDevice(dev)
            }
        }
    }
}
export function hex2Mac(buffer: ArrayBuffer) {
    const hexArr = Array.prototype.map.call(
        new Uint8Array(buffer),
        function (bit) {
            return ('00' + bit.toString(16)).slice(-2)
        }
    )
    return hexArr.join('')
}