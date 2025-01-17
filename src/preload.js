// Electron 主进程 与 渲染进程 交互的桥梁
const { contextBridge, ipcRenderer } = require("electron");


// 在window对象下导出只读对象
contextBridge.exposeInMainWorld("plugins_marketplace", {
    getConfig: () => ipcRenderer.invoke(
        "LiteLoader.plugins_marketplace.getConfig"
    ),
    setConfig: new_config => ipcRenderer.invoke(
        "LiteLoader.plugins_marketplace.setConfig",
        new_config
    ),
    install: info => ipcRenderer.invoke(
        "LiteLoader.plugins_marketplace.install",
        info
    ),
    uninstall: slug => ipcRenderer.invoke(
        "LiteLoader.plugins_marketplace.uninstall",
        slug
    ),
    update: (info, slug) => ipcRenderer.invoke(
        "LiteLoader.plugins_marketplace.update",
        info, slug
    ),
    restart: () => ipcRenderer.invoke(
        "LiteLoader.plugins_marketplace.restart"
    ),
    isOnline: () => ipcRenderer.invoke(
        "LiteLoader.plugins_marketplace.isOnline"
    )
});