import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { spawn as spawnProcess } from 'child_process';
import { parseEmailRecipients } from '../utils/emailRecipients';

export type MailPayload = { to: string; subject: string; html: string; country?: string };
export type MailResult = { success: true } | { success: false; error: string };
type Logger = Record<'info' | 'warn' | 'error', (...args: unknown[]) => void>;

/**
 * Escape a value for embedding in a PowerShell *single-quoted* string literal.
 * Single-quoted PS strings do not perform variable or $(...) subexpression
 * expansion, so this is the only safe way to inline untrusted data. Callers
 * must wrap the result in single quotes themselves.
 */
export function psLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * Send one email through Outlook COM by filling a new MailItem directly. Loading a .eml with
 * Session.OpenSharedItem fails in current Outlook builds with "Ugyldig bane eller URL-adresse"
 * (0x80020009), so no .eml is used.
 */
export async function sendViaOutlook(
  payload: MailPayload,
  {
    tempDir,
    lookupEmail,
    senderFor,
    log,
    spawn = spawnProcess,
  }: {
    tempDir: string;
    lookupEmail: (supplier: string) => string | null | undefined;
    senderFor: (country?: string) => string;
    log: Logger;
    spawn?: typeof spawnProcess;
  }
): Promise<MailResult> {
  // Each send has its own files, so concurrent sends can never read each other's content.
  const id = randomUUID();
  const htmlPath = path.join(tempDir, `pulse-mail-${id}.html`);
  const subjectPath = path.join(tempDir, `pulse-subject-${id}.txt`);
  try {
    log.info(`Attempting automatic email send via Outlook COM to: ${payload.to}`);
    log.info(`Subject: ${payload.subject}`);

    // Use the provided email address directly if it contains @, otherwise look it up.
    const emailTo = payload.to.includes('@') ? payload.to : lookupEmail(payload.to) || payload.to;
    log.info(`Resolved email address: ${emailTo}`);

    // Accept the same bare-address lists as the review, rejecting header injection.
    const recipients = parseEmailRecipients(emailTo);
    if (!recipients) {
      log.warn(`No valid email address found for supplier: ${payload.to}`);
      return {
        success: false,
        error: `Ingen gyldig e-postadresse funnet for ${payload.to}. Sjekk leverandør e-post innstillinger.`,
      };
    }

    // HTML and subject go through UTF-8 files so Norwegian characters and quotes
    // never pass through the script text.
    fs.writeFileSync(htmlPath, payload.html, 'utf8');
    fs.writeFileSync(subjectPath, payload.subject, 'utf8');

    const script = `
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
try {
  $html = [System.IO.File]::ReadAllText('${psLiteral(htmlPath)}', [System.Text.Encoding]::UTF8)
  $subject = [System.IO.File]::ReadAllText('${psLiteral(subjectPath)}', [System.Text.Encoding]::UTF8).Trim()
  $outlook = New-Object -ComObject Outlook.Application
  $mail = $outlook.CreateItem(0)
  $mail.To = '${psLiteral(recipients.join('; '))}'
  $mail.Subject = $subject
  $mail.HTMLBody = $html
  $mail.SentOnBehalfOfName = '${psLiteral(senderFor(payload.country))}'
  $mail.Send()
  Write-Output "SUCCESS: Email sent"
} catch {
  Write-Output "ERROR: $($_.Exception.Message)"
  Write-Output "ERROR_DETAILS: $($_.Exception.ToString())"
}
`;

    return await new Promise<MailResult>((resolve) => {
      const child = spawn(
        'powershell',
        ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', '-'],
        {
          windowsHide: true,
          stdio: ['pipe', 'pipe', 'pipe'],
        }
      );
      let output = '';
      let errorOutput = '';
      if (!child.stdin) {
        log.error('PowerShell process stdin is not available.');
        resolve({ success: false, error: 'PowerShell stdin utilgjengelig.' });
        return;
      }
      child.stdin.setDefaultEncoding('utf-8');
      child.stdin.write(script + '\r\n', 'utf-8');
      child.stdin.end();
      child.stdout?.on('data', (data: Buffer) => {
        output += data.toString();
      });
      child.stderr?.on('data', (data: Buffer) => {
        errorOutput += data.toString();
      });
      child.on('close', (code: number | null) => {
        log.info(`PowerShell process exited with code: ${code}`);
        log.info(`PowerShell output:\n${output}`);
        if (errorOutput) log.warn(`PowerShell stderr:\n${errorOutput}`);
        if (/^SUCCESS:/m.test(output)) {
          log.info(`Email sent automatically via Outlook COM to: ${emailTo}`);
          resolve({ success: true });
          return;
        }
        const errorMsg =
          output.match(/ERROR:\s*(.*)/)?.[1]?.trim() ||
          `PowerShell failed. Code: ${code}. See logs.`;
        log.error('PowerShell automation via Outlook COM failed:', errorMsg, output, errorOutput);
        resolve({ success: false, error: `Sending via Outlook feilet: ${errorMsg}` });
      });
      child.on('error', (error: Error) => {
        log.error('PowerShell process failed to spawn or other error:', error);
        resolve({ success: false, error: `PowerShell prosess feil: ${error.message}` });
      });
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    log.error('Automatic email sending via Outlook COM error:', errorMessage);
    return { success: false, error: errorMessage };
  } finally {
    for (const file of [htmlPath, subjectPath]) {
      try {
        if (fs.existsSync(file)) fs.unlinkSync(file);
      } catch (cleanupError) {
        log.warn(`Failed to remove temporary mail file ${file}`, cleanupError);
      }
    }
  }
}
