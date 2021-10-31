const { app, BrowserWindow, ipcMain, Menu, shell } = require("electron");
const path = require("path");
const Base64 = require("./ab");
const axios = require("axios");

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1600,
        height: 900,
        icon: path.join(__dirname, "/icons/icon.png"),
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    // mainWindow.loadURL("http://localhost:3000");
    mainWindow.loadFile('dist/index.html')

    mainWindow.webContents.openDevTools();
}

// 在 Electron 结束初始化和创建浏览器窗口的时候调用
// 部分 API 在 ready 事件触发后才能使用
app.whenReady().then(() => {
    createWindow();

    app.on("activate", () => {
        // 通常在 macOS 上，当点击 dock 中的应用程序图标时，如果没有其他打开的窗口，那么程序会重新创建一个窗口
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

// 除了 macOS 外，当所有窗口都被关闭的时候退出程序
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});

//

ipcMain.on("login", (event, _) => {
    let express = require("express");
    let web = express();
    let port;
    let server;

    web.get("/", async function (req, res) {
        if (req.query.hasOwnProperty("code")) {
            let response = await axios.post(
                "https://api.auth.ahriknow.com/api/v1/sso/token",
                {
                    code: req.query.code,
                }
            );
            event.sender.send("login", response.data.data.token);
            res.redirect("/ok");
        } else {
            let back = Base64.encode(`http://127.0.0.1:${port}`);
            res.redirect(`https://auth.ahriknow.com/auth?returnUrl=${back}`);
        }
    });

    web.get("/ok", async function (_, res) {
        res.send("ok, you can close this page");
    });

    server = web.listen(0, function () {
        port = server.address().port;
        shell.openExternal(`http://127.0.0.1:${port}`);
    });
});

ipcMain.on("show-context-folder", (event, _id) => {
    const template = [
        {
            label: "新建请求",
            click: () => {
                event.sender.send("context-menu-create", _id);
            },
        },
        { type: "separator" },
        {
            label: "新建文件夹",
            click: () => {
                event.sender.send("context-menu-folder", _id);
            },
        },
        { type: "separator" },
        {
            label: "重命名",
            click: () => {
                event.sender.send("context-menu-rename", _id);
            },
        },
        { type: "separator" },
        {
            label: "删除",
            click: () => {
                event.sender.send("context-menu-delete", _id);
            },
        },
    ];
    const menu = Menu.buildFromTemplate(template);
    menu.popup(BrowserWindow.fromWebContents(event.sender));
});

ipcMain.on("show-context-request", (event, _id) => {
    const template = [
        {
            label: "删除",
            click: () => {
                event.sender.send("context-menu-delete", _id);
            },
        },
        { type: "separator" },
        {
            label: "重命名",
            click: () => {
                event.sender.send("context-menu-rename", _id);
            },
        },
    ];
    const menu = Menu.buildFromTemplate(template);
    menu.popup(BrowserWindow.fromWebContents(event.sender));
});

ipcMain.on("show-context-null", (event) => {
    const template = [
        {
            label: "新建请求",
            click: () => {
                event.sender.send("context-menu-create", 0);
            },
        },
        { type: "separator" },
        {
            label: "新建文件夹",
            click: () => {
                event.sender.send("context-menu-folder", 0);
            },
        },
    ];
    const menu = Menu.buildFromTemplate(template);
    menu.popup(BrowserWindow.fromWebContents(event.sender));
});
