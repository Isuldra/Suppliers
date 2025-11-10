import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import crypto from "crypto";

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const releaseDir = path.join(__dirname, "..", "release");
const pagesDir = path.join(__dirname, "..", "docs", "updates");

// Create updates directory
if (!fs.existsSync(pagesDir)) {
  fs.mkdirSync(pagesDir, { recursive: true });
}

// Get version from package.json
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8")
);
const version = packageJson.version;

console.log(`🚀 Deploying version ${version} to GitHub Pages...`);

// Copy release files to pages directory
const files = fs.readdirSync(releaseDir);
const releaseFiles = files.filter(
  (f) => f.endsWith(".exe") || f.endsWith(".zip") || f.endsWith(".yml")
);

console.log(`📁 Found ${releaseFiles.length} release files:`);
releaseFiles.forEach((file) => {
  const src = path.join(releaseDir, file);
  const dest = path.join(pagesDir, file);
  fs.copyFileSync(src, dest);
  console.log(`  ✅ Copied ${file}`);
});

// Generate latest.json for auto-updater
const portableFile = releaseFiles.find((f) => f.includes("Portable"));
const nsisFile = releaseFiles.find(
  (f) => f.endsWith(".exe") && !f.includes("Portable")
);

if (portableFile) {
  const filePath = path.join(pagesDir, portableFile);
  const fileBuffer = fs.readFileSync(filePath);
  const sha512 = crypto
    .createHash("sha512")
    .update(fileBuffer)
    .digest("base64");
  const size = fileBuffer.length;

  const latestJson = {
    version: version,
    files: [
      {
        url: portableFile,
        sha512: sha512,
        size: size,
      },
    ],
    path: portableFile,
    sha512: sha512,
    releaseDate: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(pagesDir, "latest.json"),
    JSON.stringify(latestJson, null, 2)
  );
  console.log("✅ Generated latest.json for portable updates");
}

if (nsisFile) {
  const filePath = path.join(pagesDir, nsisFile);
  const fileBuffer = fs.readFileSync(filePath);
  const sha512 = crypto
    .createHash("sha512")
    .update(fileBuffer)
    .digest("base64");
  const size = fileBuffer.length;

  const appUpdateJson = {
    version: version,
    files: [
      {
        url: nsisFile,
        sha512: sha512,
        size: size,
      },
    ],
    path: nsisFile,
    sha512: sha512,
    releaseDate: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(pagesDir, "app-update.json"),
    JSON.stringify(appUpdateJson, null, 2)
  );
  console.log("✅ Generated app-update.json for NSIS updates");
}

// Create index.html for manual downloads
const indexHtml = `<!DOCTYPE html>
<html>
<head>
    <title>Pulse - Downloads</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .download { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .download a { color: #0066cc; text-decoration: none; font-weight: bold; }
        .download a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <h1>Pulse v${version}</h1>
    <p>Velg nedlastingsformat:</p>
    
    <div class="download">
        <h3>📦 Portable Version</h3>
        <p>Kjør direkte uten installasjon - anbefalt for testing</p>
        <a href="${portableFile}">Last ned Portable (.exe)</a>
    </div>
    
    <div class="download">
        <h3>🔧 NSIS Installer</h3>
        <p>Full installasjon med automatiske oppdateringer</p>
        <a href="${nsisFile}">Last ned Installer (.exe)</a>
    </div>
    
    <div class="download">
        <h3>📁 ZIP Archive</h3>
        <p>Arkiv med alle filer</p>
        <a href="${releaseFiles.find((f) =>
          f.endsWith(".zip")
        )}">Last ned ZIP</a>
    </div>
    
    <hr>
    <p><small>Automatiske oppdateringer: https://isuldra.github.io/Suppliers/</small></p>
</body>
</html>`;

fs.writeFileSync(path.join(pagesDir, "index.html"), indexHtml);
console.log("✅ Generated index.html for manual downloads");

console.log("\n🎉 GitHub Pages deployment ready!");
console.log("📝 Next steps:");
console.log("1. Commit and push the docs/updates/ directory");
console.log("2. Enable GitHub Pages in repository settings");
console.log(
  "3. Update auto-updater to use: https://isuldra.github.io/Suppliers/"
);
