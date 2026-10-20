// SPDX-License-Identifier: MIT
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve, extname} from 'node:path';
const root = resolve(import.meta.dirname, '..');
createServer(async (request, response) => {
  const path = resolve(root, '.' + new URL(request.url, 'http://localhost').pathname);
  if (!path.startsWith(root + '/') || !['/dist/', '/tests/'].some(prefix => path.slice(root.length).startsWith(prefix))) {
    response.writeHead(404).end(); return;
  }
  try {
    const body = await readFile(path);
    response.setHeader('Content-Type', {'.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json'}[extname(path)] ?? 'application/octet-stream');
    response.end(body);
  } catch {response.writeHead(404).end();}
}).listen(38137, '127.0.0.1');
