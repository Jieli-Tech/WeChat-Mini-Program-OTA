export function ab2hex(buffer) {
	const hexArr = Array.prototype.map.call(
		new Uint8Array(buffer),
		function (bit) {
			return ('00' + bit.toString(16)).slice(-2)
		}
	)
	return hexArr.join('')
}

export function hexToBytes(hex) {
	for (var bytes = [], c = 0; c < hex.length; c += 2)
		bytes.push(parseInt(hex.substr(c, 2), 16));
	return bytes;
}

/**
 * 弹出框封装
 */
export function toast(content, showCancel = false) {
	wx.showModal({
		title: '提示',
		content,
		showCancel
	});
}


//判断是否是否相等 
export function isDeviceEqual(device1, device2) {
	if (!device1 || !device2) {
		return false;
	}
	return device1.name == device2.name && device1.deviceId == device2.deviceId;
}







/**
 * 提示初始化蓝牙状态
 */
export function showBtStatusMsg(code, errMsg) {
	switch (code) {
		case 10000:
			toast('未初始化蓝牙适配器');
			break;
		case 10001:
			toast('未检测到蓝牙，请打开蓝牙重试！');
			break;
		case 10002:
			toast('没有找到指定设备');
			break;
		case 10003:
			toast('连接失败');
			break;
		case 10004:
			toast('没有找到指定服务');
			break;
		case 10005:
			toast('没有找到指定特征值');
			break;
		case 10006:
			toast('当前连接已断开');
			break;
		case 10007:
			toast('当前特征值不支持此操作');
			break;
		case 10008:
			toast('其余所有系统上报的异常');
			break;
		case 10009:
			toast('Android 系统特有，系统版本低于 4.3 不支持 BLE');
			break;
		default:
			toast(errMsg);
	}
}


/**
 * 将ltv数据转化为属性对象数组
 */
export function convertLtvDataToLtvObjArray(attrData) {
	let attrs = [];

	let pos = 0;
	let index = 0;
	for (let pos = 0; pos < attrData.length;) {
		let size = attrData[pos] & 0x00ff;
		let type = attrData[pos + 1]
		let data = attrData.slice(pos + 2, pos + size + 1);
		attrs[index++] = {
			size: size,
			type: type,
			data: data
		}
		pos = pos + size + 1;
	}
	return attrs;
}

export function bytesToInt(bytes) {
	if (bytes.length != 4) {
		return 0;
	}
	return (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];

}

export function byte2Int(h, l) {

	return ((h & 0xff) << 8) | l;

}

/**
 * 去掉重复设备
 */
export function removeRepeatDevice(device, cache) {
	if (device && device.name) {
		cache.forEach((d) => {
			if (d.name == device.name && d.deviceId == device.deviceId) {
				return null
			}
		})
		return device;
	}

	return null;
}

export function hex2Mac(buffer) {
  const hexArr = Array.prototype.map.call(
    new Uint8Array(buffer),
    function (bit) {
      return ('00' + bit.toString(16)).slice(-2)
    }
  )
  return hexArr.join(':')
}