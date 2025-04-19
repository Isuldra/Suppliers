const fs = require("fs");
const path = require("path");

const preloadPath = path.resolve(__dirname, "../dist/preload/index.cjs");

if (!fs.existsSync(preloadPath)) {
  console.error("[ERROR] Preload script missing: dist/preload/index.cjs");
  process.exit(1);
} else {
  console.log("[OK] Preload script present: dist/preload/index.cjs");
}
