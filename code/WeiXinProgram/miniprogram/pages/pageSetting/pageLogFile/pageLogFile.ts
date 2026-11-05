// pages/set/pages/pageLogFile/pageLogFile.ts
Page({

    /**
     * 页面的初始数据
     */
    data: {
        logFileList: new Array()
    },
    logFilePath: wx.env.USER_DATA_PATH + "/" + "miniprogramLog",
    onLoad() {
        const fs = wx.getFileSystemManager()
        fs.stat({
            path: this.logFilePath,
            recursive: true,
            success: res => {
                // console.log(res.stats.isDirectory())
                console.log("res", res)
                const statsList = res.stats as Array<any>
                const logFileList = new Array()
                statsList.forEach(element => {
                    const path = element.path
                    const stats = element.stats as WechatMiniprogram.Stats
                    if (stats.isFile()) {
                        logFileList.push({
                            name: path,
                            fileSize: (stats.size / (1024 * 1024)).toFixed(2),
                            updateTime: this.formatTime(stats.lastModifiedTime)
                        })
                    }
                });
                logFileList.sort((a, b) => a.name.localeCompare(b.name))
                this.setData({ logFileList: logFileList })
            }
        })
    },
    formatTime(unixTimestamp: number) {
        // 创建一个 Date 对象
        const date = new Date(unixTimestamp * 1000); // UNIX 时间戳以毫秒为单位

        // 提取日期和时间的各个部分
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0'); // 月份从0开始，所以需要+1，并补零
        const day = String(date.getDate()).padStart(2, '0'); // 补零
        const hours = String(date.getHours()).padStart(2, '0'); // 补零
        const minutes = String(date.getMinutes()).padStart(2, '0'); // 补零
        const seconds = String(date.getSeconds()).padStart(2, '0'); // 补零

        // 格式化日期字符串
        const formattedDate = `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
        return formattedDate
    },
    onClickFile(e: WechatMiniprogram.CustomEvent) {
        const index = e.currentTarget.dataset.index
        const file = this.data.logFileList[index]
        const getFileName = (fullPath: string) => {
            return fullPath.substring(fullPath.lastIndexOf("/") + 1);
        };
        const rawName = getFileName(file.name);
        wx.showActionSheet({
            alertText:`Log日志文件: ${ rawName}`,
            itemList: ['转发Log日志文件到聊天'],
            success: (res) => {
                if (res.tapIndex === 0) {
                    wx.shareFileMessage({
                        filePath: this.logFilePath + "/" + rawName,
                        fileName:  rawName+".txt",
                        success: (res) => {
                            // wx.showToast({ title: "转发成功" })
                        }, fail: (res) => {
                            wx.showToast({ title: "转发失败,msg:" + res.errMsg })
                        }
                    })
                }
            }
        })
    }
})