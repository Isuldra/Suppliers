// Script to create Windows ICO file from existing PNG files
import fs from "fs";
import path from "path";
import pngToIco from "png-to-ico";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Convert file URL to path (ES Module compatibility)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths
const rootDir = path.join(__dirname, "..");
const resourcesDir = path.join(rootDir, "resources");
const icoOutput = path.join(resourcesDir, "icon.ico");

// PNG files to include in the ICO
const pngSizes = [16, 24, 32, 48, 64, 128, 256];
const pngFiles = pngSizes.map((size) =>
  path.join(resourcesDir, `icon-${size}.png`)
);

async function createWindowsIco() {
  try {
    // Verify all PNG files exist
    for (const file of pngFiles) {
      if (!fs.existsSync(file)) {
        console.error(`PNG file not found: ${file}`);
        console.error("Please run the generate-icons.js script first");
        process.exit(1);
      }
    }

    console.log("Creating Windows ICO file from PNG files...");

    // Convert PNGs to ICO
    const buf = await pngToIco(pngFiles);

    // Write ICO file
    fs.writeFileSync(icoOutput, buf);

    console.log(`Windows ICO file created successfully: ${icoOutput}`);
  } catch (error) {
    console.error("Error creating Windows ICO file:", error.message);
    process.exit(1);
  }
}

// Run the script
createWindowsIco();
