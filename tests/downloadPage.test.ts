import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Redesigned Cloudflare download page', () => {
  it('retains all hooks used by release preparation', () => {
    const html = fs.readFileSync('docs/updates/index.html', 'utf8');
    expect(html.match(/class="release-version">v[\d.]+</g)?.length).toBeGreaterThan(0);
    expect(html.match(/class="release-date">[^<]+</g)?.length).toBeGreaterThan(0);
    for (const target of ['installer', 'portable']) {
      expect(html).toMatch(
        new RegExp(
          `id="download-${target}"[^>]*href="https://github.com/Isuldra/Suppliers/releases/download/`
        )
      );
    }
    expect(fs.existsSync('docs/updates/onemed-logo.png')).toBe(true);
  });
});
