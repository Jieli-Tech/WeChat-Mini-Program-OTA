import { Device } from "./rcsp-protocol/jl-rcsp/rcsp-base";
import { logGroup, logGroupEnd, logv, logd, logi, logw, loge } from "./log";

/todo 不可以跟上层扫描冲突，所以要上层的扫描/
export class Reconnect {
    reconnectOp: ReconnectOp;
    reconnectCallback: ReconnectCallback;
    isFinished: boolean = false;
    connectingDevice: WechatMiniprogram.BlueToothDevice | undefined;
    timeoutNumber: number = -1;
    constructor(op: ReconnectOp, callback: ReconnectCallback) {
        this.reconnectOp = op;
        this.reconnectCallback = callback;
    }
    startReconnect(timeout: number) {
        this.timeoutNumber = setTimeout(() => {
            clearTimeout(this.timeoutNumber)
            this.reconnectCallback.onReconnectFailed()
        }, timeout);
        this.reconnectOp.startScanDevice()
    }
    stopReconnect() {
      this.isFinished = true
      clearTimeout(this.timeoutNumber)
    }
    //上层扫描暂停通知
    onScanStop() {
        console.error("上层扫描暂停通知 : " +this.isFinishedReconnect());
        if (!this.isFinishedReconnect()) {
            this.reconnectOp.startScanDevice();
        }
    }
    //上层扫描发现设备
    onDiscoveryDevices(devices: WechatMiniprogram.BlueToothDevice[]) {
        devices.forEach(device => {
            this.onDiscoveryDevice(device)
        });
    }
    //上层扫描发现设备
    onDiscoveryDevice(device: WechatMiniprogram.BlueToothDevice) {
        if (!this.isFinishedReconnect()) {
            if (this.reconnectOp.isReconnectDevice(device)) {
                this.connectingDevice = device
                this.reconnectOp.connectDevice(device)
            }
        }
    }
    //上层连接设备成功-
    onDeviceConnected(device: Device) {
        logi("onDeviceConnected : " + device.mac + " deviceId :" + this.connectingDevice!.deviceId);
        if (this.connectingDevice != null && device.mac == this.connectingDevice.deviceId) {
            clearTimeout(this.timeoutNumber)
            this.reconnectCallback.onReconnectSuccess(device)
            this.isFinished = true
        }
    }
    private isFinishedReconnect(): boolean {
        return this.isFinished;
    }
}
//新回连方式解析器
export function parseReconnectNewWayMsg(rawData: ArrayBuffer) {

}

export interface ReconnectOp {
    startScanDevice(): any;//扫描设备
    isReconnectDevice(scanDevice: WechatMiniprogram.BlueToothDevice): boolean//判断是不是回连设备
    connectDevice(device: WechatMiniprogram.BlueToothDevice): any;//连接设备
}
export interface ReconnectCallback {
    onReconnectSuccess(device: Device): any;
    onReconnectFailed(): any;
}