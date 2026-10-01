import os from 'node:os';
import path from 'node:path';

export function bunEnvironment(environment = process.env, homeDirectory = os.homedir()) {
  const pathKey =
    process.platform === 'win32'
      ? Object.keys(environment).find((key) => key.toLowerCase() === 'path') || 'PATH'
      : 'PATH';
  const bunBin = path.join(environment.BUN_INSTALL || path.join(homeDirectory, '.bun'), 'bin');
  return {
    ...environment,
    [pathKey]: [bunBin, environment[pathKey]].filter(Boolean).join(path.delimiter),
  };
}
