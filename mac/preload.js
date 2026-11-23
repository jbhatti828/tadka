const {contextBridge,ipcRenderer}=require("electron");
contextBridge.exposeInMainWorld("cbsShell",{setUrl:u=>ipcRenderer.invoke("set-url",u),getUrl:()=>ipcRenderer.invoke("get-url"),retry:()=>ipcRenderer.invoke("retry")});
