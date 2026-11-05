/**
 * uni-app 的宽松环境声明。
 *
 * 本项目没有 package.json，也就装不了 @dcloudio/types，这里给出最小可用的声明，
 * 让 IDE 不报「找不到名称 uni / getApp」。HBuilderX 编译时只转译不做类型检查，
 * 因此这些声明不影响产物。若后续需要完整的 uni API 类型提示，安装 @dcloudio/types
 * 并在 tsconfig.json 的 compilerOptions.types 里声明后，即可删除本文件。
 */

/** uni-app 统一 API，编译到各端时映射为对应平台的原生 API */
declare const uni: any

/** 微信小程序原生 API。仅 MP-WEIXIN 端存在，必须配合 #ifdef MP-WEIXIN 使用 */
declare const wx: any

/** HTML5+ 原生 API。仅 App 端存在，必须配合 #ifdef APP-PLUS 使用 */
declare const plus: any

/** 获取 App.vue 中定义的全局实例 */
declare const getApp: <T = any>() => T

/** 获取当前页面栈 */
declare const getCurrentPages: () => any[]

/** 条件编译区块（#ifdef / #ifndef / #endif）在编译前是普通注释，这里显式声明其用途 */
declare const __uniConfig: any
