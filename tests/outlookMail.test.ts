// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { psLiteral, sendViaOutlook } from '../src/main/outlookMail';

let tempDir: string;
const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pulse-mail-test-'));
});
afterEach(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

/** A PowerShell stand-in: records the script and the files it would read, then replies. */
function powershell(reply: (script: string) => { stdout?: string; code?: number; error?: Error }) {
  const runs: { script: string; files: Record<string, string> }[] = [];
  const spawn = vi.fn(() => {
    const child = Object.assign(new EventEmitter(), {
      stdout: new EventEmitter(),
      stderr: new EventEmitter(),
      stdin: {
        script: '',
        setDefaultEncoding: vi.fn(),
        write(chunk: string) {
          this.script += chunk;
        },
        end() {
          const script = this.script;
          const files = Object.fromEntries(
            [...script.matchAll(/ReadAllText\('([^']+)'/g)].map(([, file]) => [
              file,
              fs.readFileSync(file, 'utf8'),
            ])
          );
          runs.push({ script, files });
          const { stdout = '', code = 0, error } = reply(script);
          setTimeout(() => {
            if (error) return child.emit('error', error);
            child.stdout.emit('data', Buffer.from(stdout));
            child.emit('close', code);
          });
        },
      },
    });
    return child;
  });
  return { spawn: spawn as never, runs };
}

function send(payload: Partial<Parameters<typeof sendViaOutlook>[0]>, spawn: never) {
  return sendViaOutlook(
    { to: 'a@example.com', subject: 'Purring', html: '<p>Hei</p>', ...payload },
    {
      tempDir,
      lookupEmail: (supplier) => (supplier === 'Abena Norge AS' ? 'ordre@abena.no' : null),
      senderFor: () => 'supply.planning.no@onemed.com',
      log,
      spawn,
    }
  );
}

describe('sending through Outlook', () => {
  it('fills the MailItem from UTF-8 files and removes them after a successful send', async () => {
    const { spawn, runs } = powershell(() => ({ stdout: 'SUCCESS: Email sent\r\n' }));
    const result = await send(
      {
        to: 'a@example.com; b@example.com',
        subject: "Purring – O'Brien & Søn",
        html: '<p>Æøå</p>',
      },
      spawn
    );
    expect(result).toEqual({ success: true });
    const [{ script, files }] = runs;
    expect(script).toContain("$mail.To = 'a@example.com; b@example.com'");
    expect(script).toContain("$mail.SentOnBehalfOfName = 'supply.planning.no@onemed.com'");
    expect(Object.values(files).sort()).toEqual(['<p>Æøå</p>', "Purring – O'Brien & Søn"]);
    expect(script).not.toContain('Æøå');
    expect(fs.readdirSync(tempDir)).toEqual([]);
  });

  it('reports the Outlook error and still removes the files', async () => {
    const { spawn } = powershell(() => ({
      stdout: 'ERROR: Ugyldig bane eller URL-adresse.\r\nERROR_DETAILS: COMException\r\n',
    }));
    expect(await send({}, spawn)).toEqual({
      success: false,
      error: 'Sending via Outlook feilet: Ugyldig bane eller URL-adresse.',
    });
    expect(fs.readdirSync(tempDir)).toEqual([]);
  });

  it('fails when PowerShell cannot start, and removes the files', async () => {
    const { spawn } = powershell(() => ({ error: new Error('spawn powershell ENOENT') }));
    expect(await send({}, spawn)).toEqual({
      success: false,
      error: 'PowerShell prosess feil: spawn powershell ENOENT',
    });
    expect(fs.readdirSync(tempDir)).toEqual([]);
  });

  it('does not treat output without a success line as sent', async () => {
    const { spawn } = powershell(() => ({ stdout: '', code: 1 }));
    expect(await send({}, spawn)).toEqual({
      success: false,
      error: 'Sending via Outlook feilet: PowerShell failed. Code: 1. See logs.',
    });
  });

  it('looks up a supplier name, and never starts PowerShell without a valid recipient', async () => {
    const { spawn, runs } = powershell(() => ({ stdout: 'SUCCESS: Email sent' }));
    await send({ to: 'Abena Norge AS' }, spawn);
    expect(runs[0].script).toContain("$mail.To = 'ordre@abena.no'");
    const result = await send({ to: "x@example.com'; Remove-Item C:\\" }, spawn);
    expect(result.success).toBe(false);
    expect(runs).toHaveLength(1);
  });

  it('gives concurrent sends their own files', async () => {
    const { spawn, runs } = powershell(() => ({ stdout: 'SUCCESS: Email sent' }));
    await Promise.all([
      send({ subject: 'Første', html: '<p>1</p>' }, spawn),
      send({ subject: 'Andre', html: '<p>2</p>' }, spawn),
    ]);
    const paths = runs.flatMap((run) => Object.keys(run.files));
    expect(new Set(paths).size).toBe(4);
    expect(runs.map((run) => Object.values(run.files).sort())).toEqual([
      ['<p>1</p>', 'Første'],
      ['<p>2</p>', 'Andre'],
    ]);
  });

  it('escapes single quotes for PowerShell literals', () => {
    expect(psLiteral("O'Brien")).toBe("O''Brien");
  });
});
