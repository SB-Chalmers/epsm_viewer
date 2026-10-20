// SPDX-License-Identifier: MIT
import {build} from 'esbuild';
import {readFile, writeFile, mkdir, copyFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {checkVersion} from './check-version.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
await checkVersion(root);
const assets = root + 'python/epsm_viewer/assets/';
await mkdir(assets, {recursive: true});
const upstreamLicense = await readFile(root + 'node_modules/three/LICENSE', 'utf8');
const banner = '/* Three.js and OrbitControls license:\n' + upstreamLicense + '\n*/';
await build({entryPoints: [root + 'src/index.ts'], bundle: true, format: 'esm',
  outfile: root + 'dist/viewer.bundle.js', minify: true, banner: {js: banner}, target: 'es2022'});
for (const entry of ['browser', 'widget']) {
  await build({entryPoints: [root + `src/${entry}.ts`], bundle: true, format: 'esm',
    outfile: assets + `${entry}.js`, minify: true, banner: {js: banner}, target: 'es2022'});
}
const html = '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>EPSM Viewer</title><style>body{margin:0}</style><div id="viewer"></div><script type="module" src="./browser.js"></script></html>\n';
await writeFile(assets + 'index.html', html);
await copyFile(root + 'LICENSE', assets + 'LICENSE');
await writeFile(assets + 'THREE_LICENSE', upstreamLicense);
await copyFile(root + 'THIRD_PARTY_NOTICES.md', assets + 'THIRD_PARTY_NOTICES.md');
// Standalone assets are also usable from the npm tarball without Python.
await mkdir(root + 'dist/standalone', {recursive: true});
for (const name of ['browser.js', 'widget.js', 'index.html', 'LICENSE', 'THREE_LICENSE', 'THIRD_PARTY_NOTICES.md']) {
  await copyFile(assets + name, root + 'dist/standalone/' + name);
}
