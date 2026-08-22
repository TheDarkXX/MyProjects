const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('path');
const { startServer } = require('./server'); // We will export this from server.js

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        title: 'LazyRead',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    // Start Express and load it
    startServer().then(port => {
        mainWindow.loadURL(`http://localhost:${port}`);
    }).catch(err => {
        console.error("Failed to start server", err);
        app.quit();
    });

    createMenu();
}

function createMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'Add Local Folder...',
                    click: async () => {
                        const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
                            properties: ['openDirectory']
                        });
                        if (!canceled && filePaths.length > 0) {
                            const folderPath = filePaths[0];
                            const folderName = path.basename(folderPath);
                            
                            // Send to renderer to add via API
                            mainWindow.webContents.executeJavaScript(`
                                (async () => {
                                    try {
                                        const res = await fetch('/api/config/add-folder', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ name: "${folderName.replace(/\\/g, '\\\\')}", path: "${folderPath.replace(/\\/g, '\\\\')}" })
                                        });
                                        if (res.ok) {
                                            if (typeof fetchSources !== 'undefined') {
                                                await fetchSources();
                                                document.getElementById('source-select').value = 'local-vault';
                                                selectSource('local-vault');
                                            }
                                        } else {
                                            alert("Failed to add folder");
                                        }
                                    } catch(e) { alert(e.message); }
                                })();
                            `);
                        }
                    }
                },
                { type: 'separator' },
                { role: 'quit' }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
    createWindow();
    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});
