/// <reference path="./types/index.d.ts" />

import { BluetoothManager } from "../miniprogram/lib/bluetoothManager";



interface IAppOption {
  globalData: {
    userInfo?: WechatMiniprogram.UserInfo,
    gbIsHandshake: boolean,
    gbIsAutoTest:boolean,
    gbTestNum: number,
    gbMtuNum: number,
    bluetoothManager:BluetoothManager,
  }
  userInfoReadyCallback?: WechatMiniprogram.GetUserInfoSuccessCallback,
}