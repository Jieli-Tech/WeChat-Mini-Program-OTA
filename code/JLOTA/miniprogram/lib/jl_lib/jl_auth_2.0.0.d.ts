/* 杰理认证库 version 2.0 , Gitee: https://gitee.com/Jieli-Tech/WeChat-Mini-Program-OTA, Github: https://github.com/Jieli-Tech/WeChat-Mini-Program-OTA*/
declare class Auth {
    private authing;
    private authed;
    private authDeviceId;
    private timeoutTaskId;
    private authTime;
    private callback;
    constructor();
    startAuth(deviceId: string, callback: AuthListener): void;
    handlerAuth(deviceId: String, data: ArrayBuffer): void;
    private _writeAuthData;
    private _stopTimeoutTask;
    private _startTimeoutTask;
    private _onAuthSuccess;
    private _onAuthFailed;
}
declare function setLinkKey(newLinkKey: number[]): void;
interface AuthListener {
    onSendData: (deviceId: string, data: ArrayBuffer) => void;
    onAuthSuccess: (deviceId: string) => void;
    onAuthFailed: (deviceId: string) => void;
}

export { Auth, AuthListener, setLinkKey };
/* follow me on Github! */
