<template>
	<!-- OTA 升级进度弹窗 -->
	<view v-if="show" class="container">
		<view class="ota-view" :style="{ height: otaBgHeight + 'rpx' }">
			<view v-if="times > 1" class="view_0">自动化测试程序：{{ number }}/{{ times }}</view>

			<!-- 升级/校验 状态 -->
			<template v-if="status === 0 || status === 1">
				<view v-if="status === 0" class="view_1">校验文件中 {{ progressText }}%</view>
				<view v-if="status === 1" class="view_1">正在升级 {{ progressText }}%</view>
				<view class="view_2">{{ otaFile }}</view>
				<progress class="ota-pg" border-radius="100" :percent="value" stroke-width="3" activeColor="#398BFF" />
			</template>

			<!-- 回连状态 -->
			<view v-if="status === 2" class="box">
				<view class="loading">
					<view></view><view></view><view></view><view></view>
					<view></view><view></view><view></view><view></view>
				</view>
			</view>

			<view v-if="status === 0 || status === 1" class="view_3">(升级过程中，请保持蓝牙和网络打开状态)</view>
			<view v-if="status === 2" class="view_3">正在回连设备...</view>

			<image v-if="isFinished && otaResult === 0" class="image_0" src="/static/images/icon_success_48_nol.png" mode="aspectFit" />
			<image v-if="isFinished && otaResult !== 0" class="image_0" src="/static/images/icon_fail_48_nol.png" mode="aspectFit" />

			<view v-if="isFinished && otaResult === 0" class="view_0">升级成功</view>
			<view v-if="isFinished && otaResult !== 0" class="view_0">升级失败</view>

			<view v-if="isFinished && otaResult !== 0" class="view_3">原因：{{ failReason }}</view>
			<view v-if="isFinished && times > 1" class="view_3">测试任务次数:{{ number }} 测试成功次数:{{ times }}</view>
			<view v-if="isFinished" class="view-ok" @tap="onConfirm">确定</view>
		</view>
	</view>
</template>

<script lang="ts">
	export default {
		name: 'ota-progress-view',
		props: {
			/** 是否展示 OTA 升级界面 */
			show: { type: Boolean, default: false },
			/** 0:检验中 1:升级中 2:回连设备 3:升级成功 4:升级失败 */
			status: { type: Number, default: 0 },
			/** 进度 0-100 */
			value: { type: Number, default: 0 },
			/** 自动化测试-完成次数 */
			number: { type: Number, default: 0 },
			/** 自动化测试-测试总次数 */
			times: { type: Number, default: 0 },
			/** OTA 文件名 */
			otaFile: { type: String, default: '' },
			/** 0:成功 1:失败 */
			otaResult: { type: Number, default: 0 },
			/** 失败原因 */
			failReason: { type: String, default: 'ota Fail' }
		},
		computed: {
			/** 原版用 observers 计算弹窗高度，这里改成计算属性更直观 */
			otaBgHeight(): number {
				if (this.times > 1) {
					return this.status > 2 ? 500 : 400
				}
				return this.status > 2 ? 370 : 270
			},
			/** 原版用 wxs 过滤器 toFix2，Vue 里直接算 */
			progressText(): string {
				return Number(this.value).toFixed(2)
			},
			isFinished(): boolean {
				return this.status === 3 || this.status === 4
			}
		},
		methods: {
			onConfirm() {
				this.$emit('confirm')
			}
		}
	}
</script>

<style scoped>
	.container {
		position: fixed;
		z-index: 10000;
		width: 100%;
		height: 100%;
		top: 0;
		left: 0;
		background-color: rgba(0, 0, 0, 0.4);
	}

	.ota-view {
		background-color: white;
		border-radius: 30rpx;
		margin-bottom: 12vh;
		display: flex;
		flex-direction: column;
		justify-content: space-around;
		align-items: center;

		position: fixed;
		height: 400rpx;
		left: 30rpx;
		right: 30rpx;
		bottom: 30rpx;

		padding-top: 20rpx;
	}

	.view_0 {
		width: 400rpx;
		height: 48rpx;
		font-size: 34rpx;
		font-family: PingFangSC-Regular, PingFang SC;
		font-weight: 400;
		text-align: center;

		color: #242424;
		line-height: 48rpx;
	}

	.view_1 {
		width: 300rpx;
		height: 44rpx;
		font-size: 32rpx;
		font-family: PingFangSC-Regular, PingFang SC;
		font-weight: 400;
		text-align: center;
		color: #242424;
		line-height: 44rpx;
	}

	.view_2 {
		width: 300rpx;
		height: 40rpx;
		font-size: 30rpx;
		font-family: PingFangSC-Regular, PingFang SC;
		font-weight: 400;
		text-align: center;
		color: #919191;
		line-height: 40rpx;

		margin-top: -30rpx;
	}

	.view_3 {
		width: 600rpx;
		height: 40rpx;
		font-size: 28rpx;
		font-family: PingFangSC-Regular, PingFang SC;
		font-weight: 400;
		text-align: center;
		color: #919191;
		line-height: 40rpx;
		padding-bottom: 30rpx;
	}

	.ota-pg {
		height: 6rpx;
		width: 86%;
	}

	.image_0 {
		height: 104rpx;
		width: 104rpx;
	}

	.view-ok {
		border-top: solid #F7F7F7 2rpx;
		width: 100%;
		height: 90rpx;
		font-size: 32rpx;
		font-family: PingFangSC-Regular, PingFang SC;
		font-weight: 400;
		text-align: center;
		color: #398BFF;
		line-height: 44rpx;
		margin-bottom: 0;

		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
	}

	.box {
		height: 100rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto;
		overflow: unset;
	}

	.loading {
		position: relative;
	}

	.loading>view {
		position: absolute;
		width: 6rpx;
		height: 18rpx;
		border-radius: 10rpx;
		background-color: #838383;
	}

	.loading>view:nth-child(1) {
		top: 24rpx;
		left: 0rpx;
		animation: loading infinite 1s;
	}

	.loading>view:nth-child(2) {
		top: 18.5rpx;
		left: 18.5rpx;
		transform: rotate(-45deg);
		animation: loading infinite 1s 0.125s;
	}

	.loading>view:nth-child(3) {
		top: 0rpx;
		left: 24rpx;
		transform: rotate(90deg);
		animation: loading infinite 1s 0.25s;
	}

	.loading>view:nth-child(4) {
		top: -18.5rpx;
		left: 18.5rpx;
		transform: rotate(45deg);
		animation: loading infinite 1s 0.375s;
	}

	.loading>view:nth-child(5) {
		top: -24rpx;
		left: 0rpx;
		transform: rotate(0deg);
		animation: loading infinite 1s 0.5s;
	}

	.loading>view:nth-child(6) {
		top: -18.5rpx;
		left: -18.5rpx;
		transform: rotate(-45deg);
		animation: loading infinite 1s 0.625s;
	}

	.loading>view:nth-child(7) {
		top: 0rpx;
		left: -24rpx;
		transform: rotate(90deg);
		animation: loading infinite 1s 0.75s;
	}

	.loading>view:nth-child(8) {
		top: 18.5rpx;
		left: -18.5rpx;
		transform: rotate(45deg);
		animation: loading infinite 1s 0.875s;
	}

	@keyframes loading {
		50% {
			opacity: 0.1;
		}

		100% {
			opacity: 1;
		}
	}
</style>
