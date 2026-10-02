// @vitest-environment node
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CancellationToken } from 'builder-util-runtime';
import { NsisUpdater } from 'electron-updater/out/NsisUpdater';
import { GenericProvider } from 'electron-updater/out/providers/GenericProvider';
import { ElectronHttpExecutor } from 'electron-updater/out/electronHttpExecutor';
import type { DownloadExecutorTask } from 'electron-updater/out/AppUpdater';

const installerName = 'Pulse-1.5.5-setup.exe';
const installerBytes = Buffer.from('isolated updater cache fixture; never an executable');
const sha512 = createHash('sha512').update(installerBytes).digest('base64');
let root: string;

// Keep the real updater's cache, rename, completion event, and failure cleanup.
// Only the application adapter and transfer of fixture bytes are substituted.
class CacheProbeUpdater extends NsisUpdater {
  constructor() {
    super(undefined, {
      version: '1.5.4',
      name: 'Pulse updater cache test',
      isPackaged: true,
      appUpdateConfigPath: path.join(root, 'app-update.yml'),
      userDataPath: root,
      baseCachePath: root,
      whenReady: async () => {},
      relaunch: () => {
        throw new Error('Tests must never relaunch an app');
      },
      quit: () => {
        throw new Error('Tests must never quit or install an app');
      },
      onQuit: () => {
        throw new Error('Tests must never register automatic installation');
      },
    });
    this.autoInstallOnAppQuit = false;
    this.logger = null;
  }

  downloadFixture(task: DownloadExecutorTask['task']) {
    const url = new URL(`https://example.invalid/${installerName}`);
    const fileInfo = { url, info: { url: url.href, sha512, size: installerBytes.length } };
    const info = {
      version: '1.5.5',
      releaseDate: '2026-10-02T00:00:00.000Z',
      path: installerName,
      sha512,
      files: [fileInfo.info],
    };
    const provider = new GenericProvider({ provider: 'generic', url: url.origin }, this, {
      platform: 'win32',
      isUseMultipleRangeRequest: false,
      executor: new ElectronHttpExecutor(),
    });
    return this.executeDownload({
      fileExtension: 'exe',
      fileInfo,
      downloadUpdateOptions: {
        updateInfoAndProvider: { info, provider },
        requestHeaders: {},
        cancellationToken: new CancellationToken(),
        disableDifferentialDownload: true,
      },
      task,
    });
  }
}

function barrier() {
  let release!: () => void;
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { wait, release };
}

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'pulse-updater-race-'));
  await fs.writeFile(path.join(root, 'app-update.yml'), 'updaterCacheDirName: cache\n');
});

afterEach(async () => {
  if (
    path.dirname(root) !== path.resolve(os.tmpdir()) ||
    !path.basename(root).startsWith('pulse-updater-race-')
  )
    throw new Error('Unexpected updater test cleanup path');
  const pending = path.join(root, 'cache', 'pending');
  for (const file of [
    path.join(root, 'app-update.yml'),
    path.join(pending, installerName),
    path.join(pending, `temp-${installerName}`),
    path.join(pending, 'update-info.json'),
  ]) {
    await fs.unlink(file).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }
  for (const directory of [pending, path.join(root, 'cache'), root]) {
    await fs.rmdir(directory).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }
});

it('reproduces two app instances deleting an installer already announced as downloaded', async () => {
  const first = new CacheProbeUpdater();
  const second = new CacheProbeUpdater();
  const downloaded = vi.fn();
  first.on('update-downloaded', downloaded);
  const firstWriting = barrier();
  const secondWriting = barrier();
  const finishFirst = barrier();
  const finishSecond = barrier();
  let firstDestination = '';
  let secondDestination = '';

  const firstDownload = first.downloadFixture(async (destination) => {
    firstDestination = destination;
    await fs.writeFile(destination, installerBytes);
    firstWriting.release();
    await finishFirst.wait;
  });
  await firstWriting.wait;
  const secondDownload = second.downloadFixture(async (destination) => {
    secondDestination = destination;
    await fs.writeFile(destination, installerBytes);
    secondWriting.release();
    await finishSecond.wait;
  });
  await secondWriting.wait;
  expect(secondDestination).toBe(firstDestination);

  finishFirst.release();
  const [installer] = await firstDownload;
  expect(downloaded).toHaveBeenCalledOnce();
  expect(await fs.readFile(installer)).toEqual(installerBytes);

  const failedDownload = expect(secondDownload).rejects.toMatchObject({ code: 'ENOENT' });
  finishSecond.release();
  await failedDownload;
  // The losing updater's cleanup removes the first updater's valid installer.
  await expect(fs.stat(installer)).rejects.toMatchObject({ code: 'ENOENT' });
});

it('preserves the validated installer when only one app owns the updater cache', async () => {
  const first = new CacheProbeUpdater();
  const [installer] = await first.downloadFixture(async (destination) => {
    await fs.writeFile(destination, installerBytes);
  });
  expect(await fs.readFile(installer)).toEqual(installerBytes);

  const nextLaunch = new CacheProbeUpdater();
  const downloaded = vi.fn();
  const transfer = vi.fn();
  nextLaunch.on('update-downloaded', downloaded);
  expect(await nextLaunch.downloadFixture(transfer)).toEqual([installer]);
  expect(transfer).not.toHaveBeenCalled();
  expect(downloaded).toHaveBeenCalledOnce();
  expect(await fs.readFile(installer)).toEqual(installerBytes);
});
