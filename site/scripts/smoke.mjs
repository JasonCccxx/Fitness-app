const base = process.argv[2] ?? 'http://127.0.0.1:4173';
const cases = [
  ...['/account/index.html','/account/account.js','/admin/index.html','/admin/admin.js','/backend-config.json','/atlas-api.js','/workspace.css','/motion-lab/index.html'].map(path=>[path,200]),
  ['/backend/seed-samples.sql',404], ['/motion-lab/assets/squat.glb',404],
  ...['/', '/explore/gym', '/explore/outdoor', '/explore/functional', '/library?type=exercise&equipment=dumbbell', '/preview/exercise', '/preview/guide', '/preview/workout-template', '/roadmap', '/app.js', '/styles.css', '/core.js', '/data.js', '/assets/gym.jpg', '/assets/outdoor.jpg', '/assets/functional.jpg', '/assets/favicon.svg'].map(path => [path, 200]),
  ['/missing-page', 404], ['/assets/missing.jpg', 404], ['/docs/product-brief.md', 404], ['/package.json', 404], ['/%2e%2e%2fpackage.json', 400],
];
for (const [path, expected] of cases) {
  const response = await fetch(base + path);
  await response.arrayBuffer();
  if (response.status !== expected) throw new Error(`${path}: expected ${expected}, got ${response.status}`);
}
console.log(`Live HTTP smoke: PASS (${cases.length} paths at ${base})`);
