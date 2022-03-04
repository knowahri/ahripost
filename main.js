const { app, BrowserWindow, ipcMain, Menu, shell, dialog } = require("electron")
const path = require("path")
const Base64 = require("./ab")
const axios = require("axios")
const { autoUpdater } = require("electron-updater")
app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');
const template = [
    {
        label: '文件',
        submenu: [
            {
                label: '新建项目',
                accelerator: 'CmdOrCtrl+N',
                click: () => {
                    console.log(0)
                }
            },
            {
                type: 'separator'
            },
            {
                label: '退出',
                accelerator: 'Shift+CmdOrCtrl+Q',
                click: () => {
                    app.quit()
                }
            }
        ]
    }
]

let mainWindow
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1600,
        height: 900,
        icon: path.join(__dirname, "/icons/icon.png"),
        darkTheme: false,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: true,
            contextIsolation: false,
        },
    })

    mainWindow.loadURL("http://localhost:3000")
    // mainWindow.loadFile('dist/index.html')

    mainWindow.webContents.openDevTools()
}

// 在 Electron 结束初始化和创建浏览器窗口的时候调用
// 部分 API 在 ready 事件触发后才能使用
app.whenReady().then(() => {
    // const appMenu = Menu.buildFromTemplate(template);
    // Menu.setApplicationMenu(appMenu);

    createWindow()

    autoUpdater.updateConfigPath

    app.on("activate", () => {
        // 通常在 macOS 上，当点击 dock 中的应用程序图标时，如果没有其他打开的窗口，那么程序会重新创建一个窗口
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    });
});

// 除了 macOS 外，当所有窗口都被关闭的时候退出程序
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit()
});

// =========== 登录 ===========

ipcMain.on("login", (event, _) => {
    let express = require("express")
    let web = express()
    let port
    let server

    web.get("/", async function (req, res) {
        if (req.query.hasOwnProperty("code")) {
            let response = await axios.post(
                "http://auth.api.ahriknow.com/api/v1/sso/token",
                {
                    code: req.query.code,
                }
            )
            event.sender.send("login", response.data.data.token)
            res.redirect("/ok")
        } else {
            let back = Base64.encode(`http://127.0.0.1:${port}`)
            res.redirect(`https://auth.ahriknow.com/auth?returnUrl=${back}`)
        }
    })

    web.get("/ok", async function (_, res) {
        res.send("ok, you can close this page")
    })

    server = web.listen(0, function () {
        port = server.address().port
        shell.openExternal(`http://127.0.0.1:${port}`)
    })
})

// =========== 菜单 ===========

ipcMain.on("ipc-event", (event, context) => {
    switch (context.event) {
        case 'create-item':
            {
                let template = [];
                if (context.data.type == -1) {
                    template = [
                        {
                            label: "新建请求",
                            click: () => {
                                event.sender.send("ipc-event-catalog", {
                                    event: 'create-request',
                                    data: context.data._id
                                })
                            },
                        },
                        { type: "separator" },
                        {
                            label: "新建文件夹",
                            click: () => {
                                event.sender.send("ipc-event-catalog", {
                                    event: 'create-folder',
                                    data: context.data._id
                                })
                            },
                        },
                    ]
                }
                else if (context.data.type == 0) {
                    template = [
                        {
                            label: "新建请求",
                            click: () => {
                                event.sender.send("ipc-event-catalog", {
                                    event: 'create-request',
                                    data: context.data._id
                                })
                            },
                        },
                        { type: "separator" },
                        {
                            label: "新建文件夹",
                            click: () => {
                                event.sender.send("ipc-event-catalog", {
                                    event: 'create-folder',
                                    data: context.data._id
                                })
                            },
                        },
                        { type: "separator" },
                        {
                            label: "重命名",
                            click: () => {
                                event.sender.send("ipc-event-catalog", {
                                    event: 'rename',
                                    data: context.data._id
                                })
                            },
                        },
                        { type: "separator" },
                        {
                            label: "删除",
                            click: () => {
                                event.sender.send("ipc-event-catalog", {
                                    event: 'delete',
                                    data: context.data._id
                                })
                            },
                        },
                        {
                            label: "删除(远程)",
                            click: () => {
                                event.sender.send("ipc-event-catalog", {
                                    event: 'delete-remote',
                                    data: context.data._id
                                })
                            },
                        },
                    ]
                } else {
                    template = [
                        {
                            label: "重命名",
                            click: () => {
                                event.sender.send("ipc-event-catalog", {
                                    event: 'rename',
                                    data: context.data._id
                                })
                            },
                        },
                        { type: "separator" },
                        {
                            label: "删除",
                            click: () => {
                                event.sender.send("ipc-event-catalog", {
                                    event: 'delete',
                                    data: context.data._id
                                })
                            },
                        },
                        {
                            label: "删除(远程)",
                            click: () => {
                                event.sender.send("ipc-event-catalog", {
                                    event: 'delete-remote',
                                    data: context.data._id
                                })
                            },
                        },
                    ]
                }
                const menu = Menu.buildFromTemplate(template)
                menu.popup(BrowserWindow.fromWebContents(event.sender))
            }
            break
        case 'change':
            event.sender.send("ipc-event-catalog", {
                event: 'change',
                data: context.data
            })
            break
        case 'open-api':
            event.sender.send("ipc-event-api", {
                event: 'open-api',
                data: context.data
            })
            break
        case 'close-api':
            event.sender.send("ipc-event-api", {
                event: 'close-api',
                data: context.data
            })
            break
        case 'lang':
            event.sender.send("ipc-event-update", {
                event: 'lang',
                data: context.data
            })
            break

    }
})

// =========== 请求 ===========

const instance = axios.create();
instance.interceptors.response.use(function (response) {
    return response;
}, function (error) {
    return error.response;
});
ipcMain.on("request", (event, { path = '', method = 'GET', data = null, headers = {} }) => {
    try{
        instance({
            url: path,
            method: method,
            data: data,
            headers: headers
        }).then(res => {
            let data = {
                status: res.status,
                headers: res.headers,
                data: res.data
            }
            event.sender.send("response", data)
        }).catch(err => {
            event.sender.send("response", err)
        });
    } catch (err) {
        event.sender.send("response", err)
    }
});

// =========== 更新 ===========

ipcMain.on("update", (_, opera) => {
    if (opera == 0) {
        autoUpdater.checkForUpdates()
    } else if (opera == 1) {
        autoUpdater.downloadUpdate()
    } else if (opera == 2) {
        autoUpdater.quitAndInstall()
    }
});

autoUpdater.autoInstallOnAppQuit = false
autoUpdater.autoDownload = false
autoUpdater.setFeedURL('http://127.0.0.1:5500/build/')
autoUpdater.on('update-available', () => {
    mainWindow.webContents.send('update', {
        code: 1
    })
})
autoUpdater.on('update-not-available', () => {
    mainWindow.webContents.send('update', {
        code: 2
    })
})
autoUpdater.on('error', (_, err) => {
    mainWindow.webContents.send('update', {
        code: 5
    })
})
autoUpdater.on('download-progress', (_, progressObj) => {
    mainWindow.webContents.send('update', {
        code: 3
    })
})
autoUpdater.on('update-downloaded', () => {
    mainWindow.webContents.send('update', {
        code: 4
    })
});
