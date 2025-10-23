import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Get version from package.json
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8")
);
const version = packageJson.version;

// 2. Find the NSIS installer .exe file
const releaseDir = path.join(__dirname, "..", "release");
const files = fs.readdirSync(releaseDir);
const nsisFile = files.find(
  (f) => f.endsWith(".exe") && !f.includes("Portable")
);

if (!nsisFile) {
  console.error("NSIS installer exe not found");
  process.exit(1);
}

const nsisPath = path.join(releaseDir, nsisFile);

// 3. Read file once for efficiency
const fileBuffer = fs.readFileSync(nsisPath);

// 4. Calculate hash from buffer
const sha512 = crypto.createHash("sha512").update(fileBuffer).digest("base64");

// 5. Get size from buffer
const size = fileBuffer.length;

// 6. Generate app-update.yml content
const appUpdateYml = `version: ${version}
files:
  - url: ${nsisFile}
    sha512: ${sha512}
    size: ${size}
path: ${nsisFile}
sha512: ${sha512}
releaseDate: '${new Date().toISOString()}'
`;

// 7. Write the file
fs.writeFileSync(path.join(releaseDir, "app-update.yml"), appUpdateYml);
console.log("app-update.yml generated for NSIS installer:", nsisFile);
