#!/usr/bin/env node

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get project root directory
const projectRoot = path.resolve(__dirname, "..");
const releaseDir = path.join(projectRoot, "release");
const updatesDir = path.join(projectRoot, "docs", "updates");

// Read package.json to get current version
const packageJsonPath = path.join(projectRoot, "package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const version = packageJson.version;

console.log(`🚀 Preparing Cloudflare release for version ${version}...`);

// Ensure updates directory exists
if (!fs.existsSync(updatesDir)) {
  fs.mkdirSync(updatesDir, { recursive: true });
}

// Function to calculate SHA512 hash
function calculateSHA512(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hash = crypto.createHash("sha512");
  hash.update(fileBuffer);
  return hash.digest("base64");
}

// Function to get file size
function getFileSize(filePath) {
  const stats = fs.statSync(filePath);
  return stats.size;
}

// Function to copy file
function copyFile(source, destination) {
  const destDir = path.dirname(destination);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(source, destination);
  console.log(`✅ Copied: ${path.basename(source)}`);
}

// Find the latest NSIS installer
const nsisInstaller = `OneMed SupplyChain-${version}-setup.exe`;
const nsisInstallerPath = path.join(releaseDir, nsisInstaller);
const nsisBlockmap = `OneMed SupplyChain-${version}-setup.exe.blockmap`;
const nsisBlockmapPath = path.join(releaseDir, nsisBlockmap);

// Find portable executable
const portableExe = "OneMed SupplyChain-Portable.exe";
const portableExePath = path.join(releaseDir, portableExe);

// Check if files exist
const filesToCopy = [];
const filesToInclude = [];

if (fs.existsSync(nsisInstallerPath)) {
  filesToCopy.push({
    source: nsisInstallerPath,
    destination: path.join(updatesDir, nsisInstaller),
  });
  filesToInclude.push({
    name: nsisInstaller,
    path: nsisInstallerPath,
  });
  console.log(`✅ Found NSIS installer: ${nsisInstaller}`);
} else {
  console.log(`⚠️  NSIS installer not found: ${nsisInstaller}`);
}

if (fs.existsSync(nsisBlockmapPath)) {
  filesToCopy.push({
    source: nsisBlockmapPath,
    destination: path.join(updatesDir, nsisBlockmap),
  });
  console.log(`✅ Found NSIS blockmap: ${nsisBlockmap}`);
} else {
  console.log(`⚠️  NSIS blockmap not found: ${nsisBlockmap}`);
}

if (fs.existsSync(portableExePath)) {
  filesToCopy.push({
    source: portableExePath,
    destination: path.join(updatesDir, portableExe),
  });
  console.log(`✅ Found portable executable: ${portableExe}`);
} else {
  console.log(`⚠️  Portable executable not found: ${portableExe}`);
}

// Copy files to updates directory
console.log("\n📁 Copying files to docs/updates/...");
filesToCopy.forEach(({ source, destination }) => {
  copyFile(source, destination);
});

// Generate latest.yml for auto-updates
if (filesToInclude.length > 0) {
  console.log("\n📝 Generating latest.yml...");

  const mainFile = filesToInclude[0]; // Use the first file (NSIS installer) as main
  const fileHash = calculateSHA512(mainFile.path);
  const fileSize = getFileSize(mainFile.path);
  const releaseDate = new Date().toISOString();

  const latestYml = `version: ${version}
files:
  - url: ${mainFile.name}
    sha512: ${fileHash}
    size: ${fileSize}
path: ${mainFile.name}
sha512: ${fileHash}
releaseDate: '${releaseDate}'`;

  const latestYmlPath = path.join(updatesDir, "latest.yml");
  fs.writeFileSync(latestYmlPath, latestYml);
  console.log(`✅ Generated: latest.yml`);
}

// Update index.html with current version
console.log("\n📄 Updating index.html...");
const indexPath = path.join(updatesDir, "index.html");
let indexContent = fs.readFileSync(indexPath, "utf8");

// Update version in the HTML
indexContent = indexContent.replace(
  /<span class="version-badge">v[\d.]+<\/span>/,
  `<span class="version-badge">v${version}</span>`
);

// Update status message
indexContent = indexContent.replace(
  /<h3>✅ Cloudflare Pages er konfigurert!<\/h3>/,
  `<h3>✅ Release v${version} er klar!</h3>`
);

indexContent = indexContent.replace(
  /<p>Automatiske oppdateringer er nå tilgjengelige via Cloudflare Pages\.<\/p>/,
  `<p>Automatiske oppdateringer er nå tilgjengelige via Cloudflare Pages.</p>
                <p><strong>Ny versjon:</strong> v${version} - ${new Date().toLocaleDateString(
    "no-NO"
  )}</p>`
);

fs.writeFileSync(indexPath, indexContent);
console.log(`✅ Updated: index.html with version ${version}`);

// Ensure _redirects file exists
const redirectsPath = path.join(updatesDir, "_redirects");
if (!fs.existsSync(redirectsPath)) {
  const redirectsContent = `# Cloudflare Pages redirects
# Serve latest.yml for auto-updates
/latest.yml /latest.yml 200

# Serve all other files normally
/* /index.html 200`;

  fs.writeFileSync(redirectsPath, redirectsContent);
  console.log(`✅ Created: _redirects`);
}

console.log("\n🎉 Cloudflare release preparation complete!");
console.log("\n📋 Next steps:");
console.log("1. Review the files in docs/updates/");
console.log("2. Commit changes: git add docs/updates/");
console.log("3. Push to GitHub: git push origin main");
console.log("4. Cloudflare Pages will auto-deploy in 1-2 minutes");
console.log("5. Users will see update notifications automatically");

console.log("\n📁 Files ready for deployment:");
const deployedFiles = fs.readdirSync(updatesDir);
deployedFiles.forEach((file) => {
  const filePath = path.join(updatesDir, file);
  const stats = fs.statSync(filePath);
  const sizeKB = Math.round(stats.size / 1024);
  console.log(`   - ${file} (${sizeKB} KB)`);
});
