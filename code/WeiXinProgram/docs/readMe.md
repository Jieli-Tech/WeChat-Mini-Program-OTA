整个OTA项目的架构: OTA流程库基于RCSP协议库实现，所以需要先实现RCSP协议库


**当前微信api【基础库版本：2.24.6】的bug：***

1. wx.setBLEMTU函数的fail属性并不会将最终协商mtu返回。解决方法：fail的时候调用wx.getBLEMTU方法获取最终协商mtu
2. wx.onBLEMTUChange函数不会触发(不确定是不是使用方式不对)
3. 目前发现bug：iOS端微信有些版本会不支持获取MTU，会直接性导致mtu发数只能以每包20Byte地发，最终影响手表设备升级失败。
    可参考的处理方案：通过自定义命令的方式，从设备端获取到MTU





## 常见问题：

### 1.MTU引起的发送数据异常问题

常见现象一：小机在OTA时频繁请求同一段数据

**引发错误的原因：**

一.小程序中 MTU 为 ATT_MTU，包含 Op-Code 和 Attribute Handle 的长度，实际可以传输的数据长度为 ATT_MTU - 3。
iOS 系统中 MTU 为固定值；安卓系统中，MTU 会在系统协商成功之后发生改变，建议使用 wx.onBLEMTUChange 监听

二. MTU大小不足，并且没有做分包发送，导致发送出去的数据丢数据。举例子：MTU只有23，实际可用mtu大小：23-3=20，发送数据有40byte，那么小机真正接收到的数据只有最前面的20byte。

### 2.小程序调整MTU失败问题

常见现象一：调用wx.setBLEMTU，会回调fail函数

**引发错误的原因：**

一. 小程序调整MTU时，可调节的MTU大小要小于设备端设置的mtu。否则会调整失败，而且fail中也不会携带最终协商mtu(当前微信api的bug)

[mtu值大于设备端的mtu大小]: https://developers.weixin.qq.com/community/develop/doc/0002c25cca071050f93ae0b5856800?highLine=wx.setBLEMTU

二.iOS手机是不支持调整MTU的，需要通过wx.getBLEMTU()获取,要指明writeType为writeNoResponse

### 3.小程序提审代码时，wx.getLocation暂未开通问题

先到「设置」- 「基本设置」-「服务类目」将小程序的类目设置成对应的类目，再到「开发」-「开发管理」-「接口设置」中自助开通该接口(wx.getLocation)权限。

只有部分类目可以开通该接口，具体请查阅官方介绍[wx.getLocation(Object object) ](https://developers.weixin.qq.com/miniprogram/dev/api/location/wx.getLocation.html)


### 4.旧JS项目使用TS出现白屏现象（部分ui显示不正常）
在 project.config.json 文件中，修改 setting 下的 uglifyFileName 字段为 false（关闭上传时代码保护）[如何解决基于typescript、less开发的小程序，真机预览页面空白，babel报错？ ](https://developers.weixin.qq.com/community/develop/doc/00046a8e9f4ff0b2115e8711f56000?highLine=TypeScript%25E7%25BC%2596%25E8%25AF%2591%25E4%25B8%258D%25E6%25AD%25A3%25E5%25B8%25B8)

### 5.OTA升级失败，等待回复命令超时
可能原因一:mtu太小，频繁调用wx.writeBLECharacteristicValue，会偶现写入成功回调延时很严重。处理方法：当wx.writeBLECharacteristicValue回调complete的时候，再调用下一次。
可能原因二：mtu太小，一个协议包数据太大，导致完整发出去的时候，设备端已经超时。处理方法：调大mtu。

### 6.出现认证失败
可能原因一：上一次通过认证的蓝牙连接断开和这一次蓝牙连接时间间隔很短，蓝牙底层并没有断开。处理办法：1.做一下处理，不要频繁断连设备。2.如果非要频繁断连设备，推荐小程序端不走认证，且关闭设备端的认证。

### 7.单备份新回连

单备份新回连：通过改变设备BLE地址，用广播包广播原BLE地址的形式进行回连。避免一些HID连接问题。

### 8.单备份回连超时问题

**可能原因一：可能是ReConnectMsg的信息错误。**

固件端在使用新回连方式(ReConnectMsg.isSupportNewReconnectADV==true)时，未正确设置BLE地址，导致ReConnectMsg.deviceBleMac==undefined。

处理方式：固件端正确配置BLE地址。可能是未移植该部分功能代码导致没有BLE地址，也可能是BLE地址错误。

**可能原因二：可能是设备的广播包问题。**

固件端在使用新回连方式(ReConnectMsg.isSupportNewReconnectADV==true)时，广播中的数据格式未能正确匹配回连信息。广播包解析请参考：[单备份升级的新回连广播包 ](https://doc.zh-jieli.com/Apps/Wechat/ota/zh-cn/master/developmentv2/development_desc.html#id4)

处理方式：对比广播包数据，看具体需求，哪一方进行修改。小程序修改处：otaWrapper.ts中搜索isReconnectDevice。

**可能原因三：可能是设备未来得及广播，就连接成功。**

常见场景1：被系统HID连接。

处理方式：使用新回连方式，可避免被系统HID连接。

常见场景2：App通过mac地址盲连设备，而不是通过广播发现设备，再去连接设备。

处理方式：App的连接方式请遵循通过广播发现设备，再去连接设备。或者使用新回连，不要用盲连mac的方式去连接 变地址后的设备（升级设备）。

常见场景3：App扫描发现两个同名的升级设备（一个是升级变地址的BLE设备1，一个是升级前的BLE设备2）。此时实际上BLE设备1，并不存在，只存在BLE设备2。点击连接BLE设备1（连接中），再点击BLE设备2(连接成功)，开始升级。在升级回连过程中，设备进入回连流程时，BLE设备1会被立即连接上，导致发不出广播包。最终导致回连超时失败。

处理方式：参考一：连接阻塞化，只能进行单一设备连接。参考二：连接流程，自己加超时处理，超时后连接成功的设备就不要再进行蓝牙初始化流程。