// 蓝牙UI交互层，处理蓝牙适配器状态。可以在UI层自己实现
import { BTManager, BTAdapter } from "./bluetooth";
import { logv, logd, logi, logw, loge, ab2hex } from "./log";

class BluetoothUIImpl extends BTManager.BluetoothImpl {
    startScan(scanTimeOut?: number): void {
        this._checkLocation(scanTimeOut)
    }
    private _checkLocation(scanTimeOut?: number) {
        this.checkLocation().then((available) => {
            if (available) {//位置信息可用
                logv("_checkLocation 位置信息可用");
                this._checkBluetooth(scanTimeOut)
            }
        }).catch((locationInfo: BTAdapter.LocationAdapterInfo) => {
            logv("locationInfo", locationInfo);
            if (locationInfo.locationEnabled == false) {//位置信息未打开
                logv(" _checkLocation 位置信息未打开");
                uni.showModal({
                    title: '位置信息未打开',
                    content: "请先打开位置信息，打开后请重新扫描",
                    showCancel: false
                })
                return
            } else {//位置信息已打开
                logv(" _checkLocation 位置信息已打开");
            }
            if (locationInfo.locationAuthorized == false) {//GPS-应用未授权
                logv(" _checkLocation GPS-应用未授权");
                uni.showModal({
                    title: '未授权[位置信息]权限',
                    content: "搜索蓝牙设备，需要授权[位置信息]权限",
                    success: (res) => {
                        // if (res.confirm) {
                        //   // BluetoothInstance.authorizeLocation().then((res) => {
                        //   //   logv(" _checkLocation GPS-应用授权成功");
                        //   // }).catch((err) => {
                        //   //   logv(" _checkLocation GPS-应用授权失败");
                        //   // })
                        // }
                    }
                })
                return
            } else {//GPS-应用已授权
                logv(" _checkLocation GPS-应用已授权");
            }
            if (locationInfo.locationSetting == false) {//GPS-小程序/应用未授权
                logv(" _checkLocation GPS-小程序/应用未授权");
                this.authorizeLocation().then((res) => {
                    if (res == false) {
                        uni.showModal({
                            title: '使用[位置信息]权限',
                            content: "搜索蓝牙设备，需要授权[位置信息]权限",
                            success: (res) => {
                                if (res.confirm) {
                                    uni.openSetting({
                                        success: (res) => {
                                            let title = "授权失败"
                                            if (res.authSetting['scope.userLocation'] == true) {
                                                title = "授权成功，请重新扫描"
                                            }
                                            uni.showToast({ icon: 'none', title: title })
                                        }
                                    })
                                }
                            }
                        })
                    }
                }).catch((err) => {
                    loge("授权小程序蓝牙失败", err);
                })
                return
            } else {///GPS-小程序/应用已授权
                logv(" _checkLocation GPS-小程序/应用已授权");
            }
        })
    }
    private _checkBluetooth(scanTimeOut?: number) {
        this.checkBluetoothAdapter().then((available) => {
            if (available) {
                logv("checkBluetoothAdapter， 蓝牙可用");
                super.startScan(scanTimeOut)
            } else {
                logv("checkBluetoothAdapter， 蓝牙不可用");
            }
        }).catch((btAdapterInfo: BTAdapter.BTAdapterInfo) => {
            if (btAdapterInfo.bluetoothSupport == false) {//不支持蓝牙,pc不支持蓝牙功能
                logv(" checkBluetoothAdapter， 不支持蓝牙");
                return
            } else {//支持蓝牙
                logv(" checkBluetoothAdapter， 支持蓝牙");
            }
            if (btAdapterInfo.bluetoothEnabled == false) {//蓝牙未打开
                logv(" checkBluetoothAdapter， 蓝牙未打开");
                if (this._platform === 'android' || this._platform === 'ohos') {
                    uni.showModal({
                        title: '蓝牙未打开',
                        content: "跳转系统蓝牙设置页",
                        success: (res) => {
                            if (res.confirm) {
                                this.openSystemBluetoothSetting({
                                    success: (res) => {
                                        logv("openSystemBluetoothSetting ", res);
                                    }
                                })
                            }
                        }
                    })
                } else {
                    uni.showModal({
                        title: '蓝牙未打开',
                        content: "请先打开蓝牙",
                        showCancel: false
                    })
                }
                return
            } else {//蓝牙已打开
                logv(" checkBluetoothAdapter， 蓝牙已打开");
            }
            if (btAdapterInfo.bluetoothSetting == false) {//蓝牙-小程序未授权
                logv(" checkBluetoothAdapter， 蓝牙-小程序未授权");
                this.authorizeBluetooth().then((res) => {
                    if (res == false) {
                        uni.showModal({
                            title: '使用[蓝牙]权限',
                            content: "搜索蓝牙设备，需要授权[蓝牙]权限",
                            success: (res) => {
                                if (res.confirm) {
                                    uni.openSetting({
                                        success: (res) => {
                                            let title = "授权失败"
                                            //@ts-ignore
                                            if (res.authSetting['scope.bluetooth'] == true) {
                                                title = "授权成功，请重新扫描"
                                            }
                                            uni.showToast({ icon: 'none', title: title })
                                        }
                                    })
                                }
                            }
                        })
                    } else {
                        this._openBluetoothAdapter(scanTimeOut)
                    }
                }).catch((err) => {
                    loge("授权小程序蓝牙失败", err);
                })
                return
            } else {///蓝牙-小程序已授权
                logv(" checkBluetoothAdapter， 蓝牙-小程序已授权");
            }
            if (btAdapterInfo.bluetoothInit == false) {//蓝牙-适配器未初始化
                logv(" checkBluetoothAdapter， 蓝牙-适配器未初始化");
                this._openBluetoothAdapter(scanTimeOut)
                return
            } else {
                logv(" checkBluetoothAdapter， 蓝牙-适配器已初始化");
            }
        })
    }
    private _openBluetoothAdapter(scanTimeOut?: number) {
        this.openBluetoothAdapter({
            success: () => {
                logv("打开适配器成功");
                super.startScan(scanTimeOut)
            }, fail: () => {
                logv("打开适配器失败");
            }
        })
    }
}
export var BluetoothInstance = new BluetoothUIImpl()
