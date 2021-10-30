const { app, BrowserWindow } = require('electron')
const path = require('path')

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1366,
        height: 768,
        icon: path.join(__dirname, '/icons/icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    })

    // mainWindow.loadURL('http://localhost:3000')
    mainWindow.loadFile('dist/index.html')

    mainWindow.webContents.openDevTools()
}

// 在 Electron 结束初始化和创建浏览器窗口的时候调用
// 部分 API 在 ready 事件触发后才能使用
app.whenReady().then(() => {
    createWindow()

    app.on('activate', () => {
        // 通常在 macOS 上，当点击 dock 中的应用程序图标时，如果没有其他打开的窗口，那么程序会重新创建一个窗口
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

// 除了 macOS 外，当所有窗口都被关闭的时候退出程序
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})
