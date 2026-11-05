const canIUseLogManage = wx.canIUse("getLogManager");
const logger = canIUseLogManage ? wx.getLogManager({ level: 1 }) : null;
var logGrade: number = 1;
var logEnable: boolean = true;

export function getLogger() {
    const log = {
        output: (level: string, ...args: any[]) => {
            switch (level) {
                case 'e':
                    loge(...args)
                    break
                case 'w':
                    logw(...args)
                    break
                case 'i':
                    logi(...args)
                    break
                case 'd':
                    logd(...args)
                    break
                default:
                    logv(...args)
                    break;
            }
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
function logv(...args: any[]) {
    if (logEnable && logGrade <= 1) {
        // console.log( ...args);
        if (canIUseLogManage && logger != null) {
            logger.log(...args);
        }
    }
}
function logd(...args: any[]) {
    if (logEnable && logGrade <= 2) {
        // console.debug( ...args);
        if (canIUseLogManage && logger != null) {
            logger.debug(...args);
        }
    }
}
function logi(...args: any[]) {
    if (logEnable && logGrade <= 3) {
        // console.info( ...args);
        if (canIUseLogManage && logger != null) {
            logger.info(...args);
        }
    }
}
function logw(...args: any[]) {
    if (logEnable && logGrade <= 4) {
        // console.warn( ...args);
        if (canIUseLogManage && logger != null) {
            logger.warn(...args);
        }
    }
}
function loge(...args: any[]) {
    if (logEnable && logGrade <= 5) {
        // console.error( ...args);
        if (canIUseLogManage && logger != null) {//LogManager没有error方法，只能用warn代替
            logger.warn(...args);
        }
    }
}