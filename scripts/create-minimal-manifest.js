/**
 * Creates a minimal package.json manifest in the dist directory with essential fields
 * including the main entry point path, which is critical for electron-builder.
 */

import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");
const distDir = join(rootDir, "dist");

// Ensure dist directory exists
if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

// Create minimal package.json for electron-builder
const minimalPackageJson = {
  name: "one-med-supplychain-app",
  version: "1.1.7",
  main: "main/main.cjs",
  private: true,
};

// Create .npmrc for electron-builder to use prebuilt sharp binaries
const npmrcContent = `sharp_binary_host=https://github.com/lovell/sharp-libvips/releases/download
sharp_libvips_binary_host=https://github.com/lovell/sharp-libvips/releases/download
sharp_dist_base_url=https://github.com/lovell/sharp-libvips/releases/download
sharp_ignore_global_libvips=1
sharp_prebuild_platform=win32
sharp_prebuild_arch=x64
fund=false
legacy-peer-deps=true
shamefully-hoist=true`;

try {
  // Write minimal package.json
  writeFileSync(
    join(distDir, "package.json"),
    JSON.stringify(minimalPackageJson, null, 2)
  );
  console.log("✅ Created minimal package.json in dist/");

  // Write .npmrc for electron-builder
  writeFileSync(join(distDir, ".npmrc"), npmrcContent);
  console.log("✅ Created .npmrc in dist/ for electron-builder");
} catch (error) {
  console.error("❌ Error creating files:", error);
  process.exit(1);
}
