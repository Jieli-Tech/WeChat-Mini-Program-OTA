<template>
	<view class="page-root">
		<!-- Service -->
		<view class="view_part">
			<view>
				<text class="name">Service</text>
				<view class="container-row">
					<text class="hint">UUID:</text>
					<text class="uuid">{{ serviceUUID }}</text>
				</view>
			</view>
			<image class="btn_edit" src="/static/images/icon_edit.png" mode="scaleToFill" @tap.stop="onEditService" />
		</view>

		<!-- Notify Characteristic -->
		<view class="view_part">
			<view>
				<text class="name">Notify Characteristic</text>
				<view class="container-row">
					<text class="hint">UUID:</text>
					<text class="uuid">{{ notifyCharacteristicUUID }}</text>
				</view>
			</view>
			<image class="btn_edit" src="/static/images/icon_edit.png" mode="scaleToFill" @tap.stop="onEditNotifyCharacteristic" />
		</view>

		<!-- Write Characteristic -->
		<view class="view_part">
			<view>
				<text class="name">Write Characteristic</text>
				<view class="container-row">
					<text class="hint">UUID:</text>
					<text class="uuid">{{ writeCharacteristicUUID }}</text>
				</view>
			</view>
			<image class="btn_edit" src="/static/images/icon_edit.png" mode="scaleToFill" @tap.stop="onEditWriteCharacteristic" />
		</view>

		<button @tap.stop="onSave" style="background-color: white;margin-top: 24rpx;">保存</button>
	</view>
</template>

<script lang="ts">
	export default {
		data() {
			return {
				serviceUUID: "0000ae00-0000-1000-8000-00805f9b34fb",
				notifyCharacteristicUUID: "0000ae00-0000-1000-8000-00805f9b34fb",
				writeCharacteristicUUID: "0000ae00-0000-1000-8000-00805f9b34fb"
			}
		},
		onLoad() {
			const configure = getApp().globalData.bluetoothManager.getConfigure()
			this.serviceUUID = configure.serviceUUID
			this.notifyCharacteristicUUID = configure.notifyCharacteristicUUID
			this.writeCharacteristicUUID = configure.writeCharacteristicUUID
		},
		methods: {
			onEditService() {
				uni.showModal({
					title: "Service",
					content: this.serviceUUID,
					editable: true,
					success: (res) => {
						if (res.confirm) {
							if (!this._isValidBluetoothUUID(res.content)) {
								uni.showToast({ title: "uuid格式错误", icon: 'error' })
							} else {
								this.serviceUUID = res.content
							}
						}
					}
				})
			},
			onEditNotifyCharacteristic() {
				uni.showModal({
					title: "Notify Characteristic",
					content: this.notifyCharacteristicUUID,
					editable: true,
					success: (res) => {
						if (res.confirm) {
							if (!this._isValidBluetoothUUID(res.content)) {
								uni.showToast({ title: "uuid格式错误", icon: 'error' })
							} else {
								this.notifyCharacteristicUUID = res.content
							}
						}
					}
				})
			},
			onEditWriteCharacteristic() {
				uni.showModal({
					title: "Write Characteristic",
					content: this.writeCharacteristicUUID,
					editable: true,
					success: (res) => {
						if (res.confirm) {
							if (!this._isValidBluetoothUUID(res.content)) {
								uni.showToast({ title: "uuid格式错误", icon: 'error' })
							} else {
								this.writeCharacteristicUUID = res.content
							}
						}
					}
				})
			},
			onSave() {
				uni.showToast({ title: "修改成功，请断开设备后重新连接", icon: 'none' })
				uni.setStorageSync("ServiceUUID", this.serviceUUID)
				uni.setStorageSync("NotifyCharacteristicUUID", this.notifyCharacteristicUUID)
				uni.setStorageSync("WriteCharacteristicUUID", this.writeCharacteristicUUID)
				const bluetoothManager = getApp().globalData.bluetoothManager
				const configure = bluetoothManager.getConfigure()
				configure.serviceUUID = this.serviceUUID
				configure.writeCharacteristicUUID = this.writeCharacteristicUUID
				configure.notifyCharacteristicUUID = this.notifyCharacteristicUUID
				bluetoothManager.setConfigure(configure)
			},
			_isValidBluetoothUUID(uuidStr: string) {
				const uuid = uuidStr.toLocaleUpperCase()
				const regex16 = /^[0-9A-F]{4}$/;
				const regex32 = /^[0-9A-F]{8}$/;
				const regex128 = /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/;
				return regex16.test(uuid) || regex32.test(uuid) || regex128.test(uuid);
			}
		}
	}
</script>

<style scoped>
	/* 原版靠 page 选择器设置背景，这里合并进根容器 */
	.page-root {
		min-height: 100vh;
		background-color: #F4F7FB;
	}

	.view_part {
		background-color: #ffffff;
		padding-left: 20rpx;
		display: flex;
		flex-direction: row;
		margin-top: 24rpx;
	}

	.view_part .name {
		font-size: 30rpx;
	}

	.view_part .container-row {
		display: flex;
	}

	.view_part .hint {
		color: #ada6a6;
		margin-right: 12rpx;
		font-size: 30rpx;
	}

	.view_part .uuid {
		font-size: 30rpx;
		word-break: break-all;
	}

	.view_part .btn_edit {
		height: 48rpx;
		width: 48rpx;
		padding: 24rpx;
	}
</style>
