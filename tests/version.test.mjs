// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Sanjay Somanath
import assert from 'node:assert/strict';
import {copyFile, mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import test from 'node:test';

const checker = fileURLToPath(new URL('../scripts/check-version.mjs', import.meta.url));

async function fixture(t, version = '0.1.0') {
  const root = await mkdtemp(join(tmpdir(), 'epsm-viewer-version-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  await writeFile(join(root, 'package.json'), JSON.stringify({name: 'epsm_viewer', version}));
  await writeFile(join(root, 'package-lock.json'), JSON.stringify({version, packages: {'': {version}}}));
  await writeFile(join(root, 'VERSION'), version + '\n');
  return root;
}

test('package, lockfile and tracked Python version agree', async t => {
  const root = await fixture(t);
  const result = spawnSync(process.execPath, [checker, '--root', root], {encoding: 'utf8'});
  assert.equal(result.status, 0, result.stderr);
});

test('version mismatch fails without rewriting the selected Python version', async t => {
  const root = await fixture(t);
  await writeFile(join(root, 'VERSION'), '0.2.0\n');
  const result = spawnSync(process.execPath, [checker, '--root', root], {encoding: 'utf8'});
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /VERSION.*package\.json|package\.json.*VERSION/);
  assert.equal(await readFile(join(root, 'VERSION'), 'utf8'), '0.2.0\n');
});

test('a stale npm lockfile is rejected', async t => {
  const root = await fixture(t);
  await writeFile(join(root, 'package-lock.json'), JSON.stringify({version: '0.0.9', packages: {'': {version: '0.0.9'}}}));
  const result = spawnSync(process.execPath, [checker, '--root', root], {encoding: 'utf8'});
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /package-lock\.json/);
});

test('npm refuses to start a build when the versions differ', async t => {
  const root = await fixture(t);
  await mkdir(join(root, 'scripts'));
  await copyFile(checker, join(root, 'scripts/check-version.mjs'));
  const packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  packageJson.scripts = {
    prebuild: 'node scripts/check-version.mjs',
    build: 'node -e "require(\'fs\').writeFileSync(\'build-started\', \'yes\')"',
  };
  await writeFile(join(root, 'package.json'), JSON.stringify(packageJson));
  await writeFile(join(root, 'VERSION'), '9.9.9\n');
  const result = spawnSync('npm', ['run', 'build'], {cwd: root, encoding: 'utf8'});
  assert.notEqual(result.status, 0);
  await assert.rejects(readFile(join(root, 'build-started')), {code: 'ENOENT'});
});
