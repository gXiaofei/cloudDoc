const {
    app,
    BrowserWindow,
    globalShortcut,
    Menu,
    ipcMain,
    dialog
} = require('electron');
const isDev = require('electron-is-dev');
const path = require('path');
const { autoUpdater, CancellationToken } = require('electron-updater');
const menuTemplate = require('./src/menuTemplate');
const AppWindow = require('./src/AppWindow');
const Store = require('electron-store');
const QiniuManager = require('./src/utils/QiniuManager');
const settingsStore = new Store({ name: 'Settings' });
const filesStore = new Store({ name: 'Files Data' });
let mainWindow, settingsWindow;

const createManager = () => {
    const accessKey = settingsStore.get('accessKey');
    const secretKey = settingsStore.get('secretKey');
    const bucketName = settingsStore.get('bucketName');
    return new QiniuManager(accessKey, secretKey, bucketName);
};
function createWindow() {
    const cancellationToken = new CancellationToken();
    if (isDev) {
        autoUpdater.updateConfigPath = path.join(
            __dirname,
            'dev-app-update.yml'
        );
    }

    autoUpdater.autoDownload = false;
    autoUpdater.checkForUpdates();
    autoUpdater.on('error', error => {
        dialog.showErrorBox(
            'Error: ',
            error == null ? 'unknown' : (error.stack || error).toString()
        );
    });
    autoUpdater.on('checking-for-update', () => {
        console.log('Checking for update...');
    });
    autoUpdater.on('update-available', () => {
        dialog.showMessageBox(
            {
                type: 'info',
                title: '应用有新的版本',
                message: '发现新版本，是否现在更新?',
                buttons: ['是', '否']
            },
            buttonIndex => {
                if (buttonIndex === 0) {
                    autoUpdater.downloadUpdate(cancellationToken);
                }
            }
        );
    });
    // 取消下载
    // cancellationToken.cancel()
    autoUpdater.on('update-not-available', () => {
        dialog.showMessageBox({
            title: '没有新版本',
            message: '当前已经是最新版本'
        });
    });
    autoUpdater.on('download-progress', progressObj => {
        let log_message = 'Download speed: ' + progressObj.bytesPerSecond;
        log_message =
            log_message + ' - Downloaded ' + progressObj.percent + '%';
        log_message =
            log_message +
            ' (' +
            progressObj.transferred +
            '/' +
            progressObj.total +
            ')';
        console.log(log_message);
    });
    autoUpdater.on('update-downloaded', () => {
        dialog.showMessageBox(
            {
                title: '安装更新',
                message: '更新下载完毕，应用将重启并进行安装'
            },
            () => {
                setImmediate(() => autoUpdater.quitAndInstall());
            }
        );
    });

    const mainWindowConfig = {
        width: 1200,
        height: 800
    };

    // and load the index.html of the app.
    // mainWindow.loadFile('index.html');

    const urlLocation = isDev
        ? 'http://localhost:3000'
        : `file://${path.join(__dirname, './index.html')}`;
    // mainWindow.loadURL(urlLocation);
    mainWindow = new AppWindow(mainWindowConfig, urlLocation);
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    let menu = new Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);

    ipcMain.on('open-settings-window', () => {
        const settingsWindowConfig = {
            width: 500,
            height: 400,
            parent: mainWindow
        };
        const settingsFileLocation = `file://${path.join(
            __dirname,
            './settings/settings.html'
        )}`;
        settingsWindow = new AppWindow(
            settingsWindowConfig,
            settingsFileLocation
        );
        settingsWindow.removeMenu();
        settingsWindow.on('closed', () => {
            settingsWindow = null;
        });
    });
    // 同步上传七牛云
    ipcMain.on('upload-file', (event, data) => {
        const manager = createManager();
        manager
            .uploadFile(data.key, data.path)
            .then(data => {
                console.log('上传成功', data);
                mainWindow.webContents.send('active-file-uploaded');
            })
            .catch(err => {
                dialog.showErrorBox('同步失败', '请检查七牛云同步不参数');
            });
    });
    ipcMain.on('download-file', (event, data) => {
        const manager = createManager();
        const filesObj = filesStore.get('files');
        const { key, path, id } = data;
        console.log(data);
        manager.getStat(key).then(
            resp => {
                console.log(filesObj[id]);
                const serverUpdatedTime = Math.round(resp.putTime / 10000);
                const locationUpdatedTime = filesObj[id].uploadedAt;
                console.log(serverUpdatedTime);
                console.log(locationUpdatedTime);
                if (
                    !locationUpdatedTime ||
                    serverUpdatedTime > locationUpdatedTime
                ) {
                    console.log('new file');
                    manager.downloadFile(key, path).then(() => {
                        mainWindow.webContents.send('file-downloaded', {
                            status: 'download-success',
                            id
                        });
                    });
                } else {
                    console.log('no new file');
                    mainWindow.webContents.send('file-downloaded', {
                        status: 'no-new-file',
                        id
                    });
                }
            },
            error => {
                console.log(error);
                if (error.statusCode === 612) {
                    mainWindow.webContents.send('file-downloaded', {
                        status: 'no-file',
                        id
                    });
                }
            }
        );
    });

    ipcMain.on('upload-all-to-qiniu', () => {
        mainWindow.webContents.send('loading-status', true);
        const manager = createManager();
        const filesObj = filesStore.get('files') || {};

        const uploadPromiseArr = Object.keys(filesObj).map(key => {
            const file = filesObj[key];
            return manager.uploadFile(`${file.title}.md`, file.path);
        });

        Promise.all(uploadPromiseArr)
            .then(res => {
                console.log(res);
                dialog.showMessageBox({
                    type: 'info',
                    title: `成功上传了${res.length}个文件`,
                    message: `成功上传了${res.length}个文件`
                });
                mainWindow.webContents.send('files-uploaded');
            })
            .catch(() => {
                dialog.showErrorBox('同步失败', '请检查七牛云同步不参数');
            })
            .finally(() => {
                mainWindow.webContents.send('loading-status', false);
            });
    });

    // 动态菜单
    ipcMain.on('config-is-saved', () => {
        // mac 和 window 位置不一样
        let qiniuMenu =
            process.platform === 'darwin' ? menu.items[3] : menu.items[2];
        const switchItems = toggle => {
            [1, 2, 3].forEach(number => {
                qiniuMenu.submenu.items[number].enabled = toggle;
            });
        };
        const qiniuConfiged = ['accessKey', 'secretKey', 'bucketName'].every(
            key => !!settingsStore.get(key)
        );
        if (qiniuConfiged) switchItems(true);
        else switchItems(false);
    });

    globalShortcut.register('Control+F12', () => {
        // Open the DevTools.
        mainWindow.webContents.openDevTools();
    });
}

app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function() {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function() {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
