const fs = require("fs");
const path = require("path");

// List of expected locations for the native binary
const outputDirs = [
  path.join(
    __dirname,
    "../release/win-unpacked/resources/app.asar.unpacked/node_modules/better-sqlite3/build/Release/better-sqlite3.node"
  ),
  path.join(
    __dirname,
    "../release/win-unpacked/resources/app/node_modules/better-sqlite3/build/Release/better-sqlite3.node"
  ),
  path.join(
    __dirname,
    "../release/win-arm64-unpacked/resources/app.asar.unpacked/node_modules/better-sqlite3/build/Release/better-sqlite3.node"
  ),
  path.join(
    __dirname,
    "../release/win-arm64-unpacked/resources/app/node_modules/better-sqlite3/build/Release/better-sqlite3.node"
  ),
];

let found = false;
for (const file of outputDirs) {
  if (fs.existsSync(file)) {
    console.log(`✔ Found native module: ${file}`);
    found = true;
  }
}

if (!found) {
  console.error(
    "❌ ERROR: better-sqlite3.node not found in any expected output directory!"
  );
  process.exit(1);
} else {
  console.log("All required native modules are present.");
}
