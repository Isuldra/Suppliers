#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import semver from "semver";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get project root directory
const projectRoot = path.resolve(__dirname, "..");

console.log("🔍 Validating version consistency...");

// Read package.json version
const packageJsonPath = path.join(projectRoot, "package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const packageVersion = packageJson.version;

console.log(`📦 Package.json version: ${packageVersion}`);

// Get latest git tag
let latestTag;
try {
  const output = execSync("git describe --tags --abbrev=0", {
    cwd: projectRoot,
    encoding: "utf8",
  });
  latestTag = output.trim();
} catch (error) {
  console.log("❌ No git tags found!");
  process.exit(1);
}

// Extract version from tag (remove 'v' prefix)
const tagVersion = latestTag.startsWith("v") ? latestTag.slice(1) : latestTag;

console.log(`🏷️  Latest git tag: ${latestTag} (version: ${tagVersion})`);

// Check if package.json version is higher than the latest tag
const isPackageNewer = semver.gt(packageVersion, tagVersion);
const isPackageOlder = semver.lt(packageVersion, tagVersion);
const isPackageEqual = semver.eq(packageVersion, tagVersion);

console.log("\n📊 Version Analysis:");

if (isPackageNewer) {
  console.log("⚠️  PACKAGE.JSON IS NEWER THAN LATEST GIT TAG!");
  console.log(`   Package: ${packageVersion}`);
  console.log(`   Latest tag: ${tagVersion}`);
  console.log("\n🚨 CRITICAL: You have unreleased changes!");
  console.log(
    "   This means you've updated package.json but haven't created a git tag."
  );
  console.log("\n📋 Required actions:");
  console.log("   1. Commit any pending changes");
  console.log(
    "   2. Create git tag: git tag -a v" +
      packageVersion +
      " -m 'Release v" +
      packageVersion +
      "'"
  );
  console.log("   3. Push tag: git push origin v" + packageVersion);
  console.log("   4. Build and deploy: npm run release:full");
  console.log("\n❌ DO NOT PROCEED WITH RELEASES UNTIL THIS IS FIXED!");
  process.exit(1);
} else if (isPackageOlder) {
  console.log("⚠️  PACKAGE.JSON IS OLDER THAN LATEST GIT TAG!");
  console.log(`   Package: ${packageVersion}`);
  console.log(`   Latest tag: ${tagVersion}`);
  console.log("\n📋 This usually means you need to sync:");
  console.log("   npm run version:sync");
  process.exit(1);
} else if (isPackageEqual) {
  console.log("✅ Version consistency OK!");
  console.log(
    `   Both package.json and git tag are at version ${packageVersion}`
  );

  // Additional check: ensure the tag exists on the current commit
  try {
    const currentCommit = execSync("git rev-parse HEAD", {
      cwd: projectRoot,
      encoding: "utf8",
    }).trim();

    const tagCommit = execSync(`git rev-parse ${latestTag}`, {
      cwd: projectRoot,
      encoding: "utf8",
    }).trim();

    if (currentCommit === tagCommit) {
      console.log("✅ Current commit matches the latest tag");
      console.log("🎉 Ready for release!");
    } else {
      console.log("⚠️  Current commit does not match the latest tag");
      console.log("   This means you have commits after the tag");
      console.log(
        "   Consider creating a new version if you want to release these changes"
      );
    }
  } catch (error) {
    console.log("⚠️  Could not verify tag commit");
  }
}

console.log("\n📋 Version validation complete!");
