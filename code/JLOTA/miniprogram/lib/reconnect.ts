// import { Device } from "./JL_RCSP/jl-rcsp/rcsp-base";
import { logv, logd, logi, logw, loge } from "./log";
import { BluetoothDevice } from "./otaWrapper";
export class Reconnect {
    reconnectOp: ReconnectOp;
    reconnectCallback: ReconnectCallback;
    isFinished: boolean = false;
    connectingDevice: BluetoothDevice | undefined;
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
        loge("上层扫描暂停通知 : " + this.isFinishedReconnect());
        if (!this.isFinishedReconnect()) {
            this.reconnectOp.startScanDevice();
        }
    }
    //上层扫描发现设备
    onDiscoveryDevices(devices: BluetoothDevice[]) {
        devices.forEach(device => {
            this.onDiscoveryDevice(device)
        });
    }
    //上层扫描发现设备
    onDiscoveryDevice(device: BluetoothDevice) {
        if (!this.isFinishedReconnect()) {
            if (this.reconnectOp.isReconnectDevice(device)) {
                this.connectingDevice = device
                this.reconnectOp.connectDevice(device)
            }
        }
    }
    //上层连接设备成功-
    onDeviceConnected(device: BluetoothDevice) {
        if (!this.isFinishedReconnect()) {
            logi("onDeviceConnected : " + device.deviceId + " deviceId :" + this.connectingDevice?.deviceId);
            if (this.connectingDevice != null && device.deviceId == this.connectingDevice?.deviceId) {
                clearTimeout(this.timeoutNumber)
                this.reconnectCallback.onReconnectSuccess(device)
                this.isFinished = true
            }
        }
    }
    //上层连接设备失败-
    onDeviceConnectFailed(device: BluetoothDevice) {
        if (!this.isFinishedReconnect()) {
            logi("onDeviceConnectFailed : " + device.deviceId + " deviceId :" + this.connectingDevice?.deviceId);
            if (this.connectingDevice != null && device.deviceId == this.connectingDevice?.deviceId) {
                this.reconnectCallback.onDeviceConnectFailed(device)
            }
        }
    }
    //上层连接设备断开-
    onDeviceConnectDisconnected(device: BluetoothDevice) {
        if (!this.isFinishedReconnect()) {
            logi("onDeviceConnectDisconnected : " + device.deviceId + " deviceId :" + this.connectingDevice?.deviceId);
            if (this.connectingDevice != null && device.deviceId == this.connectingDevice?.deviceId) {
                this.reconnectCallback.onDeviceConnectDisconnected(device)
            }
        }
    }
    private isFinishedReconnect(): boolean {
        return this.isFinished;
    }
}
export interface ReconnectOp {
    startScanDevice(): any;//扫描设备
    isReconnectDevice(scanDevice: BluetoothDevice): boolean//判断是不是回连设备
    connectDevice(device: BluetoothDevice): any;//连接设备
}
export interface ReconnectCallback {
    /**回连成功*/
    onReconnectSuccess(device: BluetoothDevice): any;
    /**回连失败*/
    onReconnectFailed(): any;
    /**回连-连接失败*/
    onDeviceConnectFailed(device: BluetoothDevice): any;
    /**回连-连接断开*/
    onDeviceConnectDisconnected(device: BluetoothDevice): any;
}