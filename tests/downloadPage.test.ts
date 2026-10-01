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

  it('offers the same release as the published update feed', () => {
    const html = fs.readFileSync('docs/updates/index.html', 'utf8');
    const feed = fs.readFileSync('docs/updates/latest.yml', 'utf8');
    const portable = JSON.parse(fs.readFileSync('docs/updates/latest.json', 'utf8'));
    const version = feed.match(/^version: (.+)$/m)?.[1].trim();
    expect(html).toContain(`class="release-version">v${version}<`);
    expect(html).toMatch(
      new RegExp(`id="download-installer"[^>]*href="${feed.match(/- url: (\S+)/)?.[1]}"`)
    );
    expect(html).toMatch(new RegExp(`id="download-portable"[^>]*href="${portable.files[0].url}"`));
  });
});
