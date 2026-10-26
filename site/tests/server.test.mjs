import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPreviewServer } from '../server.mjs';

test('local preview serves only its public directory and supports deep links', async t => {
  const root = await mkdtemp(join(tmpdir(), 'jy-atlas-test-'));
  await writeFile(join(root, 'index.html'), '<!doctype html><title>Fixture</title>');
  await writeFile(join(root, 'app.js'), 'export const fixture = true;');
  await mkdir(join(root, 'motion-lab', 'assets'), { recursive: true });
  await writeFile(join(root, 'motion-lab', 'index.html'), '<title>Motion Lab</title>');
  await writeFile(join(root, 'motion-lab', 'assets', 'sample.glb'), Buffer.from('glTF'));
  const server = createPreviewServer({ root });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await rm(root, { recursive: true, force: true }); });

  await t.test('home and theme deep links return the application shell', async () => {
    for (const path of ['/', '/explore/gym?type=exercise', '/library', '/preview/guide']) {
      const response = await fetch(base + path);
      assert.equal(response.status, 200);
      assert.match(await response.text(), /Fixture/);
    }
  });
  await t.test('JS assets have a module-compatible MIME type', async () => {
    const response = await fetch(base + '/app.js');
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /javascript/);
  });
  await t.test('the separate motion sample page and binary 3D assets are served directly', async () => {
    const page = await fetch(base + '/motion-lab/index.html');
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Motion Lab/);
    const asset = await fetch(base + '/motion-lab/assets/sample.glb');
    assert.equal(asset.status, 200);
    assert.equal(asset.headers.get('content-type'), 'model/gltf-binary');
    assert.equal(await asset.text(), 'glTF');
    const head = await fetch(base + '/motion-lab/assets/sample.glb', { method: 'HEAD' });
    assert.equal(head.headers.get('content-length'), '4');
    assert.equal((await head.arrayBuffer()).byteLength, 0);
  });
  await t.test('missing assets and private paths are not replaced by the app shell', async () => {
    for (const path of ['/missing.jpg', '/package.json', '/docs/product-brief.md', '/.env']) {
      const response = await fetch(base + path);
      assert.equal(response.status, 404);
      assert.doesNotMatch(await response.text(), /Fixture/);
    }
  });
  await t.test('encoded traversal is rejected', async () => {
    const response = await fetch(base + '/%2e%2e%2fpackage.json');
    assert.equal(response.status, 400);
  });
  await t.test('unexpected HTTP methods are rejected', async () => {
    const response = await fetch(base + '/', { method: 'POST' });
    assert.equal(response.status, 405);
  });
});
