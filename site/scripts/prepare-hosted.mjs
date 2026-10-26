import { cp, lstat, readFile, realpath, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const source = resolve(project, 'site/dist');
const output = resolve(project, 'dist');
const manifest = JSON.parse(await readFile(resolve(project, '.openai/hosting.json'), 'utf8'));
if (manifest.static?.directory !== 'dist') throw new Error('Expected the root dist deployment directory');
await lstat(resolve(source, 'index.html'));
const existing = await lstat(output).catch(error => {
  if (error.code !== 'ENOENT') throw error;
});
if (existing && (!existing.isDirectory() || existing.isSymbolicLink() || await realpath(output) !== output)) {
  throw new Error('Refusing to replace a redirected deployment directory');
}
// Only the fixed, generated project-root dist directory is replaced.
await rm(output, { recursive: true, force: true });
await cp(source, output, { recursive: true });
console.log('Prepared hosted assets from site/dist; original UI files are unchanged.');
