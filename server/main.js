const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

let mainWindow;

app.on("ready", () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"), 
    },
  });

  mainWindow.loadURL("http://localhost:3000");
//개발 완료 후 아래로 변경
//mainWindow.loadFile(path.join(__dirname, "../client/build/index.html"));

});

ipcMain.handle("read-file", async (event, filePath) => {
  const fs = require("fs");
  try {
    const data = fs.readFileSync(filePath, "utf-8");
    return data;
  } catch (err) {
    console.error(err);
    throw err;
  }
});
