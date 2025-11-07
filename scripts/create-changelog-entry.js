#!/usr/bin/env node

/**
 * Create CHANGELOG Entry Helper
 * 
 * This script helps create a new CHANGELOG entry with the correct date format.
 * 
 * Usage:
 *   node scripts/create-changelog-entry.js <version> "<title>"
 * 
 * Example:
 *   node scripts/create-changelog-entry.js 1.4.0 "New Feature Release"
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get current date in format "Month YYYY"
 */
function getCurrentDate() {
  const now = new Date();
  const month = now.toLocaleString("en-US", { month: "long" });
  const year = now.getFullYear();
  return `${month} ${year}`;
}

/**
 * Get current date in format "DD Month YYYY"
 */
function getCurrentFullDate() {
  const now = new Date();
  const day = now.getDate();
  const month = now.toLocaleString("en-US", { month: "long" });
  const year = now.getFullYear();
  return `${day} ${month} ${year}`;
}

async function createChangelogEntry(version, title) {
  try {
    const projectRoot = path.resolve(__dirname, "..");
    const changelogPath = path.join(projectRoot, "docs", "CHANGELOG.md");
    
    // Read current CHANGELOG
    const changelogContent = await fs.readFile(changelogPath, "utf8");
    
    // Get current date
    const completedDate = getCurrentDate();
    
    // Create new entry template
    const newEntry = `## Version ${version}: ${title}

_Completed ${completedDate}_

[Add description here]

### Key Features:

- [Feature 1]
- [Feature 2]

### Technical Implementation:

- [Implementation detail 1]
- [Implementation detail 2]

### Files Modified:

- [List modified files]

### Impact:

- [Impact description]

### Breaking Changes:

None - [Or describe breaking changes]

### Migration Notes:

No migration required - [Or describe migration steps]

---

`;

    // Insert new entry at the top (after the first line which is "# Documentation Changelog")
    const lines = changelogContent.split("\n");
    const newContent = [
      lines[0], // "# Documentation Changelog"
      "",
      newEntry,
      ...lines.slice(1),
    ].join("\n");

    // Write back to file
    await fs.writeFile(changelogPath, newContent, "utf8");
    
    console.log(`✅ Created CHANGELOG entry for version ${version}`);
    console.log(`   Title: ${title}`);
    console.log(`   Date: ${completedDate}`);
    console.log(`   File: ${changelogPath}`);
    console.log("");
    console.log("📝 Next steps:");
    console.log("   1. Edit the CHANGELOG entry to add details");
    console.log("   2. Fill in the [placeholder] sections");
    console.log("   3. Commit the changes");
  } catch (error) {
    console.error("❌ Error creating CHANGELOG entry:", error.message);
    process.exit(1);
  }
}

// Main
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error("❌ Error: Missing required arguments");
  console.error("");
  console.error("Usage:");
  console.error('  node scripts/create-changelog-entry.js <version> "<title>"');
  console.error("");
  console.error("Example:");
  console.error('  node scripts/create-changelog-entry.js 1.4.0 "New Feature Release"');
  process.exit(1);
}

const version = args[0];
const title = args[1];

if (!version || !title) {
  console.error("❌ Error: Version and title are required");
  process.exit(1);
}

createChangelogEntry(version, title);

