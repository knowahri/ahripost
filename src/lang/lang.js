import zh_CN from "./zh_CN"
import en_US from "./en_US"

export default (lang = 'zh-CN') => {
    switch (lang) {
        case 'zh-CN':
            return zh_CN
        case 'en-US':
            return en_US
        default:
            return zh_CN
    }
}