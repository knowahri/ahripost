const format = (str) => {
    if (str) {
        let date = new Date(str)
        let M = date.getMonth() + 1
        let D = date.getDate()
        let H = date.getHours()
        let m = date.getMinutes()
        let s = date.getSeconds()
        let res = `${date.getFullYear()}-${M < 10 ? '0' : ''}${M}-${D < 10 ? '0' : ''}${D} ${H < 10 ? '0' : ''}${H}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`
        return res
    }
    return ''
}

export {
    format
}