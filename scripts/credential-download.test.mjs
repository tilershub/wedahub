import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const result=await build({entryPoints:['src/pages/api/admin/credential-document.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {GET}=await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
test('private credential download requires admin and issues only a short-lived attachment URL',async()=>{
 let signed=0;
 const supabase={rpc:async()=>({data:false}),from:()=>({select:()=>({eq:()=>({single:async()=>({data:{document_path:'owner/credential/document.pdf'}})})})}),storage:{from:bucket=>({createSignedUrl:async(path,ttl,options)=>{signed++;assert.equal(bucket,'credential-documents');assert.equal(ttl,60);assert.equal(options.download,true);return{data:{signedUrl:'https://storage.example/signed-test'}}}})}};
 const context={locals:{supabase},url:new URL('https://wedahub.lk/api/admin/credential-document?id=55555555-5555-4555-8555-555555555555')};
 assert.equal((await GET(context)).status,401);
 context.locals.user={id:'someone'};
 assert.equal((await GET(context)).status,403);assert.equal(signed,0);
 supabase.rpc=async()=>({data:true});
 const response=await GET(context);assert.equal(response.status,302);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.headers.get('referrer-policy'),'no-referrer');assert.equal(signed,1);
});
