#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CLI options
const args = process.argv.slice(2);
const skipViteBuild = args.includes('--skip-vite-build');

// Get project root directory
const projectRoot = path.resolve(__dirname, '..');
const distPath = path.join(projectRoot, 'dist');

console.log('🔨 Building with proper version handling...');

// Read current version from package.json
const packageJsonPath = path.join(projectRoot, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;

console.log(`📦 Building version: ${version}`);

// Clean build cache first (only when doing a full build)
// When --skip-vite-build is used, we want to preserve the existing dist directory
if (!skipViteBuild) {
  console.log('🧹 Cleaning build cache...');
  try {
    execSync('node scripts/clean-build-cache.js', {
      cwd: projectRoot,
      stdio: 'inherit',
    });
  } catch (error) {
    console.log('⚠️  Cache cleaning failed, continuing with build...');
  }
} else {
  console.log('⚡ Skipping cache clean (reusing existing dist)...');
}

// Ensure version is properly set in all relevant files
console.log('📝 Ensuring version consistency...');

// Update electron-builder configuration to use current version
const electronBuilderConfig = {
  ...packageJson.build,
  // Force version to be used from package.json
  extraMetadata: {
    version: version,
  },
};

// Write a temporary electron-builder config to ensure version is used
const tempConfigPath = path.join(projectRoot, 'electron-builder.temp.json');
fs.writeFileSync(tempConfigPath, JSON.stringify(electronBuilderConfig, null, 2));

function assertDistExists() {
  if (!fs.existsSync(distPath)) {
    console.error(
      '❌ Application directory "dist" does not exist. Run `npm run build` before packaging.'
    );
    process.exit(1);
  }
}

try {
  // First build the application unless already built (CI can opt-out)
  if (skipViteBuild) {
    console.log('⚙️  Skipping Vite build (dist already generated)...');
  } else {
    console.log('🏗️  Building application with vite...');
    execSync('npm run build', {
      cwd: projectRoot,
      stdio: 'inherit',
    });
  }

  assertDistExists();

  console.log('📦 Creating minimal manifest...');
  execSync('npm run create-minimal-manifest', {
    cwd: projectRoot,
    stdio: 'inherit',
  });

  assertDistExists();

  // Then build with electron-builder
  console.log('🏗️  Building with electron-builder...');
  execSync(`npx electron-builder --config electron-builder.temp.json --win --publish never`, {
    cwd: projectRoot,
    stdio: 'inherit',
  });

  console.log('✅ Build completed successfully!');
  console.log(`📦 Version ${version} built and ready for deployment`);

  // Show what was built
  const releaseDir = path.join(projectRoot, 'release');
  if (fs.existsSync(releaseDir)) {
    console.log('\n📁 Built files:');
    const files = fs.readdirSync(releaseDir);
    files
      .filter((file) => file.includes(version) || file.endsWith('.exe'))
      .forEach((file) => {
        const filePath = path.join(releaseDir, file);
        const stats = fs.statSync(filePath);
        const sizeMB = Math.round(stats.size / (1024 * 1024));
        console.log(`   - ${file} (${sizeMB} MB)`);
      });
  }
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
} finally {
  // Clean up temporary config
  if (fs.existsSync(tempConfigPath)) {
    fs.unlinkSync(tempConfigPath);
  }
}

console.log('\n📋 Next steps:');
console.log("1. Run 'npm run release:prepare' to prepare for Cloudflare deployment");
console.log('2. Commit and push changes to trigger auto-deployment');
