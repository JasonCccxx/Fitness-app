import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const lab = resolve(root, 'dist/motion-lab');
const reports = JSON.parse(await readFile(resolve(lab, 'assets/build-report.json'), 'utf8'));
assert.deepEqual(reports.map(report => report.id), ['squat', 'push-up', 'dumbbell-curl']);
for (const report of reports) {
  const bytes = await readFile(resolve(root, 'backend/media', `${report.id}.glb`));
  assert.equal(bytes.toString('ascii', 0, 4), 'glTF');
  assert.equal(bytes.readUInt32LE(4), 2);
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), report.sha256);
  const jsonLength = bytes.readUInt32LE(12);
  const doc = JSON.parse(bytes.toString('utf8', 20, 20 + jsonLength));
  assert.equal(doc.animations.length, 1);
  assert.ok(doc.skins[0].joints.length > 20);
  assert.ok(doc.animations[0].channels.length > 20);
  assert.equal(doc.extras.motion_source.includes('no upstream clip retained'), true);
  const binaryStart = 28 + jsonLength;
  let duration = 0;
  for (const sampler of doc.animations[0].samplers) {
    const input = doc.accessors[sampler.input];
    assert.equal(input.count, 97);
    duration = Math.max(duration, input.max[0]);
    const output = doc.accessors[sampler.output];
    const view = doc.bufferViews[output.bufferView];
    assert.ok(view.byteOffset + view.byteLength <= doc.buffers[0].byteLength);
    assert.equal(output.count, input.count);
    const width = output.type === 'VEC4' ? 4 : 3;
    const offset = binaryStart + view.byteOffset + (output.byteOffset ?? 0);
    for (let frame = 0; frame < output.count; frame++) {
      const values = Array.from({ length: width }, (_, i) => bytes.readFloatLE(offset + (frame * width + i) * 4));
      assert.ok(values.every(Number.isFinite));
      if (width === 4) assert.ok(Math.abs(Math.hypot(...values) - 1) < 1e-5);
    }
  }
  assert.equal(duration, 4);
  assert.ok(report.max_bone_length_drift_m < 1e-4);
  assert.equal(report.loop_matrix_error, 0);
  console.log(`${report.id}: GLB structure, animation, quaternion and asset hash PASS`);
}
const html = await readFile(resolve(lab, 'index.html'), 'utf8');
for (const match of html.matchAll(/(?:src|href)="(\.\/[^"?#]+)"/g)) await stat(resolve(lab, match[1]));
const provenance = JSON.parse(await readFile(resolve(lab, 'assets/provenance.json'), 'utf8'));
const base = await readFile(resolve(root, 'source-assets/human-base.glb'));
assert.equal(createHash('sha256').update(base).digest('hex'), provenance.geometry.local_base_sha256);
assert.equal(provenance.motions.mixamo_motion_included, false);
console.log('Local sample page assets, geometry provenance and notices: PASS');
