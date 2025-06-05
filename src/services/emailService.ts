import { ipcRenderer } from "electron";
import {
  generateEmailContent,
  EmailData,
} from "../generated/emailTemplateCompiled";
import nodemailer from "nodemailer";
import log from "electron-log";

export class EmailService {
  async sendReminder(
    data: EmailData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Try automatic Outlook sending first (Windows only)
      const autoResult = await this.tryAutomaticOutlook(data);
      if (autoResult.success) {
        return autoResult;
      }

      // Fallback to MAPI (draft creation)
      const mapiResult = await this.tryMAPI(data);
      if (mapiResult.success) {
        return mapiResult;
      }

      // Final fallback to SMTP
      return await this.trySMTP(data);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      log.error("Email sending failed:", errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  private async tryAutomaticOutlook(
    data: EmailData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const html = generateEmailContent(data);
      const result = await ipcRenderer.invoke("sendEmailAutomatically", {
        to: data.supplier,
        subject: "Purring på manglende leveranser",
        html,
      });
      return result;
    } catch (error) {
      log.warn("Automatic Outlook failed, falling back:", error);
      return { success: false, error: "Automatic Outlook failed" };
    }
  }

  private async tryMAPI(
    data: EmailData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const html = generateEmailContent(data);
      const result = await ipcRenderer.invoke("sendEmail", {
        to: data.supplier,
        subject: "Purring på manglende leveranser",
        html,
      });
      return result;
    } catch (error) {
      log.warn("MAPI failed, falling back to SMTP:", error);
      return { success: false, error: "MAPI failed" };
    }
  }

  private async trySMTP(
    data: EmailData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const html = generateEmailContent(data);
      await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: data.supplier,
        subject: "Purring på manglende leveranser",
        html,
      });

      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "SMTP failed";
      log.error("SMTP fallback failed:", errorMessage);
      return { success: false, error: errorMessage };
    }
  }
}
