// Script to generate icons from the OneMed logo for different platforms
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Convert file URL to path (ES Module compatibility)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths
const rootDir = path.join(__dirname, "..");
const resourcesDir = path.join(rootDir, "resources");
const sourceFile = path.join(
  rootDir,
  "OneMed part of Asker white text below.webp"
);

// Ensure the resources directory exists
if (!fs.existsSync(resourcesDir)) {
  fs.mkdirSync(resourcesDir, { recursive: true });
  console.log(`Created resources directory: ${resourcesDir}`);
}

// Check if sharp is installed
try {
  execSync("npm list sharp", { stdio: "ignore" });
} catch (error) {
  console.log("Sharp package not detected. Attempting to install...");
  try {
    execSync("npm install sharp --save-dev", { stdio: "inherit" });
    console.log("Sharp package installed successfully");
  } catch (installError) {
    console.error(
      "Failed to install Sharp. Please install it manually with: npm install sharp --save-dev"
    );
    process.exit(1);
  }
}

// Function to generate Windows ICO file
async function generateWindowsIcon() {
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const iconsPromises = sizes.map((size) => {
    return sharp(sourceFile)
      .resize(size, size)
      .png()
      .toBuffer()
      .then((data) => ({ size, data }));
  });

  // Wait for all resizing operations to complete
  const icons = await Promise.all(iconsPromises);

  // Write each PNG to a temporary file
  const tempFiles = [];
  for (const icon of icons) {
    const tempFile = path.join(resourcesDir, `temp-${icon.size}.png`);
    fs.writeFileSync(tempFile, icon.data);
    tempFiles.push(tempFile);
  }

  // Create ICO output path
  const icoOutput = path.join(resourcesDir, "icon.ico");

  // Use ImageMagick convert command if available, otherwise keep the PNG files
  try {
    console.log("Attempting to convert to ICO using ImageMagick...");
    const convertCmd = `convert ${tempFiles.join(" ")} ${icoOutput}`;
    execSync(convertCmd);
    console.log(`Windows icon created: ${icoOutput}`);

    // Clean up temp files
    tempFiles.forEach((file) => fs.unlinkSync(file));
  } catch (error) {
    console.log(
      "ImageMagick not found or error occurred. Keeping PNG files for manual conversion."
    );
    console.log(
      "Please install ImageMagick or manually convert the PNGs to ICO format."
    );

    // If convert fails, at least create a copy of the largest size as icon.png
    fs.copyFileSync(
      tempFiles[tempFiles.length - 1],
      path.join(resourcesDir, "icon.png")
    );
  }
}

// Function to generate macOS ICNS file
async function generateMacOSIcon() {
  const macIconSize = 1024;
  const pngOutput = path.join(resourcesDir, "icon.png");

  await sharp(sourceFile)
    .resize(macIconSize, macIconSize)
    .png()
    .toFile(pngOutput);

  console.log(`macOS PNG icon created: ${pngOutput}`);
  console.log("To convert to ICNS format, use iconutil on macOS:");
  console.log("1. Create a .iconset folder with icons of different sizes");
  console.log("2. Run: iconutil -c icns [iconset_folder]");
}

// Function to generate Linux PNG icons
async function generateLinuxIcons() {
  const linuxSizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024];

  // Generate a PNG file for each size
  const promises = linuxSizes.map((size) => {
    const output = path.join(resourcesDir, `icon-${size}.png`);
    return sharp(sourceFile)
      .resize(size, size)
      .png()
      .toFile(output)
      .then(() => console.log(`Linux icon ${size}x${size} created`));
  });

  await Promise.all(promises);
  console.log("Linux icons generated successfully");
}

// Function to generate installer sidebar image (for NSIS installer on Windows)
async function generateInstallerSidebar() {
  const sidebarWidth = 164;
  const sidebarHeight = 314;

  const sidebarOutput = path.join(resourcesDir, "sidebar.png");

  try {
    await sharp(sourceFile)
      .resize(sidebarWidth, sidebarHeight)
      .composite([
        {
          input: Buffer.from(`
          <svg width="${sidebarWidth}" height="${sidebarHeight}">
            <rect width="100%" height="100%" fill="#2D2D30"/>
          </svg>
        `),
          blend: "dest-in",
        },
      ])
      .png()
      .toFile(sidebarOutput);

    console.log(`Installer sidebar created: ${sidebarOutput}`);
  } catch (error) {
    console.log("Error creating sidebar, creating placeholder instead");

    // Create a placeholder sidebar with text
    const svgBuffer = Buffer.from(`
      <svg width="${sidebarWidth}" height="${sidebarHeight}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#2D2D30"/>
        <text x="50%" y="50%" font-family="Arial" font-size="20" fill="white" text-anchor="middle" dominant-baseline="middle">
          OneMed
        </text>
      </svg>
    `);

    await sharp(svgBuffer).png().toFile(sidebarOutput);

    console.log(`Placeholder sidebar created: ${sidebarOutput}`);
  }
}

// Generate all icons
async function generateAllIcons() {
  try {
    console.log("Generating icons from:", sourceFile);

    if (!fs.existsSync(sourceFile)) {
      throw new Error(`Source file not found: ${sourceFile}`);
    }

    await generateWindowsIcon();
    await generateMacOSIcon();
    await generateLinuxIcons();
    await generateInstallerSidebar();

    console.log("All icons generated successfully");
  } catch (error) {
    console.error("Error generating icons:", error.message);
    process.exit(1);
  }
}

// Run the script
generateAllIcons();
