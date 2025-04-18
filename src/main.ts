import { app, BrowserWindow } from "electron";
import { fileURLToPath } from "url";
import path from "path";

// This ensures __dirname is correctly set in ES modules environment
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// This script is only used in the entry point
// The main Electron process is handled by src/main/main.ts
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload/index.js"),
    },
  });

  // In development, load from localhost
  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:3000");
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built index.html
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  // Prevent memory leaks by explicitly setting mainWindow to null when closed
  mainWindow.on("closed", () => {
    // This helps ensure resources are properly released
    // @ts-ignore
    mainWindow = null;
  });
}

// Wait for app to be ready before creating window
app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    // On macOS, recreate window when dock icon is clicked and no windows are open
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit the app when all windows are closed (except on macOS)
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
