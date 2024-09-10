import { loge } from "./log"

/**
 * 需要限制文件大小，升级文件全部最大只能是200MB。保存文件的时候可能会保存失败
*/
interface UpgradeFileListener {
    onUpgradeFileInfoList(infoList: UpgradeFileInfo[]): void
}
export class UpgradeFileInfo {
    fileName?: string
    time?: number
    filePath?: string
    fileSize?: number
}
class UpgradeFileManager {
    readonly upgradeFolder: string
    _upgradeFileInfoList = new Array<UpgradeFileInfo>()
    _listener?: UpgradeFileListener
    constructor() {
        this.upgradeFolder = wx.env.USER_DATA_PATH + "/" + "upgrade" + "/"
        const fs = wx.getFileSystemManager()
        fs.access({
            path: this.upgradeFolder,
            success: () => {//文件夹存在
            },
            fail: () => {
                fs.mkdirSync(this.upgradeFolder)
            }
        })
        //读取缓存中的文件信息
        const cacheUpgradeFileInfos = wx.getStorageSync("UpgradeFileInfos")
        if (cacheUpgradeFileInfos !== "") {
            this._upgradeFileInfoList = cacheUpgradeFileInfos
        }
    }
    setListener(listener?: UpgradeFileListener) {
        this._listener = listener
    }
    getUpgradeFileInfos() {
        return JSON.parse(JSON.stringify(this._upgradeFileInfoList))
    }
    removeUpgradeFile(info: UpgradeFileInfo) {
        for (let index = 0; index < this._upgradeFileInfoList.length; index++) {
            const element = this._upgradeFileInfoList[index];
            if (element.filePath === info.filePath) {
                this._upgradeFileInfoList.splice(index, 1)
                if (info.filePath) {
                    const fs = wx.getFileSystemManager()
                    try {
                        fs.unlinkSync(info.filePath)
                    } catch (error) {

                    }
                }
                continue
            }
        }

        this._onUpgradeFileInfoList(this._upgradeFileInfoList)
    }
    private _addUpgradeFile(fs: WechatMiniprogram.FileSystemManager, fileName: string, time: number, fileSrcPath: string, destPath: string, fileSize: number) {
        return new Promise<UpgradeFileInfo>((resolve, reject) => {
            const upgradeFileInfo = new UpgradeFileInfo()
            upgradeFileInfo.fileName = fileName
            upgradeFileInfo.time = time
            upgradeFileInfo.filePath = destPath
            upgradeFileInfo.fileSize = fileSize
            fs.copyFile({
                srcPath: fileSrcPath,
                destPath: upgradeFileInfo.filePath,
                fail: (error) => {
                    loge("copyFileSync", error);
                    if (error.errMsg === "copyFile:fail the maximum size of the file storage limit is exceeded") {//剩余空间不足
                        reject(1300202)
                    } else {
                        reject(-1)
                    }
                }, success: () => {
                    resolve(upgradeFileInfo)
                }
            })
        })
    }
    addUpgradeFiles(infos: { fileName: string, fileSrcPath: string, fileSize: number }[]) {
        return new Promise<boolean>(async (resolve, reject) => {
            const fs = wx.getFileSystemManager()
            for (let index = 0; index < infos.length; index++) {
                const info = infos[index];
                const time = (new Date()).getTime()
                const destPath = this.upgradeFolder + time + "_" + index
                try {
                    const result = await this._addUpgradeFile(fs, info.fileName, time, info.fileSrcPath, destPath, info.fileSize)
                    this._upgradeFileInfoList.push(result)
                } catch (error) {
                    this._onUpgradeFileInfoList(this._upgradeFileInfoList)
                    reject(error)
                    return
                }
            }
            this._onUpgradeFileInfoList(this._upgradeFileInfoList)
        })
    }
    addUpgradeFile(fileName: string, fileSrcPath: string, fileSize: number) {
        return new Promise<boolean>(async (resolve, reject) => {
            const fs = wx.getFileSystemManager()
            const time = (new Date()).getTime()
            const destPath = this.upgradeFolder + time + "_" + 0
            try {
                const info = await this._addUpgradeFile(fs, fileName, time, fileSrcPath, destPath, fileSize)
                this._upgradeFileInfoList.push(info)
                this._onUpgradeFileInfoList(this._upgradeFileInfoList)
                resolve(true)
            } catch (error) {
                reject(error)
            }
        })
    }

    private _onUpgradeFileInfoList(infoList: UpgradeFileInfo[]): void {
        wx.setStorageSync("UpgradeFileInfos", infoList)
        this._listener?.onUpgradeFileInfoList(JSON.parse(JSON.stringify(infoList)))
    }
}
export var UpgradeFileUtil = new UpgradeFileManager()
