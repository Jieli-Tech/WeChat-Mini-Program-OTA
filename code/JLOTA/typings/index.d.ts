/// <reference path="./types/index.d.ts" />

import { BluetoothOTAManager } from "../miniprogram/lib/bluetoothOTAManager";



interface IAppOption {
  globalData: {
    userInfo?: WechatMiniprogram.UserInfo,
    gbIsHandshake: boolean,
    gbIsAutoTest: boolean,
    gbTestNum: number,
    gbMtuNum: number,
    gbDevelop:boolean,
    gbEnableDebug:boolean,
    // gbServiceUUID: string,
    // gbNotifyCharacteristicUUID: string,
    // gbWriteCharacteristicUUID: string,
    bluetoothManager: BluetoothOTAManager,
  }
  userInfoReadyCallback?: WechatMiniprogram.GetUserInfoSuccessCallback,
}