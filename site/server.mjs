import { createServer } from 'node:http';
import { readFile, stat, realpath } from 'node:fs/promises';
import { dirname, resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';
import { parseLocation } from './dist/core.js';

const here = dirname(fileURLToPath(import.meta.url));
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json; charset=utf-8', '.ico': 'image/x-icon', '.glb': 'model/gltf-binary', '.gif': 'image/gif', '.mp4': 'video/mp4', '.webm': 'video/webm', '.txt': 'text/plain; charset=utf-8' };

export function createPreviewServer({ root = resolve(here, 'dist') } = {}) {
  const publicRoot = resolve(root);
  return createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405, { Allow: 'GET, HEAD' }); response.end('Method not allowed'); return; }
    let path;
    try { path = decodeURIComponent((request.url ?? '/').split('?')[0]); } catch { response.writeHead(400); response.end('Invalid path'); return; }
    if (path.includes('\\') || path.includes('\0') || path.split('/').includes('..')) { response.writeHead(400); response.end('Invalid path'); return; }
    if (path.split('/').some(part => part.startsWith('.'))) { response.writeHead(404); response.end('Not found'); return; }
    const route = parseLocation(path, '');
    const isAppRoute = route.page !== 'not-found';
    let status = 200;
    let asset = path;
    if (isAppRoute) asset = '/index.html';
    else if (!extname(path) && !path.startsWith('/docs')) { asset = '/index.html'; status = 404; }
    const candidate = resolve(publicRoot, '.' + asset);
    if (!candidate.startsWith(publicRoot + sep)) { response.writeHead(404); response.end('Not found'); return; }
    try {
      const actual = await realpath(candidate);
      if (!actual.startsWith((await realpath(publicRoot)) + sep) || !(await stat(actual)).isFile()) throw new Error('Not public');
      const body = await readFile(actual);
      response.writeHead(status, { 'Content-Type': mime[extname(actual)] ?? 'application/octet-stream', 'Content-Length': body.length });
      response.end(request.method === 'HEAD' ? undefined : body);
    } catch { response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); response.end('Not found'); }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argument = (key, fallback) => { const index = process.argv.indexOf(key); return index === -1 ? fallback : process.argv[index + 1]; };
  const host = argument('--host', '127.0.0.1');
  const port = Number(argument('--port', process.env.PORT ?? '4173'));
  const server = createPreviewServer();
  server.on('error', error => { console.error(`Unable to start JY FITNESS ATLAS: ${error.message}`); process.exitCode = 1; });
  server.listen(port, host, () => {
    console.log(`JY FITNESS ATLAS\nLocal: http://localhost:${port}\nStop: Ctrl+C`);
    if (host === '0.0.0.0') for (const entries of Object.values(networkInterfaces())) for (const entry of entries ?? []) if (entry.family === 'IPv4' && !entry.internal) console.log(`Network: http://${entry.address}:${port}`);
  });
}
