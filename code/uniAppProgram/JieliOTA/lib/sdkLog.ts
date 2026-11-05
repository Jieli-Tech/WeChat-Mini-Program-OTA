import { JL_OTA, JL_RCSP } from "./lib_rcsp"
import { getLogger } from "./logger"

/**
 * 把 V2.2 SDK 的 LogHub 输出桥接到 uni 工程现有的 5 级日志体系。
 *
 * - SDK 输出级别：d / i / w / e
 * - 应用日志级别：logv / logd / logi / logw / loge（LogGrade 1-5）
 * - 过滤统一由 lib/logger.ts 完成，这里只做级别映射。
 */
let inited = false

export function initSdkLog() {
    if (inited) return
    inited = true

    const logger = getLogger()
    const option = {
        output: (level: string, module: string, tag: string, message: string, ...args: any[]) => {
            const text = (module ? module + ":" : "") + tag + ": " + message
            switch (level) {
                case "e":
                    logger.loge(text, ...args)
                    break
                case "w":
                    logger.logw(text, ...args)
                    break
                case "i":
                    logger.logi(text, ...args)
                    break
                case "d":
                default:
                    logger.logd(text, ...args)
                    break
            }
        }
    }

    if (JL_OTA.OtaLog && typeof JL_OTA.OtaLog.setLogOption === "function") {
        JL_OTA.OtaLog.setLogOption(option)
    }
    if (JL_RCSP.RcspLog && typeof JL_RCSP.RcspLog.setLogOption === "function") {
        JL_RCSP.RcspLog.setLogOption(option)
    }
}
