<template>
	<view class="content">
		<!-- 设备过滤条件 -->
		<view class="layout-row" id="filter-contain" @tap="onSetFilter">
			<view>设备过滤条件</view>
			<view class="gray-838383 layout-row" style="align-items: center;">
				<text v-if="filterDevName === ''">内容</text>
				<text v-else>{{ filterDevName }}</text>
				<image class="icon-next" src="/static/images/icon_return.png"></image>
			</view>
		</view>

		<!-- 设备列表 -->
		<view class="layout-row gray-838383" id="scan-status">
			<view>设备列表</view>
			<image v-if="isScaning" id="icon-loading" style="margin-left: 24rpx;" src="/static/images/loading.png"></image>
		</view>

		<scroll-view class="scan-contain" scroll-y :refresher-enabled="true" :refresher-threshold="80"
			refresher-default-style="none" refresher-background="#F4F7FB" :refresher-triggered="triggered"
			@refresherpulling="onPulling" @refresherrefresh="onRefresh" @refresherrestore="onRestore">
			<view slot="refresher" class="refresh-container">
				<view class="view1">下拉刷新</view>
			</view>
			<template v-for="(item, index) in scanDevices" :key="item.deviceId">
				<view class="item-scandev-contain layout-row" @tap="onSelectedDevice" :data-index="index">
					<view class="item-scandev-left">
						<view>{{ item.name }}</view>
						<view class="layout-row gray-B0B0B0" style="font-size: 24rpx;">
							<view class="rssi">rssi:{{ isConnectedDevice(item) ? 0 : item.RSSI }},</view>
							<view>deviceId : {{ item.deviceId }}</view>
						</view>
					</view>
					<view class="item-scandev-right">
						<image v-if="isConnectedDevice(item)" style="height: 48rpx;width: 48rpx;"
							src="/static/images/icon_choose.png"></image>
					</view>
				</view>
				<view class="space-line"></view>
			</template>
		</scroll-view>
	</view>
</template>

<script lang="ts">
	import { BTBean, BTAdapter } from '../../lib/bluetooth'
	import { BluetoothEventCallback, BluetoothOTAManager } from '../../lib/bluetoothOTAManager'
	import { JL_OTA } from '../../lib/lib_rcsp'
	import { logv } from '../../lib/log'

	/** 页面级的单例，和原版小程序一样放在模块作用域 */
	let sBluetoothManager: BluetoothOTAManager
	let sBluetoothEventCallback: BluetoothEventCallback
	/** 下拉刷新节流标志 */
	let freshing = false
	/** 未过滤的设备原始列表 */
	let foundSrcDevlist: BTBean.BluetoothDevice[] = []
	/** 发现设备回调的节流时间戳 */
	let lastUpDateTime = 0
	/** OTA/RCSP 事件监听（初始化成功、强制升级） */
	let sOtaWrapperListener: JL_OTA.OTAWrapperListener | undefined
	/** 当前页面是否可见 */
	let sIsShow = false

	export default {
		data() {
			return {
				isScaning: false,
				triggered: false,
				filterDevName: '',
				connectedDevice: null as BTBean.BluetoothDevice | null,
				scanDevices: [] as BTBean.BluetoothDevice[]
			}
		},
		onLoad() {
			const value = uni.getStorageSync('filterDevName')
			if (value) {
				this.filterDevName = value
			}
			sBluetoothManager = getApp().globalData.bluetoothManager
			sBluetoothEventCallback = new BluetoothEventCallback();
			sBluetoothEventCallback.onBluetoothAdapter = this._onBluetoothAdapter
			sBluetoothEventCallback.onLocation = this._onLocation
			sBluetoothEventCallback.onScanStart = this._onScanStart
			sBluetoothEventCallback.onScanFailed = this._onScanFailed
			sBluetoothEventCallback.onScanFinish = this._onScanFinish
			sBluetoothEventCallback.onFoundDev = this._OnFoundDevs
			sBluetoothEventCallback.onDevStatusSuccess = this._onDevConnectSuccess
			sBluetoothEventCallback.onDevStatusDisconnect = this._onDevDisconnect
			sBluetoothEventCallback.onDevStatusFailed = this._onDevConnectFailed
			sBluetoothManager.addBluetoothEventCallback(sBluetoothEventCallback)
			sOtaWrapperListener = new JL_OTA.OTAWrapperListener()
			sOtaWrapperListener.onRcspInit = (_device, isInit) => {
				if (isInit && !sBluetoothManager.isOTAing()) {
					uni.showToast({ title: '设备初始化成功', icon: 'success' })
				}
			}
			sOtaWrapperListener.onMandatoryUpgrade = (_device) => {
				if (_device != null && !sBluetoothManager.isOTAing() && sIsShow) {
					uni.switchTab({
						url: '/pages/pageUpdate/pageUpdate',
						success: () => {
							uni.showToast({ title: '设备需要强制升级', icon: 'none' })
						}
					})
				}
			}
			sBluetoothManager.registerRcspCallback(sOtaWrapperListener)
			const isHasPermission = uni.getStorageSync("IsHasPermission")//扫描成功，认为有权限（之前使用过该功能）
			if (isHasPermission) {
				sBluetoothManager.sanDevice()
			}
		},
		onShow() {
			sIsShow = true
			this._syncConnectedDevice()
		},
		onHide() {
			sIsShow = false
		},
		onUnload() {
			sBluetoothManager.removeBluetoothEventCallback(sBluetoothEventCallback)
			if (sOtaWrapperListener) {
				sBluetoothManager.unregisterRcspCallback(sOtaWrapperListener)
				sOtaWrapperListener = undefined
			}
		},
		methods: {
			onSelectedDevice(e: any) {
				const index = Number(e.currentTarget.dataset.index)
				const device = this.scanDevices[index]
				if (device == undefined) {
					return
				}
				logv(device)
				const connectedDevices = sBluetoothManager.getConnectedDevice();
				if (connectedDevices != null && connectedDevices.length > 0) {//已连接设备
					if (!sBluetoothManager.isConnected(device)) {
						uni.showToast({
							title: '请先断开已连接的设备',
							icon: 'none'
						})
						return;
					} else {
						uni.showModal({
							title: '提示',
							content: '是否要断开该设备',
							success(res) {
								if (res.confirm) {
									sBluetoothManager.disconnectDevice(device)
								}
							}
						})
					}
				} else {
					uni.showLoading({
						title: '连接中',
						mask: true
					})
					logv(" 连接中", device);
					sBluetoothManager.connectDevice(device)
				}
			},
			onPulling() {
			},
			onRestore() {
			},
			onRefresh() {
				if (freshing) return;
				freshing = true
				if (!this.triggered) {
					this.triggered = true
				}//保证刷新状态下，triggered为true
				sBluetoothManager.sanDevice();
				setTimeout(() => {
					this.triggered = false//触发onRestore，关闭刷新图标
					freshing = false
				}, 1500);
			},
			onSetFilter() {
				uni.showModal({
					title: "设备过滤条件",
					editable: true,
					content: this.filterDevName,
					success: (res) => {
						if (res.confirm) {
							this.filterDevName = res.content
							this._filterDevName(foundSrcDevlist)
							uni.setStorageSync('filterDevName', res.content)
						}
					}
				})
			},
			/** 判断某个扫描结果是不是当前已连接的设备 */
			isConnectedDevice(device: BTBean.BluetoothDevice): boolean {
				return this.connectedDevice != null && this.connectedDevice.deviceId === device.deviceId
			},
			_onBluetoothAdapter(_availableBluetooth: boolean, _btAdapterInfo?: BTAdapter.BTAdapterInfo) {
			},
			_onLocation(_availableLocation: boolean, _locationAdapterInfo?: BTAdapter.LocationAdapterInfo) {
			},
			_onScanStart() {
				uni.setStorageSync("IsHasPermission", true)//扫描成功，认为有权限
				this.isScaning = true
			},
			_onScanFailed(_err: BTBean.BluetoothError) {
				this.isScaning = false
			},
			_onScanFinish() {
				this.isScaning = false
			},
			_OnFoundDevs(devices: BTBean.BluetoothDevice[]) {
				const time = new Date().getTime()
				if (time - lastUpDateTime < 750) {
					return
				}
				lastUpDateTime = time
				const devicesTemp = devices.sort(function (a, b) { return b.RSSI - a.RSSI })
				foundSrcDevlist = devicesTemp
				this._filterDevName(foundSrcDevlist)
			},
			_filterDevName(devs: BTBean.BluetoothDevice[]) {
				const filterDevName = this.filterDevName.toLowerCase()
				const tempList = new Array<BTBean.BluetoothDevice>()
				const connectedDevices = sBluetoothManager.getConnectedDevice();
				if (connectedDevices != null) {
					connectedDevices.forEach(element => {
						if (element.name && element.name.toLowerCase().includes(filterDevName)) {
							tempList.push(element)
						}
					})
				}
				devs.forEach(e => {
					const devName = e.name?.toLowerCase()
					const isConnected = sBluetoothManager.isConnected(e.deviceId)
					if (e.RSSI <= 0 && devName && devName.includes(filterDevName) && !isConnected) {
						tempList.push(e)
					}
				})
				this.scanDevices = tempList
			},
			/** 从蓝牙管理器同步一次当前连接状态，避免只依赖事件回调 */
			_syncConnectedDevice() {
				const connectedDevices = sBluetoothManager?.getConnectedDevice()
				if (connectedDevices != null && connectedDevices.length > 0) {
					this.connectedDevice = connectedDevices[0]
				} else {
					this.connectedDevice = null
				}
			},
			_onDevDisconnect: function (_result: BTBean.BluetoothDevice) {
				this.connectedDevice = null
			},
			_onDevConnectFailed: function (_result: BTBean.BluetoothDevice) {
				this.connectedDevice = null
				uni.hideLoading({
					success: () => {
						uni.showToast({
							title: '连接失败',
							icon: 'none'
						})
					},
				})
			},
			_onDevConnectSuccess: function (device: BTBean.BluetoothDevice) {
				this.connectedDevice = device
				uni.hideLoading({
					success: () => {
						uni.showToast({
							title: '连接成功',
							icon: 'none'
						})
					},
				})
			}
		}
	}
</script>

<style scoped>
	/* 原版靠 page 选择器撑满整页，这里改用根容器，避免 scoped 下无法命中 page */
	.content {
		height: 100vh;
		box-sizing: border-box;
		background-color: #F4F7FB;
		display: flex;
		flex-direction: column;
	}

	.layout-row {
		display: flex;
		flex-direction: row;
	}

	.icon-next {
		height: 32rpx;
		width: 32rpx;
	}

	.scan-contain {
		flex: 1;
		height: 0;
	}

	.refresh-container {
		display: flex;
		align-items: center;
		width: 100%;
		height: 80px;
		background: #F4F7FB;
	}

	.refresh-container .view1 {
		position: absolute;
		text-align: center;
		width: 100%;
	}

	.item-scandev-contain {
		height: 128rpx;
		background-color: white;
		align-items: center;
		justify-content: space-between;
		padding: 0rpx 40rpx;
	}

	.rssi {
		width: 110rpx;
	}

	.item-scandev-right {
		height: wrap;
	}

	.space-line {
		margin-left: 42rpx;
		height: 2rpx;
		background-color: #0000000D;
	}

	.gray-838383 {
		color: #838383;
	}

	.gray-B0B0B0 {
		color: #b0b0b0;
	}

	#filter-contain {
		justify-content: space-between;
		margin-top: 24rpx;
		background-color: white;
		height: 96rpx;
		align-items: center;
		padding: 0rpx 40rpx;
		font-size: 32rpx;
	}

	#scan-status {
		height: 112rpx;
		align-items: center;
		font-size: 32rpx;
		padding: 0rpx 40rpx;
	}

	#icon-loading {
		height: 40rpx;
		width: 40rpx;
	}
</style>
