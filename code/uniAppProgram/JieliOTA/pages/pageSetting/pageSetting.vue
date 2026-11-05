<template>
	<view class="container">
		<view class="container_0">
			<view class="view-0">
				<text class="text-0">设备认证</text>
				<switch :checked="isHandshake" color="#398BFF" @change="onIsHandshakeDevice" />
			</view>
			<view v-if="false" class="view-1">
				<text class="text-0">自动化测试OTA</text>
				<switch :checked="isAutoTest" color="#398BFF" @change="onIsAutoTestDevice" />
			</view>
			<view v-if="false" class="view-2">
				<text class="text-0">测试次数</text>
				<view class="view-mtu" @tap="onShowTestNumberView">
					<view class="sub-0">{{ mTestNum }}</view>
					<image class="image-0" src="/static/images/icon_return.png" mode="aspectFit" />
				</view>
			</view>
			<view v-if="mPlatform === 'android' || mPlatform === 'ohos'" class="view-3">
				<text class="text-0">调整MTU</text>
				<view class="view-mtu" @tap="onShowMtuNumberView">
					<view class="sub-0">{{ mMtuNum }}</view>
					<image class="image-0" src="/static/images/icon_return.png" mode="aspectFit" />
				</view>
			</view>
			<view class="view-5" @tap.stop="onUploadLogFile">
				<text class="text-0">Log文件</text>
				<image class="image-0" src="/static/images/icon_return.png" mode="aspectFit" />
			</view>
			<view v-if="developMode" class="view-2">
				<text class="text-0">Log等级</text>
				<picker mode="selector" :value="logGrade" :range="logGradeArray" @change="onLogGradePickerChange">
					<view class="view-mtu">
						<view class="sub-0">{{ logGradeArray[logGrade] }}</view>
						<image class="image-0" src="/static/images/icon_return.png" mode="aspectFit" />
					</view>
				</picker>
			</view>
			<view v-if="developMode" class="view-5">
				<text class="text-0">小程序开发调试</text>
				<switch :checked="isEnableDebug" color="#398BFF" @change="onEnableDebug" />
			</view>
			<view v-if="developMode" class="view-5" @tap.stop="onTestCustomCmd">
				<text class="text-0">自定义命令</text>
				<image class="image-0" src="/static/images/icon_return.png" mode="aspectFit" />
			</view>
			<view v-if="developMode" class="view-5" @tap.stop="onBLEDataSetting">
				<text class="text-0">BLE通讯配置</text>
				<image class="image-0" src="/static/images/icon_return.png" mode="aspectFit" />
			</view>
			<view class="view-5">
				<text class="text-0">小程序版本号</text>
				<text class="text-1" @longpress="onDevelopMode">{{ appVersion }}</text>
			</view>
			<view class="view-5">
				<text class="text-0">SDK版本号</text>
				<text class="text-1">{{ sdkVersion }}</text>
			</view>
		</view>
	</view>

	<times-select-view :show="isTimesView" :status="mStatusTimesView" :test-number="mTestNum" :mtu-number="mMtuNum"
		@cancel="onTimesSelectCancel" @confirm-test-number="onTimesSelectTestNumber" @confirm-mtu="onTimesSelectMTU" />

	<view v-if="logViewVisible" class="view_log">
		<view class="dialog_log">
			<text class="title">上传Log文件</text>
			<text>【上传步骤】：</text>
			<text>步骤1： 反馈类型选择[功能异常]</text>
			<text>步骤2： 反馈内容选择[其他异常]</text>
			<text>步骤3： 填写日志描述(必须10字以上)</text>
			<text>步骤4： 点击[提交]</text>
			<text>【查看日志】: </text>
			<text>小程序开发者可以通过小程序管理后台左侧菜单“反馈管理”页面查看相关打印日志</text>
			<view class="btn">
				<button @tap.stop="onCancelUploadLog">暂不上传</button>
				<!-- open-type="feedback" 是微信小程序独有能力，其它端会退化成普通按钮 -->
				<button @tap.stop="onConfirmUploadLog" open-type="feedback">上传日志</button>
			</view>
		</view>
	</view>
</template>

<script lang="ts">
	import { BluetoothConfigure, BluetoothOTAManager } from '../../lib/bluetoothOTAManager'
	import { logv } from '../../lib/log'
	import { getLogGrade, setLogGrade, setLogEnable } from '../../lib/logger'
	import { getPlatform, setEnableDebug } from '../../lib/platform'
	import { JL_OTA } from '../../lib/lib_rcsp'

	/** 页面级的单例，和原版小程序一样放在模块作用域 */
	let sBluetoothManager: BluetoothOTAManager

	export default {
		data() {
			return {
				isTimesView: false,
				mStatusTimesView: 0,//0:测试数量弹窗 1:MTU弹窗
				isHandshake: true,//是否需要认证
				isAutoTest: false,
				isEnableDebug: false,//是否打开开发调试
				logViewVisible: false,//显示上传log弹窗
				logGradeArray: ['logv', 'logd', 'logi', 'logw', 'loge'],
				logGrade: 0,
				developMode: false,
				mTestNum: 1,
				mMtuNum: 23,
				mPlatform: 'android',
				appVersion: 'V2.2.0',
				sdkVersion: 'V2.2.0'
			}
		},
		onLoad() {
			sBluetoothManager = getApp().globalData.bluetoothManager
			const app = getApp()
			const logGrade = getLogGrade()
			this.isHandshake = app.globalData.gbIsHandshake
			this.isAutoTest = app.globalData.gbIsAutoTest
			this.mTestNum = app.globalData.gbTestNum
			this.mMtuNum = app.globalData.gbMtuNum
			this.isEnableDebug = app.globalData.gbEnableDebug
			this.developMode = app.globalData.gbDevelop
			this.mPlatform = getPlatform()
			this.logGrade = (logGrade - 1)
			this.sdkVersion = "V" + JL_OTA.OTASdkVersion.VersionName
		},
		methods: {
			// 设备认证
			onIsHandshakeDevice(e: any) {
				logv("认证设备：" + e.detail.value)
				const isHandshake = e.detail.value
				this.isHandshake = isHandshake
				getApp().globalData.gbIsHandshake = isHandshake;
				uni.setStorageSync("IsHandshake", isHandshake)
				this._saveSettings()
			},
			//自动化测试
			onIsAutoTestDevice(e: any) {
				logv("自动化测试：" + e.detail.value)
				const isAutoTest = e.detail.value
				this.isAutoTest = isAutoTest
				if (this.isAutoTest == false) {
					this.mTestNum = 1
					this.mMtuNum = 23
				}
				const app = getApp()
				app.globalData.gbIsAutoTest = isAutoTest;
				uni.setStorageSync("IsAutoTest", isAutoTest)
				app.globalData.gbTestNum = this.mTestNum;
				app.globalData.gbMtuNum = this.mMtuNum;
				this._saveSettings()
			},

			//测试次数弹窗
			onShowTestNumberView() {
				this.mStatusTimesView = 0
				this.isTimesView = !this.isTimesView
			},
			//MTU设置弹窗
			onShowMtuNumberView() {
				this.mStatusTimesView = 1
				this.isTimesView = !this.isTimesView
			},
			onUploadLogFile() {
				uni.navigateTo({
					url: '/pages/pageSetting/pageLogFile/pageLogFile',
				})
			},
			onCancelUploadLog() {
				this.logViewVisible = false
			},
			onConfirmUploadLog() {
				this.logViewVisible = false
			},
			onLogGradePickerChange(e: any) {
				logv("onLogGradePickerChange", e.detail);
				const logGrade: number = Number.parseInt(e.detail.value) + 1
				this.logGrade = e.detail.value
				uni.setStorageSync("LogGrade", logGrade)
				setLogGrade(logGrade)
			},
			// 开发调试
			onEnableDebug(e: any) {
				const enableDebug = e.detail.value
				uni.setStorageSync("IsEnableDebug", enableDebug)
				getApp().globalData.gbEnableDebug = enableDebug
				setLogEnable(enableDebug)
				setTimeout(() => {
					setEnableDebug(enableDebug)
				}, 100);
			},
			// BLE通讯配置
			onBLEDataSetting() {
				uni.navigateTo({
					url: '/pages/pageSetting/pageBLEDataSet/pageBLEDataSet',
				})
			},
			onTimesSelectTestNumber(e: any) {
				logv("测试次数：" + e)
				let num = e;
				if (e == 0) num = 1;

				this.mTestNum = num
				this.isTimesView = !this.isTimesView
				this._saveSettings()
			},
			onTimesSelectMTU(e: any) {
				logv("MTU：" + e)
				this.mMtuNum = e
				this.isTimesView = !this.isTimesView
				getApp().globalData.gbMtuNum = e
				uni.setStorageSync("MtuNum", e)
				this._saveSettings()
			},
			onTimesSelectCancel(e: any) {
				logv("取消" + e)
				//测试次数
				if (e == 0) {
					this.mTestNum = this.mTestNum
					this.isTimesView = !this.isTimesView
				}
				//MTU设置
				if (e == 1) {
					this.mMtuNum = this.mMtuNum
					this.isTimesView = !this.isTimesView
				}
			},
			onTestCustomCmd() {
				uni.navigateTo({
					url: '/pages/pageSetting/pageCustomCmd/pageCustomCmd',
				})
			},
			onDevelopMode() {
				if (this.developMode) {
					uni.showToast({ title: "退出开发者模式" })
					if (this.isEnableDebug) {
						uni.setStorageSync("IsEnableDebug", false)
						setTimeout(() => {
							setEnableDebug(false)
						}, 100);
					}
					uni.setStorageSync("DevelopMode", false)
					this.developMode = false
					this.isEnableDebug = false
				} else {
					uni.showToast({ title: "进入开发者模式" })
					uni.setStorageSync("DevelopMode", true)
					this.developMode = true
				}
			},
			_saveSettings() {
				const configure = new BluetoothConfigure()
				configure.isUseAuth = this.isHandshake
				configure.changeMTU = this.mMtuNum
				//todo 目前未实现自动化测试OTA
				configure.isAutoTestOTA = false;
				configure.autoTestOTACount = 20;
				sBluetoothManager.setConfigure(configure)
			}
		}
	}
</script>

<style scoped>
	/* 原版靠 page 选择器设置背景，这里合并进根容器 .container */
	.container {
		position: fixed;
		width: 100%;
		height: 100%;
		top: 0;
		left: 0;
		background-color: #F4F7FB;

		display: flex;
		flex-direction: column;
		justify-content: space-between;
		align-items: center;
	}

	.container_0 {
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
		align-items: center;

		width: 100%;
		padding-top: 20rpx;
	}

	.view-0 {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
		height: 100rpx;
		width: 100%;
		background-color: white;
	}

	.view-1 {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
		height: 100rpx;
		width: 100%;
		background-color: white;
		margin-top: 20rpx;
	}

	.view-2 {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
		height: 100rpx;
		width: 100%;
		background-color: white;
		border-top: solid #F4F7FB 2rpx;
	}

	.view-3 {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
		height: 100rpx;
		width: 100%;
		background-color: white;
		border-top: solid #F4F7FB 2rpx;
	}

	.view-5 {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
		height: 100rpx;
		width: 100%;
		background-color: white;
		margin-top: 20rpx;
	}

	.text-0 {
		width: 300rpx;
		height: 40rpx;
		font-size: 30rpx;
		font-family: PingFangSC-Medium, PingFang SC;
		font-weight: 500;
		color: #242424;
		line-height: 40rpx;
		padding-left: 40rpx;
	}

	.text-1 {
		height: 44rpx;
		font-size: 30rpx;
		font-family: PingFangSC-Medium, PingFang SC;
		font-weight: 500;
		color: #838383;
		line-height: 44rpx;
		text-align: right;
		padding-right: 40rpx;
	}

	.btn-1 {
		width: 110rpx;
		height: 68rpx;
		background-color: #EBEFF3;
		margin-right: 8rpx;
		border-radius: 40rpx;
		font-size: 30rpx;
		font-family: PingFangSC-Medium, PingFang SC;
		font-weight: 500;
		color: #838383;
		line-height: 68rpx;
		text-align: center;
	}

	.image-0 {
		height: 32rpx;
		width: 60rpx;
		padding-right: 30rpx;
	}

	.view-mtu {
		width: 300rpx;
		height: 100rpx;
		display: flex;
		flex-direction: row;
		justify-content: flex-end;
		align-items: center;
	}

	.view-mtu .sub-0 {
		width: 100rpx;
		height: 44rpx;
		font-size: 30rpx;
		font-family: PingFangSC-Medium, PingFang SC;
		font-weight: 500;
		text-align: right;
		color: #838383;
		line-height: 44rpx;
	}

	.view_log {
		position: fixed;
		z-index: 10000;
		width: 100%;
		height: 100%;
		top: 0;
		left: 0;
		background-color: rgba(0, 0, 0, 0.4);
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.dialog_log {
		width: calc(85% - 96rpx);
		height: min-content;
		background-color: #F4F7FB;
		display: flex;
		flex-direction: column;
		border-radius: 24rpx;
		padding-left: 48rpx;
		padding-right: 48rpx;
	}

	.dialog_log text {
		font-size: 30rpx;
		font-family: PingFangSC, PingFang SC;
		font-weight: 500;
		color: rgba(0, 0, 0, 0.9);
	}

	.dialog_log .title {
		width: 100%;
		text-align: center;
		height: 42rpx;
		font-size: 30rpx;
		font-family: PingFangSC, PingFang SC;
		font-weight: 500;
		color: rgba(0, 0, 0, 0.9);
		line-height: 42rpx;
		margin-top: 48rpx;
		margin-bottom: 48rpx;
	}

	.dialog_log .btn {
		display: flex;
		flex-direction: row;
	}
</style>
