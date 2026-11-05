<template>
	<view class="contain">
		<view class="view_part">
			<view class="top">
				<text class="name">手机->设备</text>
				<image class="ic_logo" @tap.stop="onShowSendDialog" src="/static/images/icon_send.png" mode="scaleToFill" />
			</view>
			<view class="time">
				<text class="tip">Update time</text>
				<text class="value"> {{ sendDataUpdateTime }}</text>
			</view>
			<view class="bottom">
				<text class="tip">Value:(0x)</text>
				<text selectable class="value">{{ sendDataHexStr }}</text>
			</view>
		</view>

		<view class="view_part">
			<view class="top">
				<text class="name">设备->手机</text>
				<image class="ic_logo" src="/static/images/icon_receive.png" mode="scaleToFill" />
			</view>
			<view class="time">
				<text class="tip">Update time</text>
				<text class="value"> {{ receiveDataUpdateTime }}</text>
			</view>
			<view class="bottom">
				<text class="tip">Value:(0x)</text>
				<text selectable class="value">{{ receiveDataHexStr }}</text>
			</view>
		</view>
	</view>

	<!-- 发送自定义命令Dialog -->
	<view v-if="isShowSendDialog" class="dialog_send">
		<view class="view_contain">
			<view class="top">
				<text class="name">发送命令</text>
			</view>
			<view class="center">
				<scroll-view style="margin-bottom:32rpx;">
					<view v-for="(item, index) in dataObjArr" :key="index" class="data_item">
						<input class="v_input" type="text" :value="item.value" placeholder="写入数据"
							@input="onInputDataObj" :data-index="index" />
						<picker mode="selector" :value="item.dataType" :range="dataType" @change="onDataObTypePickerChange"
							:data-index="index">
							<view class="picker">
								{{ dataType[item.dataType] }} ▼
							</view>
						</picker>
						<image class="ic_delete" src="/static/images/icon_delete.png" mode="scaleToFill"
							@tap.stop="onDeleteDataObj" :data-index="index" />
					</view>
				</scroll-view>
				<text class="bt1" style="margin-bottom:32rpx;" @tap.stop="onAddDataType">添加类型值</text>
			</view>
			<view class="bottom">
				<text class="bt1" @tap.stop="onHideSendDialog">取消</text>
				<text class="bt1" @tap.stop="onSendData"> 发送</text>
			</view>
		</view>
	</view>
</template>

<script lang="ts">
	import { hexToBytes } from '../../../lib/util'
	import { BluetoothOTAManager } from '../../../lib/bluetoothOTAManager'
	import { BTBean } from '../../../lib/bluetooth'
	import { formatTime, string2buffer, byteArrayToHex } from '../../../utils/util'
	import { JL_OTA, JL_RCSP } from '../../../lib/lib_rcsp'
	import { loge } from '../../../lib/log'

	/** 页面级的单例，和原版小程序一样放在模块作用域 */
	let sBluetoothManager: BluetoothOTAManager
	let sOtaWrapperListener: JL_OTA.OTAWrapperListener
	let sTargetDev: BTBean.BluetoothDevice | null = null

	export default {
		data() {
			return {
				isShowSendDialog: false,
				// dataObj
				dataType: ['ByteArray', '文本'],
				dataObjArr: new Array<any>(),//[{ dataType: 0, value: "4455" }, { dataType: 1, value: "天气" }]
				// 发送数据
				sendDataUpdateTime: "",
				sendDataHexStr: "",
				// 接收数据
				receiveDataUpdateTime: "",
				receiveDataHexStr: ""
			}
		},
		onLoad() {
			sBluetoothManager = getApp().globalData.bluetoothManager
			const cacheDataObjArrStr = uni.getStorageSync('CacheDataObjArr')
			if (cacheDataObjArrStr === "") {
				this.dataObjArr = []
			} else {
				this.dataObjArr = cacheDataObjArrStr
			}
			this.registerRcspCallback()
			const connectedDevices = sBluetoothManager.getConnectedDevice();
			if (connectedDevices != null && connectedDevices.length > 0) {
				sTargetDev = connectedDevices[0]
			} else {
				uni.showToast({ icon: 'none', title: "蓝牙未连接,请先连接蓝牙设备" })
			}
		},
		onUnload() {
			uni.setStorageSync('CacheDataObjArr', this.dataObjArr)
			this.unregisterRcspCallback()
		},
		methods: {
			/** 发送自定义命令 */
			onSendData() {
				const dataObjArr = this.dataObjArr;
				let dataCacheArray = new Uint8Array()
				for (let index = 0; index < dataObjArr.length; index++) {//累加数据
					const element = dataObjArr[index];
					if (element.dataType == 0) {//byteArray
						if (element.value == undefined || (element.value.length % 2 != 0 || !this._isHexadecimal(element.value))) {//数据不合法
							uni.showToast({ title: "ByteArray类型数据不合法" })
							return
						} else {
							const tempBytes = hexToBytes(element.value)
							const tempUnit8Array = new Uint8Array(dataCacheArray.length + tempBytes.length)
							tempUnit8Array.set(dataCacheArray, 0)
							tempUnit8Array.set(tempBytes, dataCacheArray.length)
							dataCacheArray = tempUnit8Array
						}
					} else if (element.dataType == 1) {//文本类型
						if (element.value != undefined && element.value.length != 0) {
							const tempBytes = new Uint8Array(string2buffer(element.value))
							const tempUnit8Array = new Uint8Array(dataCacheArray.length + tempBytes.length)
							tempUnit8Array.set(dataCacheArray, 0)
							tempUnit8Array.set(tempBytes, dataCacheArray.length)
							dataCacheArray = tempUnit8Array
						}
					}
				}
				if (sTargetDev == null || !sBluetoothManager.isConnected(sTargetDev)) {
					uni.showToast({ title: "蓝牙未连接" })
					return
				}
				const commandCallback: JL_RCSP.CommandCallback<JL_RCSP.Command> = {
					onCmdResponse: (_device, command) => {
						if (command.getStatus() == JL_RCSP.CmdRespParam.STATUS_SUCCESS) {
							const response = command.getResponse()
							if (response != null) {
								const payload = response.getPayload()
								const receiveDataHexStr = byteArrayToHex(payload)
								loge("cmd response,payload:" + receiveDataHexStr)
							}
						}
					},
					onError: (_device, code, message) => {
						uni.showToast({ icon: 'none', title: "error，" + message })
						switch (code) {
							case JL_RCSP.RCSPErrorCode.ERR_RESPONSE_TIMEOUT://命令超时

								break;
							default:
								break;
						}
						loge("cmd error,code:" + JL_RCSP.toHexWithPrefix(code) + ",message:" + message)
					}
				}
				if (sBluetoothManager.sendCustomCmd(sTargetDev, dataCacheArray, commandCallback)) {
					const time = formatTime(new Date())
					const sendDataHexStr = byteArrayToHex(dataCacheArray)
					this.sendDataUpdateTime = time
					this.sendDataHexStr = sendDataHexStr
					this.isShowSendDialog = false
					uni.setStorageSync('CacheDataObjArr', this.dataObjArr)
				}
			},
			registerRcspCallback() {
				sOtaWrapperListener = new JL_OTA.OTAWrapperListener()
				sOtaWrapperListener.onConnectStateChange = (_device, _status) => {
					if (_status == JL_RCSP.ConnectState.DISCONNECT && (sTargetDev?.deviceId != undefined && _device?.deviceId === sTargetDev?.deviceId)) {
						uni.showToast({ title: "蓝牙已断开" })
					}
				}
				sOtaWrapperListener.onRcspCommand = (device, command) => {
					if (device != null && device.deviceId === sTargetDev?.deviceId) {//是否为同一个设备
						switch (command.getOpCode()) {
							case JL_RCSP.CmdOpCodeBase.CMD_EXTRA_CUSTOM://自定义命令
								const cmdCustom = command as JL_RCSP.CmdCustom
								const paramCustom = cmdCustom.getParam()
								if (paramCustom != null) {
									const payload = paramCustom.getPayload()
									const receiveDataHexStr = byteArrayToHex(payload)
									const time = formatTime(new Date())
									loge("设备->手机,推送自定义命令，payload:" + receiveDataHexStr)
									this.receiveDataUpdateTime = time
									this.receiveDataHexStr = receiveDataHexStr
								}
								break;
						}
					}
				}
				sOtaWrapperListener.onRcspResponse = (device, command) => {
					if (device != null && device.deviceId === sTargetDev?.deviceId) {//是否为同一个设备
						switch (command.getOpCode()) {
							case JL_RCSP.CmdOpCodeBase.CMD_EXTRA_CUSTOM://自定义命令回复
								const cmdCustom = command as JL_RCSP.CmdCustom
								const responseCustom = cmdCustom.getResponse()
								if (responseCustom != null) {
									const payload = responseCustom.getPayload()
									const receiveDataHexStr = byteArrayToHex(payload)
									const time = formatTime(new Date())
									loge("设备->手机,回复自定义命令，payload:" + receiveDataHexStr)
									this.receiveDataUpdateTime = time
									this.receiveDataHexStr = receiveDataHexStr
								}
								break;
						}
					}
				}
				sBluetoothManager.registerRcspCallback(sOtaWrapperListener)
			},
			unregisterRcspCallback() {
				sBluetoothManager.unregisterRcspCallback(sOtaWrapperListener)
			},
			onShowSendDialog() {
				this.isShowSendDialog = true
			},
			onHideSendDialog() {
				this.isShowSendDialog = false
				uni.setStorageSync('CacheDataObjArr', this.dataObjArr)
			},
			onInputDataObj(e: any) {
				const index = Number(e.currentTarget.dataset.index)
				const tempDataObj = this.dataObjArr[index]
				if (tempDataObj == undefined) {
					return
				}
				tempDataObj.value = e.detail.value
			},
			onDataObTypePickerChange(e: any) {
				const index = Number(e.currentTarget.dataset.index)
				const tempDataObj = this.dataObjArr[index]
				if (tempDataObj == undefined) {
					return
				}
				tempDataObj.dataType = e.detail.value
			},
			onDeleteDataObj(e: any) {
				const index = Number(e.currentTarget.dataset.index)
				this.dataObjArr.splice(index, 1)
			},
			onAddDataType() {
				this.dataObjArr.push({ dataType: 0, value: undefined })
			},
			_isHexadecimal(str: string) {
				const regex = /^[0-9A-Fa-f]+$/;
				return regex.test(str);
			}
		}
	}
</script>

<style scoped>
	/* 原版靠 page 选择器做纵向布局，这里合并进根容器 */
	.contain {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	.contain .view_part {
		display: flex;
		flex-direction: column;
		margin-top: 24rpx;
	}

	.view_part .top {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
	}

	.view_part .top .name {
		margin-left: 24rpx;
		height: 48rpx;
	}

	.view_part .top .ic_logo {
		height: 48rpx;
		width: 48rpx;
		margin-right: 24rpx;
	}

	.view_part .time {
		display: flex;
		flex-direction: row;
	}

	.view_part .time .tip {
		margin-left: 24rpx;
		color: rgba(0, 0, 0, 0.5);
		white-space: nowrap;
	}

	.view_part .time .value {
		margin-left: 24rpx;
	}

	.view_part .bottom {
		display: flex;
		flex-direction: row;
	}

	.view_part .bottom .tip {
		margin-left: 24rpx;
		color: rgba(0, 0, 0, 0.5);
		white-space: nowrap;
	}

	.view_part .bottom .value {
		margin-left: 24rpx;
	}

	.dialog_send {
		position: absolute;
		z-index: 100;
		background-color: rgba(0, 0, 0, 0.5);
		width: 100vw;
		height: 100vh;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
	}

	.dialog_send .view_contain {
		background-color: white;
		width: 80vw;
		padding: 36rpx;
	}

	.dialog_send .top {
		display: flex;
		flex-direction: row;
		height: 72rpx;
		justify-content: space-between;
	}

	.dialog_send .top .name {
		color: #242424;
		font-size: 40rpx;
		line-height: 72rpx;
		margin: 0rpx 16rpx;
	}

	.dialog_send .bottom {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
	}

	.dialog_send .bt1 {
		color: #1296db;
		font-size: 36rpx;
	}

	.dialog_send .center {
		display: flex;
		flex-direction: column;
	}

	.dialog_send .center .data_item {
		display: flex;
		flex-direction: row;
	}

	.dialog_send .center .data_item .v_input {
		width: 0;
		flex: 1;
		border-bottom: 3rpx solid #0d0d0e;
	}

	.dialog_send .center .data_item .ic_delete {
		height: 48rpx;
		width: 48rpx;
	}
</style>
