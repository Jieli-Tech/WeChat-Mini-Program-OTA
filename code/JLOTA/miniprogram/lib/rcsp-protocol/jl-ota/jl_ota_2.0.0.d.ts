declare function setLogGrade(grade: number): void;

/** OTA接口 */
interface IOTAOp {
    /** 是否已连接设备 */
    isDeviceConnected(): boolean;
    /** 切换通讯方式 */
    changeCommunicationWay(communicationWay: number, isSupportNewRebootWay: boolean, callback: OnResultCallback<number>): void;
    /** 读取文件头信息偏移 */
    readUpgradeFileFlag(callback: OnResultCallback<FileOffset>): void;
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
/** 升级流程的回调 */
interface OnUpgradeCallback {
    /** OTA开始*/
    onStartOTA(): void;
    /**需要回连的回调
     * <p>
     * 注意: 1.仅连接通讯通道（BLE or  SPP）
     * 2.用于单备份OTA</p>
     *
     * @param reConnectMsg 回连设备信息
     */
    onNeedReconnect(reConnectMsg: ReConnectMsg): void;
    /** 进度回调
     *
     * @param type     类型
     * @param progress 进度
     */
    onProgress(type: UpgradeType, progress: number): void;
    /** OTA结束*/
    onStopOTA(): void;
    /** OTA取消*/
    onCancelOTA(): void;
    /** OTA失败
     * @param error   错误码
     * @param message 错误信息
     */
    onError(error: number, message: string): void;
}
/** OTA错误码 */
declare class OTAError {
    static readonly ERROR_UNKNOWN = -1;
    static readonly ERROR_NONE = 0;
    static readonly ERROR_INVALID_PARAM = -2;
    static readonly ERROR_DATA_FORMAT = -3;
    static readonly ERROR_NOT_FOUND_RESOURCE = -4;
    static readonly ERROR_UNKNOWN_DEVICE = -32;
    static readonly ERROR_DEVICE_OFFLINE = -33;
    static readonly ERROR_IO_EXCEPTION = -35;
    static readonly ERROR_REPEAT_STATUS = -36;
    static readonly ERROR_RESPONSE_TIMEOUT = -64;
    static readonly ERROR_REPLY_BAD_STATUS = -65;
    static readonly ERROR_REPLY_BAD_RESULT = -66;
    static readonly ERROR_NONE_PARSER = -67;
    static readonly ERROR_OTA_LOW_POWER = -97;
    static readonly ERROR_OTA_UPDATE_FILE = -98;
    static readonly ERROR_OTA_FIRMWARE_VERSION_NO_CHANGE = -99;
    static readonly ERROR_OTA_TWS_NOT_CONNECT = -100;
    static readonly ERROR_OTA_HEADSET_NOT_IN_CHARGING_BIN = -101;
    static readonly ERROR_OTA_DATA_CHECK_ERROR = -102;
    static readonly ERROR_OTA_FAIL = -103;
    static readonly ERROR_OTA_ENCRYPTED_KEY_NOT_MATCH = -104;
    static readonly ERROR_OTA_UPGRADE_FILE_ERROR = -105;
    static readonly ERROR_OTA_UPGRADE_TYPE_ERROR = -106;
    static readonly ERROR_OTA_LENGTH_OVER = -107;
    static readonly ERROR_OTA_FLASH_IO_EXCEPTION = -108;
    static readonly ERROR_OTA_CMD_TIMEOUT = -109;
    static readonly ERROR_OTA_IN_PROGRESS = -110;
    static readonly ERROR_OTA_COMMAND_TIMEOUT = -111;
    static readonly ERROR_OTA_RECONNECT_DEVICE_TIMEOUT = -112;
    static readonly ERROR_OTA_USE_CANCEL = -113;
    static readonly ERROR_OTA_SAME_FILE = -114;
}
declare function getErrorDesc(errorCode: number, explain: string): string;
declare enum UpgradeType {
    UPGRADE_TYPE_UNKNOWN = -1,
    UPGRADE_TYPE_CHECK_FILE = 0,
    UPGRADE_TYPE_FIRMWARE = 1
}
/** 文件偏移 */
declare class FileOffset {
    readonly offset: number;
    readonly len: number;
    constructor(offset: number | undefined, len: number | undefined);
    toString(): string;
}
/** OTA 配置 */
declare class OTAConfig {
    static readonly COMMUNICATION_WAY_BLE = 0;
    static readonly COMMUNICATION_WAY_SPP = 1;
    static readonly COMMUNICATION_WAY_USB = 2;
    /** 通讯方式*/
    communicationWay: number;
    /** 是否支持新的回连方式*/
    isSupportNewRebootWay: boolean;
    /** 固件升级文件数据*/
    updateFileData?: Uint8Array;
    toString(): string;
}
/** 回连信息*/
declare class ReConnectMsg {
    isSupportNewReconnectADV?: boolean;
    copy(): ReConnectMsg;
    toString(): string;
}
/** 设备升级相关信息 */
declare class DeviceUpgradeInfo {
    readonly isSupportDoubleBackup: boolean;
    readonly isNeedBootLoader: boolean;
    readonly isMandatoryUpgrade: boolean;
    constructor(isSupportDoubleBackup: boolean, isNeedBootLoader: boolean, isMandatoryUpgrade: boolean);
}
declare class OTAImpl {
    static readonly WAITING_CMD_TIMEOUT: number;
    static readonly WAITING_DEVICE_OFFLINE_TIMEOUT: number;
    static readonly RECONNECT_DEVICE_DELAY = 1000;
    static readonly RECONNECT_DEVICE_TIMEOUT: number;
    private mIOTAOp;
    private mUpgradeCbHelper;
    private mUpgradeDataBuf;
    private mTotalOTaSize;
    private mCurrentOtaSize;
    protected mOTAConfig: OTAConfig | null;
    private mReConnectMsg;
    private mDeviceUpgradeInfo;
    /** 定时器 */
    private mTaskTimer;
    private mReconnectTimer;
    private mWaitDeviceOffLineTimer;
    constructor(iOTAOp: IOTAOp);
    release(): void;
    /** isOTA 是否正在OTA*/
    isOTA(): boolean;
    /** 开始OTA流程  */
    startOTA(config: OTAConfig, callback: OnUpgradeCallback): void;
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
    private _setOTAConfig;
    /** 读取升级标识  */
    private _upgradePrePare;
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
    private _callbackOTAError;
    private _getCurrentProgress;
    private _getUpgradeTypeByCode;
}

export { DeviceUpgradeInfo, FileOffset, IOTAOp, OTAConfig, OTAError, OTAImpl, OnResultCallback, OnUpgradeCallback, ReConnectMsg, UpgradeType, getErrorDesc, setLogGrade };
