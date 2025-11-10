#!/usr/bin/env node

/**
 * CHANGELOG Parser Utility
 * Extracts version entries from CHANGELOG.md
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Parse CHANGELOG.md and extract a specific version entry
 * @param {string} version - Version to extract (e.g., "1.3.8")
 * @returns {Promise<object|null>} Version entry object or null if not found
 */
export async function parseChangelogVersion(version) {
  try {
    const projectRoot = path.resolve(__dirname, '..');
    const changelogPath = path.join(projectRoot, 'docs', 'CHANGELOG.md');
    const changelogContent = await fs.readFile(changelogPath, 'utf8');

    // Find the section for this version
    const versionPattern = new RegExp(
      `## Version ${version.replace(/\./g, '\\.')}:([\\s\\S]*?)(?=## Version|$)`,
      'i'
    );
    const match = changelogContent.match(versionPattern);

    if (!match) {
      return null;
    }

    const versionContent = match[1].trim();

    // Extract title (first line after version header)
    const titleMatch = versionContent.match(/^([^\n]+)/);
    const title = titleMatch ? titleMatch[1].replace(/^_|_$/g, '').trim() : '';

    // Extract completion date
    const dateMatch = versionContent.match(/_Completed ([^_]+)_/);
    const completedDate = dateMatch ? dateMatch[1].trim() : '';

    // Extract main description (content after date, before first ###)
    const descriptionMatch = versionContent.match(/_Completed [^_]+_\s*([\s\S]*?)(?=###|$)/);
    const description = descriptionMatch
      ? descriptionMatch[1].trim()
      : versionContent.split('\n###')[0].trim();

    // Extract sections
    const sections = {};
    const sectionPattern = /### ([^\n]+)\n([\s\S]*?)(?=###|$)/g;
    let sectionMatch;
    while ((sectionMatch = sectionPattern.exec(versionContent)) !== null) {
      const sectionTitle = sectionMatch[1].trim();
      const sectionContent = sectionMatch[2].trim();
      sections[sectionTitle] = sectionContent;
    }

    return {
      version,
      title,
      completedDate,
      description,
      sections,
      fullContent: versionContent,
    };
  } catch (error) {
    console.error(`Error parsing CHANGELOG for version ${version}:`, error);
    return null;
  }
}

/**
 * Get the latest version entry from CHANGELOG
 * @returns {Promise<object|null>} Latest version entry or null
 */
export async function getLatestChangelogEntry() {
  try {
    const projectRoot = path.resolve(__dirname, '..');
    const changelogPath = path.join(projectRoot, 'docs', 'CHANGELOG.md');
    const changelogContent = await fs.readFile(changelogPath, 'utf8');

    // Find the first version entry
    const versionMatch = changelogContent.match(/^## Version ([^\s:]+):/m);
    if (!versionMatch) {
      return null;
    }

    const version = versionMatch[1];
    return await parseChangelogVersion(version);
  } catch (error) {
    console.error('Error getting latest CHANGELOG entry:', error);
    return null;
  }
}

// CLI usage - Check if this file is being run directly
const isMainModule =
  import.meta.url === `file://${process.argv[1]}` ||
  import.meta.url.endsWith(path.basename(process.argv[1]));

if (isMainModule || import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const version = args[0];

  if (!version) {
    // Get latest version
    getLatestChangelogEntry()
      .then((entry) => {
        if (entry) {
          console.log(JSON.stringify(entry, null, 2));
        } else {
          console.error('No CHANGELOG entry found');
          process.exit(1);
        }
      })
      .catch((error) => {
        console.error('Error:', error);
        process.exit(1);
      });
  } else {
    // Get specific version
    parseChangelogVersion(version)
      .then((entry) => {
        if (entry) {
          console.log(JSON.stringify(entry, null, 2));
        } else {
          console.error(`No CHANGELOG entry found for version ${version}`);
          process.exit(1);
        }
      })
      .catch((error) => {
        console.error('Error:', error);
        process.exit(1);
      });
  }
}
