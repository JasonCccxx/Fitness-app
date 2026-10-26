import { createClient } from '@supabase/supabase-js';

let client;
let configuration;
let initialization;
let identityRevision = 0;
let identity = { user: null, profile: null, access: null, error: null, configured: false };
const subscribers = new Set();
const allowedMedia = { model: { glb:'model/gltf-binary' }, gif: { gif:'image/gif' }, image: { png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp' }, video: { mp4:'video/mp4',webm:'video/webm' } };

function fail(error) { if (error) { const result = new Error(error.message || '服务请求未完成'); result.code = error.code; throw result; } }
function notify() { for (const callback of subscribers) callback({ ...identity }); }
export function subscribeIdentity(callback) { subscribers.add(callback); callback({ ...identity }); return () => subscribers.delete(callback); }
export function currentIdentity() { return { ...identity }; }
function isPublicKey(value) {
  if (/^sb_publishable_/.test(value)) return true;
  try { return JSON.parse(atob(value.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).role === 'anon'; } catch { return false; }
}
async function refreshIdentity(session) {
  const revision = ++identityRevision;
  if (!session) { identity = { ...identity, user:null,profile:null,access:null,error:null }; notify(); return; }
  const { data, error } = await client.auth.getUser();
  if (revision !== identityRevision) return;
  if (error || !data.user) { identity = { ...identity,user:null,profile:null,access:null,error:error?.message??'登录状态无效' }; notify(); return; }
  const [profile,access] = await Promise.all([client.from('profiles').select('*').eq('id',data.user.id).single(),client.rpc('get_my_access')]);
  if (revision !== identityRevision) return;
  identity = { configured:true,user:data.user,profile:profile.data,access:access.data,error:profile.error?.message || access.error?.message || null }; notify();
}
export function initializeBackend() {
  if (initialization) return initialization;
  initialization = (async () => {
    const response = await fetch('/backend-config.json',{ cache:'no-store' });
    if (!response.ok) throw new Error('后端配置暂不可用');
    configuration = await response.json();
    if (configuration.provider !== 'supabase' || !configuration.supabaseUrl || !isPublicKey(configuration.publishableKey)) throw new Error('账户与内容服务尚未配置');
    const url = new URL(configuration.supabaseUrl);
    if (url.protocol !== 'https:') throw new Error('后端连接必须使用 HTTPS');
    client = createClient(url.origin,configuration.publishableKey,{ auth:{ flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:`jy-atlas-${url.hostname.split('.')[0]}` } });
    identity.configured = true;
    const { data,error } = await client.auth.getSession(); fail(error);
    await refreshIdentity(data.session);
    // Finish the initial verified identity before pages make access decisions.
    // Supabase emits INITIAL_SESSION again when a subscriber is registered.
    client.auth.onAuthStateChange((event,session) => { if(event==='INITIAL_SESSION')return; setTimeout(() => refreshIdentity(session).catch(error => { identity.error=error.message; notify(); }),0); });
    return { ...configuration };
  })().catch(error => { identity.error=error.message; notify(); throw error; });
  return initialization;
}
export async function signInWithGoogle() {
  await initializeBackend();
  if (!configuration.googleEnabled) throw new Error('Google 登录正在配置，尚未开放。');
  const { error } = await client.auth.signInWithOAuth({ provider:'google',options:{ redirectTo:new URL('/account/index.html',location.origin).href,scopes:'openid email profile' } }); fail(error);
}
export async function signOut() { await initializeBackend(); const {error}=await client.auth.signOut({scope:'local'}); fail(error); }
async function requireUser() { await initializeBackend(); if(!identity.user)throw new Error('请先使用 Google 账号登录'); if(identity.access?.account_status!=='active')throw new Error('此账号暂不可用，请联系管理员'); }
async function requireAdmin() { await requireUser(); if(identity.access?.role!=='admin')throw new Error('需要管理员权限'); }
async function signedMedia(rows) {
  const assets = rows.flatMap(row=>row.media_assets??[]);
  if (!assets.length) return rows.map(row=>({...row,media:[]}));
  const {data,error}=await client.storage.from('exercise-media').createSignedUrls(assets.map(asset=>asset.object_path),300); fail(error);
  const urls=new Map(data.filter(item=>!item.error).map(item=>[item.path,item.signedUrl]));
  return rows.map(row=>({...row,media_expires_at:Date.now()+240000,media:(row.media_assets??[]).map(asset=>({...asset,url:urls.get(asset.object_path)??null}))}));
}
export async function listPublishedContent() {
  await initializeBackend();
  const {data,error}=await client.from('contents').select('*,media_assets(*)').eq('publication_status','published').order('display_order').order('id'); fail(error);
  return signedMedia(data);
}
export async function refreshContent(id) {
  await initializeBackend(); const {data,error}=await client.from('contents').select('*,media_assets(*)').eq('id',id).single(); fail(error);
  return (await signedMedia([data]))[0];
}
export async function mediaDownloadURL(content,kind) {
  await initializeBackend(); const asset=content.media.find(item=>item.kind===kind);
  if(!asset)throw new Error('该媒体暂不可用');
  const {data,error}=await client.storage.from('exercise-media').createSignedUrl(asset.object_path,300,{download:`jy-atlas-${content.slug}.${asset.object_path.split('.').at(-1)}`}); fail(error);return data.signedUrl;
}
export async function updateProfile(values) {
  await requireUser(); const display_name=String(values.display_name??'').trim(); const timezone=String(values.timezone??'Asia/Tokyo');
  const {error}=await client.from('profiles').update({display_name,timezone}).eq('id',identity.user.id); fail(error);
  const {data}=await client.auth.getSession(); await refreshIdentity(data.session);
}
export async function listPlans() {
  await requireUser(); const {data,error}=await client.from('plans').select('*,plan_days(*,plan_items(*))').order('updated_at',{ascending:false}); fail(error);
  return data.map(plan=>({...plan,days:plan.plan_days.sort((a,b)=>a.day_order-b.day_order).map(day=>({...day,items:day.plan_items.sort((a,b)=>a.item_order-b.item_order)}))}));
}
export async function savePlan(plan) {
  await requireUser(); const {data,error}=await client.rpc('save_plan',{p_plan_id:plan.id??null,p_expected_revision:plan.revision??null,p_title:plan.title,p_notes:plan.notes??'',p_days:plan.days.map(day=>({title:day.title,items:day.items.map(item=>({content_id:item.content_id,prescription:item.prescription??{}}))}))}); fail(error);
  recordActivity('plan_saved','/account'); return data;
}
export async function deletePlan(id) { await requireUser(); const {error}=await client.from('plans').delete().eq('id',id);fail(error); }
export async function recordActivity(eventType,path,contentId=null) {
  if (!client || !identity.user || identity.access?.account_status!=='active') return;
  try { await client.rpc('record_activity',{p_event_type:eventType,p_path:path.split('?')[0].slice(0,200),p_content_id:contentId}); } catch { /* Statistics must not interrupt browsing. */ }
}
export async function adminContents() { await requireAdmin(); const {data,error}=await client.from('contents').select('*,media_assets(*)').order('updated_at',{ascending:false});fail(error);return signedMedia(data); }
export async function adminSaveContent(input,isNew=false) {
  await requireAdmin(); const fields=['id','slug','content_type','title','english_title','summary','aliases','review_status','theme_links','discipline_ids','equipment_ids','primary_muscle_ids','secondary_muscle_ids','details','display_order'];
  const values=Object.fromEntries(fields.filter(key=>Object.hasOwn(input,key)).map(key=>[key,input[key]]));
  const query=isNew?client.from('contents').insert(values):client.from('contents').update(values).eq('id',input.id);
  const {data,error}=await query.select().single();fail(error);return data;
}
export async function adminPublish(id,status) { await requireAdmin();const {error}=await client.from('contents').update({publication_status:status}).eq('id',id);fail(error); }
export async function adminUpload(content,file,kind) {
  await requireAdmin();const ext=file.name.split('.').at(-1).toLowerCase();const mime=allowedMedia[kind]?.[ext];
  if(!mime || file.size===0 || file.size>20*1024*1024)throw new Error('请选择受支持的媒体文件，大小不超过 20 MB');
  if(!/^[a-zA-Z0-9_-]+$/.test(content.id))throw new Error('内容标识无效');
  const buffer=await file.arrayBuffer();
  if(kind==='model' && (buffer.byteLength<12 || new DataView(buffer).getUint32(0,true)!==0x46546c67))throw new Error('这不是有效的 GLB 文件');
  const sha256=[...new Uint8Array(await crypto.subtle.digest('SHA-256',buffer))].map(x=>x.toString(16).padStart(2,'0')).join('');
  const path=`${kind}/${content.id}/${crypto.randomUUID()}.${ext}`;
  const upload=await client.storage.from('exercise-media').upload(path,file,{contentType:mime,upsert:false});fail(upload.error);
  const existing=content.media?.find(item=>item.kind===kind);
  const row={id:existing?.id??`${content.id}-${kind}`,content_id:content.id,kind,bucket_id:'exercise-media',object_path:path,mime_type:mime,byte_size:file.size,sha256,attribution:{source:'Administrator upload',original_name:file.name}};
  const {error}=await client.from('media_assets').upsert(row,{onConflict:'content_id,kind'});
  if(error){await client.storage.from('exercise-media').remove([path]);fail(error);}return row;
}
export async function adminUsers(){await requireAdmin();const {data,error}=await client.rpc('admin_list_users');fail(error);return data;}
export async function adminSetRole(id,role){await requireAdmin();const {error}=await client.rpc('admin_set_role',{target_user_id:id,new_role:role});fail(error);}
export async function adminSetAccountStatus(id,status){await requireAdmin();const {error}=await client.rpc('admin_set_account_status',{target_user_id:id,new_status:status});fail(error);}
export async function adminActivity(){await requireAdmin();const {data,error}=await client.rpc('admin_activity');fail(error);return data;}
