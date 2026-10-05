import {test} from 'node:test';import assert from 'node:assert/strict';import {projectInput} from '../src/lib/project-input.js';
const valid={project_type:'Bathroom plumbing',city:'Kandy',description:'Replace two leaking taps',customer_name:'Example Customer',whatsapp:'+94770000000',images:['https://example.com/image.jpg']};
test('project API allowlists content and derives ownership and initial state',()=>{
 const row=projectInput({...valid,user_id:'other',status:'featured',homepage_display:true,created_at:'2000-01-01'},'actual');
 assert.equal(row.user_id,'actual');assert.equal(row.status,'active');assert.equal('homepage_display' in row,false);assert.equal('created_at' in row,false);
});
test('new projects reject missing/oversized photos and invalid content',()=>{
 for(const change of [{images:[]},{images:new Array(6).fill('url')},{description:'short'},{project_type:'x'},{city:''}])assert.throws(()=>projectInput({...valid,...change},'actual'));
});
