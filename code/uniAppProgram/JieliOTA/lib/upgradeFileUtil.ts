import { loge } from "./log"
import { getFileSystemManager, getUserDataPath, UPGRADE_FOLDER_NAME } from "./platform"

/**
 * 升级文件管理。
 *
 * 需要限制文件大小，升级文件全部最大只能是200MB。保存文件的时候可能会保存失败。
 *
 * 微信端把文件复制到用户私有目录并持久化列表；其它端没有同步文件系统 API，
 * 此时只维护内存列表（getFileSystemManager 返回 null 的分支），升级文件在应用重启后需要重新导入。
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
    /** 同步文件系统管理器。微信端有，其它端为 null */
    private readonly fs: any
    _upgradeFileInfoList = new Array<UpgradeFileInfo>()
    _listener?: UpgradeFileListener
    constructor() {
        const userDataPath = getUserDataPath()
        this.upgradeFolder = userDataPath === '' ? '' : userDataPath + "/" + UPGRADE_FOLDER_NAME + "/"
        this.fs = getFileSystemManager()
        if (this.fs != null && this.upgradeFolder !== '') {
            this.fs.access({
                path: this.upgradeFolder,
                success: () => {//文件夹存在
                },
                fail: () => {
                    try {
                        this.fs.mkdirSync(this.upgradeFolder)
                    } catch (error) {
                        //目录已存在（并发创建）时 mkdirSync 会抛错，忽略即可
                        loge("mkdirSync", error);
                    }
                }
            })
        }
        //读取缓存中的文件信息
        const cacheUpgradeFileInfos = uni.getStorageSync("UpgradeFileInfos")
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
                if (info.filePath && this.fs != null) {
                    try {
                        this.fs.unlinkSync(info.filePath)
                    } catch (error) {

                    }
                }
                continue
            }
        }

        this._onUpgradeFileInfoList(this._upgradeFileInfoList)
    }
    private _addUpgradeFile(fileName: string, time: number, fileSrcPath: string, destPath: string, fileSize: number) {
        return new Promise<UpgradeFileInfo>((resolve, reject) => {
            const upgradeFileInfo = new UpgradeFileInfo()
            upgradeFileInfo.fileName = fileName
            upgradeFileInfo.time = time
            upgradeFileInfo.filePath = destPath
            upgradeFileInfo.fileSize = fileSize
            if (this.fs == null) {
                //没有同步文件系统，直接引用源路径，不做拷贝
                resolve(upgradeFileInfo)
                return
            }
            this.fs.copyFile({
                srcPath: fileSrcPath,
                destPath: upgradeFileInfo.filePath,
                fail: (error: any) => {
                    loge("copyFile", error);
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
            for (let index = 0; index < infos.length; index++) {
                const info = infos[index];
                const time = (new Date()).getTime()
                const destPath = this._buildDestPath(time, index, info.fileSrcPath)
                try {
                    const result = await this._addUpgradeFile(info.fileName, time, info.fileSrcPath, destPath, info.fileSize)
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
            const time = (new Date()).getTime()
            const destPath = this._buildDestPath(time, 0, fileSrcPath)
            try {
                const info = await this._addUpgradeFile(fileName, time, fileSrcPath, destPath, fileSize)
                this._upgradeFileInfoList.push(info)
                this._onUpgradeFileInfoList(this._upgradeFileInfoList)
                resolve(true)
            } catch (error) {
                reject(error)
            }
        })
    }

    /** 没有私有目录时（H5 / App）直接沿用源路径，避免生成一个无法写入的假路径 */
    private _buildDestPath(time: number, index: number, fileSrcPath: string): string {
        if (this.upgradeFolder === '') {
            return fileSrcPath
        }
        return this.upgradeFolder + time + "_" + index
    }

    private _onUpgradeFileInfoList(infoList: UpgradeFileInfo[]): void {
        uni.setStorageSync("UpgradeFileInfos", infoList)
        this._listener?.onUpgradeFileInfoList(JSON.parse(JSON.stringify(infoList)))
    }
}
export var UpgradeFileUtil = new UpgradeFileManager()
