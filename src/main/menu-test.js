// Dette er en enkel testfil for å sjekke menyhåndtering i Electron
const { app, BrowserWindow, Menu, dialog } = require("electron");
const path = require("path");

// Logg hvor vi er
console.log("Starting menu test...");
console.log("Process env:", process.env.NODE_ENV);
console.log("__dirname:", __dirname);

let mainWindow;

function createWindow() {
  console.log("Creating window...");

  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Opprett en enkel HTML-fil i minnet
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Menytest</title>
      </head>
      <body>
        <h1>Menytest</h1>
        <p>Sjekk om den tilpassede menyen vises i toppen av vinduet</p>
      </body>
    </html>
  `;

  mainWindow.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`
  );
  mainWindow.webContents.openDevTools();

  mainWindow.on("closed", function () {
    mainWindow = null;
  });
}

function createApplicationMenu() {
  console.log("Creating test menu...");

  const template = [
    {
      label: "Test Meny 1",
      submenu: [
        {
          label: "Test Handling 1",
          click: () => {
            dialog.showMessageBox({
              title: "Test 1",
              message: "Dette er en test",
              buttons: ["OK"],
            });
          },
        },
        { type: "separator" },
        { role: "quit", label: "Avslutt" },
      ],
    },
    {
      label: "Test Meny 2",
      submenu: [
        {
          label: "Test Handling 2",
          click: () => {
            dialog.showMessageBox({
              title: "Test 2",
              message: "Dette er en annen test",
              buttons: ["OK"],
            });
          },
        },
      ],
    },
  ];

  try {
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
    console.log("Menu set successfully!");
  } catch (error) {
    console.error("Failed to set menu:", error);
  }
}

app.on("ready", () => {
  console.log("App is ready, creating menu and window...");
  createApplicationMenu();
  createWindow();

  // Forsøk å opprette menyen igjen etter en forsinkelse
  setTimeout(() => {
    console.log("Trying to set menu again after delay...");
    createApplicationMenu();
  }, 1000);
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", function () {
  if (mainWindow === null) createWindow();
});

// Sett menyen også når appen er aktivert
app.on("activate", createApplicationMenu);
