<template>
	<view class="content">
		<view class="view_0">
			<text class="text_0">设备状态：</text>
			<text class="text_1">{{ isBleConnect ? '已连接' : '未连接' }}</text>
		</view>

		<view class="view_1">
			<text class="text_2">设备类型：</text>
			<text v-if="isBleConnect" class="text_3">BLE</text>
		</view>

		<view class="view_2">
			<view class="view_3" @tap="onAddOTAFile">
				<text class="text_4">文件选择:</text>
				<image class="image_0" src="/static/images/icon_add.png" mode="aspectFit" />
			</view>
			<view class="view_6">
				<image v-if="fileArray.length === 0" class="image_1" src="/static/images/img_01.png" mode="aspectFit" />
				<scroll-view v-if="fileArray.length > 0" class="file_scroll" scroll-y>
					<view class="itemView" v-for="(item, index) in fileArray" :key="item.filePath"
						@tap.stop="onSelectedFile" @longpress.stop="onLongTapFile" :data-index="index">
						<view class="view_left">
							<view class="image_l">
								<image class="image_l" src="/static/images/icon_file.png" mode="aspectFit" />
							</view>
							<view class="text_l">
								<view class="view_top">
									<view class="text_name">{{ item.fileName }}</view>
									<view class="text_size">{{ item.fileSizeStr }}MB</view>
								</view>
								<view class="text_path">{{ item.date }}</view>
							</view>
						</view>
						<view class="view_right">
							<image v-if="index !== fileIndex" class="image_r" src="/static/images/icon_choose_nol.png"
								mode="aspectFit" />
							<image v-else class="image_r" src="/static/images/icon_choose_sel.png" mode="aspectFit" />
						</view>
					</view>
				</scroll-view>
			</view>
		</view>

		<view :class="isBleConnect ? 'view_4' : 'view_5'" @tap="onUpdate">升级</view>

		<ota-progress-view :show="isShowProgress" :status="mStatus" :ota-file="mOtaFile" :value="mValue"
			:number="mNumber" :times="mTimes" :ota-result="mOtaResult" :fail-reason="mFailReason"
			@confirm="onOtaProgressViewConfirm" />

		<waiting-view :show="isShowLoading" :text="mLoadingText" />
	</view>
</template>

<script lang="ts">
	import { BTBean } from '../../lib/bluetooth'
	import { BluetoothEventCallback, BluetoothOTAManager } from '../../lib/bluetoothOTAManager'
	import { JL_OTA } from '../../lib/lib_rcsp'
	import { loge, logv } from '../../lib/log'
	import { UpgradeFileUtil } from '../../lib/upgradeFileUtil'
	import {
		chooseUpgradeFile,
		isShareFileSupported,
		readFileAsUint8Array,
		shareUpgradeFile
	} from '../../lib/platform'

	/** 页面级的单例，和原版小程序一样放在模块作用域 */
	let sBluetoothManager: BluetoothOTAManager
	let sBluetoothEventCallback: BluetoothEventCallback
	/** 当前选中文件的路径，页面重建后用来恢复选中项 */
	let selectFilePath = ''
	/** 当前选中文件的二进制内容 */
	let upgradeData = new Uint8Array(0)

	export default {
		data() {
			return {
				isBleConnect: false,
				fileArray: new Array<any>(),
				fileIndex: -1,

				isShowProgress: false,      //展示OTA升级界面
				mValue: 0,                  //进度 0-100
				mOtaFile: "otaUpdate.ufw",  //OTA文件名
				mFailReason: "ota Fail",    //失败原因
				mOtaResult: 0,              //0:成功 1:失败
				mStatus: 0,                 //0:检验中 1:升级中 2:回连设备 3:升级成功 4:升级失败
				// 自动化测试暂未实现，保持与小程序一致地传 0，OTA 弹窗不会展示次数行
				mNumber: 0,
				mTimes: 0,

				isShowLoading: false,
				mLoadingText: "加载升级文件"
			}
		},
		onLoad() {
			sBluetoothManager = getApp().globalData.bluetoothManager
			sBluetoothEventCallback = new BluetoothEventCallback();
			/** 设备断开 */
			sBluetoothEventCallback.onDevStatusDisconnect = (_dev: BTBean.BluetoothDevice) => {
				this._checkIsConnected()
			};
			/** 设备连接失败 */
			sBluetoothEventCallback.onDevStatusFailed = (_dev: BTBean.BluetoothDevice) => {
				this._checkIsConnected()
			};
			/** 设备连接成功*/
			sBluetoothEventCallback.onDevStatusSuccess = (_dev: BTBean.BluetoothDevice) => {
				this._checkIsConnected()
			};
			sBluetoothManager.addBluetoothEventCallback(sBluetoothEventCallback)
			this._onUpgradeFileInfoList(UpgradeFileUtil.getUpgradeFileInfos())
			UpgradeFileUtil.setListener({
				onUpgradeFileInfoList: (infoList: any[]) => {
					this._onUpgradeFileInfoList(infoList)
				}
			})
		},
		onShow() {
			this._checkIsConnected()
		},
		onUnload() {
			// 原版只注册不注销，切页来回后会重复注册回调，这里补上
			sBluetoothManager.removeBluetoothEventCallback(sBluetoothEventCallback)
		},
		methods: {
			showLoadingView() {
				this.isShowLoading = true
			},
			dismissLoadingView() {
				this.isShowLoading = false
			},
			onAddOTAFile() {
				logv("读取文件...")
				chooseUpgradeFile(10).then((addFileArray) => {
					if (addFileArray.length > 1) {//多个文件跳过重命名
						const infos = addFileArray.map((item) => ({
							fileName: item.name,
							fileSrcPath: item.path,
							fileSize: item.size
						}))
						UpgradeFileUtil.addUpgradeFiles(infos).then(() => {
							uni.showToast({
								title: '导入成功',
								icon: 'success'
							})
						}).catch((error) => {
							this._showImportError(error)
						})
					} else if (addFileArray.length == 1) {//单个文件重命名
						const file = addFileArray[0]
						uni.showModal({
							title: "请输入文件名",
							content: file.name,
							editable: true,
							success: (res) => {
								if (res.confirm == true) {
									UpgradeFileUtil.addUpgradeFile(res.content, file.path, file.size).then(() => {
										uni.showToast({
											title: '导入成功',
											icon: 'success'
										})
									}).catch((error) => {
										this._showImportError(error)
									})
								} else if (res.cancel == true) {
									uni.showToast({
										title: '取消保存',
										icon: 'none'
									})
								}
							}
						})
					}
				}).catch((e) => {
					loge(e)
					this.dismissLoadingView()
					uni.hideLoading({
						success: () => {
							uni.showToast({
								title: e?.message || '数据错误',
								icon: 'none'
							})
						},
					})
				})
			},
			onLongTapFile(e: any) {
				const index = Number(e.currentTarget.dataset.index)
				const file = this.fileArray[index]
				if (file == undefined) {
					return
				}
				const itemList = isShareFileSupported() ? ['删除文件', '转发文件到聊天'] : ['删除文件']
				uni.showActionSheet({
					itemList: itemList,
					success: (res) => {
						if (res.tapIndex === 0) {
							if (this.fileIndex == index) {
								this.fileIndex = -1
								this.mOtaFile = ""
								selectFilePath = ""
							}
							UpgradeFileUtil.removeUpgradeFile(file)
						} else if (res.tapIndex === 1) {
							shareUpgradeFile({
								filePath: file.filePath,
								fileName: file.fileName,
								fail: (message: string) => {
									uni.showToast({ title: "转发失败,msg:" + message })
								}
							})
						}
					}
				})
			},
			onSelectedFile(e: any) {
				const index = Number(e.currentTarget.dataset.index)
				if (this.fileIndex == index) {
					this.fileIndex = -1
					this.mOtaFile = ""
					selectFilePath = ""
					return;
				}
				const selectedFile = this.fileArray[index]
				if (selectedFile == undefined) {
					return
				}
				this.showLoadingView()
				readFileAsUint8Array(selectedFile.filePath, selectedFile.fileSize).then((uint8) => {
					upgradeData = uint8
					logv("------------读取文件成功------------")
					setTimeout(() => {
						this.dismissLoadingView()
						uni.showToast({
							title: '加载成功',
							icon: 'none'
						})
					}, 200);
					this.fileIndex = index
					this.mOtaFile = selectedFile.fileName
					selectFilePath = selectedFile.filePath
				}).catch((error) => {
					this.dismissLoadingView()
					uni.showToast({
						title: '文件丢失',
						icon: 'none'
					})
					if (this.fileIndex == index) {
						this.fileIndex = -1
						this.mOtaFile = ""
						selectFilePath = ""
					}
					UpgradeFileUtil.removeUpgradeFile(selectedFile)
					logv("error", error);
				})
			},
			onUpdate() {
				if (!this.isBleConnect) {
					uni.showToast({
						title: '请先连接的设备',
						icon: 'none'
					})
					return;
				}
				if (this.fileIndex == -1) {
					uni.showToast({
						title: '请先选择升级文件',
						icon: 'none'
					})
					return;
				}
				if (sBluetoothManager.isOTAing()) {
					uni.showToast({ title: '正在升级中', icon: 'none' })
					return;
				}

				/*--- 开始执行OTA升级 ---*/
				const otaConfig: JL_OTA.OtaConfig = new JL_OTA.OtaConfig()
				otaConfig.isSupportNewRebootWay = true
				logv("upgradeData size: " + upgradeData.length);
				const connectedDevices = sBluetoothManager.getConnectedDevice()
				if (connectedDevices != null && connectedDevices.length > 0) {
					const otaDev = connectedDevices[0]
					sBluetoothManager.isInit(otaDev).then((isInit: boolean) => {
						if (!isInit) {
							uni.showToast({ title: '设备未初始化，请稍候', icon: 'none' })
							return
						}
						sBluetoothManager.isNeedMandatoryUpgrade(otaDev).then((needMandatoryUpgrade: boolean) => {
							sBluetoothManager.startOTA(otaDev, otaConfig, {
								onStartOTA: () => {
									this.isShowProgress = true
									this.mStatus = needMandatoryUpgrade ? 1 : 0
									setTimeout(() => {
										// 原版禁用自定义 tabBar 的点击，这里用隐藏原生 tabBar 达到同样效果
										uni.hideTabBar()
									}, 100);
								},
								onReadData: (offset: number, size: number) => {
									if (!upgradeData || offset < 0 || size < 0) return undefined
									if (offset >= upgradeData.length) return undefined
									const end = Math.min(offset + size, upgradeData.length)
									return upgradeData.slice(offset, end)
								},
								onExecuteDisconnectDevice: () => {
									// BLE 方式由底层断开；SPP 才需要在这里主动断开
								},
								onNeedReconnect: (_reConnectMsg: JL_OTA.ReconnectInfo, _reconnectCallback) => {
									this.mValue = 0
									this.mStatus = 2
								},
								onProgress: (type: JL_OTA.UpgradeType, progress: number) => {
									if (type == JL_OTA.UpgradeType.UPGRADE_TYPE_CHECK_FILE) {
										this.mValue = progress
										this.mStatus = 0
									}
									if (type == JL_OTA.UpgradeType.UPGRADE_TYPE_FIRMWARE) {
										this.mValue = progress
										this.mStatus = 1
									}
								},
								onStopOTA: () => {
									uni.showTabBar()
									this.mValue = 0
									this.mOtaResult = 0
									this.mStatus = 3
								},
								onCancelOTA: () => {
									uni.showTabBar()
									this.mValue = 0
									this.mOtaResult = 1
									this.mStatus = 4
									this.mFailReason = "升级被取消."
								},
								onError: (_error: number, message: string) => {
									uni.showTabBar()
									this.mValue = 0
									this.mOtaResult = 1
									this.mStatus = 4
									this.mFailReason = message
								},
								onRCSPInit: (_deviceId: string, _isInit: boolean) => {
								}
							})
						}).catch(() => {
							uni.showToast({ title: '读取设备升级信息失败', icon: 'none' })
						})
					})
				}
			},
			onOtaProgressViewConfirm() {
				this.isShowProgress = false
			},
			_onUpgradeFileInfoList(infoList: any[]) {
				const tempList = infoList.reverse()
				let selectedIndex = -1;
				const selectPath = selectFilePath || '';
				tempList.forEach((element, index) => {
					element.date = this._formatTime(new Date(element.time))
					element.fileSizeStr = (element.fileSize / (1024 * 1024)).toFixed(2)
					if (selectedIndex === -1 && selectPath !== '' && element.filePath === selectPath) {
						selectedIndex = index;
					}
				});

				this.fileArray = tempList
				this.fileIndex = selectedIndex
			},
			_checkIsConnected() {
				let isConnected = false
				const connectedDevices = sBluetoothManager.getConnectedDevice()
				if (connectedDevices != null && connectedDevices.length > 0) {
					isConnected = true
				}
				this.isBleConnect = isConnected
			},
			_showImportError(error: any) {
				if (error == 1300202) {
					uni.showToast({
						title: '导入失败，剩余使用空间不足(上限200MB)',
						icon: 'none'
					})
				}
			},
			_formatTime(date: Date) {
				const year = date.getFullYear()
				const month = date.getMonth() + 1
				const day = date.getDate()
				const hour = date.getHours()
				const minute = date.getMinutes()
				const second = date.getSeconds()
				return (
					[year, month, day].map(this._formatNumber).join('/') +
					' ' +
					[hour, minute, second].map(this._formatNumber).join(':')
				)
			},
			_formatNumber(n: number) {
				const s = n.toString()
				return s[1] ? s : '0' + s
			}
		}
	}
</script>

<style scoped>
	/* 原版靠 page 选择器设置背景，这里合并进根容器 */
	.content {
		min-height: 100vh;
		background-color: #F4F7FB;
	}

	.view_0 {
		padding-left: 30rpx;
		padding-top: 30rpx;
	}

	.view_1 {
		padding-left: 30rpx;
		padding-top: 30rpx;
	}

	.view_2 {
		height: 520rpx;
		margin-top: 30rpx;
		margin-left: 30rpx;
		margin-right: 30rpx;
		background-color: white;
		border-radius: 16rpx;

		display: flex;
		flex-direction: column;
		justify-content: space-between;
		align-items: center;
	}

	.view_3 {
		padding-top: 30rpx;
		height: 12%;
		width: 90%;
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
	}

	.view_6 {
		width: 100%;
		height: 88%;
		display: flex;
		flex-direction: row;
		justify-content: center;
		align-items: center;
	}

	.view_4 {
		margin-left: 30rpx;
		margin-right: 30rpx;
		margin-top: 200rpx;
		height: 96rpx;
		font-size: 30rpx;
		font-family: PingFangSC-Medium, PingFang SC;
		font-weight: 500;
		color: #FFFFFF;
		line-height: 40rpx;
		background-color: #398BFF;
		border-radius: 48rpx;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.view_5 {
		margin-left: 30rpx;
		margin-right: 30rpx;
		margin-top: 200rpx;
		height: 96rpx;
		font-size: 30rpx;
		font-family: PingFangSC-Medium, PingFang SC;
		font-weight: 500;
		color: #FFFFFF;
		line-height: 40rpx;
		background-color: #D7DADD;
		border-radius: 48rpx;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.text_0 {
		width: 240rpx;
		height: 40rpx;
		font-size: 30rpx;
		font-family: PingFangSC-Medium, PingFang SC;
		font-weight: 500;
		color: #242424;
		line-height: 40rpx;
	}

	.text_1 {
		width: 240rpx;
		height: 40rpx;
		font-size: 30rpx;
		font-family: PingFangSC-Medium, PingFang SC;
		font-weight: 500;
		color: #398BFF;
		line-height: 40rpx;
	}

	.text_2 {
		width: 150rpx;
		height: 40rpx;
		font-size: 30rpx;
		font-family: PingFangSC-Medium, PingFang SC;
		font-weight: 500;
		color: #242424;
		line-height: 40rpx;
	}

	.text_3 {
		width: 150rpx;
		height: 40rpx;
		font-size: 30rpx;
		font-family: PingFangSC-Medium, PingFang SC;
		font-weight: 500;
		color: #398BFF;
		line-height: 40rpx;
	}

	.text_4 {
		width: 300rpx;
		height: 40rpx;
		font-size: 30rpx;
		font-family: PingFangSC-Medium, PingFang SC;
		font-weight: 500;
		color: #242424;
		line-height: 40rpx;
		text-align: left;
	}

	.image_0 {
		height: 48rpx;
		width: 48rpx;
	}

	.image_1 {
		width: 308rpx;
		height: 212rpx;
	}

	.file_scroll {
		height: 90%;
		width: 92%;
	}

	.itemView {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
		border-bottom: solid #F4F7FB 2rpx;
		height: 128rpx;
		padding-left: 0rpx;
		padding-right: 0rpx;
		word-break: keep-all;
	}

	.view_left {
		display: flex;
		flex-direction: row;
		justify-content: flex-start;
		align-items: center;
		height: 60rpx;
		width: 90%;
	}

	.image_l {
		height: 48rpx;
		width: 48rpx;
	}

	.text_l {
		margin-left: 32rpx;
		overflow: hidden;
		width: 100%;
	}

	.text_l .view_top {
		display: flex;
		width: 100%;
		justify-content: space-between;
	}

	.text_l .view_top .text_size {
		height: 42rpx;
		font-size: 30rpx;
		white-space: nowrap;
		font-family: PingFangSC, PingFang SC;
		font-weight: 500;
		color: #242424;
		line-height: 42rpx;
	}

	.text_l .view_top .text_name {
		width: 1;
		height: 42rpx;
		font-size: 30rpx;
		white-space: nowrap;
		font-family: PingFangSC, PingFang SC;
		font-weight: 500;
		color: #242424;
		line-height: 42rpx;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.text_l .text_path {
		height: 34rpx;
		font-size: 24rpx;
		font-family: PingFangSC, PingFang SC;
		font-weight: 400;
		color: #B0B0B0;
		line-height: 34rpx;
		margin-top: 4rpx;
	}

	.view_right {
		display: flex;
		flex-direction: row;
		justify-content: center;
		align-items: center;
		width: 36rpx;
		height: 36rpx;
	}

	.image_r {
		width: 36rpx;
		height: 36rpx;
	}
</style>
