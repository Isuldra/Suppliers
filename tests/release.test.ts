// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { prepareRelease } from '../scripts/prepare-cloudflare-release.js';
import { publishRelease } from '../scripts/create-github-release.js';
import { readReleaseArtifacts } from '../scripts/release-artifacts.js';
import { validateRelease } from '../scripts/validate-release.js';

let root: string;
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'pulse-release-test-'));
  fs.mkdirSync(path.join(root, 'release'));
  fs.mkdirSync(path.join(root, 'docs/updates'), { recursive: true });
  fs.writeFileSync(path.join(root, 'package.json'), '{"version":"2.0.0"}');
  fs.writeFileSync(path.join(root, 'release/Pulse-2.0.0-setup.exe'), 'installer bytes');
  fs.writeFileSync(path.join(root, 'release/Pulse-Portable.exe'), 'portable bytes');
  fs.writeFileSync(
    path.join(root, 'docs/updates/index.html'),
    [
      '<a id="download-installer" href="old">Installer</a>',
      '<a id="download-portable" href="old">Portable</a>',
      '<span class="release-version">v1.0.0</span>',
    ].join('\n')
  );
  fs.writeFileSync(
    path.join(root, 'docs/CHANGELOG.md'),
    '# Changes\n\n## Version 2.0.0: Import correction\n\n- Keep the correct warehouse.\n'
  );
  prepareRelease(root, new Date('2026-10-01T12:00:00Z'));
});
afterEach(() => {
  if (
    path.dirname(root) !== path.resolve(os.tmpdir()) ||
    !path.basename(root).startsWith('pulse-release-test-')
  ) {
    throw new Error('Unexpected test cleanup path');
  }
  fs.rmSync(root, { recursive: true, force: true });
});

function client() {
  return {
    rest: {
      repos: {
        getReleaseByTag: vi
          .fn()
          .mockResolvedValue({ data: { id: 5, html_url: 'https://example.invalid/release' } }),
        createRelease: vi
          .fn()
          .mockResolvedValue({ data: { id: 5, html_url: 'https://example.invalid/release' } }),
        listReleaseAssets: vi.fn(),
        deleteReleaseAsset: vi.fn().mockResolvedValue({}),
        uploadReleaseAsset: vi.fn().mockResolvedValue({}),
      },
    },
    paginate: vi.fn().mockResolvedValue([]),
  };
}
function releaseResponse() {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      draft: false,
      prerelease: false,
      assets: readReleaseArtifacts(root).assets.map((asset) => ({
        name: asset.name,
        size: asset.size,
        browser_download_url: asset.url,
      })),
    }),
  };
}

describe('release preparation and publication', () => {
  it('generates matching installer and portable hashes and updates the real download links', () => {
    const release = readReleaseArtifacts(root);
    const index = fs.readFileSync(path.join(root, 'docs/updates/index.html'), 'utf8');
    expect(index).toContain(release.installer.url);
    expect(index).toContain(release.portable.url);
    expect(index).toContain('v2.0.0');
    expect(
      fs.readdirSync(path.join(root, 'docs/updates')).some((file) => file.endsWith('.exe'))
    ).toBe(false);
  });

  it('rejects missing files before making any GitHub call', async () => {
    fs.unlinkSync(path.join(root, 'release/Pulse-Portable.exe'));
    const api = client();
    await expect(publishRelease({ root, client: api })).rejects.toThrow();
    expect(api.rest.repos.getReleaseByTag).not.toHaveBeenCalled();
    expect(api.rest.repos.deleteReleaseAsset).not.toHaveBeenCalled();
  });

  it('rejects stale installer metadata before making any GitHub call', async () => {
    fs.writeFileSync(path.join(root, 'release/Pulse-2.0.0-setup.exe'), 'changed installer');
    const api = client();
    await expect(publishRelease({ root, client: api })).rejects.toThrow('latest.yml');
    expect(api.rest.repos.getReleaseByTag).not.toHaveBeenCalled();
  });

  it('requires the portable binary before rewriting either manifest', () => {
    const original = fs.readFileSync(path.join(root, 'docs/updates/latest.yml'), 'utf8');
    fs.unlinkSync(path.join(root, 'release/Pulse-Portable.exe'));
    expect(() => prepareRelease(root)).toThrow();
    expect(fs.readFileSync(path.join(root, 'docs/updates/latest.yml'), 'utf8')).toBe(original);
  });

  it('replaces only managed assets and preserves additional release attachments', async () => {
    const api = client();
    api.paginate.mockResolvedValue([
      { id: 10, name: 'Pulse-2.0.0-setup.exe' },
      { id: 11, name: 'release-notes.pdf' },
      { id: 12, name: 'Pulse-2.0.0-setup.exe.blockmap' },
    ]);
    await publishRelease({ root, client: api });
    expect(api.rest.repos.deleteReleaseAsset.mock.calls.map(([args]) => args.asset_id)).toEqual([
      10, 12,
    ]);
    expect(api.rest.repos.uploadReleaseAsset.mock.calls.map(([args]) => args.name)).toEqual([
      'Pulse-2.0.0-setup.exe',
      'Pulse-Portable.exe',
      'latest.yml',
    ]);
  });

  it('uses the actual changelog and the built commit when creating a release', async () => {
    const api = client();
    api.rest.repos.getReleaseByTag.mockRejectedValue({ status: 404 });
    await publishRelease({ root, client: api, targetCommit: 'built-commit' });
    expect(api.rest.repos.createRelease).toHaveBeenCalledWith(
      expect.objectContaining({
        target_commitish: 'built-commit',
        body: expect.stringContaining('Keep the correct warehouse.'),
      })
    );
  });

  it('fails publication when upload fails', async () => {
    const api = client();
    api.rest.repos.uploadReleaseAsset.mockRejectedValue(new Error('upload failed'));
    await expect(publishRelease({ root, client: api })).rejects.toThrow('upload failed');
  });
});

describe('release validation', () => {
  it('rejects a GitHub asset with a different size', async () => {
    const response = releaseResponse();
    const data = await response.json();
    data.assets[0].size++;
    const fetchImpl = vi.fn().mockResolvedValue({ ...response, json: async () => data });
    await expect(validateRelease({ root, fetchImpl })).rejects.toThrow('GitHub asset');
  });

  it('rejects a published feed that still points to an older build', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(releaseResponse())
      .mockResolvedValueOnce({ ok: true, text: async () => 'version: 1.0.0' });
    await expect(validateRelease({ root, fetchImpl, published: true })).rejects.toThrow(
      'Published latest.yml'
    );
  });

  it('accepts matching assets and both published manifests', async () => {
    const release = readReleaseArtifacts(root);
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(releaseResponse())
      .mockResolvedValueOnce({ ok: true, text: async () => release.metadata })
      .mockResolvedValueOnce({ ok: true, json: async () => release.portableMetadata });
    await expect(validateRelease({ root, fetchImpl, published: true })).resolves.toBeUndefined();
  });
});
