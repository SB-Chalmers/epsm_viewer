// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Sanjay Somanath
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export async function checkVersion(root) {
  const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
  const version = (await readFile(resolve(root, 'VERSION'), 'utf8')).trim();
  if (!version || version !== pkg.version) {
    throw new Error(`VERSION (${version}) must match package.json (${pkg.version}); update both deliberately.`);
  }
  const lock = JSON.parse(await readFile(resolve(root, 'package-lock.json'), 'utf8'));
  if (lock.version !== pkg.version || lock.packages?.['']?.version !== pkg.version) {
    throw new Error('package-lock.json must match package.json; refresh the lockfile before building.');
  }
  return version;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length && (args[0] !== '--root' || args.length !== 2)) {
    console.error('Usage: node scripts/check-version.mjs [--root directory]');
    process.exitCode = 1;
  } else {
    try {
      const root = args.length ? resolve(args[1]) : fileURLToPath(new URL('../', import.meta.url));
      console.log(`Viewer package versions agree: ${await checkVersion(root)}`);
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    }
  }
}
