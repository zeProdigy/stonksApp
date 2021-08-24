const {contextBridge, ipcRenderer} = require('electron');


contextBridge.exposeInMainWorld(
    "ipc", {
        send: (channel, data) => {
            ipcRenderer.send(channel, data);
        },
        invoke: async (channel, data) => {
            return await ipcRenderer.invoke(channel, data);
        },
        receive: (channel, func) => {
            ipcRenderer.on(channel, (event, ...args) => func(...args));
        }
    }
);
