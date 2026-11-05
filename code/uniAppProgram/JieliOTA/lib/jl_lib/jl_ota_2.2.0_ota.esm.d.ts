/****杰理OTA库 version 2.2.0 ****/
import { RCSPErrorCode, RcspImpl, BtDevice, OnRcspCallback, CommandCallback, Command, DeviceInfo, LogHub } from './jl_rcsp_2.2.0_ota.esm.js';

/** OTA接口 */
interface IOtaOp {
    /** 是否已连接设备 */
    isDeviceConnected(): boolean;
    /** 切换通讯方式 */
    changeCommunicationWay(communicationWay: number, isSupportNewRebootWay: boolean, callback: OnResultCallback<number>): void;
    /** 读取文件头信息偏移 */
    readUpgradeFileFlag(callback: OnResultCallback<FileOffsetInfo>): void;
    /** 查询设备是否可升级 */
    inquiryDeviceCanOTA(data: Uint8Array, callback: OnResultCallback<number>): void;
    /** 非RCSP库不用实现该方法————调整RCSP库的设备收数据的MTU(App的缓存)，让数据可以成功发出 */
    changeReceiveMtu(): void;
    /** 进入升级模式 */
    enterUpdateMode(callback: OnResultCallback<number>): void;
    /** 退出升级模式 */
    exitUpdateMode(callback: OnResultCallback<number>): void;
    /** 读取设备升级状态 */
    queryUpdateResult(callback: OnResultCallback<number>): void;
    /** 重启或关闭设备 */
    rebootDevice(callback: OnResultCallback<boolean> | null): void;
    /** 设置TWS设备通知 */
    stopNotifyADV(callback: OnResultCallback<boolean>): void;
    /** 回复发送升级固件数据块 */
    receiveFileBlock(offset: number, len: number, data: Uint8Array, callback: OnResultCallback<boolean>): void;
    /** 释放 */
    release(): void;
}

/** 设备升级相关信息 */
declare class DeviceUpgradeInfo {
    readonly isSupportDoubleBackup: boolean;
    readonly isNeedBootLoader: boolean;
    readonly isMandatoryUpgrade: boolean;
    constructor(isSupportDoubleBackup: boolean, isNeedBootLoader: boolean, isMandatoryUpgrade: boolean);
}

/** 回连信息*/
declare class ReconnectInfo {
    isSupportNewReconnectADV?: boolean;
    /** rcsp协议中的BLE_Mac地址  */
    deviceBleMac?: string;
    /** rcsp协议中的SPP_Mac地址  */
    deviceSppMac?: string;
    copy(): ReconnectInfo;
    toString(): string;
}

/** 升级流程的回调 */

interface OnUpgradeCallback {
    /** OTA开始*/
    onStartOTA: () => void;
    /**
     * 读取升级数据并返回
     * @param offset 数据偏移
     * @param size 数据大小
     * @returns 字节数组
     */
    onReadData: (offset: number, size: number) => Uint8Array;
    /** 执行断开设备
     * Spp设备需实现断开设备，
     * Ble设备不需要实现断开设备
     * */
    onExecuteDisconnectDevice: () => void;
    /**需要回连的回调
     * <p>
     * 注意: 1.仅连接通讯通道（BLE or  SPP）
     * 2.用于单备份OTA</p>
     *
     * @param reConnectMsg 回连设备信息
     */
    onNeedReconnect: (reConnectMsg: ReconnectInfo) => void;
    /** 进度回调
     *
     * @param type     类型
     * @param progress 进度
     */
    onProgress: (type: UpgradeType, progress: number) => void;
    /** OTA结束*/
    onStopOTA: () => void;
    /** OTA取消*/
    onCancelOTA: () => void;
    /** OTA失败
     * @param error   错误码
     * @param message 错误信息
     */
    onError: (error: number, message: string) => void;
}

/** OTA 配置 */
declare class OtaConfig {
    static readonly COMMUNICATION_WAY_BLE = 0;
    static readonly COMMUNICATION_WAY_SPP = 1;
    static readonly COMMUNICATION_WAY_USB = 2;
    /** 通讯方式*/
    communicationWay: number;
    /** 是否支持新的回连方式*/
    isSupportNewRebootWay: boolean;
    toString(): string;
}

/** 文件偏移 */
declare class FileOffsetInfo {
    readonly offset: number;
    readonly len: number;
    constructor(offset: number | undefined, len: number | undefined);
    toString(): string;
}

interface OnResultCallback<T> {
    /**回调结果
     *
     * @param device 操作设备
     * @param result 结果
     */
    onResult(result: T): void;
    /**回调错误结果
     *
     * @param device  操作设备
     * @param code    错误码 (参考{@})
     * @param message 错误信
     */
    onError(code: number, message: string): void;
}

/** 更新类型 */
declare enum UpgradeType {
    UPGRADE_TYPE_UNKNOWN = -1,
    UPGRADE_TYPE_CHECK_FILE = 0,
    UPGRADE_TYPE_FIRMWARE = 1
}
declare class UpgradeResultCode {
    /** 升级完成 */
    static readonly _UPGRADE_RESULT_COMPLETE = 0;
    /** 升级完成 */
    static readonly _UPGRADE_RESULT_DATA_CHECK_ERROR = 1;
    /** 升级完成 */
    static readonly _UPGRADE_RESULT_FAIL = 2;
    /** 加密key不匹配 */
    static readonly _UPGRADE_RESULT_ENCRYPTED_KEY_NOT_MATCH = 3;
    /** 升级文件出错 */
    static readonly _UPGRADE_RESULT_UPGRADE_FILE_ERROR = 4;
    /** 升级类型出错 */
    static readonly _UPGRADE_RESULT_UPGRADE_TYPE_ERROR = 5;
    /** 升级过程中出现长度错误 */
    static readonly _UPGRADE_RESULT_ERROR_LENGTH = 6;
    /** 出现flash读写错误 */
    static readonly _UPGRADE_RESULT_FLASH_READ = 7;
    /** 升级过程中指令超时 */
    static readonly _UPGRADE_RESULT_CMD_TIMEOUT = 8;
    /** 相同升级文件 */
    static readonly _UPGRADE_RESULT_SAME_FILE = 9;
    /** 下载boot loader完成 */
    static readonly _UPGRADE_RESULT_DOWNLOAD_BOOT_LOADER_SUCCESS = 128;
}
declare class InquiryCanOTAResultCode {
    /**
     * 可以更新
     */
    static readonly _RESULT_CAN_UPDATE = 0;
    /**
     * 设备低电压
     */
    static readonly _RESULT_DEVICE_LOW_VOLTAGE_EQUIPMENT = 1;
    /**
     * 升级固件信息错误
     */
    static readonly _RESULT_FIRMWARE_INFO_ERROR = 2;
    /**
     * 升级文件的固件版本一致
     */
    static readonly _RESULT_FIRMWARE_VERSION_NO_CHANGE = 3;
    /**
     * TWS未连接
     */
    static readonly _RESULT_TWS_NOT_CONNECT = 4;
    /**
     * 耳机未在充电仓
     */
    static readonly _RESULT_HEADSET_NOT_IN_CHARGING_BIN = 5;
}

/** OTA错误码 */
declare class OtaError extends RCSPErrorCode {
    /**
     * 错误码划分
     * 0x1000 ~ 0x1FFF : 定义通用错误码
     * 0x2000 ~ 0x2FFF : 定义连接错误码
     * 0x3000 ~ 0x3FFF : 定义通讯错误码
     * 0x4000 ~ 0x4FFF : 定义文件操作错误码
     * 0x5000 ~ 0x5FFF : 定义网路模块错误码
     * 0x6000 ~ 0x6FFF : 定义OTA错误码
     */
    /** 0x6001 (24577) (ERR_OTA_DEVICE_LOW_VOLTAGE)Equipment low voltage*/
    static readonly ERR_OTA_DEVICE_LOW_VOLTAGE = 24577;
    /** 0x6002 (24578) (升级固件信息错误)Upgrade firmware information error*/
    static readonly ERR_OTA_FIRMWARE_INFO_ERROR = 24578;
    /** 0x6003 (24579) (升级文件的固件版本一致)The firmware version of the upgrade file is consistent*/
    static readonly ERR_OTA_FIRMWARE_VERSION_NO_CHANGE = 24579;
    /** 0x6004 (24580) (TWS未连接)TWS not connected*/
    static readonly ERR_OTA_TWS_NOT_CONNECT = 24580;
    /** 0x6005 (24581) (耳机未在充电仓)The earphones are not in the charging compartment*/
    static readonly ERR_OTA_HEADSET_NOT_IN_CHARGING_BIN = 24581;
    /** 0x6006 (24582) (升级数据校验出错)Upgrade data verification error*/
    static readonly ERR_OTA_DATA_CHECK_ERROR = 24582;
    /** 0x6007 (24583) (升级失败)Upgrade failed*/
    static readonly ERR_OTA_FAIL = 24583;
    /** 0x6008 (24584) (加密key不匹配)Encryption key mismatch*/
    static readonly ERR_OTA_ENCRYPTED_KEY_NOT_MATCH = 24584;
    /** 0x6009 (24585) (升级文件出错)Upgrade file error*/
    static readonly ERR_OTA_UPGRADE_FILE_ERROR = 24585;
    /** 0x600A (24586) (升级类型出错)Upgrade type error*/
    static readonly ERR_OTA_UPGRADE_TYPE_ERROR = 24586;
    /** 0x600B (24587) (升级过程中出现长度错误)Length error occurred during the upgrade process*/
    static readonly ERR_OTA_LENGTH_OVER = 24587;
    /** 0x600C (24588) (出现flash读写错误)Flash read/write error occurred*/
    static readonly ERR_OTA_FLASH_IO_EXCEPTION = 24588;
    /** 0x600D (24589) (升级过程中指令超时)Command timeout during upgrade process*/
    static readonly ERR_OTA_CMD_TIMEOUT = 24589;
    /** 0x600E (24590) (正在OTA)OTA in progress*/
    static readonly ERR_OTA_IN_PROGRESS = 24590;
    /** 0x600F (24591) (等待升级命令超时)Waiting for ota command timeout*/
    static readonly ERR_OTA_COMMAND_TIMEOUT = 24591;
    /** 0x6010 (24592) (回连设备超时)Reconnect device timeout*/
    static readonly ERR_OTA_RECONNECT_DEVICE_TIMEOUT = 24592;
    /** 0x6011 (24593) (用户取消升级)User cancels upgrade*/
    static readonly ERR_OTA_USE_CANCEL = 24593;
    /** 0x6012 (24594) (升级文件相同)Upgrade files are the same*/
    static readonly ERR_OTA_SAME_FILE = 24594;
    static getErrorDesc(errorCode: number, prefix?: string | undefined, explain?: string | undefined): string;
}

declare class OTAImpl {
    static readonly WAITING_CMD_TIMEOUT: number;
    static readonly WAITING_DEVICE_OFFLINE_TIMEOUT: number;
    static readonly RECONNECT_DEVICE_DELAY = 1000;
    static readonly RECONNECT_DEVICE_TIMEOUT: number;
    private _IOTAOp;
    _upgradeCallback?: OnUpgradeCallback;
    private _TotalOTaSize;
    private _CurrentOtaSize;
    private _OTAConfig;
    private _ReConnectMsg;
    private _DeviceUpgradeInfo;
    private _OTADeviceBleMac;
    private _OTADeviceSppMac;
    private _TaskTimer;
    private _ReconnectTimer;
    private _WaitDeviceOffLineTimer;
    constructor(iOTAOp: IOtaOp);
    release(): void;
    /** isOTA 是否正在OTA*/
    isOTA(): boolean;
    /** 开始OTA流程  */
    startOTA(config: OtaConfig, callback: OnUpgradeCallback): void;
    /** 取消OTA流程
     * 说明：如果是单备份方案，此接口无效；如果是双备份方案，此接口才有效
     * @return 操作结果 (true -- 操作成功， false -- 操作失败)
     */
    cancelOTA(): boolean;
    /** 设备初始化*/
    onDeviceInit(deviceUpgradeInfo: DeviceUpgradeInfo | undefined, isInit: boolean | undefined): void;
    /** 设备断开通知*/
    onDeviceDisconnect(): void;
    /** 设备通知文件大小*/
    notifyUpgradeSize(totalSize: number, currentSize: number): void;
    /** 设备获取升级文件块  */
    gainFileBlock(offset: number, len: number): void;
    /**
     * 设置RCSP的BLEMac地址
     */
    setDeviceBLEMac(deviceBLEMac: string | undefined): void;
    /**
     * 设置RCSP的SppMac地址
     */
    setDeviceSppMac(deviceSppMac: string | undefined): void;
    private _setOTAConfig;
    /** 读取升级标识  */
    private _readUpgradeFileFlag;
    /** 携带数据给设备校验  */
    private _inquiryDeviceCanOTA;
    /** 检查升级环境  */
    private _checkUpdateEnvironment;
    /** 读取文件块  */
    private _readBlockData;
    /** 读取设备升级状态  */
    private _queryUpgradeResult;
    /** 进入升级状态  */
    private _enterUpdateMode;
    /** 准备回连设备  */
    private _readyToReconnectDevice;
    private _checkIsNotOTA;
    private _setReConnectMsg;
    private _resetOTAParam;
    private _removeAllTimer;
    private _startWaitDeviceOffLineTimeOut;
    private _stopWaitDeviceOffLineTimeOut;
    private _startTimeoutTask;
    private _stopTimeoutTask;
    private _startReConnectDeviceTimeout;
    private _stopReConnectDeviceTimeout;
    private _callbackOTAStart;
    private _callbackProgress;
    private _callbackTypeAndProgress;
    private _callbackReConnectDevice;
    private _callbackOTAStop;
    private _callbackOTACancel;
    private _callbackExecuteDisconnectDevice;
    private _callbackOTAError;
    private _getCurrentProgress;
    private _getUpgradeTypeByCode;
}

declare class RcspOTAManager {
    private _RcspImpl;
    private _OTAImpl;
    private _RcspOTA;
    constructor(rcspImpl: RcspImpl);
    /**
     * releas
     */
    release(): void;
    startOTA(config: OtaConfig, callback: OnUpgradeCallback): void;
    cancelOTA(): void;
    isOTA(): boolean;
    getCurrentOTADevice(): BtDevice | null;
    updateRcspImpl(rcspImpl: RcspImpl): void;
}

/**
 * Des:
 * author: zhanghuanming@zh-jieli.com
 * date: 2024/7/24
 * Copyright: Jieli Technology
 * Modify date:
 * Modified by:
 */
declare class BluetoothDevice {
    deviceType: number;
    /** 当前蓝牙设备的信号强度，单位 dBm */
    RSSI: number;
    /** 当前蓝牙设备的广播数据段中的 ManufacturerData 数据段。 */
    advertiseData?: ArrayBuffer;
    /** 当前蓝牙设备的广播数据段中的 ServiceUUIDs 数据段 */
    advertiseServiceUUIDs?: string[];
    /** 当前蓝牙设备是否可连接（ Android 8.0 以下不支持返回该值 ） */
    connectable: boolean;
    /** 蓝牙设备 id */
    deviceId: string;
    /** 当前蓝牙设备的广播数据段中的 LocalName 数据段 */
    localName: string;
    /** 蓝牙设备名称，某些设备可能没有 */
    name?: string;
    /** 当前蓝牙设备的广播数据段中的 ServiceData 数据段 */
    serviceData: object | undefined | string;
    constructor(deviceId: string);
    equals(o: BluetoothDevice | null): boolean;
}

/**
 * Des:
 * author: zhanghuanming@zh-jieli.com
 * date: 2024/7/24
 * Copyright: Jieli Technology
 * Modify date:
 * Modified by:
 */

interface OTAWrapperOption {
    /**是否需要认证。 在上层已经认证过，就不需要认证。**/
    isUseAuth: () => boolean;
    /**是否需要回连。 在上层进行回连，就不需要内部回连。**/
    isInnerReconnect: () => boolean;
    /**扫描设备--一定是BLE设备，目前BootLoader设备只有BLE类型**/
    sanDevice: () => void;
    /**连接设备--一定是BLE设备，目前BootLoader设备只有BLE类型**/
    connectDevice: (device: BluetoothDevice) => void;
    /**断开设备**/
    disconnectDevice: (device: BluetoothDevice) => void;
    /**发送数据(非必须实现)，
     * 必须实现的情况：
     * - 1.内部创建并管理RCSPImpl, 即OTAWrapperOption.getRCSPImpl未实现
     * - 2.需要进行认证, 即OTAWrapperOption.isUseAuth返回false
     * **/
    sendData?: (device: BluetoothDevice, data: Uint8Array) => void;
    /**获取RCSPImpl(非必须实现)。
     * - 上层管理RCSPImpl则需要实现,如使用jl-rcsp-op时需要实现。
     * - 上层不管理RCSPImpl则不需要实现，由内部创建并管理RCSPImpl
     *  **/
    getRCSPImpl?: (device: BluetoothDevice) => RcspImpl | undefined;
}

/**
 * Des:
 * author: zhanghuanming@zh-jieli.com
 * date: 2024/7/24
 * Copyright: Jieli Technology
 * Modify date:
 * Modified by:
 */

declare class OTAUpgradeCallback {
    /** OTA开始*/
    onStartOTA: () => void;
    /** 执行断开设备.
     * Spp设备需实现断开设备，
     * Ble设备不需要实现断开设备.
     * */
    onExecuteDisconnectDevice: () => void;
    /**需要回连的回调
     * <p>
     * 注意: 1.仅连接通讯通道（BLE or  SPP）
     * 2.用于单备份OTA</p>
     *
     * @param reConnectMsg 回连设备信息
     * @param reconnectCallback 回连结果。
     */
    onNeedReconnect: (reConnectMsg: ReconnectInfo, reconnectCallback: OnResultCallback<string>) => void;
    /** 进度回调
     *
     * @param type     类型
     * @param progress 进度
     */
    onProgress: (type: UpgradeType, progress: number) => void;
    /** OTA结束*/
    onStopOTA: () => void;
    /** OTA取消*/
    onCancelOTA: () => void;
    /** OTA失败
     * @param error   错误码
     * @param message 错误信息
     */
    onError: (error: number, message: string) => void;
    /** 读取升级文件的数据
     */
    onReadData: (offset: number, size: number) => Uint8Array | undefined;
    /** 回调通知-RCSP初始化结果
     */
    onRCSPInit: (deviceId: string, isInit: boolean) => void;
}

/**
 * Des:
 * author: zhanghuanming@zh-jieli.com
 * date: 2024/7/24
 * Copyright: Jieli Technology
 * Modify date:
 * Modified by:
 */

declare class OTAWrapperListener extends OnRcspCallback {
}

/**
 * Des:
 * author: zhanghuanming@zh-jieli.com
 * date: 2024/7/24
 * Copyright: Jieli Technology
 * Modify date:
 * Modified by:
 */

interface IOTAWrapper {
    /**初始化成功**/
    isRCSPInit(device: BluetoothDevice): Promise<boolean>;
    /**是否需要强制升级**/
    isNeedMandatoryUpgrade(device: BluetoothDevice): Promise<boolean>;
    /**开始升级**/
    startOTA(device: BluetoothDevice, otaConfig: OtaConfig, onUpgradeCallback: OTAUpgradeCallback): void;
    /** 取消升级（仅双备份支持）*/
    cancelOTA(device: BluetoothDevice): void;
    /**是否正在升级**/
    isOTA(device?: BluetoothDevice | undefined): boolean | undefined;
    /**发送自定义命令**/
    sendCustomCmd(device: BluetoothDevice, data: Uint8Array, callback: CommandCallback<Command> | null): boolean;
    /**获取设备信息**/
    getDeviceInfo(device: BluetoothDevice): DeviceInfo | undefined;
    /**注册RCSP回调**/
    registerRcspCallback(callback: OTAWrapperListener): void;
    /**注销RCSP回调**/
    unregisterRcspCallback(callback: OTAWrapperListener): void;
    /**扫描设备停止**/
    onSanDeviceStop(): void;
    /**发现设备**/
    onScanFound(devices: BluetoothDevice[]): void;
    /**蓝牙连接成功-内部管理RCSPImpl调用**/
    onConnectStateSuccess(dev: BluetoothDevice): void;
    /**蓝牙连接断开**/
    onConnectStateDisconnect(dev: BluetoothDevice): void;
    /**蓝牙连接失败**/
    onConnectStateFailed(dev: BluetoothDevice): void;
    /**RCSP初始化成功-外部管理RCSPImpl调用**/
    onRcspInitSuccess(dev: BluetoothDevice): void;
    /**RCSP初始化失败-外部管理RCSPImpl调用**/
    onRcspInitFail(dev: BluetoothDevice): void;
    /**收到数据-内部管理RCSPImpl调用或者内部实现Auth调用**/
    onReceiveData(dev: BluetoothDevice, data: Uint8Array): void;
    /** 设置OTA配置 */
    setOTAWrapperOption(value: OTAWrapperOption): void;
    /** 获取OTA配置 */
    getOTAWrapperOption(): OTAWrapperOption;
    /** 释放 */
    release(): void;
}

declare var SUPPORT_RESET_FLAG: boolean;
declare class OTAWrapper implements OTAWrapperOption, IOTAWrapper {
    private _RcspOTAManagerMap;
    private _RcspOTAUpgradeCallbackMap;
    private _RcspImplMap;
    private _ReconnectMap;
    private _AuthMap;
    private _RcspCallbackManager;
    private _OTAWrapperOption;
    constructor(otaWrapperOption: OTAWrapperOption);
    /**是否初始化成功**/
    isRCSPInit(device: BluetoothDevice): Promise<boolean>;
    /**是否需要强制升级**/
    isNeedMandatoryUpgrade(device: BluetoothDevice): Promise<boolean>;
    /**
     * 开始升级
     */
    startOTA(device: BluetoothDevice, otaConfig: OtaConfig, otaUpgradeCallback: OTAUpgradeCallback): void;
    /**
     * 取消升级（仅双备份支持）
     */
    cancelOTA(device: BluetoothDevice): void;
    /**
     * 是否正在升级
     */
    isOTA(device?: BluetoothDevice | undefined): boolean;
    /**
     * 发自定义命令
     */
    sendCustomCmd(device: BluetoothDevice, data: Uint8Array, callback: CommandCallback<Command> | null): boolean;
    getDeviceInfo(device: BluetoothDevice): DeviceInfo | undefined;
    /**
     * 注册RCSP回调
     */
    registerRcspCallback(callback: OTAWrapperListener): void;
    /**
     * 注销RCSP回调
     */
    unregisterRcspCallback(callback: OTAWrapperListener): void;
    /**
     * 释放
     */
    release(): void;
    /** 设置OTA配置 */
    setOTAWrapperOption(value: OTAWrapperOption): void;
    /** 获取OTA配置 */
    getOTAWrapperOption(): OTAWrapperOption;
    /**************************** OTAWrapperOption  ****************************/
    /**是否需要认证**/
    isUseAuth(): boolean;
    /**是否需要回连。 在上层进行回连，就不需要内部回连。**/
    isInnerReconnect(): boolean;
    /**扫描设备**/
    sanDevice(): void;
    /**连接设备**/
    connectDevice(device: BluetoothDevice): void;
    /**断开设备**/
    disconnectDevice(device: BluetoothDevice): void;
    /**发送数据**/
    sendData(device: BluetoothDevice, data: Uint8Array): void;
    /**************************** 事件触发  ****************************/
    /**扫描设备停止**/
    onSanDeviceStop(): void;
    /**发现设备**/
    onScanFound(devices: BluetoothDevice[]): void;
    /**蓝牙连接成功**/
    onConnectStateSuccess(dev: BluetoothDevice): void;
    /**蓝牙连接断开**/
    onConnectStateDisconnect(dev: BluetoothDevice): void;
    /**蓝牙连接失败**/
    onConnectStateFailed(dev: BluetoothDevice): void;
    /**RCSP初始化成功**/
    onRcspInitSuccess(dev: BluetoothDevice): void;
    /**RCSP初始化失败**/
    onRcspInitFail(dev: BluetoothDevice): void;
    /**收到数据**/
    onReceiveData(dev: BluetoothDevice, data: Uint8Array): void;
    private _getRCSPImpl;
    private _onDeviceConnected;
    private _onDeviceDisconnected;
    private _onRcspInit;
}

declare class Reconnect {
    reconnectOp: ReconnectOp;
    reconnectCallback: ReconnectCallback;
    isFinished: boolean;
    connectingDevice: BluetoothDevice | undefined;
    timeoutNumber: number;
    constructor(op: ReconnectOp, callback: ReconnectCallback);
    startReconnect(timeout: number): void;
    stopReconnect(): void;
    onScanStop(): void;
    onDiscoveryDevices(devices: BluetoothDevice[]): void;
    onDiscoveryDevice(device: BluetoothDevice): void;
    onDeviceConnected(device: BluetoothDevice): void;
    onDeviceConnectFailed(device: BluetoothDevice): void;
    onDeviceConnectDisconnected(device: BluetoothDevice): void;
    private isFinishedReconnect;
}
interface ReconnectOp {
    startScanDevice: () => void;
    isReconnectDevice: (scanDevice: BluetoothDevice) => boolean;
    connectDevice: (device: BluetoothDevice) => void;
}
interface ReconnectCallback {
    /**回连成功*/
    onReconnectSuccess: (device: BluetoothDevice) => void;
    /**回连失败*/
    onReconnectFailed: () => void;
    /**回连-连接失败*/
    onDeviceConnectFailed: (device: BluetoothDevice) => void;
    /**回连-连接断开*/
    onDeviceConnectDisconnected: (device: BluetoothDevice) => void;
}

declare class OTASdkVersion {
    private static readonly versionCode;
    private static readonly versionName;
    static get VersionCode(): number;
    static get VersionName(): string;
}

/**
 *number转 16进制string(如：-0x40)
 */
declare function toHexWithPrefix(num: number): string;
/**
 * arraybuffer 转字符串
 */
declare function toHexString(buffer?: ArrayBuffer): string;

declare class OtaLog extends LogHub {
    constructor();
}
declare const Logger: OtaLog;

export { BluetoothDevice, DeviceUpgradeInfo, FileOffsetInfo, IOTAWrapper, IOtaOp, InquiryCanOTAResultCode, OTAImpl, OTASdkVersion, OTAUpgradeCallback, OTAWrapper, OTAWrapperListener, OTAWrapperOption, OnResultCallback, OnUpgradeCallback, OtaConfig, OtaError, Logger as OtaLog, RcspOTAManager, Reconnect, ReconnectCallback, ReconnectInfo, ReconnectOp, SUPPORT_RESET_FLAG, UpgradeResultCode, UpgradeType, toHexString, toHexWithPrefix };
