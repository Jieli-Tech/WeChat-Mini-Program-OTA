/****杰理RCSP协议(OTA) version 2.1.1 ****/
declare class RcspConstant {
    static DEFAULT_SEND_CMD_TIMEOUT: number;
    static DEFAULT_PROTOCOL_MTU: number;
}
declare enum Connection {
    CONNECTION_DISCONNECT = 0,
    CONNECTION_CONNECTING = 1,
    CONNECTION_CONNECTED = 2
}
/** 设备 */
declare class Device {
    deviceId: string;
    name?: string;
    constructor(deviceId: string, name?: string);
    equals(o: Device | null): boolean;
}
/** 数据透传代理 */
interface IOProxy {
    /**
         * 传递设备的状态
         *
         * @param device 操作设备
         * @param status 设备状态
         *               <p>说明:
         *               1. 设备状态由库内定义，参考{@link }。
         *               2. 用户必须传入对应的状态码</p>
         */
    transmitDeviceStatus: (device: Device, status: Connection) => void;
    /**
     * 传递从设备接收到的数据
     *
     * @param device 操作设备
     * @param data   原始数据
     */
    transmitDeviceData: (device: Device, data: Uint8Array) => void;
    /**
     * 向设备发送RCSP数据包
     *
     * @param device 操作设备
     * @param data   RCSP数据包
     * @return 结果
     * <p>
     * 说明:
     * 1. 该方法需要用户自行实现
     * 2. 该方法运行在子线程，允许阻塞处理
     * 3. 该方法会回调完整的一包RCSP数据, 用户实现需要根据实际发送MTU进行分包处理
     * </p>
     */
    sendDataToDevice: (device: Device, data: Uint8Array) => boolean;
}
/** RCSP数据解析监听 */
interface OnRcspDataListener {
    /**回调接收到的RCSP命令包
   *
   * @param device  操作设备
   * @param command RCSP命令包
   */
    onRcspCommand: (device: Device, command: CommandBase) => void;
    /**回调接收到的RCSP回复包
     *
     * @param device  操作设备
     * @param command RCSP回复包
     */
    onRcspResponse: (device: Device, command: CommandBase) => void;
    /**回调错误事件
     *
     * @param device  操作设备
     * @param code    错误码 (参考{@link com.jieli.rcsp.data.constant.ErrorCode})
     * @param message 错误描述
     */
    onError: (device: Device | null, code: number, message: string) => void;
}
/** Command-错误码 */
declare class ErrorCode {
    static ERROR_UNKNOWN: number;
    static ERROR_NONE: number;
    static ERROR_INVALID_PARAM: number;
    static ERROR_DATA_FORMAT: number;
    static ERROR_NOT_FOUND_RESOURCE: number;
    static ERROR_UNKNOWN_DEVICE: number;
    static ERROR_DEVICE_OFFLINE: number;
    static ERROR_IO_EXCEPTION: number;
    static ERROR_REPEAT_STATUS: number;
    static ERROR_RESPONSE_TIMEOUT: number;
    static ERROR_REPLY_BAD_STATUS: number;
    static ERROR_REPLY_BAD_RESULT: number;
    static ERROR_NONE_PARSER: number;
    protected static SEPARATOR: string;
    static getErrorDesc1(errorCode: number): string;
    static getErrorDesc2(errorCode: number, explain: string): string;
}
/** 命令解析器-基础解析器 */
declare abstract class BaseCmdParser {
    abstract createCommand(): CommandBase | null;
    convertToCmd(packet: RcspPacket): CommandBase | null;
}
/** Command-RCSP基础数据类型 */
declare class RcspPacket {
    static RCSP_HEAD: number[];
    static RCSP_END: number;
    private _isCommand;
    private _isNeedResponse;
    private _reserve;
    private _opCode;
    private _payload?;
    private _sn;
    isCommand(): boolean;
    setCommand(command: boolean): this;
    isNeedResponse(): boolean;
    setNeedResponse(needResponse: boolean): RcspPacket;
    getReserve(): number;
    setReserve(reserve: number): RcspPacket;
    getOpCode(): number;
    setOpCode(opCode: number): RcspPacket;
    getSn(): number;
    getPayload(): Uint8Array | undefined;
    setPayload(payload: Uint8Array): void;
    toData(): Uint8Array | null;
    parseData(data: Uint8Array): number;
}
/** Command-基础命令 */
declare class Command<P extends ParamBase, R extends ResponseBase> extends RcspPacket {
    private _param;
    private _response;
    constructor(opCode: number, param: P, response: R | null);
    getParam(): P;
    getResponse(): R | null;
    getSn(): number;
    setParam(param: P): void;
    setResponse(response: R | null): void;
    setSn(sn: number): void;
    setStatus(status: number): void;
    getStatus(): number;
    toData(): Uint8Array | null;
}
/** Command-参数基类 */
declare class ParamBase {
    private _sn;
    private _basePayload?;
    setSn(sn: number): void;
    getSn(): number;
    getData(): Uint8Array | undefined;
    setData(data: Uint8Array): void;
    toData(): Uint8Array;
    parseData(data: Uint8Array): number;
}
/** Command-回复数据基类 */
declare class ResponseBase {
    static STATUS_UNKNOWN: number;
    static STATUS_SUCCESS: number;
    static STATUS_FAILED: number;
    static STATUS_UNKNOWN_CMD: number;
    static STATUS_BUSY: number;
    static STATUS_NONE_RESOURCE: number;
    static STATUS_CRC_ERROR: number;
    static STATUS_ALL_DATA_CRC_ERROR: number;
    static STATUS_INVALID_PARAM: number;
    static STATUS_RESPONSE_DATA_OVER_LIMIT: number;
    private _status;
    private _sn;
    private _payload?;
    getStatus(): number;
    getSn(): number;
    getPayload(): Uint8Array | undefined;
    setStatus(status: number): void;
    setSn(sn: number): void;
    setPayload(payload: Uint8Array): void;
    toData(): Uint8Array;
    parseData(data: Uint8Array): number;
}
/** Command-回复结果码 */
declare class ResponseResult extends ResponseBase {
    /**
    * 成功回复
    */
    static RESULT_OK: number;
    /**
     * 失败结果
     */
    static RESULT_FAIL: number;
    result: number;
    parseData(data: Uint8Array): number;
    toData(): Uint8Array;
}
declare class CommandBase extends Command<ParamBase, ResponseBase> {
}
/** Command-命令回调 */
interface CommandCallback<T extends CommandBase> {
    /**
   * 回调回复命令
   * @param device  操作对象
   * @param command 回复命令
   *                <p>说明:
   *                1. 若有回复的命令, 返回的是带回复数据的命令对象
   *                2. 若无回复的命令, 返回的是命令原型</p>
   */
    onCmdResponse(device: Device, command: T): void;
    /**
     * 回调错误事件
     * @param device  操作对象
     * @param code    错误码 (参考{@link com.jieli.rcsp.data.constant.ErrorCode})
     * @param message 错误描述
     */
    onError(device: Device, code: number, message: string): void;
}
/** 数据处理-基本数据信息 */
declare class BaseDataInfo {
    static DATA_TYPE_SEND: number;
    static DATA_TYPE_RECEIVE: number;
    device: Device;
    type: number;
    constructor(device: Device, type: number);
}
/** 数据处理-发送数据信息 */
declare class SendDataInfo extends BaseDataInfo {
    command: CommandBase;
    timeoutMs: number;
    callback: CommandCallback<CommandBase> | null;
    reSendCount: number;
    sendTimestamp: number;
    constructor(device: Device, command: CommandBase, timeoutMs: number, callback: CommandCallback<CommandBase> | null);
}
/** 数据处理-接收数据信息 */
declare class ReceiveDataInfo extends BaseDataInfo {
    data: Uint8Array;
    constructor(device: Device, data: Uint8Array);
}
/** 数据处理-RCSP数据处理器 */
declare class RCSPDataHandler {
    private SEND_AGAIN_LIMIT;
    protected ioProxy: IOProxy;
    listener: OnRcspDataListener;
    deviceMtuManager: DeviceMtuManager;
    private _dataInfoCache;
    private _sendInfoArray;
    private _receiveInfoArray;
    private _rcspParser;
    private _isCanHandler;
    private _sendTimeOutIDMap;
    constructor(ioProxy: IOProxy, deviceMtuManager: DeviceMtuManager, cmdParserMap: Map<number, BaseCmdParser>, listener: OnRcspDataListener);
    startHandler(): void;
    stopHandler(): void;
    addSendData(dataInfo: SendDataInfo): void;
    addReceiveData(dataInfo: ReceiveDataInfo): void;
    destroy(): void;
    private _checkDataAvailable;
    private _isCanHandle;
    private _writeDataToDevice;
    private _sendData;
    private _parseDataFromDevice;
    private _callbackError;
    private _callbackCmd;
    private _getRCSPSendMtu;
    private _getRCSPReceiveMtu;
    private _getSendDataKey;
    private _pollSendDataInfo;
}
/** 设备MTU管理器 */
declare abstract class DeviceMtuManager {
    abstract getReceiveMtu(device: Device): number | null;
    abstract getSendMtu(device: Device): number | null;
}

declare class OpCode$2 {
    /******************************************************************
      * 0x01 数据命令
      * 0x02 获取目标信息
      *      ...
      *      ...
      *      ...
      * 0xA0~0xAF 健康数据命令
      * 0xC0~0xCF TWS 命令
      * 0xD0~0xDF 辅助命令
      * 0xE0~0xEF OTA命令
      * 0xF0~0xFF 自定义命令
      ******************************************************************/
    static CMD_UNKNOWN: number;
    static CMD_DATA: number;
    static CMD_GET_TARGET_FEATURE_MAP: number;
    static CMD_GET_TARGET_INFO: number;
    static CMD_DISCONNECT_CLASSIC_BLUETOOTH: number;
    static CMD_GET_SYS_INFO: number;
    static CMD_SET_SYS_INFO: number;
    static CMD_SYS_INFO_AUTO_UPDATE: number;
    static CMD_SWITCH_DEVICE_REQUEST: number;
    static CMD_CUSTOM: number;
    static CMD_EXTRA_CUSTOM: number;
    static CMD_NOTIFY_DEVICE_APP_INFO: number;
    static CMD_SETTINGS_COMMUNICATION_MTU: number;
    static CMD_GET_DEV_MD5: number;
}
/** Command-数据传输命令 */
declare class CmdData extends Command<ParamData, ResponseData> {
    constructor(param: ParamData);
}
declare class ParamData extends ParamBase {
    responseOpCode: number | undefined;
    payload: Uint8Array | undefined;
    toData(): Uint8Array;
    parseData(data: Uint8Array): number;
}
declare class ResponseData extends ResponseBase {
    responseOpCode: number | undefined;
    toData(): Uint8Array;
    parseData(data: Uint8Array): number;
}
/** Command-设置固件状态信息 */
declare class CmdSetSysInfo extends Command<ParamSysInfo, ResponseBase> {
    constructor(param: ParamSysInfo);
}
/** Command- 获取固件的状态信息 */
declare class CmdGetSysInfo extends Command<ParamGetSysInfo, ResponseSysInfo> {
    constructor(param: ParamGetSysInfo);
}
/** Command-固件向app推送状态信息 */
declare class CmdNotifySysInfo extends Command<ParamSysInfo, ResponseBase> {
    constructor(param: ParamSysInfo);
}
declare class LtvBean {
    type?: number;
    value?: Uint8Array;
    getLen(): number;
    toData(): Uint8Array;
    parseData(data: Uint8Array): number;
}
declare class ParamSysInfo extends ParamBase {
    function: number | undefined;
    dataList: Array<LtvBean> | undefined;
    toData(): Uint8Array;
    parseData(data: Uint8Array): number;
}
declare class ParamGetSysInfo extends ParamBase {
    function: number;
    mask: number;
    toData(): Uint8Array;
}
declare class ResponseSysInfo extends ResponseBase {
    function?: number;
    dataList?: Array<LtvBean>;
    parseData(data: Uint8Array): number;
}
/** Command- 读取固件特征信息*/
declare class CmdGetTargetInfo extends Command<ParamTargetInfo, ResponseTargetInfo> {
    static readonly FLAG_MANDATORY_UPGRADE = 1;
    constructor(param: ParamTargetInfo);
}
declare class ParamTargetInfo extends ParamBase {
    mask: number;
    platform: number;
    constructor(mask: number, platform: number);
    toData(): Uint8Array;
}
declare class ResponseTargetInfo extends ResponseBase {
    /**设备版本名称*/
    versionName?: string;
    /**设备版本信息*/
    versionCode: number;
    /**协议版本*/
    protocolVersion?: string;
    /**协议发送MTU*/
    sendMtu: number;
    /**协议接收MTU*/
    receiveMtu: number;
    /**经典蓝牙相关信息-经典蓝牙地址*/
    edrAddr?: string;
    /**经典蓝牙相关信息-经典蓝牙的连接状态*/
    edrStatus: number;
    /**经典蓝牙相关信息-经典蓝牙支持的协议*/
    edrProfile: number;
    /**BLE相关信息-BLE地址*/
    bleAddr?: string;
    /**ai平台相关参数-AI平台类型（0：图灵；1：deepbrain；2：小米）*/
    platform: number;
    /**ai平台相关参数-设备唯一标示*/
    license?: string;
    /**设备音量-当前值*/
    volume: number;
    /**设备音量-最大值*/
    maxVol: number;
    /**设备电量*/
    quantity: number;
    /**功能支持掩码*/
    functionMask: number;
    /**功能支持掩码-当前模式*/
    curFunction: number;
    /**功能支持掩码-支持蓝牙模式*/
    btEnable: boolean;
    /**功能支持掩码-支持设备音乐模式*/
    devMusicEnable: boolean;
    /**功能支持掩码-支持RTC模式(闹钟)*/
    rtcEnable: boolean;
    /**功能支持掩码-支持LineIn模式*/
    lineInEanble: boolean;
    /**功能支持掩码-支持FM接收模式*/
    fmEnable: boolean;
    /**功能支持掩码-支持灯光模式*/
    lightEnable: boolean;
    /**功能支持掩码-支持FM发射模式*/
    fmTXEnable: boolean;
    /**功能支持掩码-支持EQ模式*/
    eqEnable: boolean;
    /**是否支持usb、sd、linein不在线时显示功能图标*/
    supportOfflineShow: boolean;
    /**是否支持usb*/
    supportUsb: boolean;
    /**是否支持sd0*/
    supportSd0: boolean;
    /**是否支持sd1*/
    supportSd1: boolean;
    /**是否隐藏网络电台*/
    hideNetRadio: boolean;
    /**是否为标准sdk 默认false即默认为ai sdk*/
    sdkType: number;
    /**名字*/
    name?: string;
    /**产品ID*/
    pid: number;
    /**厂商ID*/
    vid: number;
    /**客户ID*/
    uid: number;
    /**强制升级*/
    mandatoryUpgradeFlag: number;
    /**请求升级标志*/
    requestOtaFlag: number;
    /**uboot 版本号*/
    ubootVersionCode: number;
    /**uboot 版本名称*/
    ubootVersionName?: string;
    /**是否支持双备份升级（单备份[false]，需要断开回连过程；双备份[true]，不需要断开回连过程）*/
    isSupportDoubleBackup: boolean;
    /**是否需要下载boot loader*/
    isNeedBootLoader: boolean;
    /**单备份OTA连接方式(00 -- 不使能 01 -- BLE  02 -- SPP)*/
    singleBackupOtaWay: number;
    /**拓展模式 0：不启用 1: 升级资源模式*/
    expandMode: number;
    /**是否允许连接 0 -- 允许 1 -- 不允许*/
    allowConnectFlag: number;
    /**用于服务器校验产品信息-认证秘钥*/
    authKey?: string;
    /**用于服务器校验产品信息-项目标识码*/
    projectCode?: string;
    /**用于自定义版本信息*/
    customVersionMsg?: string;
    /**是否仅仅连接ble设备，*/
    bleOnly: boolean;
    /**是否支持外设模式*/
    emitterSupport: boolean;
    /**外设状态：0x00:普通模式  0x01:外设模式*/
    emitterStatus: number;
    /**是否支持MD5读取*/
    isSupportMD5: boolean;
    /**是否游戏模式*/
    isGameMode: boolean;
    /**是否支持查找设备*/
    isSupportSearchDevice: boolean;
    /**是否支持音量同步*/
    supportVolumeSync: boolean;
    /**是否支持声卡功能*/
    supportSoundCard: boolean;
    /**是否支持外挂Flash传输功能*/
    supportExternalFlashTransfer: boolean;
    /**是否支持主动降噪功能*/
    supportAnc: boolean;
    /**禁止app调节设备eq*/
    banEq: boolean;
    /**大文件传输是否支持分包crc16校验*/
    supportPackageCrc16: boolean;
    /**以新的文件名方式读取固件文件(支持多设备)*/
    getFileByNameWithDev: boolean;
    /**联系人传输是否使用小文件方式*/
    contactsTransferBySmallFile: boolean;
    /**手表设置功能支持状态的掩码*/
    watchSettingMask: number;
    parseData(data: Uint8Array): number;
    private _fillTargetInfo;
}
/** Command-切换通讯方式 */
declare class CmdChangeCommunicationWay extends Command<ParamCommunicationWay, ResponseResult> {
    constructor(param: ParamCommunicationWay);
}
declare class ParamCommunicationWay extends ParamBase {
    readonly communicationWay: number;
    readonly isSupportNewRebootWay: boolean;
    constructor(communicationWay: number, isSupportNewRebootWay?: boolean);
    toData(): Uint8Array;
}
/** Command-设置通讯MTU */
declare class CmdSetMtu extends Command<ParamMtu, ResponseMtu> {
    constructor(param: ParamMtu);
}
declare class ParamMtu extends ParamBase {
    protocolMtu: number;
    parseData(data: Uint8Array): number;
    toData(): Uint8Array;
}
declare class ResponseMtu extends ResponseBase {
    realProtocolMtu: number;
    parseData(data: Uint8Array): number;
    toData(): Uint8Array;
}
/** Command-自定义命令*/
declare class CmdCustom extends Command<ParamBase, ResponseBase> {
    constructor(param: ParamBase);
}
/** Command-内容自定义命令*/
declare class CmdInnerCustom extends Command<ParamBase, ResponseBase> {
    constructor(param: ParamBase);
}

/** 设备信息 */
declare class DeviceInfo extends ResponseTargetInfo {
}
/** 设备信息管理器 */
declare class DeviceInfoManager extends DeviceMtuManager {
    private deviceInfoMap;
    release(): void;
    getReceiveMtu(device: Device): number | null;
    getSendMtu(device: Device): number | null;
    getDeviceInfo(device: Device): DeviceInfo | undefined;
    removeDeviceInfo(device: Device): boolean | undefined;
    updateDeviceInfo(device: Device, deviceInfo: DeviceInfo): void;
}
/** 数据发送回调 */
interface OnSendDataCallback {
    /**
     * 向设备发送RCSP数据包
     *
     * @param device 操作设备
     * @param data   RCSP数据包
     * @return 结果
     * <p>
     * 说明:
     * 1. 该方法需要用户自行实现
     * 2. 该方法运行在子线程，允许阻塞处理
     * 3. 该方法会回调完整的一包RCSP数据, 用户实现需要根据实际发送MTU进行分包处理
     * </p>
     */
    sendDataToDevice: (device: Device, data: Uint8Array) => boolean;
}
/** Rcsp事件回调*/
declare class OnRcspCallback {
    /**
     * Rcsp协议初始化回调
     *
     * @param _device 已连接设备
     * @param _isInit 初始化结果
     */
    onRcspInit(_device: Device | null, _isInit: boolean): void;
    /**
     * 设备主动发送的rcsp命令回调
     *
     * @param _device  已连接设备
     * @param _command RCSP命令
     */
    onRcspCommand(_device: Device | null, _command: CommandBase): void;
    /**
 * 设备回复的rcsp命令回调
 *
 * @param _device  已连接设备
 * @param _command RCSP命令
 */
    onRcspResponse(_device: Device | null, _command: CommandBase): void;
    /**
     * 设备主动发送的数据命令回调
     *
     * @param _device  已连接设备
     * @param _dataCmd 数据命令
     */
    onRcspDataCmd(_device: Device | null, _dataCmd: CommandBase): void;
    /**
     * RCSP错误事件回调
     *
     * @param _device  设备对象
     * @param _error   错误码 (参考{@link com.jieli.rcsp.data.constant.ErrorCode})
     * @param _message 错误描述
     */
    onRcspError(_device: Device | null, _error: number, _message: string): void;
    /**
     * 需要强制升级回调
     *
     * @param _device 需要强制升级的设备
     */
    onMandatoryUpgrade(_device: Device | null): void;
    /**
     * 设备连接状态
     *
     * @param _device 蓝牙设备
     * @param _status 连接状态
     */
    onConnectStateChange(_device: Device | null, _status: Connection): void;
}
interface OnResultCallback<T> {
    /**回调结果
     *
     * @param device 操作设备
     * @param result 结果
     */
    onResult(device: Device, result: T): void;
    /**回调错误结果
     *
     * @param device  操作设备
     * @param code    错误码 (参考{@link com.jieli.rcsp.data.constant.ErrorCode})
     * @param message 错误信
     */
    onError(device: Device, code: number, message: string): void;
}
declare class RcspCallbackManager extends OnRcspCallback {
    private _callbacks;
    registerRcspCallback(callback: OnRcspCallback): void;
    unregisterRcspCallback(callback: OnRcspCallback): void;
    release(): void;
    onRcspInit(device: Device | null, isInit: boolean): void;
    onRcspCommand(device: Device | null, command: CommandBase): void;
    onRcspResponse(device: Device | null, command: CommandBase): void;
    onRcspDataCmd(device: Device | null, dataCmd: CommandBase): void;
    onRcspError(device: Device | null, error: number, message: string): void;
    onMandatoryUpgrade(device: Device | null): void;
    onConnectStateChange(device: Device | null, status: Connection): void;
    private _callbackRcspEvent;
}
/** Rcsp协议实现 */
declare abstract class RcspOpImplBase implements IOProxy {
    protected mRCSPDataHandler: RCSPDataHandler;
    private mDeviceInfoManager;
    private mRcspCallbackManager;
    private mCmdSnGenerator;
    private mTargetDevice;
    private mOnSendDataCallback?;
    constructor();
    abstract getNotifyCmdParser(): Map<number, BaseCmdParser>;
    getUsingDevice(): Device | null;
    setOnSendDataCallback(callback: OnSendDataCallback | undefined): void;
    isDeviceConnected(): boolean;
    getDeviceInfo(device: Device): DeviceInfo | undefined;
    addOnRcspCallback(callback: OnRcspCallback): void;
    removeOnRcspCallback(callback: OnRcspCallback): void;
    transmitDeviceStatus(device: Device, status: Connection): void;
    transmitDeviceData(device: Device, data: Uint8Array): void;
    sendDataToDevice(device: Device, data: Uint8Array): boolean;
    sendRCSPCommand(device: Device, command: CommandBase, timeoutMs: number, callback: CommandCallback<CommandBase> | null): void;
    syncDeviceInfo(device: Device, param: ParamTargetInfo, callback: OnResultCallback<ResponseTargetInfo>): void;
    destroy(): void;
    getDeviceInfoManager(): DeviceInfoManager;
    private _callbackCmdError;
    private _callbackError;
    private _sendCommand;
    private _handleDeviceStatus;
    private _handleDeviceConnectedEvent;
    private _checkIsValidDevice;
    private _handleDeviceReceiveData;
    private _dealWithRcspCommand;
    private _dealWithRcspResponse;
}

declare class OpCode$1 {
    static CMD_OTA_GET_DEVICE_UPDATE_FILE_INFO_OFFSET: number;
    static CMD_OTA_INQUIRE_DEVICE_IF_CAN_UPDATE: number;
    static CMD_OTA_ENTER_UPDATE_MODE: number;
    static CMD_OTA_EXIT_UPDATE_MODE: number;
    static CMD_OTA_SEND_FIRMWARE_UPDATE_BLOCK: number;
    static CMD_OTA_GET_DEVICE_REFRESH_FIRMWARE_STATUS: number;
    static CMD_REBOOT_DEVICE: number;
    static CMD_OTA_NOTIFY_UPDATE_CONTENT_SIZE: number;
}
/** Command-请求进入升级模式 */
declare class CmdEnterUpdateMode extends Command<ParamBase, ResponseEnterUpdateMode> {
    constructor();
}
/** Command-回复结果码 */
declare class ResponseEnterUpdateMode extends ResponseBase {
    /**否进入了升级模式 */
    result: number;
    parseData(data: Uint8Array): number;
    toData(): Uint8Array;
}
/** Command-请求退出更新模式 */
declare class CmdExitUpdateMode extends Command<ParamBase, ResponseResult> {
    constructor();
}
/** Command-通知升级内容大小 */
declare class CmdNotifyUpdateFileSize extends Command<ParamUpdateFileSize, ResponseBase> {
    constructor(param: ParamUpdateFileSize);
}
declare class ParamUpdateFileSize extends ParamBase {
    totalSize: number;
    currentSize: number;
    parseData(data: Uint8Array): number;
    toData(): Uint8Array;
}
/** Command-查询升级结果 */
declare class CmdQueryUpdateResult extends Command<ParamBase, ResponseResult> {
    static readonly UPGRADE_RESULT_COMPLETE = 0;
    static readonly UPGRADE_RESULT_DATA_CHECK_ERROR = 1;
    static readonly UPGRADE_RESULT_FAIL = 2;
    static readonly UPGRADE_RESULT_ENCRYPTED_KEY_NOT_MATCH = 3;
    static readonly UPGRADE_RESULT_UPGRADE_FILE_ERROR = 4;
    static readonly UPGRADE_RESULT_UPGRADE_TYPE_ERROR = 5;
    static readonly UPGRADE_RESULT_ERROR_LENGTH = 6;
    static readonly UPGRADE_RESULT_FLASH_READ = 7;
    static readonly UPGRADE_RESULT_CMD_TIMEOUT = 8;
    static readonly UPGRADE_RESULT_DOWNLOAD_BOOT_LOADER_SUCCESS = 128;
    constructor();
}
/** Command-读取文件块数据 */
declare class CmdReadFileBlock extends Command<ParamFileBlock, ResponseFileBlock> {
    constructor(param: ParamFileBlock);
}
declare class ParamFileBlock extends ParamBase {
    offset: number;
    len: number;
    toData(): Uint8Array;
    parseData(data: Uint8Array): number;
}
declare class ResponseFileBlock extends ResponseBase {
    block?: Uint8Array;
    toData(): Uint8Array;
    parseData(data: Uint8Array): number;
}
/** Command-读取文件偏移 */
declare class CmdReadFileOffset extends Command<ParamBase, ResponseFileOffset> {
    constructor();
}
declare class ResponseFileOffset extends ResponseBase {
    offset: number;
    len: number;
    toData(): Uint8Array;
    parseData(data: Uint8Array): number;
}
/** Command-重启设备 */
declare class CmdRebootDevice extends Command<ParamRebootDevice, ResponseResult> {
    constructor(param: ParamRebootDevice);
}
declare class ParamRebootDevice extends ParamBase {
    static OP_REBOOT: number;
    static OP_CLOSE: number;
    readonly op: number;
    constructor(op: number);
    toData(): Uint8Array;
}
/** Command-查询设备能否更新 */
declare class CmdRequestUpdate extends Command<ParamRequestUpdate, ResponseResult> {
    /**
     * 可以更新
     */
    static readonly RESULT_CAN_UPDATE = 0;
    /**
     * 设备低电压
     */
    static readonly RESULT_DEVICE_LOW_VOLTAGE_EQUIPMENT = 1;
    /**
     * 升级固件信息错误
     */
    static readonly RESULT_FIRMWARE_INFO_ERROR = 2;
    /**
     * 升级文件的固件版本一致
     */
    static readonly RESULT_FIRMWARE_VERSION_NO_CHANGE = 3;
    /**
     * TWS未连接
     */
    static readonly RESULT_TWS_NOT_CONNECT = 4;
    /**
     * 耳机未在充电仓
     */
    static readonly RESULT_HEADSET_NOT_IN_CHARGING_BIN = 5;
    constructor(param: ParamRequestUpdate);
}
declare class ParamRequestUpdate extends ParamBase {
    readonly data: Uint8Array;
    constructor(data: Uint8Array);
    toData(): Uint8Array;
}

declare class OpCode {
    static CMD_ADV_SETTINGS: number;
    static CMD_ADV_GET_INFO: number;
    static CMD_ADV_DEVICE_NOTIFY: number;
    static CMD_ADV_NOTIFY_SETTINGS: number;
    static CMD_ADV_DEV_REQUEST_OPERATION: number;
}
/**
   * 按键设置
   */
declare class KeySettings {
    keyNum: number;
    action: number;
    function: number;
    toData(): Uint8Array;
}
/**
   * 灯光设置
   */
declare class LedSettings {
    scene: number;
    effect: number;
    toData(): Uint8Array;
}
/**  TWS设置命令 */
declare class CmdSetADVInfo extends Command<ParamSetADVInfo, ResponseResult> {
    constructor(param: ParamSetADVInfo);
}
/**  TWS设置命令参数 */
declare class ParamSetADVInfo extends ParamBase {
    payload: Uint8Array;
    constructor(data: Uint8Array);
    toData(): Uint8Array;
    parseData(data: Uint8Array): number;
}
/**  获取ADV信息命令 */
declare class CmdGetADVInfo extends Command<ParamGetADVInfo, ResponseGetADVInfo> {
    constructor(param: ParamGetADVInfo);
}
/**  获取ADV信息参数 */
declare class ParamGetADVInfo extends ParamBase {
    mask: number;
    constructor(mask: number);
    toData(): Uint8Array;
    parseData(data: Uint8Array): number;
}
declare class ResponseGetADVInfo extends ResponseBase {
    /**
         * 厂商ID
         */
    pid: number;
    /**
     * 产品ID
     */
    vid: number;
    /**
     * 客户ID
     */
    uid: number;
    /**
     * 左设备（设备1）电量
     */
    leftDeviceQuantity: number;
    /**
     * 左设备（设备1）充电标识
     */
    isLeftCharging: boolean;
    /**
     * 右设备（设备2）电量
     */
    rightDeviceQuantity: number;
    /**
     * 右设备（设备2）充电标识
     */
    isRightCharging: boolean;
    /**
     * 充电仓（设备3）电量
     */
    chargingBinQuantity: number;
    /**
     * 充电仓（设备3）充电标识
     */
    isDeviceCharging: boolean;
    /**
     * 设备名
     */
    deviceName?: string;
    /**
     * 麦通道
     */
    micChannel: number;
    /**
     * 工作模式
     */
    workModel: number;
    /**
     * 按键设置
     */
    keySettingsList?: Array<KeySettings>;
    /**
     * 灯光设置
     */
    ledSettingsList?: Array<LedSettings>;
    /**
     * 入耳检测设置
     */
    inEarSettings: number;
    /**
     * 语言
     */
    language?: string;
    /**
     * ANC模式列表
     */
    modes?: Uint8Array;
    parseData(data: Uint8Array): number;
}
/**  通知设备广播信息 */
declare class CmdNotifyADVInfo extends Command<ParamADVInfo, ResponseBase> {
    constructor();
}
/**广播包信息 */
declare class ParamADVInfo extends ParamBase {
    private vid;
    private pid;
    private uid;
    private deviceType;
    private version;
    private showDialog;
    private edrAddr;
    private seq;
    private action;
    private leftDeviceQuantity;
    private leftCharging;
    private rightDeviceQuantity;
    private rightCharging;
    private chargingBinQuantity;
    private deviceCharging;
    getVid(): number;
    setVid(vid: number): ParamADVInfo;
    getPid(): number;
    setPid(pid: number): ParamADVInfo;
    getUid(): number;
    setUid(uid: number): ParamADVInfo;
    getDeviceType(): number;
    setDeviceType(deviceType: number): ParamADVInfo;
    getVersion(): number;
    setVersion(version: number): ParamADVInfo;
    isShowDialog(): boolean;
    setShowDialog(showDialog: boolean): ParamADVInfo;
    getEdrAddr(): string;
    setEdrAddr(edrAddr: string): ParamADVInfo;
    getSeq(): number;
    setSeq(seq: number): ParamADVInfo;
    getAction(): number;
    setAction(action: number): ParamADVInfo;
    getLeftDeviceQuantity(): number;
    setLeftDeviceQuantity(leftDeviceQuantity: number): ParamADVInfo;
    isLeftCharging(): boolean;
    setLeftCharging(leftCharging: boolean): ParamADVInfo;
    getRightDeviceQuantity(): number;
    setRightDeviceQuantity(rightDeviceQuantity: number): ParamADVInfo;
    isRightCharging(): boolean;
    setRightCharging(rightCharging: boolean): ParamADVInfo;
    getChargingBinQuantity(): number;
    setChargingBinQuantity(chargingBinQuantity: number): ParamADVInfo;
    isDeviceCharging(): boolean;
    setDeviceCharging(deviceCharging: boolean): ParamADVInfo;
    parseData(data: Uint8Array): number;
    private _fillADVInfo;
}
/**  操作码参数 */
declare class ParamOperation extends ParamBase {
    op: number;
    constructor(op?: number);
    toData(): Uint8Array;
    parseData(data: Uint8Array): number;
}
/**  控制ADV广播流*/
declare class CmdControlADVStream extends Command<ParamOperation, ResponseResult> {
    /** 关闭广播流*/
    static readonly CTRL_OP_CLOSE = 0;
    /** 开启广播流*/
    static readonly CTRL_OP_OPEN = 1;
    constructor(op: number);
}
/** 设备请求操作 */
declare class CmdDeviceRequestOp extends Command<ParamOperation, ResponseBase> {
    /** 主动更新配置信息*/
    static readonly REQUEST_OP_SYNC_SETTINGS = 0;
    /** 更新配置信息，需要重启生效*/
    static readonly REQUEST_OP_UPDATE_SETTINGS_AND_REBOOT = 1;
    /** 请求同步时间戳*/
    static readonly REQUEST_OP_SYNC_CONNECTION_TIME = 2;
    /** 请求回连设备*/
    static readonly REQUEST_OP_RECONNECT_DEVICE = 3;
    /** 请求同步设备信息*/
    static readonly REQUEST_OP_SYNC_DEVICE_INFO = 4;
    constructor();
}

interface Logger {
    logv: (tag: string, ...args: any[]) => void;
    logd: (tag: string, ...args: any[]) => void;
    logi: (tag: string, ...args: any[]) => void;
    logw: (tag: string, ...args: any[]) => void;
    loge: (tag: string, ...args: any[]) => void;
}
declare function setLogGrade(grade: number): void;
declare function setLogger(log: Logger): void;
declare function logv(...args: any[]): void;
declare function logd(...args: any[]): void;
declare function logi(...args: any[]): void;
declare function logw(...args: any[]): void;
declare function loge(...args: any[]): void;
/** arraybuffer 转字符串*/
declare function ab2hex(buffer: ArrayBuffer): string;
/** 16进制数据转蓝牙地址 */
declare function hexDataCovetToAddress(dataArray: Uint8Array): string;

/**
 * RCSP 错误码
*/
declare class RCSPErrorCode {
    /**
     * 错误码划分
     * 0x1000 ~ 0x1FFF : 定义通用错误码
     * 0x2000 ~ 0x2FFF : 定义连接错误码
     * 0x3000 ~ 0x3FFF : 定义通讯错误码
     * 0x4000 ~ 0x4FFF : 定义文件操作错误码
     */
    /** (0) (操作成功)Success*/
    static ERR_NONE: number;
    /** (4097) (无效参数)Input invalid parameter*/
    static ERR_INVALID_PARAMETER: number;
    /** (4098) (取消操作)Cancel operation.*/
    static ERR_CANCEL_OP: number;
    /** (4099) (操作超时)Operation timeout.*/
    static ERR_OPERATION_TIMEOUT: number;
    /** (4100) (其他错误)Other error.*/
    static ERR_OTHER: number;
    /** (8192) (远端设备未连接)The remote device is not connected*/
    static ERR_REMOTE_NOT_CONNECT: number;
    /** (8193) (操作设备不一致)The device is not the same as the device in use.*/
    static ERR_DEVICE_NOT_MATCH: number;
    /** (8194) (调用系统接口失败)Failed to use system reflection function*/
    static ERR_USE_SYSTEM_API: number;
    /**  (8195) (设备认证失败)Failed to auth device*/
    static ERR_AUTH_DEVICE: number;
    /** (12288) (命令发送失败)Command sending failed.Please check the connection*/
    static ERR_CMD_SEND: number;
    /** (12289) (解析数据异常)Error parsing RCSP data*/
    static ERR_PARSE_DATA: number;
    /** (12290) (等待设备回复命令超时)Waiting for a reply packet timed out*/
    static ERR_RESPONSE_TIMEOUT: number;
    /** (12291) (系统繁忙)System is busy*/
    static ERR_SYSTEM_BUSY: number;
    /** (12292) (设备返回错误状态)Device response a bad status*/
    static ERR_RESPONSE_BAD_STATUS: number;
    /** (12293) (设备返回错误结果)Device response a bad result*/
    static ERR_RESPONSE_BAD_RESULT: number;
    /** (16384) (存储设备下线)Storage offline.*/
    static ERR_STORAGE_OFFLINE: number;
    /** (16385) (文件浏览中)File browsing*/
    static ERR_FILE_BROWSING: number;
    /** (16386) (数据加载完成)File data is loaded.*/
    static ERR_DATA_LOAD_COMPLETE: number;
    /** (16387) (丢失文件数据)Missing file data*/
    static ERR_MISSING_FILE_DATA: number;
    /** (16388) (文件夹层级过深)Directory hierarchy is too deep.*/
    static ERR_DIR_TOO_DEEP: number;
    /** (16389) (读写异常)IO exception.*/
    static ERR_IO_EXCEPTION: number;
    /** (16390) (文件与存储器不一致)File does not match storage.*/
    static ERR_FILE_NOT_IN_STORAGE: number;
    /**
     * 获取错误描述
     *
     * @param code 错误码
     * @return 错误描述
     */
    static getErrorDesc(code: number): string;
}
declare class RCSPError {
    errorCode: number;
    message?: string;
    step?: number;
    constructor(errorCode: number, message?: string);
}

/**
 * byteArray 转 String(utf8)
*/
declare function utf8ToString(_array: ArrayBuffer): string;
/**
 * byteArray 转 String（gbk）
*/
declare function gbkToString(data: ArrayBuffer): string;
/**
 *number转 4个bytes的大端数据
 */
declare function intToBigBytes4(params: number): Uint8Array;
declare function intToBigBytes2(params: number): Uint8Array;
declare function bigBytes4ToInt(data: Uint8Array): number;
declare function bigBytes2ToInt(data: Uint8Array): number;
/**
 *number转 16进制string(如：-0x40)
 */
declare function toHexWithPrefix(num: number): string;

declare class RcspImpl extends RcspOpImplBase {
    getNotifyCmdParser(): Map<number, BaseCmdParser>;
}

export { CmdChangeCommunicationWay, CmdControlADVStream, CmdCustom, CmdData, CmdDeviceRequestOp, CmdEnterUpdateMode, CmdExitUpdateMode, CmdGetADVInfo, CmdGetSysInfo, CmdGetTargetInfo, CmdInnerCustom, CmdNotifyADVInfo, CmdNotifySysInfo, CmdNotifyUpdateFileSize, OpCode$2 as CmdOpCodeBase, OpCode as CmdOpCodeHeadSet, OpCode$1 as CmdOpCodeOta, CmdQueryUpdateResult, CmdReadFileBlock, CmdReadFileOffset, CmdRebootDevice, CmdRequestUpdate, CmdSetADVInfo, CmdSetMtu, CmdSetSysInfo, Command, CommandBase, CommandCallback, Connection, Device, DeviceInfo, DeviceInfoManager, ErrorCode, KeySettings, LedSettings, LtvBean, OnRcspCallback, OnResultCallback, OnSendDataCallback, ParamADVInfo, ParamBase, ParamCommunicationWay, ParamData, ParamFileBlock, ParamGetADVInfo, ParamGetSysInfo, ParamMtu, ParamOperation, ParamRebootDevice, ParamRequestUpdate, ParamSetADVInfo, ParamSysInfo, ParamTargetInfo, ParamUpdateFileSize, RCSPError, RCSPErrorCode, RcspCallbackManager, RcspConstant, RcspImpl, ResponseBase, ResponseData, ResponseFileBlock, ResponseFileOffset, ResponseGetADVInfo, ResponseMtu, ResponseResult, ResponseSysInfo, ResponseTargetInfo, ab2hex, bigBytes2ToInt, bigBytes4ToInt, gbkToString, hexDataCovetToAddress, intToBigBytes2, intToBigBytes4, logd, loge, logi, logv, logw, setLogGrade, setLogger, toHexWithPrefix, utf8ToString };
