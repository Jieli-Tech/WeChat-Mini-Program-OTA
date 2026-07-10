[tag download]:https://github.com/Jieli-Tech/WeChat-Mini-Program-OTA/tags
[tag_badgen]:https://img.shields.io/github/v/tag/Jieli-Tech/WeChat-Mini-Program-OTA?style=plastic&logo=android&labelColor=ffffff&color=informational&label=Tag&logoColor=blue

# WeChat-Mini-Program-OTA  [![tag][tag_badgen]][tag download]

<div align="center">



**杰理OTA SDK(WeiXin) - 专为杰理蓝牙类产品提供固件升级功能的集成SDK**

[中文](./README.md) · [English](./README_en.md) · [文档中心](https://doc.zh-jieli.com/Apps/Wechat/ota/zh-cn/master/index.html) · [SDK 版本历史](#八版本历史) · [报告问题](https://github.com/Jieli-Tech/Android-JL_OTA/issues)

</div>

---

## 📋 目录

- [一、概述](#一概述)
- [二、运行环境](#二运行环境)
- [三、快速开始](#三快速开始)
- [四、工程结构](#四工程结构)
- [五、配置说明](#五配置说明)
- [六、调试技巧](#六调试技巧)
- [七、社区与支持](#七社区与支持)
- [八、版本历史](#八版本历史)
- [九、许可证](#九许可证)

---



## 一、概述

`WeChat-Mini-Program-OTA` 是**珠海市杰理科技股份有限公司**为杰理蓝牙类产品提供的固件升级开发平台。本 SDK 专门实现本公司蓝牙类产品的 <strong style="color:red">RCSP OTA</strong> 升级功能，支持 BLE传输方式，提供完整的固件升级流程。

**杰理OTA SDK**提供了丰富的升级功能：

| 功能           | 说明                                                     |
| -------------- | -------------------------------------------------------- |
| **BLE升级** | 通过BLE通道进行固件升级 |
| **自动回连**   | 单备份OTA自动回连BLE功能，提升用户体验                           |

---



## 二、运行环境

| 类别 | 要求 | 说明 |
|------|------------|-----------|
| **软件系统** | 微信客户端 iOS 6.5.6以上,Android 6.5.7以上 | 支持BLE功能 |
| **硬件要求** | 支持**RCSP OTA**功能的杰理SDK | AC707N、AC703N、AC701N、AC697N、AC696N、AC695N等 |
| **开发平台** | 微信开发者工具 | 建议使用最新版本 |
| **语言支持** | JavaScript | 提供完整的API支持 |


---



## 三、快速开始

### 3.1 克隆仓库

```bash
git clone https://github.com/Jieli-Tech/WeChat-Mini-Program-OTA.git
cd WeChat-Mini-Program-OTA
```



### 3.2 导入项目到微信开发者工具

1. 打开微信开发者工具
2. 选择 "导入"
3. 导航到解压后的 `code/` 目录
4. 打开参考Demo源码工程中的项目文件



### 3.3 添加依赖库

- **jl_auth_x.x.x.d.ts** — RCSP认证库声明文件
- **jl_auth_x.x.x.js** — RCSP认证库js文件
- **jl_ota_x.x.x.d.ts** — OTA流程库声明文件
- **jl_ota_x.x.x.js** — OTA流程库js文件
- **jl_rcsp_ota_x.x.x.d.ts** — RCSP-OTA协议库声明文件
- **jl_rcsp_ota_x.x.x.js** — RCSP-OTA协议库js文件

**PS: xxx为版本号**

将 `libs/` 目录下的所有依赖库的js文件和声明文件放入工程目录中的lib文件夹下



### 3.5 运行示例应用

微信搜素小程序“杰理OTA升级”，了解SDK功能和使用方法。



---



## 四、工程结构

```
WeChat-Mini-Program-OTA/
├── code/                                    # 参考源码工程文件夹
│   └── 参考Demo源码工程                  # OTA Demo项目源码
├── libs/                               # 核心库文件夹
└── ReadMe.txt                          # 说明文件
```

---



## 五、配置说明

### 5.1 OTA库使用

#### 5.1.1使用OTAWrapper进行OTA

通常情况下，我们只需要通过使用OTAWrapper就可以完成OTA功能。不需要实现和使用OTA库的接口。

**第一步：初始化OTAWrapper**

```typescript
//OTAWrapper 初始化
const otaWrapperOption: OTAWrapperOption = {
    /**是否需要认证。 在上层已经认证过，就不需要认证。**/
    isUseAuth: () => {
        return this._BluetoothConfigure.isUseAuth
    },
    /**是否需要回连。 在上层进行回连，就不需要内部回连。**/
    isInnerReconnect: () => {
        return true
    },
    /**扫描设备**/
    sanDevice: () => {
        //todo 实现蓝牙扫描操作
    },
    /**连接设备**/
    connectDevice: (device: BluetoothDevice) => {
        //todo 实现蓝牙连接操作
    },
    /**断开设备**/
    disconnectDevice: (device: BluetoothDevice) => {
        //todo 实现蓝牙断开操作
    },
    /**发送数据(非必须实现)，
    * 必须实现的情况：
    * - 1.内部创建并管理RCSPImpl, 即OTAWrapperOption.getRCSPImpl未实现
    * - 2.需要进行认证, 即OTAWrapperOption.isUseAuth返回false
    * **/
    sendData: (device: BluetoothDevice, data: Uint8Array) => {
       //todo 实现蓝牙发数操作
    }
    /**获取RCSPImpl(非必须实现)。
    * - 上层管理RCSPImpl则需要实现,如使用jl-rcsp-op时需要实现。
    * - 上层不管理RCSPImpl则不需要实现，由内部创建并管理RCSPImpl
    *  **/
    //getRCSPImpl?(device: BluetoothDevice): RCSPProtocol.RcspImpl | undefined
}
this._OTAWrapper = new OTAWrapper(otaWrapperOption)
```

**第二步：监听蓝牙连接状态并同步OTAWrapper**

```typescript
this._bluetoothInstance.addConnectCallback({
    onMTUChange: (dev: any, mtu) => {
        BleSendDataHandler.setMtu(dev.deviceId, mtu)
        this._onConnectStateMTUChange(dev, mtu)
    }, onConnectSuccess: (dev: any) => {
        // 通知 OTAWrapper 蓝牙连接成功
        this._OTAWrapper.onConnectStateSuccess(dev)
        this._onConnectStateSuccess(dev)
    }, onConnectFailed: (dev: any, _err) => {
        // 通知 OTAWrapper 蓝牙连接失败
        this._OTAWrapper.onConnectStateFailed(dev)
        this._onConnectStateFailed(dev)
    }, onConnectDisconnect: (dev: any) => {
        // 通知 OTAWrapper 蓝牙连接断开
        this._OTAWrapper.onConnectStateDisconnect(dev)
        this._onConnectStateDisconnect(dev)
    }
})
```

**第三步：监听蓝牙扫描状态并同步OTAWrapper**

```typescript
this._bluetoothInstance.addScanCallback({
    onFound: (devs: BTBean.BluetoothDevice[]) => {
        // 通知 OTAWrapper 发现设备
        this._OTAWrapper.onScanFound(devs)
        this._onScanFound(devs)
    }, onScanStart: () => {
        this._onScanStart()
    }, onScanFailed: (err: BTBean.BluetoothError) => {
        this._onScanFailed(err)
    }, onScanFinish: () => {
        // 通知 OTAWrapper 扫描设备停止
        this._OTAWrapper.onSanDeviceStop()
        this._onScanFinish()
    }
})
```

**第四步：监听蓝牙数据推送并同步OTAWrapper**

```typescript
const bleDataCallback: BleDataCallback = {
    onReceiveData: (res: WechatMiniprogram.OnBLECharacteristicValueChangeCallbackResult) => {
        // 通知 OTAWrapper 收到数据
        this._OTAWrapper.onReceiveData(this._toDevice(res.deviceId), res.value)
    }
}
BleDataHandler.addCallbacks(bleDataCallback)
```

**第五步：连接设备**

连接设备时，会进行RCSP的认证和RCSP的初始化。当认证失败或者初始化失败时，SDK会主动断开设备（OTAWrapperOption.disconnectDevice）。

若需要监听设备的初始化状态。可在OTAWrapper注册RCSP回调(OTAWrapper.registerRcspCallback)。

若需要判断设备是否初始化成功，可调用IOTAWrapper.isRCSPInit方法。

**第六步：开始OTA**

```typescript
/*--- 开始执行OTA升级 ---*/
//创建OTA配置项
const otaConfig: OTAConfig = new OTAConfig()
//是否支持新的回连方式
otaConfig.isSupportNewRebootWay = true
//固件升级文件数据
otaConfig.updateFileData = this.upgradeData
//升级目标设备
const device = connectedDevices[0]
const onUgradeCallback: OnUpgradeCallback = {
    onStartOTA: () => {
    // 开始升级
    },
    onNeedReconnect: (reConnectMsg: ReConnectMsg) => {
    // 正在回连
    },
    onProgress: (type: UpgradeType, progress: number) => {
    // 升级进度回调
     if (type == UpgradeType.UPGRADE_TYPE_CHECK_FILE) {
      // 校验文件（传输BootLoader）
      } else if (type == UpgradeType.UPGRADE_TYPE_FIRMWARE) {
      // 传输升级内容
      }
    },
    onStopOTA: () => {
    // 升级结束
    },
    onCancelOTA: () => {
    // 升级取消
    },
    onError: (error: number, message: string) => {
    // 升级失败
    },
}
this._OTAWrapper.startOTA(device, otaConfig, onUgradeCallback)
```

### 5.2 使用流程

1. **打开小程序** - 初次打开应用，需要授予蓝牙等对应权限
2. **添加升级文件** - 支持以下方式：
   - 选择聊天文件
   
3. **连接目标设备** - 搜索并连接需要升级的蓝牙设备
4. **开始OTA升级** - 选择目标的升级文件，开始OTA升级

---



## 六、调试技巧

- **日志输出**：SDK提供详细的日志输出，可通过日志查看OTA连接状态和数据交互
- **设备调试**：使用``vConsole``查看实时日志
- **问题排查**：
  - **SDK：** 参考 [SDK调试说明](https://doc.zh-jieli.com/Apps/Wechat/ota/zh-cn/master/other/debug.html)



---



## 七、社区与支持

### 7.1 技术交流

| 平台 | 联系方式 | 状态 |
|------|----------|------|
| **官方网站** | [杰理科技](https://www.zh-jieli.com/) | ✅ 活跃 |
| **GitHub Issues** | [问题反馈](https://github.com/Jieli-Tech/WeChat-Mini-Program-OTA/issues) | ✅ 活跃 |



### 7.2 资源链接

| 资源 | 链接 |
|------|------|
| 📖 **在线文档中心** | [杰理OTA SDK开发文档](https://doc.zh-jieli.com/Apps/Wechat/ota/zh-cn/master/index.html) |
| 📚 **版本历史** | [版本历史](#八版本历史) |
| 🐛 **问题反馈** | [GitHub Issues](https://github.com/Jieli-Tech/WeChat-Mini-Program-OTA/issues) |

---



## 八、版本历史

| 日期       | 版本号                                                       | 发布内容                                                     |
| ---------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| 2024/09/09 | [Jieli_OTA_SDK_WeiXin_V2.1.1)](https://doc.zh-jieli.com/Apps/Wechat/ota/zh-cn/master/other/publish_record.html#ota-weixin-sdk-v2-1-1) | 1. 修复功能<br />1.1 修复iOS16单备份升级回连搜不到设备问题<br />1.2 修复AC695升级失败问题 |
| 2023/01/11 | [Jieli_OTA_SDK_WeiXin_V2.0.0)](https://doc.zh-jieli.com/Apps/Wechat/ota/zh-cn/master/other/publish_record.html#version-2-0-0) | 1. 优化功能<br />1.1抽离 SDK 中的蓝牙连接和蓝牙收发数据部分，并优化 SDK API |
| 2022/03/17 | [Jieli_OTA_SDK_WeiXin_V1.0.0)](https://doc.zh-jieli.com/Apps/Wechat/ota/zh-cn/master/other/publish_record.html#version-1-0-0) | 1. 增加OTA功能<br />1.1增加单备份OTA<br>1.2增加双备份OTA     |





## 九、许可证

本项目采用 [Apache License 2.0](./LICENSE) 开源协议。

```
Copyright 2024 珠海市杰理科技股份有限公司

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

**© 2024 珠海市杰理科技股份有限公司 | Licensed under Apache License 2.0**

</div>

