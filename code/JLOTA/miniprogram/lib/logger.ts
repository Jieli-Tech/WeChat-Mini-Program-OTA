const canIUseLogManage = wx.canIUse("getLogManager");
const logger = canIUseLogManage ? wx.getLogManager({ level: 1 }) : null;
function formatLog(msg: string) {
    let date = new Date()
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hour = date.getHours()
    const minute = date.getMinutes()
    const second = date.getSeconds()
    const mill = date.getMilliseconds()
    let timeString = `${[year, month, day].map(formatNumber).join('/')} ${[hour, minute, second, mill].map(formatNumber).join(':')}`
    return timeString + ":" + "-->" + msg;
}
const formatNumber = (n: any) => {
    n = n.toString()
    return n[1] ? n : `0${n}`
}
var logGrade: number = 1;
var logEnable: boolean = false;

export function getLogger() {
    const log = {
        logv: (tag: string, ...args: any[]) => {
            logv(tag, ...args)
        },
        logd: (tag: string, ...args: any[]) => {
            logd(tag, ...args)
        },
        logi: (tag: string, ...args: any[]) => {
            logi(tag, ...args)
        },
        logw: (tag: string, ...args: any[]) => {
            logw(tag, ...args)
        },
        loge: (tag: string, ...args: any[]) => {
            loge(tag, ...args)
        },
    }
    return log
}
export function getLogGrade() {//设置的上传的等级限制
    return logGrade
}
export function setLogGrade(grade: number) {//设置的上传的等级限制
    logGrade = grade
}
export function getLogEnable() {//设置的上传的等级限制
    return logEnable
}
export function setLogEnable(enable: boolean) {//设置的上传的等级限制
    logEnable = enable
}
function logv(tag: string, ...args: any[]) {
    if (logEnable && logGrade <= 1) {
        console.log(formatLog(tag), ...args);
        if (canIUseLogManage && logger != null) {
            logger.log(tag, ...args);
        }
    }
}
function logd(tag: string, ...args: any[]) {
    if (logEnable && logGrade <= 2) {
        console.debug(formatLog(tag), ...args);
        if (canIUseLogManage && logger != null) {
            logger.debug(tag, ...args);
        }
    }
}
function logi(tag: string, ...args: any[]) {
    if (logEnable && logGrade <= 3) {
        console.info(formatLog(tag), ...args);
        if (canIUseLogManage && logger != null) {
            logger.info(tag, ...args);
        }
    }
}
function logw(tag: string, ...args: any[]) {
    if (logEnable && logGrade <= 4) {
        console.warn(formatLog(tag), ...args);
        if (canIUseLogManage && logger != null) {
            logger.warn(tag, ...args);
        }
    }
}
function loge(tag: string, ...args: any[]) {
    if (logEnable && logGrade <= 5) {
        console.error(formatLog(tag), ...args);
        if (canIUseLogManage && logger != null) {//LogManager没有error方法，只能用warn代替
            logger.warn(tag, ...args);
        }
    }
}