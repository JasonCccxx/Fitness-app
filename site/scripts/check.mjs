import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const files = ['server.mjs', 'dist/app.js', 'dist/core.js', 'dist/data.js', 'scripts/check.mjs', 'scripts/smoke.mjs'];
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', join(root, file)], { encoding: 'utf8' });
  if (result.status !== 0) { console.error(result.stderr); process.exit(1); }
}
for (const file of ['index.html', 'styles.css', 'assets/gym.jpg', 'assets/outdoor.jpg', 'assets/functional.jpg', 'assets/favicon.svg']) {
  if ((await stat(join(root, 'dist', file))).size === 0) throw new Error(`Empty asset: ${file}`);
}
const html = await readFile(join(root, 'dist/index.html'), 'utf8');
if (!html.includes('JY FITNESS ATLAS') || !html.includes('lang="zh-CN"')) throw new Error('Missing document metadata');
for (const match of html.matchAll(/(?:src|href)="(\/[^"?#]+)"/g)) await stat(join(root, 'dist', match[1]));
async function checkDocuments(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) { await checkDocuments(join(directory, entry.name)); continue; }
    if (!entry.name.endsWith('.md')) continue;
    const text = await readFile(join(directory, entry.name), 'utf8');
    for (const match of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      const target = match[1].split('#')[0];
      if (target && !/^(https?:|\/)/.test(target)) await stat(resolve(directory, target));
    }
  }
}
await checkDocuments(resolve(root, '../docs'));
JSON.parse(await readFile(join(root, 'content-structure.json'), 'utf8'));
console.log('Syntax, required local assets, document metadata and Markdown links: PASS');
