// ota-rcsp.ts OTA库和Rcsp协议库连接类
import { CmdChangeCommunicationWay, ParamCommunicationWay, RcspOpImpl, RcspConstant, CommandCallback, ResponseBase, ErrorCode, CmdReadFileOffset, CmdRequestUpdate, ParamRequestUpdate, CmdEnterUpdateMode, CmdExitUpdateMode, CmdQueryUpdateResult, CmdRebootDevice, ParamRebootDevice, CmdControlADVStream, CommandBase, CmdReadFileBlock, OnRcspCallback, Connection, CmdNotifyUpdateFileSize, CmdNotifyADVInfo, CmdGetTargetInfo, ResponseResult, Device } from "../jl-rcsp/jl_rcsp_ota_2.0.0";
import { IOTAOp, OnResultCallback, FileOffset, OTAConfig, OTAImpl, DeviceUpgradeInfo, OnUpgradeCallback } from "./jl_ota_2.0.0";
import { logGroup, logGroupEnd, logv, logd, logi, logw, loge } from "../../log";

export class RcspOTAManager {
  private mRcspOpImpl: RcspOpImpl;
  private mOTAImpl: OTAImpl
  private mRcspOTA: RcspOTA
  constructor(rcspOpImpl?: RcspOpImpl) {
    if (rcspOpImpl == undefined) {//未从外部传递则初始化一个
      this.mRcspOpImpl = new RcspOpImpl()
    } else {
      this.mRcspOpImpl = rcspOpImpl
    }
    this.mRcspOTA = new RcspOTA(this.mRcspOpImpl)
    this.mOTAImpl = this.mRcspOTA.getOTAImpl()
    if (rcspOpImpl != undefined) { //外部传递的需要判断是否已连接设备。已连接的话，需要把设备信息设置进OTAImpl
      const usingDevice = this.mRcspOpImpl.getUsingDevice()
      if (usingDevice != null) {
        const deviceInfo = this.mRcspOpImpl.getDeviceInfo(usingDevice)
        if (deviceInfo != undefined) {
          const upgradeInfo = new DeviceUpgradeInfo(deviceInfo.isSupportDoubleBackup, deviceInfo.isNeedBootLoader, deviceInfo.mandatoryUpgradeFlag == CmdGetTargetInfo.FLAG_MANDATORY_UPGRADE)
          this.mOTAImpl.onDeviceInit(upgradeInfo, true)
        }
      }
    }
  }
  /**
   * releas
   */
  public release() {
    this.mRcspOTA.release()
  }
  public startOTA(config: OTAConfig, callback: OnUpgradeCallback) {
    this.mRcspOTA.startOTA(config, callback)
  }
  public cancelOTA() {
    this.mRcspOTA.cancelOTA()
  }
  public getCurrentOTADevice(): Device | null {
    return this.mRcspOTA.getOTADevice()
  }
  public getCurrentOTADeviceMac(): string | undefined {
    return this.mRcspOTA.getOTADeviceMac()
  }
  //回连更新device
  public updateOTADevice(device: Device) {
    return this.mRcspOTA.setOTADevice(device)
  }
}
/todo 要处理区分是不是同一个设备, 回连需要更新一下 mOTADevice/
export class RcspOTA implements IOTAOp {
  private cmdFileBlockCache: Array<CmdReadFileBlock> = new Array()
  private mRcspOpImpl: RcspOpImpl;
  private readonly cmdTimeout = RcspConstant.DEFAULT_SEND_CMD_TIMEOUT;
  private mOTAImpl: OTAImpl
  private mStopNotifyADV = false
  private mOnRcspCallback: OnRcspCallback
  private mOTADevice: Device | null = null
  private mOTADeviceMac: string | undefined = undefined
  constructor(rcspOpImpl: RcspOpImpl) {
    this.mOTAImpl = new OTAImpl(this)
    this.mRcspOpImpl = rcspOpImpl;
    const that = this
    this.mOnRcspCallback = {
      onRcspInit(device?: Device | null, isInit?: boolean): void {
        logi("onRcspInit:1" + JSON.stringify(that.mOTADevice) + " :device " + JSON.stringify(device));
        if (device == undefined) return
        if (that.mOTADevice != null && !that.mOTADevice.equals(device)) return//不等于升级设备
        const deviceInfo = that.mRcspOpImpl.getDeviceInfo(device)
        logi("onRcspInit:2" + JSON.stringify(deviceInfo));
        that.mOTADeviceMac = deviceInfo?.bleAddr
        let upgradeInfo: DeviceUpgradeInfo | undefined = undefined
        if (deviceInfo != undefined) {
          upgradeInfo = new DeviceUpgradeInfo(deviceInfo.isSupportDoubleBackup, deviceInfo.isNeedBootLoader, deviceInfo.mandatoryUpgradeFlag == CmdGetTargetInfo.FLAG_MANDATORY_UPGRADE)
        }
        that.mOTAImpl.onDeviceInit(upgradeInfo, isInit)
      },
      onRcspCommand(device: Device | null, command: CommandBase): void {
        logv("onRcspCommand : " + command.getOpCode());
        if (device == null) return
        if (command instanceof CmdReadFileBlock) {//设备请求文件数据
          logv("onRcspCommand : 设备请求文件数据");
          const readFileBlock = command as CmdReadFileBlock;
          const offset = readFileBlock.getParam().offset;
          const len = readFileBlock.getParam().len;
          that.saveCacheCmdResponse(readFileBlock)
          that.mOTAImpl.gainFileBlock(offset, len)
        } else if (command instanceof CmdNotifyUpdateFileSize) {//设备通知文件升级大小
          const notifyUpdateFileSize = command as CmdNotifyUpdateFileSize;
          const totalOTaSize = notifyUpdateFileSize.getParam().totalSize;
          const currentOtaSize = notifyUpdateFileSize.getParam().currentSize;
          that.mOTAImpl.notifyUpgradeSize(totalOTaSize, currentOtaSize)
          if (notifyUpdateFileSize.getResponse() != undefined) {//回复命令
            notifyUpdateFileSize.getResponse()?.setStatus(ResponseBase.STATUS_SUCCESS)
            // notifyUpdateFileSize.response.sn = notifyUpdateFileSize.sn
            // notifyUpdateFileSize.isCommand = false
            notifyUpdateFileSize.getResponse()?.setSn(notifyUpdateFileSize.getSn())
            notifyUpdateFileSize.setCommand(false)
            that.mRcspOpImpl.sendRCSPCommand(device, notifyUpdateFileSize, that.cmdTimeout, new CmdBooleanCallback("Response ", null))
          }
        } else if (command instanceof CmdNotifyADVInfo) {//设备广播ADV信息 
          logv("onRcspCommand : 设备广播ADV信息");
          if (!that.mStopNotifyADV) {//停止推送广播包信息
            const cmdControlADVStream = new CmdControlADVStream(CmdControlADVStream.CTRL_OP_CLOSE)
            that.mRcspOpImpl.sendRCSPCommand(device, cmdControlADVStream, that.cmdTimeout, new CmdBooleanCallback("stopNotifyADV", null))
            that.mStopNotifyADV = true
          }
        }
      },
      onRcspDataCmd(device: Device | null, dataCmd: CommandBase): void {
      },
      onConnectStateChange(device: Device | null, status: Connection): void {
        if (device == null) return
        if (status == Connection.CONNECTION_DISCONNECT && true) {//状态断开且设备是升级设备 
          that.mOTAImpl.onDeviceDisconnect()
        }
      },
      onRcspError(device: Device | null, error: number, message: string): void { },
      onMandatoryUpgrade(device: Device | null): void { }
    }
    rcspOpImpl.addOnRcspCallback(this.mOnRcspCallback)
  }

  public getOTAImpl(): OTAImpl {
    return this.mOTAImpl
  }

  startOTA(config: OTAConfig, callback: OnUpgradeCallback) {
    this.mOTADevice = this.mRcspOpImpl.getUsingDevice()
    if (this.mOTADevice != null) {
      this.mOTADeviceMac = this.mRcspOpImpl.getDeviceInfo(this.mOTADevice)?.bleAddr
    }
    this.mOTAImpl.startOTA(config, callback)
  }
  cancelOTA() {
    this.mOTAImpl.cancelOTA()
  }
  getOTADevice(): Device | null {
    return this.mOTADevice
  }
  getOTADeviceMac(): string | undefined {
    return this.mOTADeviceMac
  }
  setOTADevice(device: Device | null) {
    this.mOTADevice = device
  }
  /** -----------IOTAOp实现--------------------- */
  release() {
    this.mOTAImpl.release()
    this.mRcspOpImpl.removeOnRcspCallback(this.mOnRcspCallback)
  }

  /** 是否已连接设备 */
  isDeviceConnected(): boolean {
    //设备已连接且
    return this.mRcspOpImpl.isDeviceConnected() && this.mOTADevice != null && this.mOTADevice.equals(this.mRcspOpImpl.getUsingDevice())
  }

  /** 切换通讯方式 */
  changeCommunicationWay(communicationWay: number, isSupportNewRebootWay: boolean, callback: OnResultCallback<number>): void {
    if (!this.isDeviceConnected()) return
    const param = new ParamCommunicationWay(communicationWay, isSupportNewRebootWay)
    const cmdResultCallback = new CmdResultCallback("changeCommunicationWay", callback, {
      hasResult(): number {
        return 0;
      },
      handleResult(device: Device, command: CmdChangeCommunicationWay): number | undefined {
        return command.getResponse()?.result;
      }
    });
    this.mRcspOpImpl.sendRCSPCommand(this.mOTADevice!, new CmdChangeCommunicationWay(param), this.cmdTimeout, cmdResultCallback)
  }

  /** 读取文件头信息偏移 */
  readUpgradeFileFlag(callback: OnResultCallback<FileOffset>): void {
    if (!this.isDeviceConnected()) return
    const cmdResultCallback = new CmdResultCallback("readUpgradeFileFlag", callback, {
      hasResult(): number {
        return 0;
      },
      handleResult(device: Device, command: CmdReadFileOffset): FileOffset | undefined {
        return new FileOffset(command.getResponse()?.offset, command.getResponse()?.len);
      }
    });
    this.mRcspOpImpl.sendRCSPCommand(this.mOTADevice!, new CmdReadFileOffset(), this.cmdTimeout, cmdResultCallback)
  }

  /** 查询设备是否可升级 */
  inquiryDeviceCanOTA(data: Uint8Array, callback: OnResultCallback<number>): void {
    if (!this.isDeviceConnected()) return
    const command = new CmdRequestUpdate(new ParamRequestUpdate(data))
    const cmdResultCallback = new CmdResultCallback("inquiryDeviceCanOTA", callback, {
      hasResult(): number {
        return 0;
      },
      handleResult(device: Device, command: CmdRequestUpdate): number | undefined {
        return command.getResponse()?.result;
      }
    });
    this.mRcspOpImpl.sendRCSPCommand(this.mOTADevice!, command, this.cmdTimeout, cmdResultCallback)
  }

  /** 非RCSP库不用实现该方法————调整RCSP库的设备收数据的MTU(App的缓存)，让数据可以成功发出 */
  changeReceiveMtu(): void {
    if (!this.isDeviceConnected()) return
    const deviceInfo = this.mRcspOpImpl.getDeviceInfo(this.mOTADevice!);
    if (deviceInfo == undefined) return
    if (deviceInfo.receiveMtu < RcspConstant.DEFAULT_PROTOCOL_MTU) {
      deviceInfo.receiveMtu = RcspConstant.DEFAULT_PROTOCOL_MTU
      this.mRcspOpImpl.getDeviceInfoManager().updateDeviceInfo(this.mOTADevice!, deviceInfo);
    }
  }

  /** 进入升级模式 */
  enterUpdateMode(callback: OnResultCallback<number>): void {
    if (!this.isDeviceConnected()) return
    const command = new CmdEnterUpdateMode()
    const cmdResultCallback = new CmdResultCallback("enterUpdateMode", callback, {
      hasResult(): number {
        return 0;
      },
      handleResult(device: Device, command: CmdEnterUpdateMode): number | undefined {
        return command.getResponse()?.result;
      }
    });
    this.mRcspOpImpl.sendRCSPCommand(this.mOTADevice!, command, this.cmdTimeout, cmdResultCallback)
  }

  /** 退出升级模式 */
  exitUpdateMode(callback: OnResultCallback<number>): void {
    if (!this.isDeviceConnected()) return
    const command = new CmdExitUpdateMode()
    const cmdResultCallback = new CmdResultCallback("exitUpdateMode", callback, {
      hasResult(): number {
        return 0;
      },
      handleResult(device: Device, command: CmdExitUpdateMode): number | undefined {
        return command.getResponse()?.result;
      }
    });
    this.mRcspOpImpl.sendRCSPCommand(this.mOTADevice!, command, this.cmdTimeout, cmdResultCallback)
  }

  /** 读取设备升级状态 */
  queryUpdateResult(callback: OnResultCallback<number>): void {
    if (!this.isDeviceConnected()) return
    const command = new CmdQueryUpdateResult()
    const cmdResultCallback = new CmdResultCallback("queryUpdateResult", callback, {
      hasResult(): number {
        return 0;
      },
      handleResult(device: Device, command: CmdQueryUpdateResult): number | undefined {
        return command.getResponse()?.result;
      }
    });
    this.mRcspOpImpl.sendRCSPCommand(this.mOTADevice!, command, this.cmdTimeout, cmdResultCallback)
  }

  /** 重启或关闭设备 */
  rebootDevice(callback: OnResultCallback<boolean> | null): void {
    if (!this.isDeviceConnected()) return
    const command = new CmdRebootDevice(new ParamRebootDevice(ParamRebootDevice.OP_REBOOT))
    const cmdResultCallback = new CmdBooleanCallback("rebootDevice", callback);
    this.mRcspOpImpl.sendRCSPCommand(this.mOTADevice!, command, this.cmdTimeout, cmdResultCallback)
  }

  /** 设置TWS设备通知 */
  stopNotifyADV(callback: OnResultCallback<boolean>): void {
    if (!this.isDeviceConnected()) return
    const command = new CmdControlADVStream(CmdControlADVStream.CTRL_OP_CLOSE)
    const cmdResultCallback = new CmdBooleanCallback("stopNotifyADV", callback);
    this.mRcspOpImpl.sendRCSPCommand(this.mOTADevice!, command, this.cmdTimeout, cmdResultCallback)
  }

  /** 回复发送升级固件数据块 */
  receiveFileBlock(offset: number, len: number, data: Uint8Array, callback: OnResultCallback<boolean>): void {
    if (!this.isDeviceConnected()) return
    const command = this.getCacheCmdResponse(offset, len)
    if (command == null) return
    let status = ResponseResult.STATUS_SUCCESS;
    if (data.length == 0 && offset > 0 && len > 0) {
      status = ResponseResult.STATUS_INVALID_PARAM;
    }
    const response = command.getResponse()
    if (response != undefined) {
      response.setSn(command.getSn())
      response.block = data;
      response.setStatus(status);
      // command.isCommand = false
      command.setCommand(false)
    }
    const cmdResultCallback = new CmdBooleanCallback("receiveFileBlock", callback);
    this.mRcspOpImpl.sendRCSPCommand(this.mOTADevice!, command, this.cmdTimeout, cmdResultCallback)
  }

  /** 获取缓存的命令 */
  private getCacheCmdResponse(offset: number, len: number): CmdReadFileBlock | null {
    for (let index = 0; index < this.cmdFileBlockCache.length; index++) {
      const cmd = this.cmdFileBlockCache[index];
      if (cmd.getParam().offset == offset && cmd.getParam().len == len) {
        this.cmdFileBlockCache.splice(index, 1)
        return cmd
      }
    }
    return null
  }

  /** 添加缓存的命令 */
  private saveCacheCmdResponse(cmd: CmdReadFileBlock) {
    this.cmdFileBlockCache.push(cmd)
  }
}
class OTAOnRcspCallback extends OnRcspCallback {

}
/**处理结果 */
interface IHandleResult<T, C extends CommandBase> {
  hasResult(device: Device, command: C): number;
  handleResult(device: Device, command: C): T;
}
/** 命令结果处理 */
class CmdResultCallback<T, C extends CommandBase> implements CommandCallback<C> {
  protected readonly funcName: string;
  protected readonly callback: OnResultCallback<T> | null;
  protected readonly handle: IHandleResult<T, C>;

  constructor(funcName: string, callback: OnResultCallback<T> | null, handle: IHandleResult<T, C>) {
    if (null == handle) {
      loge("IHandleResult is null.");
    }
    this.funcName = funcName;
    this.callback = callback;
    this.handle = handle;
  }

  public onCmdResponse(device: Device, command: C): void {
    let code;
    let explain: string;
    if (command.getStatus() == ResponseBase.STATUS_SUCCESS) {
      const ret = this.handle.hasResult(device, command);
      if (ret == 0) {
        const result = this.handle.handleResult(device, command);
        this.callback?.onResult(result);
        return;
      }
      code = ErrorCode.ERROR_REPLY_BAD_RESULT;
      explain = "" + ret;
    } else {
      code = ErrorCode.ERROR_REPLY_BAD_STATUS;
      explain = "" + command.getStatus();
    }
    this.onError(device, code, ErrorCode.getErrorDesc2(code, explain));
  }

  public onError(device: Device, code: number, message: string): void {
    message = this.funcName + ":" + message;
    this.callback?.onError(code, message);
  }
}
/**  通用结果解析 */
class CmdBooleanCallback extends CmdResultCallback<Boolean, CommandBase> {
  constructor(funcName: string, callback: OnResultCallback<Boolean> | null) {
    const iHandle: IHandleResult<Boolean, CommandBase> = {
      hasResult(): number {
        return 0;
      },
      handleResult(): boolean {
        return true;
      }
    }
    super(funcName, callback, iHandle);
  }
}