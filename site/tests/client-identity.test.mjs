import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('backend initialization resolves only after the initial verified access is ready',async()=>{
  const originalFetch=globalThis.fetch;
  const previousFactory=globalThis.__atlasTestClientFactory;
  let authCallback;
  const user={id:'verified-user'};
  const access={role:'admin',account_status:'active'};
  const client={
    auth:{
      getSession:async()=>({data:{session:{user}},error:null}),
      getUser:async()=>{await new Promise(resolve=>setTimeout(resolve,5));return {data:{user},error:null};},
      onAuthStateChange:callback=>{authCallback=callback;queueMicrotask(()=>callback('INITIAL_SESSION',{user}));}
    },
    from:()=>({select:()=>({eq:()=>({single:async()=>({data:{id:user.id,display_name:'Admin'},error:null})})})}),
    rpc:async()=>({data:access,error:null})
  };
  globalThis.__atlasTestClientFactory=()=>client;
  globalThis.fetch=async()=>({ok:true,json:async()=>({provider:'supabase',supabaseUrl:'https://example.supabase.co',publishableKey:'sb_publishable_test'})});
  try {
    const source=(await readFile(new URL('../client/atlas-api.js',import.meta.url),'utf8')).replace("import { createClient } from '@supabase/supabase-js';","const createClient=globalThis.__atlasTestClientFactory;");
    const api=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
    await api.initializeBackend();
    assert.equal(api.currentIdentity().user.id,user.id);
    assert.deepEqual(api.currentIdentity().access,access);
    await new Promise(resolve=>setTimeout(resolve,15));
    assert.deepEqual(api.currentIdentity().access,access);
    authCallback('SIGNED_OUT',null);
    await new Promise(resolve=>setTimeout(resolve,5));
    assert.equal(api.currentIdentity().user,null);
  } finally {globalThis.fetch=originalFetch;globalThis.__atlasTestClientFactory=previousFactory;}
});
