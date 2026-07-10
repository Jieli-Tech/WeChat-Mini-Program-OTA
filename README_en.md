[tag download]:https://github.com/Jieli-Tech/WeChat-Mini-Program-OTA/tags
[tag_badgen]:https://img.shields.io/github/v/tag/Jieli-Tech/WeChat-Mini-Program-OTA?style=plastic&logo=android&labelColor=ffffff&color=informational&label=Tag&logoColor=blue

# WeChat-Mini-Program-OTA  [![tag][tag_badgen]][tag download]

<div align="center">



**JieLi OTA SDK (WeChat) - An Integrated SDK for Firmware Upgrade of JieLi Bluetooth Products**

[中文](./README.md) · [English](./README_en.md) · [Documentation Center](https://doc.zh-jieli.com/Apps/Wechat/ota/zh-cn/master/index.html) · [SDK Changelog](#8-version-history) · [Report Issues](https://github.com/Jieli-Tech/WeChat-Mini-Program-OTA/issues)

</div>

---

## 📋 Table of Contents

- [1. Overview](#1-overview)
- [2. Environment Requirements](#2-environment-requirements)
- [3. Quick Start](#3-quick-start)
- [4. Project Structure](#4-project-structure)
- [5. Configuration Guide](#5-configuration-guide)
- [6. Debugging Tips](#6-debugging-tips)
- [7. Community & Support](#7-community--support)
- [8. Version History](#8-version-history)
- [9. License](#9-license)

---



## 1. Overview

`WeChat-Mini-Program-OTA` is a firmware upgrade development platform provided by **Zhuhai Jieli Technology Co., Ltd.** for JieLi Bluetooth products. This SDK is specifically designed to implement <strong style="color:red">RCSP OTA</strong> upgrade functionality for our company's Bluetooth products, supporting BLE transport and providing a complete firmware upgrade workflow.

**JieLi OTA SDK** provides a rich set of upgrade features:

| Feature           | Description                                                     |
| -------------- | -------------------------------------------------------- |
| **BLE Upgrade** | Firmware upgrade via BLE channel |
| **Auto Reconnect**   | Automatic BLE reconnection for single-backup OTA, improving user experience                           |

---



## 2. Environment Requirements

| Category | Requirement | Description |
|------|------------|-----------|
| **Software** | WeChat client iOS 6.5.6+, Android 6.5.7+ | BLE support required |
| **Hardware** | JieLi SDK with **RCSP OTA** support | AC707N, AC703N, AC701N, AC697N, AC696N, AC695N, etc. |
| **Development Platform** | WeChat DevTools | Latest version recommended |
| **Language Support** | JavaScript | Full API support provided |


---



## 3. Quick Start

### 3.1 Clone the Repository

```bash
git clone https://github.com/Jieli-Tech/WeChat-Mini-Program-OTA.git
cd WeChat-Mini-Program-OTA
```



### 3.2 Import the Project into WeChat DevTools

1. Open WeChat DevTools
2. Select "Import"
3. Navigate to the extracted `code/` directory
4. Open the project files in the reference Demo source code project



### 3.3 Add Dependencies

- **jl_auth_x.x.x.d.ts** — RCSP authentication library declaration file
- **jl_auth_x.x.x.js** — RCSP authentication library JS file
- **jl_ota_x.x.x.d.ts** — OTA workflow library declaration file
- **jl_ota_x.x.x.js** — OTA workflow library JS file
- **jl_rcsp_ota_x.x.x.d.ts** — RCSP-OTA protocol library declaration file
- **jl_rcsp_ota_x.x.x.js** — RCSP-OTA protocol library JS file

**Note: xxx represents the version number**

Copy all dependency library JS files and declaration files from the `libs/` directory into the `lib` folder of your project directory.



### 3.5 Run the Sample Application

Search for the "杰理OTA升级" Mini Program in WeChat to explore SDK features and usage.



---



## 4. Project Structure

```
WeChat-Mini-Program-OTA/
├── code/                                    # Reference source code project folder
│   └── Demo source code project             # OTA Demo project source code
├── libs/                               # Core library folder
└── ReadMe.txt                          # Instructions file
```

---



## 5. Configuration Guide

### 5.1 Using the OTA Library

#### 5.1.1 Using OTAWrapper for OTA

In most cases, OTA functionality can be completed simply by using OTAWrapper. There is no need to implement or use the OTA library's interfaces directly.

**Step 1: Initialize OTAWrapper**

```typescript
// OTAWrapper initialization
const otaWrapperOption: OTAWrapperOption = {
    /** Whether authentication is required. If already authenticated at the upper layer, set to false. **/
    isUseAuth: () => {
        return this._BluetoothConfigure.isUseAuth
    },
    /** Whether to use internal reconnection. If the upper layer handles reconnection, set to false. **/
    isInnerReconnect: () => {
        return true
    },
    /** Scan for devices **/
    sanDevice: () => {
        // TODO: implement Bluetooth scan operation
    },
    /** Connect to device **/
    connectDevice: (device: BluetoothDevice) => {
        // TODO: implement Bluetooth connection operation
    },
    /** Disconnect device **/
    disconnectDevice: (device: BluetoothDevice) => {
        // TODO: implement Bluetooth disconnection operation
    },
    /** Send data (not required).
    * Required when:
    * - 1. RCSPImpl is created and managed internally, i.e. OTAWrapperOption.getRCSPImpl is not implemented
    * - 2. Authentication is needed, i.e. OTAWrapperOption.isUseAuth returns false
    * **/
    sendData: (device: BluetoothDevice, data: Uint8Array) => {
       // TODO: implement Bluetooth data sending operation
    }
    /** Get RCSPImpl (not required).
    * - Implement when the upper layer manages RCSPImpl, e.g. when using jl-rcsp-op.
    * - If not implemented, RCSPImpl is created and managed internally.
    *  **/
    //getRCSPImpl?(device: BluetoothDevice): RCSPProtocol.RcspImpl | undefined
}
this._OTAWrapper = new OTAWrapper(otaWrapperOption)
```

**Step 2: Listen to Bluetooth connection state and sync with OTAWrapper**

```typescript
this._bluetoothInstance.addConnectCallback({
    onMTUChange: (dev: any, mtu) => {
        BleSendDataHandler.setMtu(dev.deviceId, mtu)
        this._onConnectStateMTUChange(dev, mtu)
    }, onConnectSuccess: (dev: any) => {
        // Notify OTAWrapper of successful Bluetooth connection
        this._OTAWrapper.onConnectStateSuccess(dev)
        this._onConnectStateSuccess(dev)
    }, onConnectFailed: (dev: any, _err) => {
        // Notify OTAWrapper of failed Bluetooth connection
        this._OTAWrapper.onConnectStateFailed(dev)
        this._onConnectStateFailed(dev)
    }, onConnectDisconnect: (dev: any) => {
        // Notify OTAWrapper of Bluetooth disconnection
        this._OTAWrapper.onConnectStateDisconnect(dev)
        this._onConnectStateDisconnect(dev)
    }
})
```

**Step 3: Listen to Bluetooth scan state and sync with OTAWrapper**

```typescript
this._bluetoothInstance.addScanCallback({
    onFound: (devs: BTBean.BluetoothDevice[]) => {
        // Notify OTAWrapper of discovered devices
        this._OTAWrapper.onScanFound(devs)
        this._onScanFound(devs)
    }, onScanStart: () => {
        this._onScanStart()
    }, onScanFailed: (err: BTBean.BluetoothError) => {
        this._onScanFailed(err)
    }, onScanFinish: () => {
        // Notify OTAWrapper that device scanning has stopped
        this._OTAWrapper.onSanDeviceStop()
        this._onScanFinish()
    }
})
```

**Step 4: Listen to Bluetooth data push and sync with OTAWrapper**

```typescript
const bleDataCallback: BleDataCallback = {
    onReceiveData: (res: WechatMiniprogram.OnBLECharacteristicValueChangeCallbackResult) => {
        // Notify OTAWrapper of received data
        this._OTAWrapper.onReceiveData(this._toDevice(res.deviceId), res.value)
    }
}
BleDataHandler.addCallbacks(bleDataCallback)
```

**Step 5: Connect to the Device**

When connecting to a device, RCSP authentication and RCSP initialization are performed. If authentication fails or initialization fails, the SDK will actively disconnect the device (OTAWrapperOption.disconnectDevice).

To monitor the device initialization state, register an RCSP callback on OTAWrapper (OTAWrapper.registerRcspCallback).

To check whether the device has been successfully initialized, call the IOTAWrapper.isRCSPInit method.

**Step 6: Start OTA**

```typescript
/*--- Start OTA upgrade ---*/
// Create OTA configuration
const otaConfig: OTAConfig = new OTAConfig()
// Whether to support the new reconnection method
otaConfig.isSupportNewRebootWay = true
// Firmware upgrade file data
otaConfig.updateFileData = this.upgradeData
// Target device to upgrade
const device = connectedDevices[0]
const onUgradeCallback: OnUpgradeCallback = {
    onStartOTA: () => {
    // Upgrade started
    },
    onNeedReconnect: (reConnectMsg: ReConnectMsg) => {
    // Reconnecting
    },
    onProgress: (type: UpgradeType, progress: number) => {
    // Upgrade progress callback
     if (type == UpgradeType.UPGRADE_TYPE_CHECK_FILE) {
      // Verifying file (transferring BootLoader)
      } else if (type == UpgradeType.UPGRADE_TYPE_FIRMWARE) {
      // Transferring upgrade content
      }
    },
    onStopOTA: () => {
    // Upgrade finished
    },
    onCancelOTA: () => {
    // Upgrade canceled
    },
    onError: (error: number, message: string) => {
    // Upgrade failed
    },
}
this._OTAWrapper.startOTA(device, otaConfig, onUgradeCallback)
```

### 5.2 Usage Flow

1. **Open the Mini Program** - On first launch, grant Bluetooth and other required permissions
2. **Add Upgrade File** - Supports the following methods:
   - Select files from chat

3. **Connect Target Device** - Search and connect to the Bluetooth device to upgrade
4. **Start OTA Upgrade** - Select the target upgrade file and start the OTA upgrade

---



## 6. Debugging Tips

- **Log Output**: The SDK provides detailed log output, allowing you to view OTA connection status and data interactions via logs.
- **Device Debugging**: Use `vConsole` to view real-time logs.
- **Troubleshooting**:
  - **SDK:** Refer to [SDK Debugging Guide](https://doc.zh-jieli.com/Apps/Wechat/ota/zh-cn/master/other/debug.html)



---



## 7. Community & Support

### 7.1 Technical Exchange

| Platform | Contact | Status |
|------|----------|------|
| **Official Website** | [JieLi Technology](https://www.zh-jieli.com/) | ✅ Active |
| **GitHub Issues** | [Issue Tracker](https://github.com/Jieli-Tech/WeChat-Mini-Program-OTA/issues) | ✅ Active |



### 7.2 Resource Links

| Resource | Link |
|------|------|
| 📖 **Online Documentation Center** | [JieLi OTA SDK Development Docs](https://doc.zh-jieli.com/Apps/Wechat/ota/zh-cn/master/index.html) |
| 📚 **Version History** | [Version History](#8-version-history) |
| 🐛 **Issue Tracking** | [GitHub Issues](https://github.com/Jieli-Tech/WeChat-Mini-Program-OTA/issues) |

---



## 8. Version History

| Date       | Version                                                       | Release Notes                                                     |
| ---------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| 2024/09/09 | [Jieli_OTA_SDK_WeiXin_V2.1.1](https://doc.zh-jieli.com/Apps/Wechat/ota/zh-cn/master/other/publish_record.html#ota-weixin-sdk-v2-1-1) | 1. Bug Fixes<br />1.1 Fixed issue where single-backup OTA reconnection could not find device on iOS 16<br />1.2 Fixed OTA failure issue on AC695 |
| 2023/01/11 | [Jieli_OTA_SDK_WeiXin_V2.0.0](https://doc.zh-jieli.com/Apps/Wechat/ota/zh-cn/master/other/publish_record.html#version-2-0-0) | 1. Optimizations<br />1.1 Extracted Bluetooth connection and data transmission from SDK, and optimized SDK API |
| 2022/03/17 | [Jieli_OTA_SDK_WeiXin_V1.0.0](https://doc.zh-jieli.com/Apps/Wechat/ota/zh-cn/master/other/publish_record.html#version-1-0-0) | 1. Added OTA Features<br />1.1 Added single-backup OTA<br>1.2 Added dual-backup OTA     |





## 9. License

This project is licensed under the [Apache License 2.0](./LICENSE).

```
Copyright 2024 Zhuhai Jieli Technology Co., Ltd.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

<div align="center">

**© 2024 Zhuhai Jieli Technology Co., Ltd. | Licensed under Apache License 2.0**

</div>
