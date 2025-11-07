/**
 * Slack Integration Service
 * Handles sending formatted notifications to Slack via Incoming Webhooks
 */

// Slack Block Kit types
interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
    emoji?: boolean;
  };
  elements?: unknown[];
  fields?: Array<{
    type: string;
    text: string;
    emoji?: boolean;
  }>;
  accessory?: unknown;
}

export interface SlackMessage {
  text: string; // Fallback text for notifications
  blocks?: SlackBlock[];
}

export interface BulkEmailNotificationData {
  displayName: string;
  userEmail: string;
  recipientCount: number;
  template: string;
  scheduled: string;
  successCount: number;
  failCount: number;
  failures?: Array<{ supplier: string; error: string }>;
}

export interface EmailErrorNotificationData {
  displayName: string;
  userEmail: string;
  supplier: string;
  error: string;
  timestamp: string;
}

export interface DeploymentNotificationData {
  version: string;
  displayName?: string;
  timestamp: string;
}

export interface ChangelogNotificationData {
  version: string;
  title: string;
  completedDate: string;
  description: string;
  sections?: Record<string, string>;
  displayName?: string;
  timestamp: string;
}

export class SlackService {
  /**
   * Send a message to Slack via webhook
   */
  static async sendMessage(
    webhookUrl: string,
    message: SlackMessage
  ): Promise<boolean> {
    try {
      // Validate webhook URL
      if (!webhookUrl || !webhookUrl.startsWith("https://hooks.slack.com/")) {
        console.error("Invalid Slack webhook URL");
        return false;
      }

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        console.error(
          `Slack API error: ${response.status} ${response.statusText}`
        );
        return false;
      }

      const responseText = await response.text();
      if (responseText !== "ok") {
        console.error(`Slack API unexpected response: ${responseText}`);
        return false;
      }

      console.log("Slack notification sent successfully");
      return true;
    } catch (error) {
      console.error("Failed to send Slack notification:", error);
      return false;
    }
  }

  /**
   * Format bulk email notification
   */
  static formatBulkEmailNotification(
    data: BulkEmailNotificationData
  ): SlackMessage {
    const successEmoji = data.successCount > 0 ? "✅" : "";
    const failEmoji = data.failCount > 0 ? "⚠️" : "";
    const fallbackText = `📧 Bulk Email Sent by ${data.displayName} (${data.userEmail}): ${data.successCount} sent, ${data.failCount} failed`;

    const blocks: SlackBlock[] = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "📧 Bulk Email Sent",
          emoji: true,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*User:*\n${data.displayName} (${data.userEmail})`,
            emoji: true,
          },
          {
            type: "mrkdwn",
            text: `*Recipients:*\n${data.recipientCount} suppliers`,
            emoji: true,
          },
          {
            type: "mrkdwn",
            text: `*Template:*\n${data.template}`,
            emoji: true,
          },
          {
            type: "mrkdwn",
            text: `*Scheduled:*\n${data.scheduled}`,
            emoji: true,
          },
        ],
      },
      {
        type: "divider",
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `${successEmoji} *Successfully sent:*\n${data.successCount}`,
            emoji: true,
          },
          {
            type: "mrkdwn",
            text: `${failEmoji} *Failed:*\n${data.failCount}${
              data.failCount > 0 ? " (see below)" : ""
            }`,
            emoji: true,
          },
        ],
      },
    ];

    // Add failure details if any
    if (data.failures && data.failures.length > 0) {
      const failureLines = data.failures
        .slice(0, 10) // Limit to 10 to avoid too long messages
        .map((f) => `• ${f.supplier}: ${f.error}`)
        .join("\n");

      blocks.push(
        {
          type: "divider",
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Failed emails:*\n${failureLines}${
              data.failures.length > 10
                ? `\n_...and ${data.failures.length - 10} more_`
                : ""
            }`,
          },
        }
      );
    }

    return {
      text: fallbackText,
      blocks,
    };
  }

  /**
   * Format email error notification
   */
  static formatEmailErrorNotification(
    data: EmailErrorNotificationData
  ): SlackMessage {
    const fallbackText = `❌ Email Error: Failed to send email to ${data.supplier} by ${data.displayName}`;

    const blocks: SlackBlock[] = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "❌ Email Sending Error",
          emoji: true,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*User:*\n${data.displayName} (${data.userEmail})`,
            emoji: true,
          },
          {
            type: "mrkdwn",
            text: `*Supplier:*\n${data.supplier}`,
            emoji: true,
          },
          {
            type: "mrkdwn",
            text: `*Time:*\n${data.timestamp}`,
            emoji: true,
          },
        ],
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Error:*\n\`\`\`${data.error}\`\`\``,
        },
      },
    ];

    return {
      text: fallbackText,
      blocks,
    };
  }

  /**
   * Format deployment/version update notification
   */
  static formatDeploymentNotification(
    data: DeploymentNotificationData
  ): SlackMessage {
    const fallbackText = `🚀 New Version Available: ${data.version}`;

    const blocks: SlackBlock[] = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "🚀 New Version Detected",
          emoji: true,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Version:*\n${data.version}`,
            emoji: true,
          },
          {
            type: "mrkdwn",
            text: `*Time:*\n${data.timestamp}`,
            emoji: true,
          },
        ],
      },
    ];

    // Add user info if available
    if (data.displayName) {
      blocks[1].fields?.push({
        type: "mrkdwn",
        text: `*Detected by:*\n${data.displayName}`,
        emoji: true,
      });
    }

    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: "A new version of Pulse is available. Users will be notified to update.",
      },
    });

    return {
      text: fallbackText,
      blocks,
    };
  }

  /**
   * Helper to get settings from localStorage
   */
  static getSettings(): {
    enabled: boolean;
    webhookUrl: string;
    displayName: string;
    userEmail: string;
  } | null {
    try {
      const savedSettings = localStorage.getItem("appSettings");
      if (!savedSettings) {
        return null;
      }

      const settings = JSON.parse(savedSettings);
      const user = settings.user || {};

      if (!user.slackNotificationsEnabled || !user.slackWebhookUrl) {
        return null;
      }

      return {
        enabled: user.slackNotificationsEnabled,
        webhookUrl: user.slackWebhookUrl,
        displayName: user.displayName || "Unknown User",
        userEmail: user.senderEmail || "",
      };
    } catch (error) {
      console.error("Failed to load Slack settings:", error);
      return null;
    }
  }

  /**
   * Send bulk email notification if enabled
   */
  static async sendBulkEmailNotification(
    data: Omit<BulkEmailNotificationData, "displayName" | "userEmail">
  ): Promise<void> {
    const settings = this.getSettings();
    if (!settings) {
      console.log("Slack notifications disabled or not configured");
      return;
    }

    const message = this.formatBulkEmailNotification({
      ...data,
      displayName: settings.displayName,
      userEmail: settings.userEmail,
    });

    await this.sendMessage(settings.webhookUrl, message);
  }

  /**
   * Send email error notification if enabled
   */
  static async sendEmailErrorNotification(
    data: Omit<EmailErrorNotificationData, "displayName" | "userEmail">
  ): Promise<void> {
    const settings = this.getSettings();
    if (!settings) {
      return;
    }

    const message = this.formatEmailErrorNotification({
      ...data,
      displayName: settings.displayName,
      userEmail: settings.userEmail,
    });

    await this.sendMessage(settings.webhookUrl, message);
  }

  /**
   * Send deployment notification if enabled
   */
  static async sendDeploymentNotification(
    data: Omit<DeploymentNotificationData, "displayName">
  ): Promise<void> {
    const settings = this.getSettings();
    if (!settings) {
      return;
    }

    const message = this.formatDeploymentNotification({
      ...data,
      displayName: settings.displayName,
    });

    await this.sendMessage(settings.webhookUrl, message);
  }

  /**
   * Format CHANGELOG notification for Slack
   */
  static formatChangelogNotification(
    data: ChangelogNotificationData
  ): SlackMessage {
    const fallbackText = `📋 New Release: ${data.version} - ${data.title}`;

    const blocks: SlackBlock[] = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `📋 Release ${data.version}`,
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${data.title}*\n\n${data.description}`,
        },
      },
    ];

    // Add metadata fields
    const fields: Array<{
      type: string;
      text: string;
      emoji?: boolean;
    }> = [];

    if (data.completedDate) {
      fields.push({
        type: "mrkdwn",
        text: `*Completed:*\n${data.completedDate}`,
      });
    }

    if (data.timestamp) {
      fields.push({
        type: "mrkdwn",
        text: `*Released:*\n${data.timestamp}`,
      });
    }

    if (data.displayName) {
      fields.push({
        type: "mrkdwn",
        text: `*Released by:*\n${data.displayName}`,
      });
    }

    if (fields.length > 0) {
      blocks.push({
        type: "section",
        fields: fields.slice(0, 3), // Max 3 fields per section
      });
    }

    // Add sections if available
    if (data.sections && Object.keys(data.sections).length > 0) {
      blocks.push({
        type: "divider",
      });

      // Add key sections (limit to first 3 to avoid too long messages)
      const sectionKeys = Object.keys(data.sections).slice(0, 3);
      for (const sectionKey of sectionKeys) {
        const sectionContent = data.sections[sectionKey];
        // Truncate long sections to avoid message limits
        const truncatedContent =
          sectionContent.length > 1000
            ? sectionContent.substring(0, 1000) + "..."
            : sectionContent;

        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${sectionKey}*\n${truncatedContent}`,
          },
        });
      }

      // If there are more sections, add a note
      if (Object.keys(data.sections).length > 3) {
        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `_...and ${
              Object.keys(data.sections).length - 3
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
   * Send CHANGELOG notification if enabled
   */
  static async sendChangelogNotification(
    data: Omit<ChangelogNotificationData, "displayName">
  ): Promise<void> {
    const settings = this.getSettings();
    if (!settings) {
      return;
    }

    const message = this.formatChangelogNotification({
      ...data,
      displayName: settings.displayName,
    });

    await this.sendMessage(settings.webhookUrl, message);
  }
}
