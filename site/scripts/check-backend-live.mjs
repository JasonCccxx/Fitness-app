import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

// Anonymous, read-only production checks. No service key or fabricated user.
const config=JSON.parse(await readFile(new URL('../dist/backend-config.json',import.meta.url),'utf8'));
const client=createClient(config.supabaseUrl,config.publishableKey,{auth:{persistSession:false,autoRefreshToken:false}});
const {data:contents,error}=await client.from('contents').select('*,media_assets(*)').eq('publication_status','published');
assert.ifError(error);
assert.equal(contents.filter(row=>row.id.startsWith('sample-')).length,3);
for(const content of contents) {
  assert.equal(content.publication_status,'published');
  for(const asset of content.media_assets) {
    const signed=await client.storage.from(asset.bucket_id).createSignedUrl(asset.object_path,60);
    assert.ifError(signed.error);
    const response=await fetch(signed.data.signedUrl);
    assert.equal(response.status,200);
    const bytes=Buffer.from(await response.arrayBuffer());
    assert.equal(bytes.length,asset.byte_size);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256);
  }
}
for(const table of ['profiles','plans','plan_days','plan_items']) {
  const result=await client.from(table).select('*');
  assert.ok(result.error || result.data.length===0,`Anonymous data exposed: ${table}`);
}
const roles=await client.rpc('admin_list_users');
assert.ok(roles.error,'Anonymous users must not list accounts');
const adminBootstrap=await client.rpc('bootstrap_initial_admin',{target_user_id:'00000000-0000-0000-0000-000000000000'});
assert.ok(adminBootstrap.error,'Anonymous users must not bootstrap admins');
console.log(`Production anonymous API, private-data denial and media SHA-256: PASS (${contents.length} published records)`);
