import { ipcRenderer } from "electron";
import Handlebars from "handlebars";
import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";
import log from "electron-log";

// Register custom Handlebars helper for comparison
Handlebars.registerHelper("gt", (a: number, b: number) => a > b);

interface EmailData {
  supplier: string;
  orders: Array<{
    key: string;
    poNumber: string;
    orderQty: number;
    receivedQty: number;
    outstandingQty: number;
  }>;
}

export class EmailService {
  private template: Handlebars.TemplateDelegate;

  constructor() {
    const templatePath = path.join(__dirname, "emailTemplates", "reminder.hbs");
    const templateSource = fs.readFileSync(templatePath, "utf8");
    this.template = Handlebars.compile(templateSource);
  }

  async sendReminder(
    data: EmailData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Try MAPI first
      const mapiResult = await this.tryMAPI(data);
      if (mapiResult.success) {
        return mapiResult;
      }

      // Fallback to SMTP
      return await this.trySMTP(data);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      log.error("Email sending failed:", errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  private async tryMAPI(
    data: EmailData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const html = this.template(data);
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

      const html = this.template(data);
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
