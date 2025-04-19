// ... existing code ...
// At the end of the file, after databaseService is defined and exported
// Add a dbPath property if not already present
if (typeof databaseService === "object" && !databaseService.dbPath) {
  const path = require("path");
  const { app } = require("electron");
  databaseService.dbPath = path.join(
    app.getPath("userData"),
    "supplier-reminder.db"
  );
}
// ... existing code ...
