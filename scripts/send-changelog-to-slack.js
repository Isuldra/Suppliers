#!/usr/bin/env node

/**
 * Send CHANGELOG to Slack
 *
 * This script parses the CHANGELOG.md file and sends the latest version entry
 * to Slack via webhook.
 *
 * Usage:
 *   node scripts/send-changelog-to-slack.js [version] [webhook-url]
 *
 * Environment Variables:
 *   SLACK_WEBHOOK_URL - Slack webhook URL (can also be passed as argument)
 *   SLACK_DISPLAY_NAME - Display name for the notification (optional)
 *
 * Examples:
 *   SLACK_WEBHOOK_URL=https://hooks.slack.com/... node scripts/send-changelog-to-slack.js
 *   node scripts/send-changelog-to-slack.js 1.3.8 https://hooks.slack.com/...
 */

import {
  parseChangelogVersion,
  getLatestChangelogEntry,
} from "./parse-changelog.js";

const args = process.argv.slice(2);
const version = args[0];
const webhookUrl = args[1] || process.env.SLACK_WEBHOOK_URL;
// For local usage, default to "Andreas" if not set
// For GitHub Actions, this will be set via SLACK_DISPLAY_NAME env var
const displayName = process.env.SLACK_DISPLAY_NAME || "Andreas";

/**
 * Send message to Slack
 */
async function sendToSlack(webhookUrl, message) {
  try {
    // Clean up webhook URL (remove duplicate prefixes)
    if (webhookUrl) {
      // Remove duplicate "https://hooks.slack.com/services/" prefix
      webhookUrl = webhookUrl.replace(
        /https:\/\/hooks\.slack\.com\/services\/https:\/\/hooks\.slack\.com\/services\//,
        "https://hooks.slack.com/services/"
      );
    }

    // Validate webhook URL (don't log the URL for security)
    if (!webhookUrl || !webhookUrl.startsWith("https://hooks.slack.com/")) {
      throw new Error("Invalid Slack webhook URL format");
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      // Don't expose webhook URL in error messages
      throw new Error(
        `Slack API error: ${response.status} ${response.statusText}${
          errorText ? ` - ${errorText.substring(0, 100)}` : ""
        }`
      );
    }

    const responseText = await response.text();
    if (responseText !== "ok") {
      throw new Error(`Slack API unexpected response: ${responseText}`);
    }

    return true;
  } catch (error) {
    console.error("Failed to send Slack notification:", error);
    throw error;
  }
}

/**
 * Format CHANGELOG entry for Slack
 */
function formatChangelogForSlack(entry, displayName) {
  const fallbackText = `📋 New Release: ${entry.version} - ${entry.title}`;

  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `📋 Release ${entry.version}`,
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${entry.title}*\n\n${entry.description}`,
      },
    },
  ];

  // Add metadata fields
  const fields = [];

  if (entry.completedDate) {
    fields.push({
      type: "mrkdwn",
      text: `*Completed:*\n${entry.completedDate}`,
    });
  }

  const timestamp = new Date().toLocaleString("no-NO", {
    dateStyle: "short",
    timeStyle: "short",
  });

  fields.push({
    type: "mrkdwn",
    text: `*Released:*\n${timestamp}`,
  });

  if (displayName) {
    fields.push({
      type: "mrkdwn",
      text: `*Released by:*\n${displayName}`,
    });
  }

  if (fields.length > 0) {
    blocks.push({
      type: "section",
      fields: fields.slice(0, 3), // Max 3 fields per section
    });
  }

  // Add key sections if available
  if (entry.sections && Object.keys(entry.sections).length > 0) {
    blocks.push({
      type: "divider",
    });

    // Add key sections (limit to first 3 to avoid too long messages)
    const sectionKeys = Object.keys(entry.sections).slice(0, 3);
    for (const sectionKey of sectionKeys) {
      let sectionContent = entry.sections[sectionKey];

      // Clean up markdown formatting for Slack
      sectionContent = sectionContent
        .replace(/^#{1,6}\s+/gm, "") // Remove markdown headers
        .replace(/\*\*(.+?)\*\*/g, "*$1*") // Convert **bold** to *bold*
        .replace(/`(.+?)`/g, "`$1`") // Keep code blocks
        .trim();

      // Truncate long sections to avoid message limits
      if (sectionContent.length > 1000) {
        sectionContent = sectionContent.substring(0, 1000) + "...";
      }

      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${sectionKey}*\n${sectionContent}`,
        },
      });
    }

    // If there are more sections, add a note
    if (Object.keys(entry.sections).length > 3) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `_...and ${
            Object.keys(entry.sections).length - 3
          } more sections. See full CHANGELOG for details._`,
        },
      });
    }
  }

  // Add divider and link to full CHANGELOG
  blocks.push({
    type: "divider",
  });

  blocks.push({
    type: "section",
    text: {
      type: "mrkdwn",
      text: `📖 <https://github.com/Isuldra/Suppliers/blob/main/docs/CHANGELOG.md|View full CHANGELOG on GitHub>`,
    },
  });

  return {
    text: fallbackText,
    blocks,
  };
}

/**
 * Main function
 */
async function main() {
  try {
    // Check if webhook URL is provided
    if (!webhookUrl) {
      console.error("❌ Error: Slack webhook URL is required");
      console.error("");
      console.error("Usage:");
      console.error(
        "  node scripts/send-changelog-to-slack.js [version] [webhook-url]"
      );
      console.error("");
      console.error("Environment Variables:");
      console.error("  SLACK_WEBHOOK_URL - Slack webhook URL");
      console.error("  SLACK_DISPLAY_NAME - Display name (optional)");
      console.error("");
      console.error("Examples:");
      console.error(
        "  SLACK_WEBHOOK_URL=https://hooks.slack.com/... node scripts/send-changelog-to-slack.js"
      );
      console.error(
        "  node scripts/send-changelog-to-slack.js 1.3.8 https://hooks.slack.com/..."
      );
      process.exit(1);
    }

    // Parse CHANGELOG
    console.log("📋 Parsing CHANGELOG...");
    let entry;

    if (version) {
      console.log(`   Looking for version ${version}...`);
      entry = await parseChangelogVersion(version);
      if (!entry) {
        console.error(`❌ Error: Version ${version} not found in CHANGELOG`);
        process.exit(1);
      }
    } else {
      console.log("   Getting latest version...");
      entry = await getLatestChangelogEntry();
      if (!entry) {
        console.error("❌ Error: No CHANGELOG entries found");
        process.exit(1);
      }
    }

    console.log(`✅ Found version ${entry.version}: ${entry.title}`);

    // Format for Slack
    console.log("📨 Formatting message for Slack...");
    const message = formatChangelogForSlack(entry, displayName);

    // Send to Slack
    console.log("🚀 Sending to Slack...");
    await sendToSlack(webhookUrl, message);

    console.log("✅ Successfully sent CHANGELOG to Slack!");
    console.log(`   Version: ${entry.version}`);
    console.log(`   Title: ${entry.title}`);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

// Run main function
main();
