import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const compiled = await build({entryPoints:['mobile/src/lib/notification-items.ts'],bundle:true,platform:'node',format:'esm',write:false});
const { notificationItems } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
const at = '2026-10-04T10:00:00Z';
const project = { id:'p1',user_id:'customer',project_type:'Plumbing' };
const bid = { id:'b1',job_id:'p1',user_id:'provider',created_at:at,status:'new' };
const job = { id:'j1',customer_id:'customer',provider_user_id:'provider',version:2,updated_at:at,data:{title:'Plumbing',events:[{role:'provider',at}]}};
test('inbox excludes unrelated accounts and self-authored engagement events', () => {
  assert.deepEqual(notificationItems('stranger',[project],[bid],[job]),[]);
  assert.deepEqual(notificationItems('provider',[],[],[job]),[]);
  assert.equal(notificationItems('customer',[project],[bid],[job]).length,2);
});
test('duplicate bid rows are deduplicated and invalid dates excluded', () => {
  const items=notificationItems('customer',[project],[bid,bid,{...bid,id:'bad',created_at:null}],[]);
  assert.equal(items.length,1); assert.equal(items[0].kind,'applicationReceived');
});
test('new engagement versions get distinct read markers and newest records come first', () => {
  const newer={...job,version:3,data:{events:[{role:'admin',at:'2026-10-05T10:00:00Z'}]}};
  assert.notEqual(notificationItems('customer',[],[],[job])[0].id,notificationItems('customer',[],[],[newer])[0].id);
  assert.equal(notificationItems('customer',[project],[bid],[newer])[0].id,'engagement:j1:3');
});
