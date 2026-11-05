/****杰理RCSP协议(杰理OTA) version 2.2.0 ****/
/**
 * 设备
 */
declare class BtDevice {
    deviceId: string;
    name?: string;
    constructor(deviceId: string, name?: string);
    equals(o: BtDevice | null): boolean;
}

declare class RcspConstant {
    static readonly DEFAULT_SEND_CMD_TIMEOUT: number;
    static readonly DEFAULT_PROTOCOL_MTU: number;
}
declare enum ConnectState {
    DISCONNECT = 0,
    CONNECTING = 1,
    CONNECTED = 2
}

declare abstract class BaseParam {
    abstract _toData(): Uint8Array;
    abstract _parseData(data: Uint8Array): number;
    protected _sn: number;
    private _payload?;
    getSn(): number;
    getPayload(): Uint8Array | undefined;
    setSn(sn: number): void;
    setPayload(payload: Uint8Array): void;
}

/**
 * Command-参数基类，是指APP、设备两端发送的命令参数
 */
declare class CommandParam extends BaseParam {
    _toData(): Uint8Array;
    _parseData(data: Uint8Array): number;
}

/**
 * Command-回复数据基类，是指APP、设备两端回复的命令参数
 */
declare class CmdRespParam extends BaseParam {
    static readonly STATUS_UNKNOWN = 255;
    static readonly STATUS_SUCCESS = 0;
    static readonly STATUS_FAILED = 1;
    static readonly STATUS_UNKNOWN_CMD = 2;
    static readonly STATUS_BUSY = 3;
    static readonly STATUS_NONE_RESOURCE = 4;
    static readonly STATUS_CRC_ERROR = 5;
    static readonly STATUS_ALL_DATA_CRC_ERROR = 6;
    static readonly STATUS_INVALID_PARAM = 7;
    static readonly STATUS_RESPONSE_DATA_OVER_LIMIT = 8;
    private _status;
    getStatus(): number;
    setStatus(status: number): void;
    _toData(): Uint8Array;
    _parseData(data: Uint8Array): number;
}

/** Command-一般性的命令回复结果码 */
declare class CommonRespParam extends CmdRespParam {
    /**
     * 成功回复
     */
    static readonly RESULT_OK = 0;
    /**
     * 失败结果
     */
    static readonly RESULT_FAIL = 1;
    result: number;
    _parseData(data: Uint8Array): number;
    _toData(): Uint8Array;
}

/** Command-RCSP基础数据类型 */
declare class RcspPacket {
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
    _getPayload(): Uint8Array | undefined;
    _setPayload(payload: Uint8Array): void;
    _toData(): Uint8Array | null;
    _parseData(data: Uint8Array): number;
}

/** Command-基础命令 */
declare class BaseCmd<P extends CommandParam, R extends CmdRespParam> extends RcspPacket {
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
    _toData(): Uint8Array | null;
}
declare class Command extends BaseCmd<CommandParam, CmdRespParam> {
}

/** Command-命令回调 */

interface CommandCallback<T extends Command> {
    /**
     * 回调回复命令
     * @param device  操作对象
     * @param command 回复命令
     *                <p>说明:
     *                1. 若有回复的命令, 返回的是带回复数据的命令对象
     *                2. 若无回复的命令, 返回的是命令原型</p>
     */
    onCmdResponse(device: BtDevice, command: T): void;
    /**
     * 回调错误事件
     * @param device  操作对象
     * @param code    错误码 (参考{@link com.jieli.rcsp.data.constant.ErrorCode})
     * @param message 错误描述
     */
    onError(device: BtDevice, code: number, message: string): void;
}

/**
 * RCSP数据解析监听
 */

interface OnRcspDataListener {
    /**
     * 回调接收到的RCSP命令包
     * @param device  操作设备
     * @param command RCSP命令包
     */
    onDeviceNotify: (device: BtDevice, command: Command) => void;
    /**
     * 回调接收到的RCSP回复包
     * @param device  操作设备
     * @param command RCSP回复包
     */
    onDeviceResponse: (device: BtDevice, command: Command) => void;
    /**
     * 回调错误事件
     * @param device  操作设备
     * @param code    错误码
     * @param message 错误描述
     */
    onError: (device: BtDevice | null, code: number, message: string) => void;
}

/**
 * 数据处理-基本数据信息
 */
declare class BaseDataInfo {
    static _DATA_TYPE_SEND: number;
    static _DATA_TYPE_RECEIVE: number;
    _device: BtDevice;
    _type: number;
    constructor(device: BtDevice, type: number);
}

/**
 * 数据处理-接收数据信息
 */

declare class ReceiveDataInfo extends BaseDataInfo {
    _data: Uint8Array;
    constructor(device: BtDevice, data: Uint8Array);
}

/**
 * 数据处理-发送数据信息
 */
declare class SendDataInfo extends BaseDataInfo {
    _command: Command;
    _timeoutMs: number;
    _callback: CommandCallback<Command> | null;
    _reSendCount: number;
    _sendTimestamp: number;
    constructor(device: BtDevice, command: Command, timeoutMs: number, callback: CommandCallback<Command> | null);
}

/** 命令解析器-基础解析器 */
declare abstract class BaseCmdParser {
    abstract _createCommand(): Command | null;
    _convertToCmd(packet: RcspPacket): Command | null;
}

/**
 * 数据透传代理
 */
interface IBluetoothProxy {
    /**
     * 传递设备的状态
     *
     * @param device 操作设备
     * @param state 设备状态
     *               <p>说明:
     *               1. 设备状态由库内定义，参考{@link }。
     *               2. 用户必须传入对应的状态码</p>
     */
    transmitDeviceState: (device: BtDevice, state: ConnectState) => void;
    /**
     * 传递从设备接收到的数据
     *
     * @param device 操作设备
     * @param data   原始数据
     */
    transmitDeviceData: (device: BtDevice, data: Uint8Array) => void;
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
    sendDataToDevice: (device: BtDevice, data: Uint8Array) => boolean;
}

/** Command- 读取固件特征信息*/
declare class CmdGetTargetInfo extends BaseCmd<ParamTargetInfo, ResponseTargetInfo> {
    static readonly FLAG_MANDATORY_UPGRADE = 1;
    constructor(param: ParamTargetInfo);
}
declare class ParamTargetInfo extends CommandParam {
    mask: number;
    platform: number;
    constructor(mask: number, platform: number);
    _toData(): Uint8Array;
}
declare class ResponseTargetInfo extends CmdRespParam {
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
    /**
     * TWS 状态原始数据（op-translation 的 TwsStatus.toData() 结果）
     *
     * 说明：TwsStatus/RoleInfo 类型定义在 jl_rcsp_op 模块，jl_rcsp 不能反向依赖，
     * 故这里只保存协议原始字节，由 op-translation 用 TwsStatus.fromData() 还原。
     *
     * ⚠️ 放在基类而非 DeviceInfo：DeviceInfoManager 缓存里的实例未必是 DeviceInfo
     *    （RcspWrapperBase.ts:200 传入的是 ResponseTargetInfo），
     *    若只在子类加方法，运行时会对没有该方法的对象调用而崩溃。
     *
     * 用途：面对面翻译（左右耳）需按 TWS 角色表判定"本机是左耳还是右耳"，并取从机 BLE 地址。
     */
    private _twsStatusData?;
    /** 设置 TWS 状态原始数据 */
    setTwsStatusData(data: Uint8Array | undefined): void;
    /** 获取 TWS 状态原始数据（undefined 表示设备尚未上报） */
    getTwsStatusData(): Uint8Array | undefined;
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
    /**升级最低电量*/
    upgradeMinQuantity?: number;
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
    lineInEnable: boolean;
    /**功能支持掩码-支持FM接收模式*/
    fmEnable: boolean;
    /**功能支持掩码-支持灯光模式*/
    lightEnable: boolean;
    /**功能支持掩码-支持FM发射模式*/
    fmTXEnable: boolean;
    /**功能支持掩码-支持EQ模式*/
    eqEnable: boolean;
    /**功能支持掩码-支持SPDIF模式*/
    spdifEnable: boolean;
    /**功能支持掩码-支持PC从机模式*/
    pcSlaveEnable: boolean;
    /**是否支持usb、sd、lineIn不在线时显示功能图标*/
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
    /**是否支持异常信息读取功能*/
    supportReadErrorMsg: boolean;
    /**大文件传输是否支持分包crc16校验*/
    supportPackageCrc16: boolean;
    /**以新的文件名方式读取固件文件(支持多设备)*/
    getFileByNameWithDev: boolean;
    /**联系人传输是否使用小文件方式*/
    contactsTransferBySmallFile: boolean;
    /**手表设置功能支持状态的掩码*/
    watchSettingMask: number;
    _parseData(data: Uint8Array): number;
    private _fillTargetInfo;
}

/**
 * 设备信息
 *
 * 注意：TWS 状态（面对面翻译左右耳需要）的 get/set 定义在父类 ResponseTargetInfo 上，
 * 不能加在本类 —— DeviceInfoManager 缓存里存的实例未必是 DeviceInfo
 * （RcspWrapperBase.ts:200 传入的是 ResponseTargetInfo），在子类加方法会在运行时崩溃。
 */
declare class DeviceInfo extends ResponseTargetInfo {
}

declare abstract class DeviceMtuManager {
    abstract getReceiveMtu(device: BtDevice): number | null;
    abstract getSendMtu(device: BtDevice): number | null;
}
/**
 * 设备信息管理器
 */
declare class DeviceInfoManager extends DeviceMtuManager {
    private deviceInfoMap;
    release(): void;
    getReceiveMtu(device: BtDevice): number | null;
    getSendMtu(device: BtDevice): number | null;
    getDeviceInfo(device: BtDevice): DeviceInfo | undefined;
    removeDeviceInfo(device: BtDevice): boolean | undefined;
    updateDeviceInfo(device: BtDevice, deviceInfo: DeviceInfo): void;
}

/** 数据处理-RCSP数据处理器 */
declare class RcspDataHandler {
    private SEND_AGAIN_LIMIT;
    protected _ioProxy: IBluetoothProxy;
    _listener: OnRcspDataListener;
    _deviceMtuManager: DeviceMtuManager;
    private _dataInfoCache;
    private _sendInfoArray;
    private _receiveInfoArray;
    private _rcspParser;
    private _isCanHandler;
    private _sendTimeOutIDMap;
    constructor(ioProxy: IBluetoothProxy, deviceMtuManager: DeviceMtuManager, cmdParserMap: Map<number, BaseCmdParser>, listener: OnRcspDataListener);
    _startHandler(): void;
    _stopHandler(): void;
    _addSendData(dataInfo: SendDataInfo): void;
    _addReceiveData(dataInfo: ReceiveDataInfo): void;
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

/** Command协议-错误码 */
declare class RcspPacketError {
    static readonly ERROR_NONE = 0;
    static readonly ERROR_INVALID_PARAM = -1;
    static readonly ERROR_DATA_FORMAT = -2;
    static readonly ERROR_NONE_PARSER = -67;
}

declare class CmdBaseParserManager {
    private _cmdParserMap;
    constructor();
    _getCmdParserMap(): Map<number, BaseCmdParser>;
}

declare class CmdOpCodeBase {
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

/** Command-切换通讯方式 */
declare class CmdChangeCommunicationWay extends BaseCmd<ParamCommunicationWay, CommonRespParam> {
    constructor(param: ParamCommunicationWay);
}
declare class ParamCommunicationWay extends CommandParam {
    readonly communicationWay: number;
    readonly isSupportNewRebootWay: boolean;
    constructor(communicationWay: number, isSupportNewRebootWay?: boolean);
    _toData(): Uint8Array;
}

/** Command-自定义命令*/
declare class CmdCustom extends BaseCmd<CommandParam, CmdRespParam> {
    constructor(param: CommandParam);
}
/** Command-内部自定义命令*/
declare class CmdInnerCustom extends BaseCmd<CommandParam, CmdRespParam> {
    constructor(param: CommandParam);
}

/** Command-数据传输命令 */
declare class CmdData extends BaseCmd<ParamData, ResponseData> {
    constructor(param: ParamData);
}
declare class ParamData extends CommandParam {
    responseOpCode: number | undefined;
    payload: Uint8Array | undefined;
    _toData(): Uint8Array;
    _parseData(data: Uint8Array): number;
}
declare class ResponseData extends CmdRespParam {
    responseOpCode: number | undefined;
    _toData(): Uint8Array;
    _parseData(data: Uint8Array): number;
}

/** Command-设置通讯MTU */
declare class CmdSetMtu extends BaseCmd<ParamMtu, ResponseMtu> {
    constructor(param: ParamMtu);
}
declare class ParamMtu extends CommandParam {
    protocolMtu: number;
    _parseData(data: Uint8Array): number;
    _toData(): Uint8Array;
}
declare class ResponseMtu extends CmdRespParam {
    realProtocolMtu: number;
    _parseData(data: Uint8Array): number;
    _toData(): Uint8Array;
}

declare class LtvBean {
    type?: number;
    value?: Uint8Array;
    constructor(type?: number, value?: Uint8Array);
    getLen(): number;
    toData(): Uint8Array;
    parseData(data: Uint8Array): number;
}

/** Command- 获取固件的状态信息 */
declare class CmdGetSysInfo extends BaseCmd<ParamGetSysInfo, ResponseSysInfo> {
    constructor(param: ParamGetSysInfo);
}
/** Command-固件向app推送状态信息 */
declare class CmdNotifySysInfo extends BaseCmd<ParamSysInfo, CmdRespParam> {
    constructor(param: ParamSysInfo);
}
/** Command- 设置固件的状态信息 */
declare class CmdSetSysInfo extends BaseCmd<ParamSysInfo, CmdRespParam> {
    constructor(param: ParamSysInfo);
}
declare class ParamSysInfo extends CommandParam {
    function: number | undefined;
    dataList: Array<LtvBean> | undefined;
    _toData(): Uint8Array;
    _parseData(data: Uint8Array): number;
}
declare class ParamGetSysInfo extends CommandParam {
    function: number;
    mask: number;
    _toData(): Uint8Array;
}
declare class ResponseSysInfo extends CmdRespParam {
    function?: number;
    dataList?: Array<LtvBean>;
    _parseData(data: Uint8Array): number;
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
    sendDataToDevice: (device: BtDevice, data: Uint8Array) => boolean;
}
/** Rcsp事件回调*/
declare class OnRcspCallback {
    /**
     * Rcsp协议初始化回调
     *
     * @param _device 已连接设备
     * @param _isInit 初始化结果
     */
    onRcspInit: (_device: BtDevice | null, _isInit: boolean) => void;
    /**
     * 设备主动发送的rcsp命令回调
     *
     * @param _device  已连接设备
     * @param _command RCSP命令
     */
    onRcspCommand: (_device: BtDevice | null, _command: Command) => void;
    /**
     * 设备回复的rcsp命令回调
     *
     * @param _device  已连接设备
     * @param _command RCSP命令
     */
    onRcspResponse: (_device: BtDevice | null, _command: Command) => void;
    /**
     * 设备主动发送的数据命令回调
     *
     * @param _device  已连接设备
     * @param _dataCmd 数据命令
     */
    onRcspDataCmd: (_device: BtDevice | null, _dataCmd: Command) => void;
    /**
     * RCSP错误事件回调
     *
     * @param _device  设备对象
     * @param _error   错误码 (参考{@link com.jieli.rcsp.data.constant.RcspError})
     * @param _message 错误描述
     */
    onRcspError: (_device: BtDevice | null, _error: number, _message: string) => void;
    /**
     * 需要强制升级回调
     *
     * @param _device 需要强制升级的设备
     */
    onMandatoryUpgrade: (_device: BtDevice | null) => void;
    /**
     * 设备连接状态
     *
     * @param _device 蓝牙设备
     * @param _status 连接状态
     */
    onConnectStateChange: (_device: BtDevice | null, _status: ConnectState) => void;
}
interface OnResultCallback<T> {
    /**回调结果
     *
     * @param device 操作设备
     * @param result 结果
     */
    onResult: (device: BtDevice, result: T) => void;
    /**回调错误结果
     *
     * @param device  操作设备
     * @param code    错误码 (参考{@link com.jieli.rcsp.data.constant.RcspError})
     * @param message 错误信
     */
    onError: (device: BtDevice, code: number, message: string) => void;
}

/** Rcsp协议实现 */
declare abstract class RcspImplBase implements IBluetoothProxy {
    protected mRCSPDataHandler: RcspDataHandler;
    private mDeviceInfoManager;
    private mRcspCallbackManager;
    private mCmdSnGenerator;
    private mTargetDevice;
    private mOnSendDataCallback?;
    constructor();
    abstract _getNotifyCmdParser(): Map<number, BaseCmdParser>;
    getUsingDevice(): BtDevice | null;
    setOnSendDataCallback(callback: OnSendDataCallback | undefined): void;
    isDeviceConnected(): boolean;
    getDeviceInfo(device: BtDevice): DeviceInfo | undefined;
    addOnRcspCallback(callback: OnRcspCallback): void;
    removeOnRcspCallback(callback: OnRcspCallback): void;
    transmitDeviceState(device: BtDevice, status: ConnectState): void;
    transmitDeviceData(device: BtDevice, data: Uint8Array): void;
    sendDataToDevice(device: BtDevice, data: Uint8Array): boolean;
    sendRCSPCommand(device: BtDevice, command: Command, timeoutMs: number, callback: CommandCallback<Command> | null): void;
    syncDeviceInfo(device: BtDevice, param: ParamTargetInfo, callback: OnResultCallback<ResponseTargetInfo>): void;
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

/** SN生成器 */
declare class SnGenerator {
    private cmdSn;
    private cmdSnMap;
    constructor();
    getRcspCmdSeq(device: BtDevice): number;
    autoIncSN(device: BtDevice): number;
    resetCmdSeq(device: BtDevice): void;
    release(): void;
    getCmdSn(device: BtDevice): number;
}

declare class RcspCallbackManager {
    private _callbacks;
    registerRcspCallback(callback: OnRcspCallback): void;
    unregisterRcspCallback(callback: OnRcspCallback): void;
    release(): void;
    onRcspInit(device: BtDevice | null, isInit: boolean): void;
    onRcspCommand(device: BtDevice | null, command: Command): void;
    onRcspResponse(device: BtDevice | null, command: Command): void;
    onRcspDataCmd(device: BtDevice | null, dataCmd: Command): void;
    onRcspError(device: BtDevice | null, error: number, message: string): void;
    onMandatoryUpgrade(device: BtDevice | null): void;
    onConnectStateChange(device: BtDevice | null, status: ConnectState): void;
    private _callbackRcspEvent;
}

declare class CmdOpCodeOTA {
    static readonly CMD_OTA_GET_DEVICE_UPDATE_FILE_INFO_OFFSET = 225;
    static readonly CMD_OTA_INQUIRE_DEVICE_IF_CAN_UPDATE = 226;
    static readonly CMD_OTA_ENTER_UPDATE_MODE = 227;
    static readonly CMD_OTA_EXIT_UPDATE_MODE = 228;
    static readonly CMD_OTA_SEND_FIRMWARE_UPDATE_BLOCK = 229;
    static readonly CMD_OTA_GET_DEVICE_REFRESH_FIRMWARE_STATUS = 230;
    static readonly CMD_REBOOT_DEVICE = 231;
    static readonly CMD_OTA_NOTIFY_UPDATE_CONTENT_SIZE = 232;
}

/** Command-查询设备能否更新 */
declare class CmdCheckIfUpgradeable extends BaseCmd<ParamRequestUpdate, CommonRespParam> {
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
declare class ParamRequestUpdate extends CommandParam {
    readonly data: Uint8Array;
    constructor(data: Uint8Array);
    _toData(): Uint8Array;
}

/** Command-请求进入升级模式 */
declare class CmdEnterUpgradeMode extends BaseCmd<CommandParam, ResponseEnterUpdateMode> {
    constructor();
}
/** Command-回复结果码 */
declare class ResponseEnterUpdateMode extends CmdRespParam {
    /**否进入了升级模式 */
    result: number;
    _parseData(data: Uint8Array): number;
    _toData(): Uint8Array;
}

/** Command-请求退出更新模式 */
declare class CmdExitUpgradeMode extends BaseCmd<CommandParam, CommonRespParam> {
    constructor();
}

/**
 * Command-读取文件偏移
 */
declare class CmdFirmwareFileInfo extends BaseCmd<CommandParam, ResponseFileOffset$1> {
    constructor();
}
declare class ResponseFileOffset$1 extends CmdRespParam {
    offset: number;
    len: number;
    _toData(): Uint8Array;
    _parseData(data: Uint8Array): number;
}

/** Command-读取文件块数据 */
declare class CmdGetUpgradeData extends BaseCmd<ParamFileBlock, ResponseFileBlock> {
    constructor();
}
declare class ParamFileBlock extends CommandParam {
    offset: number;
    len: number;
    _toData(): Uint8Array;
    _parseData(data: Uint8Array): number;
}
declare class ResponseFileBlock extends CmdRespParam {
    block?: Uint8Array;
    _toData(): Uint8Array;
    _parseData(data: Uint8Array): number;
}

/** Command-查询升级结果 */
declare class CmdGetUpgradeResult extends BaseCmd<CommandParam, CommonRespParam> {
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

/** Command-重启设备 */
declare class CmdRebootDevice extends BaseCmd<ParamRebootDevice, CommonRespParam> {
    constructor();
}
declare class ParamRebootDevice extends CommandParam {
    static OP_REBOOT: number;
    static OP_CLOSE: number;
    readonly op: number;
    constructor(op: number);
    _toData(): Uint8Array;
}

/** Command-读取文件偏移 */
declare class CmdUpgradeFileInfo extends BaseCmd<CommandParam, ResponseFileOffset> {
    constructor();
}
declare class ResponseFileOffset extends CmdRespParam {
    offset: number;
    len: number;
    _toData(): Uint8Array;
    _parseData(data: Uint8Array): number;
}

/** Command-通知升级内容大小 */
declare class CmdUpgradeProgressInfo extends BaseCmd<ParamUpdateFileSize, CmdRespParam> {
    constructor();
}
declare class ParamUpdateFileSize extends CommandParam {
    totalSize: number;
    currentSize: number;
    _parseData(data: Uint8Array): number;
    _toData(): Uint8Array;
}

declare class CmdOTAParserManager {
    private cmdParserMap;
    constructor();
    getCmdParserMap(): Map<number, BaseCmdParser>;
}

declare class CmdOpCodeHeadSet {
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
declare class CmdSetADVInfo extends BaseCmd<ParamSetADVInfo, CommonRespParam> {
    constructor(param: ParamSetADVInfo);
}
/**  TWS设置命令参数 */
declare class ParamSetADVInfo extends CommandParam {
    payload: Uint8Array;
    constructor(data: Uint8Array);
    _toData(): Uint8Array;
    _parseData(data: Uint8Array): number;
}
/**  获取ADV信息命令 */
declare class CmdGetADVInfo extends BaseCmd<ParamGetADVInfo, ResponseGetADVInfo> {
    constructor(param: ParamGetADVInfo);
}
/**  获取ADV信息参数 */
declare class ParamGetADVInfo extends CommandParam {
    mask: number;
    constructor(mask: number);
    _toData(): Uint8Array;
    _parseData(data: Uint8Array): number;
}
declare class ResponseGetADVInfo extends CmdRespParam {
    /**
         * 产品ID
         */
    pid: number;
    /**
     * 厂商ID
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
    _parseData(data: Uint8Array): number;
}
/**  通知设备广播信息 */
declare class CmdNotifyADVInfo extends BaseCmd<ParamADVInfo, CmdRespParam> {
    constructor();
}
/**广播包信息 */
declare class ParamADVInfo extends CommandParam {
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
    _parseData(data: Uint8Array): number;
    private _fillADVInfo;
}
/**  操作码参数 */
declare class ParamOperation<T extends number> extends CommandParam {
    op: T;
    constructor(op?: T);
    _toData(): Uint8Array;
    _parseData(data: Uint8Array): number;
}
declare enum OperationControlADVStream {
    /** 关闭广播流*/
    CTRL_OP_CLOSE = 0,
    /** 开启广播流*/
    CTRL_OP_OPEN = 1
}
declare class ParamControlADVStream extends ParamOperation<OperationControlADVStream> {
}
/**  控制ADV广播流*/
declare class CmdControlADVStream extends BaseCmd<ParamControlADVStream, CommonRespParam> {
    constructor(op: OperationControlADVStream);
}

declare enum OperationDeviceRequestOp {
    /** 主动更新配置信息*/
    REQUEST_OP_SYNC_SETTINGS = 0,
    /** 更新配置信息，需要重启生效*/
    REQUEST_OP_UPDATE_SETTINGS_AND_REBOOT = 1,
    /** 请求同步时间戳*/
    REQUEST_OP_SYNC_CONNECTION_TIME = 2,
    /** 请求回连设备*/
    REQUEST_OP_RECONNECT_DEVICE = 3,
    /** 请求同步设备信息*/
    REQUEST_OP_SYNC_DEVICE_INFO = 4
}
declare class ParamDeviceRequestOp extends ParamOperation<OperationDeviceRequestOp> {
}
/** 设备请求操作 */
declare class CmdDeviceRequestOp extends BaseCmd<ParamDeviceRequestOp, CmdRespParam> {
    constructor();
}

declare class CmdHeadSetParserManager {
    private _cmdParserMap;
    constructor();
    _getCmdParserMap(): Map<number, BaseCmdParser>;
}

declare class RcspImpl extends RcspImplBase {
    _getNotifyCmdParser(): Map<number, BaseCmdParser>;
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
/**时间转换成时间结构(4Bytes)
 * 举例：
 * - 2021-08-02 10:10:10
 * - 2E04A28A
 * - 00 1011   1000 00010     01010   001010   001010
 * - 年     月     天       时       分         秒
*/
declare function dateToTimeStructure(time: number): Uint8Array;
/**时间结构(4Bytes)转换成时间
 * 举例：
 * - 2021-08-02 10:10:10
 * - 2E04A28A
 * - 00 1011   1000 00010     01010   001010   001010
 * - 年     月     天       时       分         秒
*/
declare function timeStructureToDate(timeData: ArrayBuffer): number;
/**LTV打包(Len 2Bytes)
 *
*/
declare function packLTVPacket2(type: number, value: Uint8Array): Uint8Array;
declare function parseLTVPacket2(data: Uint8Array): {
    len: number;
    type: number;
    value: Uint8Array;
}[] | undefined;
declare function packLTVPacket(type: number, value: Uint8Array): Uint8Array;
/**
 * 解析LTV数据包
 *
 * @param data 数据
 * @return LTV对象列表
 */
declare function parseLTVData(data: Uint8Array): {
    len: number;
    type: number;
    value: Uint8Array;
}[] | undefined;
/**
 * arraybuffer 转字符串
 */
declare function toHexString(buffer: ArrayBuffer): string;
/**
 * 16进制数据转蓝牙地址
 */
declare function toBluetoothAddress(dataArray: Uint8Array): string;
/**
 * 蓝牙地址转16进制数据
 */
declare function bluetoothAddressToBytes(address: string): Uint8Array;
/**
 * String(utf8) 转 byteArray
 */
declare function stringToUtf8Bytes(str: string): Uint8Array;

interface ILogOption {
    output(level: string, module: string, tag: string, message: string, ...args: any[]): void;
}
declare abstract class LogHub {
    protected prefix: string;
    protected module: string;
    protected logOption: ILogOption | undefined;
    setLogOption(option: ILogOption): void;
    d(tag: string, message: string, ...args: any[]): void;
    i(tag: string, message: string, ...args: any[]): void;
    w(tag: string, message: string, ...args: any[]): void;
    e(tag: string, message: string, ...args: any[]): void;
    protected logout(level: string, tag: string, message: string, ...args: any[]): void;
    private createTimeString;
    private createLogPrefix;
    private static add0;
}

declare class RcspLog extends LogHub {
}
declare const Logger: RcspLog;

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
     * 0x5000 ~ 0x5FFF : 定义网路模块错误码
     * 0x6000 ~ 0x6FFF : 定义OTA错误码
     */
    /** (0) (操作成功)Success*/
    static readonly ERR_NONE = 0;
    /** (4097) (无效参数)Input invalid parameter*/
    static readonly ERR_INVALID_PARAMETER = 4097;
    /** (4098) (取消操作)Cancel operation.*/
    static readonly ERR_CANCEL_OP = 4098;
    /** (4099) (操作超时)Operation timeout.*/
    static readonly ERR_OPERATION_TIMEOUT = 4099;
    /** (4100) (其他错误)Other error.*/
    static readonly ERR_OTHER = 4100;
    /** (8192) (远端设备未连接)The remote device is not connected*/
    static readonly ERR_REMOTE_NOT_CONNECT = 8192;
    /** (8193) (操作设备不一致)The device is not the same as the device in use.*/
    static readonly ERR_DEVICE_NOT_MATCH = 8193;
    /** (8194) (调用系统接口失败)Failed to use system reflection function*/
    static readonly ERR_USE_SYSTEM_API = 8194;
    /**  (8195) (设备认证失败)Failed to auth device*/
    static readonly ERR_AUTH_DEVICE = 8195;
    /** (12288) (命令发送失败)Command sending failed.Please check the connection*/
    static readonly ERR_CMD_SEND = 12288;
    /** (12289) (解析数据异常)Error parsing RCSP data*/
    static readonly ERR_PARSE_DATA = 12289;
    /** (12290) (等待设备回复命令超时)Waiting for a reply packet timed out*/
    static readonly ERR_RESPONSE_TIMEOUT = 12290;
    /** (12291) (系统繁忙)System is busy*/
    static readonly ERR_SYSTEM_BUSY = 12291;
    /** (12292) (设备返回错误状态)Device response a bad status*/
    static readonly ERR_RESPONSE_BAD_STATUS = 12292;
    /** (12293) (设备返回错误结果)Device response a bad result*/
    static readonly ERR_RESPONSE_BAD_RESULT = 12293;
    /** (16384) (存储设备下线)Storage offline.*/
    static readonly ERR_STORAGE_OFFLINE = 16384;
    /** (16385) (文件浏览中)File browsing*/
    static readonly ERR_FILE_BROWSING = 16385;
    /** (16386) (数据加载完成)File data is loaded.*/
    static readonly ERR_DATA_LOAD_COMPLETE = 16386;
    /** (16387) (丢失文件数据)Missing file data*/
    static readonly ERR_MISSING_FILE_DATA = 16387;
    /** (16388) (文件夹层级过深)Directory hierarchy is too deep.*/
    static readonly ERR_DIR_TOO_DEEP = 16388;
    /** (16389) (读写异常)IO exception.*/
    static readonly ERR_IO_EXCEPTION = 16389;
    /** (16390) (文件与存储器不一致)File does not match storage.*/
    static readonly ERR_FILE_NOT_IN_STORAGE = 16390;
    /**
     * 获取错误描述
     *
     * @param code 错误码
     * @return 错误描述
     */
    static getErrorDesc(code: number, prefix?: string | undefined, explain?: string | undefined): string;
}
declare class RCSPError {
    errorCode: number;
    message?: string;
    step?: number;
    constructor(errorCode: number, message?: string);
}

declare class Auth {
    private authing;
    private authed;
    private authDeviceId;
    private timeoutTaskId;
    private authTime;
    private callback;
    constructor();
    startAuth(deviceId: string, callback: AuthListener, supportResetFlag?: boolean): void;
    stopAuth(): void;
    private _startAuth;
    handlerAuth(deviceId: String, data: Uint8Array): void;
    private _writeAuthData;
    private _stopTimeoutTask;
    private _startTimeoutTask;
    private _onAuthSuccess;
    private _onAuthFailed;
}
declare function setLinkKey(newLinkKey: number[]): void;
interface AuthListener {
    onSendData: (deviceId: string, data: ArrayBuffer) => void;
    onAuthSuccess: (deviceId: string) => void;
    onAuthFailed: (deviceId: string) => void;
}

declare class RCSPFactory {
    private static TAG;
    private static rcspImplMap;
    private static _AuthMap;
    private static sOnSendDataCallback;
    private static _isAuth;
    private static supportResetFlag;
    private static deviceStateMap;
    /**
     * 初始化工厂类
     * @param onSendDataCallback 数据发送回调
     * @param isAuth 是否需要认证
     */
    static init(onSendDataCallback: OnSendDataCallback, isAuth: boolean, supportResetFlag?: boolean): void;
    /**
     * 创建 RcspImpl 实例
     * @param device 设备对象
     * @returns RcspImpl 实例
     */
    static create(device: BtDevice): RcspImpl;
    /**
     * 处理设备数据
     * @param device 设备对象
     * @param data 接收到的数据
     */
    static transmitDeviceData(device: BtDevice, data: Uint8Array): void;
    /**
     * 处理设备状态
     * @param device 设备对象
     * @param status 设备连接状态
     */
    static transmitDeviceState(device: BtDevice, status: ConnectState): void;
    /**
     * 释放指定设备的 RcspImpl 实例
     * @param device 设备对象
     */
    static releaseRCSPImpl(device: BtDevice): void;
    /**
     * 销毁所有 RcspImpl 实例
     */
    static destroy(): void;
    /**
     * 检查设备ID是否存在于已连接设备列表中
     * @param deviceId 待检查的设备ID
     * @returns 如果设备ID存在于已连接设备列表中，则返回true；否则返回false
     */
    static isConnectedDeviceId(deviceId: string): boolean;
}

declare class RCSPSdkVersion {
    private static readonly versionCode;
    private static readonly versionName;
    static get VersionCode(): number;
    static get VersionName(): string;
}

export { Auth, AuthListener, BaseCmd, BaseCmdParser, BaseDataInfo, BaseParam, BtDevice, CmdBaseParserManager, CmdChangeCommunicationWay, CmdCheckIfUpgradeable, CmdControlADVStream, CmdCustom, CmdData, CmdDeviceRequestOp, CmdEnterUpgradeMode, CmdExitUpgradeMode, CmdFirmwareFileInfo, CmdGetADVInfo, CmdGetSysInfo, CmdGetTargetInfo, CmdGetUpgradeData, CmdGetUpgradeResult, CmdHeadSetParserManager, CmdInnerCustom, CmdNotifyADVInfo, CmdNotifySysInfo, CmdOTAParserManager, CmdOpCodeBase, CmdOpCodeHeadSet, CmdOpCodeOTA, CmdRebootDevice, CmdRespParam, CmdSetADVInfo, CmdSetMtu, CmdSetSysInfo, CmdUpgradeFileInfo, CmdUpgradeProgressInfo, Command, CommandCallback, CommandParam, CommonRespParam, ConnectState, DeviceInfo, DeviceInfoManager, DeviceMtuManager, IBluetoothProxy, ILogOption, KeySettings, LedSettings, LogHub, LtvBean, OnRcspCallback, OnRcspDataListener, OnResultCallback, OnSendDataCallback, OperationControlADVStream, OperationDeviceRequestOp, ParamADVInfo, ParamCommunicationWay, ParamControlADVStream, ParamData, ParamDeviceRequestOp, ParamGetADVInfo, ParamGetSysInfo, ParamMtu, ParamOperation, ParamRequestUpdate, ParamSetADVInfo, ParamSysInfo, ParamTargetInfo, RCSPError, RCSPErrorCode, RCSPFactory, RCSPSdkVersion, RcspCallbackManager, RcspConstant, RcspDataHandler, RcspImpl, RcspImplBase, Logger as RcspLog, RcspPacket, RcspPacketError, ReceiveDataInfo, ResponseData, ResponseGetADVInfo, ResponseMtu, ResponseSysInfo, ResponseTargetInfo, SendDataInfo, SnGenerator, bigBytes2ToInt, bigBytes4ToInt, bluetoothAddressToBytes, dateToTimeStructure, gbkToString, intToBigBytes2, intToBigBytes4, packLTVPacket, packLTVPacket2, parseLTVData, parseLTVPacket2, setLinkKey, stringToUtf8Bytes, timeStructureToDate, toBluetoothAddress, toHexString, toHexWithPrefix, utf8ToString };
