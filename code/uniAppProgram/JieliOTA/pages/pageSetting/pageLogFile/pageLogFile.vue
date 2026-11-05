<template>
	<view class="contain">
		<scroll-view class="scroll" scroll-y>
			<view v-for="(item, index) in logFileList" :key="item.name">
				<view class="item_file" :data-index="index" @tap="onClickFile">
					<view class="left_view">
						<view class="name">{{ item.name }}</view>
						<view class="time">修改时间：{{ item.updateTime }}</view>
					</view>
					<view>{{ item.fileSize }}MB</view>
				</view>
				<view class="split-line"></view>
			</view>

			<view v-if="logFileList.length === 0" class="empty">
				{{ unsupported ? '当前平台不支持日志文件' : '暂无日志文件' }}
			</view>

			<view class="tips">
				<text>使用说明</text>
				<text>1.最多保存5M的日志内容，超过5M后，旧的日志内容会被删除。</text>
				<text>2.最新的日志，应保存在修改时间最新的文件中。</text>
				<text>3.日志文件最多只有5个。</text>
				<text>4.该日志文件是wx.getLogManager所生成的。</text>
				<text>5.小程序转发文件不支持多个文件，故此不支持多文件转发。</text>
			</view>
		</scroll-view>
	</view>
</template>

<script lang="ts">
	import {
		getFileSystemManager,
		getUserDataPath,
		isShareFileSupported,
		shareUpgradeFile
	} from '../../../lib/platform'
	import { formatTime } from '../../../utils/util'

	/** 日志目录（仅微信端有私有目录） */
	let logFilePath = ''

	export default {
		data() {
			return {
				logFileList: [] as Array<{ name: string, fileSize: string, updateTime: string }>,
				unsupported: false
			}
		},
		onLoad() {
			const userDataPath = getUserDataPath()
			logFilePath = userDataPath ? userDataPath + "/miniprogramLog" : ''
			this._loadLogFiles()
		},
		methods: {
			_loadLogFiles() {
				const fs = getFileSystemManager()
				if (!fs || typeof fs.stat !== 'function' || !logFilePath) {
					this.unsupported = true
					return
				}
				fs.stat({
					path: logFilePath,
					recursive: true,
					success: (res: any) => {
						const statsList = Array.isArray(res.stats) ? res.stats : [res.stats]
						const logFileList = new Array<any>()
						statsList.forEach((element: any) => {
							if (!element || !element.path) return
							const stats = element.stats
							if (stats && typeof stats.isFile === 'function' && stats.isFile()) {
								logFileList.push({
									name: element.path,
									fileSize: (stats.size / (1024 * 1024)).toFixed(2),
									updateTime: stats.lastModifiedTime
										? formatTime(new Date(stats.lastModifiedTime * 1000))
										: ''
								})
							}
						})
						logFileList.sort((a, b) => a.name.localeCompare(b.name))
						this.logFileList = logFileList
					},
					fail: (err: any) => {
						console.log("读取日志目录失败", err)
					}
				})
			},
			onClickFile(e: any) {
				const index = Number(e.currentTarget.dataset.index)
				const file = this.logFileList[index]
				if (!file) return
				// 从完整路径中提取文件名
				const getFileName = (fullPath: string): string => {
				return fullPath.substring(fullPath.lastIndexOf('/') + 1);
				};

				const rawName = getFileName(file.name); // 纯文件名，如 "xxx.log"
				uni.showActionSheet({
					alertText: `Log日志文件: ${rawName}`,
					itemList: ['转发Log日志文件到聊天'],
					success: (res: any) => {
						if (res.tapIndex === 0) {
							if (!isShareFileSupported()) {
								uni.showToast({ title: '当前平台不支持转发文件', icon: 'none' })
								return
							}
							//鸿蒙的file.name是包含路径的，需要去掉路径
							shareUpgradeFile({
								filePath: logFilePath + "/" + rawName,
								fileName: file.name + ".txt",
								fail: (message: string) => {
									uni.showToast({ title: "转发失败,msg:" + message, icon: 'none' })
								}
							})
						}
					}
				})
			}
		}
	}
</script>

<style scoped>
	.contain {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		display: flex;
		flex-direction: column;
		background: #F4F7FB;
	}

	.scroll {
		flex: 1;
		width: 100%;
		background: #FFFFFF;
	}

	.item_file {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
		padding: 24rpx 44rpx;
	}

	.left_view {
		display: flex;
		flex-direction: column;
	}

	.left_view .name {
		font-family: PingFangSC, PingFang SC;
		font-weight: 500;
		font-size: 30rpx;
		color: #242424;
		line-height: 42rpx;
		text-align: left;
		font-style: normal;
	}

	.left_view .time {
		font-family: PingFangSC, PingFang SC;
		font-weight: 400;
		font-size: 24rpx;
		color: #B0B0B0;
		line-height: 34rpx;
		text-align: left;
		font-style: normal;
	}

	.split-line {
		width: 100%;
		height: 1rpx;
		background-color: rgba(0, 0, 0, 0.06);
	}

	.empty {
		padding: 60rpx 44rpx;
		text-align: center;
		font-size: 26rpx;
		color: #B0B0B0;
	}

	.tips {
		display: flex;
		flex-direction: column;
		padding: 24rpx 44rpx 60rpx;
		font-size: 24rpx;
		color: #B0B0B0;
		line-height: 34rpx;
	}
</style>
