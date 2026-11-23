/* Tadka for Mac: a thin window around the web app hosted on GitHub Pages.
   New features ship by pushing docs/ to GitHub; this shell rarely needs rebuilding. */
const {app,BrowserWindow,shell,Menu,ipcMain}=require("electron");
const path=require("path"),fs=require("fs");
const settingsFile=()=>path.join(app.getPath("userData"),"settings.json");
const readSettings=()=>{try{return JSON.parse(fs.readFileSync(settingsFile(),"utf8"))}catch(e){return {}}};
const writeSettings=s=>fs.writeFileSync(settingsFile(),JSON.stringify(s,null,2));
let win;
function appUrl(){const u=readSettings().url;return /^https:\/\/\S+/.test(u||"")?u:""}
function load(){const u=appUrl();if(u)win.loadURL(u);else win.loadFile(path.join(__dirname,"setup.html"),{query:{mode:"setup"}})}
function create(){
  win=new BrowserWindow({width:1320,height:880,minWidth:900,minHeight:600,title:"Tadka",backgroundColor:"#f7f3ee",
    webPreferences:{preload:path.join(__dirname,"preload.js"),contextIsolation:true,nodeIntegration:false,spellcheck:true}});
  const sameSite=url=>{const u=appUrl();try{return u&&new URL(url).origin===new URL(u).origin}catch(e){return false}};
  win.webContents.setWindowOpenHandler(({url})=>{
    if(url==="about:blank"||url.startsWith("blob:")||sameSite(url))return {action:"allow",overrideBrowserWindowOptions:{width:1000,height:800}};
    if(/^https?:/i.test(url))shell.openExternal(url);return {action:"deny"};
  });
  win.webContents.on("will-navigate",(e,url)=>{if(/^https?:/i.test(url)&&!sameSite(url)){e.preventDefault();shell.openExternal(url)}});
  win.webContents.on("did-fail-load",(e,code,desc,url,isMain)=>{if(isMain&&code!==-3)win.loadFile(path.join(__dirname,"setup.html"),{query:{mode:"offline",msg:desc}})});
  load();
}
ipcMain.handle("set-url",(_e,url)=>{url=String(url||"").trim();if(!/^https:\/\/\S+$/.test(url))return false;if(!url.endsWith("/"))url+="/";writeSettings({...readSettings(),url});load();return true});
ipcMain.handle("get-url",()=>appUrl());
ipcMain.handle("retry",()=>load());
app.setName("Tadka");
app.whenReady().then(()=>{
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {label:"Tadka",submenu:[{role:"about"},{type:"separator"},
      {label:"App Link…",click:()=>win&&win.loadFile(path.join(__dirname,"setup.html"),{query:{mode:"change"}})},
      {type:"separator"},{role:"hide"},{role:"hideOthers"},{role:"unhide"},{type:"separator"},{role:"quit"}]},
    {role:"fileMenu"},{role:"editMenu"},
    {label:"View",submenu:[{label:"Reload",accelerator:"CmdOrCtrl+R",click:()=>win&&win.webContents.reloadIgnoringCache()},{type:"separator"},{role:"resetZoom"},{role:"zoomIn"},{role:"zoomOut"},{type:"separator"},{role:"togglefullscreen"}]},
    {role:"windowMenu"}]));
  create();
  app.on("activate",()=>{if(!BrowserWindow.getAllWindows().length)create()});
});
app.on("window-all-closed",()=>{if(process.platform!=="darwin")app.quit()});
