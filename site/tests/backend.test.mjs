import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const ids = { a:'10000000-0000-4000-8000-000000000001', b:'10000000-0000-4000-8000-000000000002', admin:'10000000-0000-4000-8000-000000000003' };
const schemaURL = new URL('../backend/migrations/202610260001_core.sql',import.meta.url);
async function as(db, role, id, fn) {
  return db.transaction(async tx => {
    await tx.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role',$2,true)",[id??'',role]);
    await tx.exec(`set local role ${role}`);
    return fn(tx);
  });
}
test('backend database enforces identity, publication, ownership and administrator boundaries', async t => {
  const sql = await readFile(schemaURL,'utf8').catch(error => { if(error.code==='ENOENT')return ''; throw error; });
  assert.ok(sql.length>100,'The backend schema has not been implemented yet');
  const db = new PGlite(); t.after(()=>db.close());
  await db.exec(await readFile(new URL('../backend/test-bootstrap.sql',import.meta.url),'utf8'));
  await db.exec(sql);
  await db.exec(await readFile(new URL('../backend/migrations/202610260002_private_rls_and_history.sql',import.meta.url),'utf8'));
  for (const [name,id] of Object.entries(ids)) await db.query('insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)',[id,`${name}@example.test`,{full_name:name,role:'admin'}]);
  await as(db,'service_role',null,tx=>tx.query('select public.bootstrap_initial_admin($1)',[ids.admin]));
  await as(db,'service_role',null,async tx=>{
    await tx.query("insert into public.contents(id,slug,title,content_type,review_status) values('published','published','Sample','exercise','prototype'),('draft','draft','Private draft','exercise','prototype')");
    await tx.query("insert into public.media_assets(id,content_id,kind,bucket_id,object_path,mime_type,byte_size,sha256) values('media','published','model','exercise-media','models/sample.glb','model/gltf-binary',4,repeat('a',64)),('draft-media','draft','model','exercise-media','models/draft.glb','model/gltf-binary',4,repeat('b',64))");
    await tx.query("insert into storage.objects(bucket_id,name) values('exercise-media','models/sample.glb'),('exercise-media','models/draft.glb')");
    await tx.query("update public.contents set publication_status='published' where id='published'");
  });
  await t.test('anonymous visitors see published content and media but no user data or drafts',async()=>{
    await as(db,'anon',null,async tx=>{
      assert.deepEqual((await tx.query('select id from public.contents')).rows.map(x=>x.id),['published']);
      assert.deepEqual((await tx.query('select name from storage.objects')).rows.map(x=>x.name),['models/sample.glb']);
    });
    await assert.rejects(as(db,'anon',null,tx=>tx.query('select * from public.profiles')));
    await assert.rejects(as(db,'anon',null,tx=>tx.query("insert into public.contents(id,slug,title,content_type) values('attack','attack','Attack','exercise')")));
  });
  await t.test('provider-controlled profile metadata cannot create an admin or change account state',async()=>{
    const access=await as(db,'authenticated',ids.a,tx=>tx.query('select public.get_my_access() as access'));
    assert.equal(access.rows[0].access.role,'member');
    await assert.rejects(as(db,'authenticated',ids.a,tx=>tx.query("update public.profiles set account_status='suspended' where id=$1",[ids.b])));
    await assert.rejects(as(db,'authenticated',ids.a,tx=>tx.query("select public.admin_set_role($1,'admin')",[ids.a])));
    await assert.rejects(as(db,'authenticated',ids.a,tx=>tx.query('select public.bootstrap_initial_admin($1)',[ids.a])));
    for (const table of ['user_roles','audit_events','activity_events']) await assert.rejects(as(db,'authenticated',ids.a,tx=>tx.query(`select * from private.${table}`)));
  });
  await t.test('publishing an exercise requires its registered file to actually exist in storage',async()=>{
    await as(db,'authenticated',ids.admin,async tx=>{
      await tx.query("insert into public.contents(id,slug,title,content_type) values('orphan','orphan','Missing file','exercise')");
      await tx.query("insert into public.media_assets(id,content_id,kind,bucket_id,object_path,mime_type,byte_size,sha256) values('orphan-media','orphan','model','exercise-media','models/missing.glb','model/gltf-binary',4,repeat('c',64))");
    });
    await assert.rejects(as(db,'authenticated',ids.admin,tx=>tx.query("update public.contents set publication_status='published' where id='orphan'")));
  });
  let planId;
  await t.test('a member can atomically create and retrieve a private plan',async()=>{
    const result=await as(db,'authenticated',ids.a,tx=>tx.query('select public.save_plan(null,null,$1,$2,$3) as plan',['My plan','Private notes',[{title:'Day one',items:[{content_id:'published',prescription:{sets:2,reps:8}}]}]]));
    planId=result.rows[0].plan.id;
    assert.equal(result.rows[0].plan.revision,1);
    const rows=await as(db,'authenticated',ids.a,tx=>tx.query('select * from public.plan_items'));
    assert.equal(rows.rows.length,1);
  });
  await t.test('another member and a content admin cannot read or modify the first member’s plan',async()=>{
    for(const id of [ids.b,ids.admin]){
      const result=await as(db,'authenticated',id,async tx=>({plans:await tx.query('select * from public.plans'),items:await tx.query('select * from public.plan_items')}));
      assert.equal(result.plans.rows.length,0); assert.equal(result.items.rows.length,0);
      await assert.rejects(as(db,'authenticated',id,tx=>tx.query('select public.save_plan($1,1,$2,$3,$4)',[planId,'Overwrite','',[{title:'Day',items:[]}]])));
    }
  });
  await t.test('plan save rejects stale revisions and rolls back invalid content',async()=>{
    await assert.rejects(as(db,'authenticated',ids.a,tx=>tx.query('select public.save_plan($1,0,$2,$3,$4)',[planId,'Stale','',[{title:'Day',items:[]}]])));
    await assert.rejects(as(db,'authenticated',ids.a,tx=>tx.query('select public.save_plan($1,1,$2,$3,$4)',[planId,'Invalid','',[{title:'Day',items:[{content_id:'draft',prescription:{}}]}]])));
    const result=await as(db,'authenticated',ids.a,tx=>tx.query('select title,revision from public.plans where id=$1',[planId]));
    assert.equal(result.rows[0].title,'My plan');assert.equal(result.rows[0].revision,1);
  });
  await t.test('admins can publish content and view account activity, with audit events',async()=>{
    await assert.rejects(as(db,'authenticated',ids.a,tx=>tx.query('select * from public.admin_list_users()')));
    const result=await as(db,'authenticated',ids.admin,tx=>tx.query('select * from public.admin_list_users()'));
    assert.equal(result.rows.length,3);
    await as(db,'authenticated',ids.admin,tx=>tx.query("update public.contents set publication_status='published' where id='draft'"));
    const published=await as(db,'anon',null,tx=>tx.query('select id from public.contents'));
    assert.equal(published.rows.length,2);
    await as(db,'authenticated',ids.a,tx=>tx.query("select public.record_activity('content_view','/library','published')"));
    const activity=await as(db,'authenticated',ids.admin,tx=>tx.query('select public.admin_activity() as result'));
    assert.ok(activity.rows[0].result.recent.length>0);
  });
  await t.test('suspension immediately removes private access and admin status cannot be self-assigned',async()=>{
    await as(db,'authenticated',ids.admin,tx=>tx.query("select public.admin_set_account_status($1,'suspended')",[ids.a]));
    const plans=await as(db,'authenticated',ids.a,tx=>tx.query('select * from public.plans'));
    assert.equal(plans.rows.length,0);
    await assert.rejects(as(db,'authenticated',ids.a,tx=>tx.query("select public.record_activity('page_view','/account',null)")));
    await assert.rejects(as(db,'authenticated',ids.admin,tx=>tx.query("select public.admin_set_role($1,'member')",[ids.admin])));
  });
});
