<script lang="ts">
	import { BluetoothOTAManager } from './lib/bluetoothOTAManager'
	import { setLogger as setAppLogger } from './lib/log'
	import { getLogger, setLogEnable, setLogGrade as setLogManagerGrade } from './lib/logger'
	import { initSdkLog } from './lib/sdkLog'
	import { getPlatform } from './lib/platform'

	export default {
		globalData: {
			gbIsHandshake: true,
			gbIsAutoTest: false,
			gbTestNum: 1,
			gbMtuNum: 512,
			gbDevelop: false,
			gbEnableDebug: false,
			bluetoothManager: null as BluetoothOTAManager | null
		},
		onLaunch: function () {
			// 开发者模式
			const developMode = uni.getStorageSync("DevelopMode")
			if (developMode != "") {
				this.globalData.gbDevelop = developMode
			}
			//开发调试(打印)
			const cacheIsEnableDebug = uni.getStorageSync("IsEnableDebug")
			if (cacheIsEnableDebug != "") {
				this.globalData.gbEnableDebug = cacheIsEnableDebug
				setLogEnable(cacheIsEnableDebug)
			}
			//打印设置
			{
				const logger = getLogger()
				setAppLogger(logger)
				const logGrade = uni.getStorageSync("LogGrade")
				if (logGrade != "") {
					setLogManagerGrade(logGrade)
				}
				// 把 V2.2 SDK 的日志接入现有 5 级日志体系
				initSdkLog()
			}

			const cacheIsHandshake = uni.getStorageSync("IsHandshake")
			if (cacheIsHandshake != "") {
				this.globalData.gbIsHandshake = cacheIsHandshake
			}
			const cacheIsAutoTest = uni.getStorageSync("IsAutoTest")
			if (cacheIsAutoTest != "") {
				this.globalData.gbIsAutoTest = cacheIsAutoTest
			}
			const cacheTestNum = uni.getStorageSync("TestNum")
			if (cacheTestNum != "") {
				this.globalData.gbTestNum = cacheTestNum
			}
			const cacheMtuNum = uni.getStorageSync("MtuNum")
			if (cacheMtuNum != "") {
				this.globalData.gbMtuNum = cacheMtuNum
			}
			const cacheServiceUUID = uni.getStorageSync("ServiceUUID")
			const cacheNotifyCharacteristicUUID = uni.getStorageSync("NotifyCharacteristicUUID")
			const cacheWriteCharacteristicUUID = uni.getStorageSync("WriteCharacteristicUUID")

			this.globalData.bluetoothManager = new BluetoothOTAManager(getPlatform())

			const bluetoothManager = this.globalData.bluetoothManager
			const configure = bluetoothManager.getConfigure()
			configure.isUseAuth = this.globalData.gbIsHandshake
			configure.changeMTU = this.globalData.gbMtuNum
			//todo 目前未实现自动化测试OTA
			configure.isAutoTestOTA = false;
			configure.autoTestOTACount = 20;
			if (cacheServiceUUID != "") {
				configure.serviceUUID = cacheServiceUUID
			}
			if (cacheNotifyCharacteristicUUID != "") {
				configure.notifyCharacteristicUUID = cacheNotifyCharacteristicUUID
			}
			if (cacheWriteCharacteristicUUID != "") {
				configure.writeCharacteristicUUID = cacheWriteCharacteristicUUID
			}
			bluetoothManager.setConfigure(configure)
		},
		onShow: function () {
			console.log('App Show')
		},
		onHide: function () {
			console.log('App Hide')
		}
	}
</script>

<style>
	/*每个页面公共css */
</style>
