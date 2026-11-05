/**
 * 平台差异收敛层。
 *
 * 微信小程序里有一批能力在 uni-app 的其它端没有对应实现——基础库版本、系统设置、
 * 应用级授权、日志管理器、用户目录文件系统、从聊天记录选文件等。这些调用统一收在本模块，
 * 业务代码只依赖这里导出的函数，不再直接出现 wx.*，换端时只需要改这一个文件。
 *
 * 端判定一律用**运行时探测**，不要用 `// #ifdef` 条件编译：
 * 实测 HBuilderX 的 uni-app 编译器不会对 lib/ 下的 .ts 做条件编译预处理
 * （项目根目录的 main.js 会被正确处理，lib/platform.ts 不会），
 * 所有分支都会被原样编译进产物，靠 #ifdef 分支赋值会被后面的分支覆盖。
 */

import { compareVersion } from "../utils/util"

/** 归一化后的手机系统名 */
export type PlatformName = 'android' | 'ios' | 'ohos' | 'other'

/** 微信从基础库 2.20.1 起停止维护 getSystemInfoSync，改用 getSystemSetting / getDeviceInfo */
const WX_SDK_VERSION_2_20_1 = '2.20.1'

/** 用户私有目录下存放升级文件的子目录名 */
export const UPGRADE_FOLDER_NAME = 'upgrade'

/**
 * uni-app 编译期注入的平台标识，取值形如 mp-weixin / h5 / app / app-harmony。
 * 拿不到时返回空串，调用方需要退回能力探测。
 */
let cachedUniPlatform: string | undefined
export function getUniPlatform(): string {
    if (cachedUniPlatform === undefined) {
        cachedUniPlatform = ''
        try {
            const sysinfo = uni.getSystemInfoSync() || {}
            cachedUniPlatform = String(sysinfo.uniPlatform || '')
        } catch (e) {
            cachedUniPlatform = ''
        }
    }
    return cachedUniPlatform
}

/**
 * 是否运行在微信小程序端。
 * 优先看 uniPlatform；拿不到时退回能力探测——getFileSystemManager 只在微信小程序端存在。
 */
export function isMpWeixin(): boolean {
    const platform = getUniPlatform()
    if (platform !== '') {
        return platform === 'mp-weixin'
    }
    try {
        return typeof uni.getFileSystemManager === 'function'
    } catch (e) {
        return false
    }
}

/** 是否运行在 App 端（含鸿蒙） */
export function isApp(): boolean {
    const platform = getUniPlatform()
    if (platform !== '') {
        return platform === 'app' || platform === 'app-plus' || platform === 'app-harmony'
    }
    try {
        return typeof plus !== 'undefined' && !!plus
    } catch (e) {
        return false
    }
}

/** 是否运行在 H5 端 */
export function isH5(): boolean {
    const platform = getUniPlatform()
    if (platform !== '') {
        return platform === 'h5' || platform === 'web'
    }
    return false
}

/**
 * 取当前运行平台的手机系统名。
 * 各端的 uni.getSystemInfoSync() 都会返回 platform 字段，取值形如
 * android / ios / devtools / ohos，这里统一归一化成 PlatformName。
 */
export function getPlatform(): PlatformName {
    let raw = ''
    try {
        const sysinfo = uni.getSystemInfoSync() || {}
        raw = String(sysinfo.platform || '')
    } catch (e) {
        raw = ''
    }
    return normalizePlatform(raw)
}

/** 把各端的 platform 原始值归一化成 PlatformName */
export function normalizePlatform(raw: string): PlatformName {
    const value = String(raw || '').toLowerCase()
    if (value === 'android') {
        return 'android'
    }
    if (value === 'ios' || value === 'iphone' || value === 'ipad') {
        return 'ios'
    }
    if (value === 'ohos' || value === 'harmonyos') {
        return 'ohos'
    }
    return 'other'
}

/**
 * 取微信基础库版本。
 * 非微信端没有「基础库」概念，返回空串，调用方按 isSDKVersionAtLeast 的语义走新接口分支。
 */
export function getSDKVersion(): string {
    if (!isMpWeixin()) {
        return ''
    }
    try {
        if (typeof wx.getAppBaseInfo === 'function') {
            return String((wx.getAppBaseInfo() || {}).SDKVersion || '')
        }
        return String((wx.getSystemInfoSync() || {}).SDKVersion || '')
    } catch (e) {
        return ''
    }
}

/**
 * 判断当前微信基础库版本是否不低于 target。
 * 非微信端 getSDKVersion() 返回空串，这里固定返回 true，让调用方走新接口分支。
 */
export function isSDKVersionAtLeast(target: string): boolean {
    const version = getSDKVersion()
    if (version === '') {
        return true
    }
    return compareVersion(version, target) >= 0
}

/**
 * 系统蓝牙开关是否打开。
 * 微信端优先用 getSystemSetting（基础库 ≥ 2.20.1），低版本回退 getSystemInfoSync。
 * 其它端无法同步读取，返回 true 交由 getBluetoothAdapterState 兜底判断真实状态。
 */
export function getSystemBluetoothEnabled(): boolean {
    if (!isMpWeixin()) {
        return true
    }
    try {
        if (isSDKVersionAtLeast(WX_SDK_VERSION_2_20_1) && typeof wx.getSystemSetting === 'function') {
            return !!(wx.getSystemSetting() || {}).bluetoothEnabled
        }
        return !!(wx.getSystemInfoSync() || {}).bluetoothEnabled
    } catch (e) {
        return true
    }
}

/** 位置信息状态 */
export interface LocationSetting {
    /** 系统位置信息（GPS）是否打开 */
    locationEnabled: boolean
    /** 应用级定位授权是否已通过 */
    locationAuthorized: boolean
}

/**
 * 取位置信息状态。
 * 微信端优先用 getSystemSetting + getAppAuthorizeSetting（基础库 ≥ 2.20.1），
 * 低版本回退 getSystemInfoSync。其它端无法同步读取，返回全 true 交由 getLocation 兜底。
 */
export function getLocationSetting(): LocationSetting {
    const setting: LocationSetting = { locationEnabled: true, locationAuthorized: true }
    if (!isMpWeixin()) {
        return setting
    }
    try {
        if (isSDKVersionAtLeast(WX_SDK_VERSION_2_20_1) &&
            typeof wx.getSystemSetting === 'function' &&
            typeof wx.getAppAuthorizeSetting === 'function') {
            const sysinfo = wx.getSystemSetting() || {}
            const appAuthorizeSetting = wx.getAppAuthorizeSetting() || {}
            setting.locationEnabled = !!sysinfo.locationEnabled
            setting.locationAuthorized = appAuthorizeSetting.locationAuthorized === "authorized"
        } else {
            const sysinfo = wx.getSystemInfoSync() || {}
            setting.locationEnabled = !!sysinfo.locationEnabled
            setting.locationAuthorized = !!sysinfo.locationAuthorized
        }
    } catch (e) {
        setting.locationEnabled = true
        setting.locationAuthorized = true
    }
    return setting
}

/** 跳转系统设置/授权页这类 API 的通用回调选项 */
export interface SettingOption {
    success?: (...args: any[]) => void
    fail?: (...args: any[]) => void
}

/** 跳转到系统蓝牙设置页。仅 Android / 鸿蒙有意义，iOS 不支持 */
export function openSystemBluetoothSetting(option?: SettingOption) {
    if (isMpWeixin()) {
        try {
            if (typeof wx.openSystemBluetoothSetting === 'function') {
                wx.openSystemBluetoothSetting(option)
                return
            }
        } catch (e) {
            // 低版本基础库不支持，降级为提示用户手动打开
        }
    }
    option?.fail?.()
}

/** 跳转到应用权限管理页 */
export function openAppAuthorizeSetting(option?: SettingOption) {
    if (isMpWeixin()) {
        try {
            if (typeof wx.openAppAuthorizeSetting === 'function') {
                wx.openAppAuthorizeSetting(option)
                return
            }
        } catch (e) {
            // 低版本基础库不支持
        }
    }
    if (isApp()) {
        try {
            // App 端跳系统应用详情页
            const main = plus.android.runtimeMainActivity()
            const Intent = plus.android.importClass("android.content.Intent")
            const Settings = plus.android.importClass("android.provider.Settings")
            const Uri = plus.android.importClass("android.net.Uri")
            const intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
            intent.setData(Uri.fromParts("package", main.getPackageName(), null))
            main.startActivity(intent)
            option?.success?.()
            return
        } catch (e) {
            option?.fail?.()
            return
        }
    }
    option?.fail?.()
}

/**
 * 打开小程序开发调试。
 * 仅微信端有效，其它端不做任何事（App/H5 本来就能直接看控制台）。
 */
export function setEnableDebug(enable: boolean) {
    if (!isMpWeixin()) {
        return
    }
    try {
        if (typeof wx.setEnableDebug === 'function') {
            wx.setEnableDebug({ enableDebug: enable })
        }
    } catch (e) {
        // 调试开关失败不影响主流程
    }
}

/**
 * 取用户私有目录路径（用于存放升级文件）。
 *
 * 只有微信端有可写的私有目录（wx.env.USER_DATA_PATH）。App / H5 端的升级文件导入尚未实现，
 * 这里返回空串表示没有可用的私有目录，upgradeFileUtil 会退回直接使用源文件路径、跳过拷贝。
 */
export function getUserDataPath(): string {
    if (!isMpWeixin()) {
        return ''
    }
    try {
        return String((wx.env || {}).USER_DATA_PATH || '')
    } catch (e) {
        return ''
    }
}

/**
 * 取文件系统管理器。
 * 只有微信端有同步文件系统 API；其它端返回 null，调用方需要自行降级（见 upgradeFileUtil）。
 */
export function getFileSystemManager(): any {
    if (!isMpWeixin()) {
        return null
    }
    try {
        return wx.getFileSystemManager()
    } catch (e) {
        return null
    }
}

/**
 * 取微信日志管理器，用于把日志上报到小程序管理后台的「反馈管理」。
 * 非微信端返回 null，logger 会退化成只打 console。
 */
let appLogManager: any = null
let appLogManagerInited = false
export function getAppLogManager(): any {
    if (!appLogManagerInited) {
        appLogManagerInited = true
        if (isMpWeixin()) {
            try {
                if (typeof wx.canIUse === 'function' && wx.canIUse('getLogManager') &&
                    typeof wx.getLogManager === 'function') {
                    appLogManager = wx.getLogManager({ level: 1 })
                }
            } catch (e) {
                appLogManager = null
            }
        }
    }
    return appLogManager
}

/** 选中的升级文件 */
export interface PickedFile {
    /** 文件名 */
    name: string
    /** 文件路径 */
    path: string
    /** 文件字节数 */
    size: number
}

/**
 * 选择升级文件。
 * - 微信端：从聊天记录里选文件（wx.chooseMessageFile）
 * - H5 端：浏览器文件选择器（uni.chooseFile）
 * - App 端：没有等价的通用文件选择能力，reject 一个带提示文案的错误，由页面提示用户
 */
export function chooseUpgradeFile(count: number = 10): Promise<PickedFile[]> {
    return new Promise<PickedFile[]>((resolve, reject) => {
        if (isMpWeixin()) {
            try {
                wx.chooseMessageFile({
                    count: count,
                    type: 'file',
                    success: (res: any) => {
                        const files: PickedFile[] = (res.tempFiles || []).map((item: any) => ({
                            name: item.name,
                            path: item.path,
                            size: item.size
                        }))
                        resolve(files)
                    },
                    fail: (e: any) => {
                        reject(e)
                    }
                })
            } catch (e) {
                reject(e)
            }
            return
        }
        if (isH5()) {
            try {
                uni.chooseFile({
                    count: count,
                    type: 'file',
                    success: (res: any) => {
                        const tempFiles = res.tempFiles || []
                        const files: PickedFile[] = tempFiles.map((item: any) => ({
                            name: item.name,
                            path: item.path,
                            size: item.size
                        }))
                        resolve(files)
                    },
                    fail: (e: any) => {
                        reject(e)
                    }
                })
            } catch (e) {
                reject(e)
            }
            return
        }
        reject(new Error('当前平台暂不支持系统文件选择'))
    })
}

/**
 * 当前平台是否支持把文件转发到聊天。
 * 只有微信端有 wx.shareFileMessage，页面据此决定 ActionSheet 里要不要列出「转发」项。
 */
export function isShareFileSupported(): boolean {
    if (!isMpWeixin()) {
        return false
    }
    try {
        return typeof wx.shareFileMessage === 'function'
    } catch (e) {
        return false
    }
}

/**
 * 读取升级文件内容。
 * 微信端走同步文件系统；H5 端对 blob url 发 fetch；App 端暂无实现，会 reject。
 */
export function readFileAsUint8Array(filePath: string, fileSize: number): Promise<Uint8Array> {
    return new Promise<Uint8Array>((resolve, reject) => {
        if (isMpWeixin()) {
            try {
                const fs = getFileSystemManager()
                const fd = fs.openSync({ filePath: filePath })
                const uint8 = new Uint8Array(fileSize)
                fs.read({
                    fd: fd,
                    arrayBuffer: uint8.buffer,
                    length: fileSize,
                    success: () => {
                        fs.closeSync({ fd: fd })
                        resolve(uint8)
                    },
                    fail: () => {
                        fs.closeSync({ fd: fd })
                        reject(new Error('read file fail'))
                    }
                })
            } catch (error) {
                reject(error)
            }
            return
        }
        if (isH5()) {
            fetch(filePath).then(res => res.arrayBuffer()).then(buffer => {
                resolve(new Uint8Array(buffer))
            }).catch(reject)
            return
        }
        reject(new Error('当前平台暂不支持读取本地升级文件'))
    })
}

/**
 * 转发升级文件到聊天。仅微信端支持。
 * @returns 当前平台是否支持转发
 */
export function shareUpgradeFile(option: {
    filePath: string,
    fileName: string,
    success?: () => void,
    fail?: (message: string) => void
}): boolean {
    if (isMpWeixin()) {
        try {
            if (typeof wx.shareFileMessage === 'function') {
                wx.shareFileMessage({
                    filePath: option.filePath,
                    fileName: option.fileName,
                    success: () => option.success?.(),
                    fail: (res: any) => option.fail?.(String(res?.errMsg || res))
                })
                return true
            }
        } catch (e) {
            option.fail?.(String(e))
            return false
        }
    }
    option.fail?.('当前平台不支持转发文件')
    return false
}
