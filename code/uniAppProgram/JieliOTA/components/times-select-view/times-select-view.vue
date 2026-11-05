<template>
	<!-- 测试次数 / MTU 设置弹窗 -->
	<view v-if="show" class="container">
		<view class="times-view">
			<view class="content-view">
				<view class="view_1">{{ status === 0 ? '测试次数' : '调整MTU' }}</view>

				<!-- 输入框 -->
				<view v-if="status === 0" class="input-view">
					<input class="sub_0" maxlength="5" :value="String(mTestNumber)" type="number" @input="onInputTestNumber" />
					<image class="sub_1" src="/static/images/icon_delete.png" mode="aspectFit" @tap="onInputBack" />
				</view>

				<!-- MTU 拖拉条 -->
				<view v-else class="slider-view">
					<slider class="sub_0" @change="onSliderChanged" @changing="onSliderchanging" activeColor="#398BFF"
						:value="mMtuNumber" :min="sl_min" :max="sl_max" show-value />
				</view>
			</view>

			<view class="btn-view">
				<view class="btn-canel" @tap="onInputCancel">取消</view>
				<view class="btn-confirm" @tap="onInputConfirm">确定</view>
			</view>
		</view>
	</view>
</template>

<script lang="ts">
	export default {
		name: 'times-select-view',
		props: {
			/** 是否展示弹窗 */
			show: { type: Boolean, default: false },
			/** 0:测试数量弹窗 1:MTU弹窗 */
			status: { type: Number, default: 0 },
			/** 测试次数 */
			testNumber: { type: Number, default: 0 },
			/** Mtu 大小 */
			mtuNumber: { type: Number, default: 0 }
		},
		data() {
			return {
				/** 弹窗内的临时值，确定时才回传给父组件 */
				mTestNumber: 0,
				mMtuNumber: 0,
				sl_min: 23, // 最小限制
				sl_max: 512 // 最大限制
			}
		},
		watch: {
			/** 原版用 observers 同步外部传入的初始值 */
			testNumber: {
				immediate: true,
				handler(val: number) {
					this.mTestNumber = val
				}
			},
			mtuNumber: {
				immediate: true,
				handler(val: number) {
					this.mMtuNumber = val
				}
			}
		},
		methods: {
			onInputTestNumber(e: any) {
				this.mTestNumber = e.detail.value
			},
			onSliderChanged(e: any) {
				this.mMtuNumber = e.detail.value
			},
			onSliderchanging(e: any) {
				this.mMtuNumber = e.detail.value
			},
			onInputBack() {
				this.mTestNumber = 0
			},
			onInputCancel() {
				this.$emit('cancel', this.status)
			},
			onInputConfirm() {
				if (this.status === 0) {
					this.$emit('confirm-test-number', this.mTestNumber)
				} else {
					this.$emit('confirm-mtu', this.mMtuNumber)
				}
			}
		}
	}
</script>

<style scoped>
	.container {
		position: fixed;
		width: 100%;
		height: 100%;
		top: 0;
		left: 0;
		background-color: rgba(0, 0, 0, 0.4);
	}

	.times-view {
		background-color: white;
		border-radius: 30rpx;

		display: flex;
		flex-direction: column;
		justify-content: space-around;
		align-items: center;

		position: fixed;
		height: 400rpx;
		left: 40rpx;
		right: 40rpx;
		top: 160rpx;
	}

	.content-view {
		display: flex;
		flex-direction: column;
		justify-content: space-around;
		align-items: center;

		height: 70%;
		width: 100%;
	}

	.view_1 {
		width: 200rpx;
		height: 44rpx;
		font-size: 32rpx;
		font-family: PingFangSC-Medium, PingFang SC;
		font-weight: 500;
		text-align: center;
		color: #242424;
		line-height: 44rpx;
		margin-bottom: -50rpx;
	}

	.input-view {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
		width: 560rpx;
		height: 96rpx;
		background: #EFEFEF;
		border-radius: 4px;
	}

	.input-view .sub_0 {
		width: 70%;
		height: 100%;
		font-size: 30rpx;
		font-family: PingFangSC-Medium, PingFang SC;
		font-weight: 500;
		line-height: 44rpx;
		margin-left: 30rpx;
	}

	.input-view .sub_1 {
		width: 50rpx;
		height: 50rpx;
		margin-right: 20rpx;
	}

	.btn-view {
		display: flex;
		flex-direction: row;
		justify-content: center;
		align-items: center;
		height: 30%;
		width: 100%;
	}

	.btn-canel {
		width: 50%;
		height: 99%;
		font-size: 30rpx;
		font-family: PingFangSC-Medium, PingFang SC;
		font-weight: 500;
		text-align: center;
		color: #242424;
		line-height: 42rpx;

		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;

		border-top: 2rpx solid #F5F5F5;
		border-right: 2rpx solid #F5F5F5;
	}

	.btn-confirm {
		width: 50%;
		height: 99%;
		font-size: 30rpx;
		font-family: PingFangSC-Medium, PingFang SC;
		font-weight: 500;
		text-align: center;
		color: #398BFF;
		line-height: 42rpx;

		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		border-top: 2rpx solid #F5F5F5;
		border-left: 2rpx solid #F5F5F5;
	}

	.slider-view {
		height: 80rpx;
		line-height: 80rpx;
		font-size: 35rpx;
		width: 100%;
		border-radius: 2rpx;
	}
</style>
