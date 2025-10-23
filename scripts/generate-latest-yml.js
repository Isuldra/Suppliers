import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Få versjon fra package.json
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8")
);
const version = packageJson.version;

// 2. Finn den portable .exe-filen
const releaseDir = path.join(__dirname, "..", "release");
const files = fs.readdirSync(releaseDir);
const portableFile = files.find((f) => f.endsWith("Portable.exe"));

if (!portableFile) {
  console.error("Portable exe not found");
  process.exit(1);
}

const portablePath = path.join(releaseDir, portableFile);

// 3. Optimalisering: Les filen kun ÉN gang
const fileBuffer = fs.readFileSync(portablePath);

// 4. Kalkuler hash fra bufferet
const sha512 = crypto.createHash("sha512").update(fileBuffer).digest("base64");

// 5. Optimalisering: Få størrelsen fra bufferet, ikke fra et nytt disk-kall
const size = fileBuffer.length;

// 6. KORREKSJON: Fjernet 'path' og 'sha512' fra toppnivået
const latestYml = `version: ${version}
files:
  - url: ${portableFile}
    sha512: ${sha512}
    size: ${size}
releaseDate: '${new Date().toISOString()}'
`;

// 7. Skriv filen
fs.writeFileSync(path.join(releaseDir, "latest.yml"), latestYml);
console.log("latest.yml generated:", portableFile);
