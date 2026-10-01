// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';
import { bunEnvironment } from '../scripts/bun-environment.js';

const directories: string[] = [];
afterEach(() => {
  for (const directory of directories.splice(0))
    fs.rmSync(directory, { recursive: true, force: true });
});

describe('Bun child process environment', () => {
  it.each([false, true])(
    'finds bun and bunx without ambient PATH entries (custom install: %s)',
    (custom) => {
      const home = fs.mkdtempSync(path.join(os.tmpdir(), 'pulse bun home '));
      directories.push(home);
      const install = path.join(home, custom ? 'custom bun' : '.bun');
      fs.mkdirSync(path.join(install, 'bin'), { recursive: true });
      for (const command of ['bun', 'bunx']) {
        const windows = process.platform === 'win32';
        fs.writeFileSync(
          path.join(install, 'bin', command + (windows ? '.cmd' : '')),
          windows ? `@echo ${command}-found\r\n` : `#!/bin/sh\necho ${command}-found\n`,
          { mode: 0o755 }
        );
      }
      const environment = Object.fromEntries(
        Object.entries(process.env).filter(
          ([key]) => key.toLowerCase() !== 'path' && key !== 'BUN_INSTALL'
        )
      );
      const pathKey = process.platform === 'win32' ? 'Path' : 'PATH';
      environment[pathKey] = path.join(home, 'unrelated');
      if (custom) environment.BUN_INSTALL = install;
      const childEnvironment = bunEnvironment(environment, home);
      for (const command of ['bun', 'bunx']) {
        expect(
          execSync(command + ' --version', { env: childEnvironment, encoding: 'utf8' }).trim()
        ).toBe(command + '-found');
      }
      expect(environment[pathKey]).toBe(path.join(home, 'unrelated'));
      expect(childEnvironment[pathKey].endsWith(path.delimiter + environment[pathKey])).toBe(true);
    }
  );
});
