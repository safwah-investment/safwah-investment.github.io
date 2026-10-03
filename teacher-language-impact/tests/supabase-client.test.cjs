const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../supabase-client.js'),'utf8');
let calls=[];
const context={window:{TEACHER_IMPACT_SUPABASE:{projectUrl:'https://test.supabase.co',anonKey:'public-test'}},URL,AbortController,setTimeout,clearTimeout,atob,
 fetch:async (url,opts)=>{calls.push({url,opts});return {ok:true,json:async()=>[]};}};
vm.runInNewContext(source,context);
(async()=>{
 const db=context.window.TeacherImpactDB;
 await db.submit({student_name:' A ',country:'ID',level:'1',teacher_name:' T ',message:'Thank you',status:'approved',created_at:'fake'});
 const body=JSON.parse(calls[0].opts.body);
 assert.equal(body.student_name,'A');assert.equal(body.status,undefined);assert.equal(body.created_at,undefined);
 assert.equal(calls[0].opts.headers.Prefer,'return=minimal');
 await db.listApproved();assert.match(calls[1].url,/status=eq.approved/);assert.match(calls[1].url,/limit=20/);
 assert.throws(()=>db.submit({country:' ',level:'1',message:'x'}),/INVALID_INPUT/);
 assert.throws(()=>db.submit({country:'ID',level:'1',message:'x'.repeat(281)}),/INVALID_INPUT/);
 context.fetch=async()=>({ok:false});await assert.rejects(db.listApproved(),/REQUEST_FAILED/);
 context.fetch=async()=>{throw new Error('offline');};await assert.rejects(db.listApproved(),/offline/);
 context.window.TEACHER_IMPACT_SUPABASE={};assert.equal(db.isConfigured(),false);await assert.rejects(db.listApproved(),/NOT_CONFIGURED/);
 context.window.TEACHER_IMPACT_SUPABASE={projectUrl:'https://test.supabase.co',anonKey:'sb_secret_bad'};assert.equal(db.isConfigured(),false);
 console.log('PASS: requests, moderation filter, validation, failure handling, missing/secret configuration');
})().catch(e=>{console.error(e);process.exitCode=1;});
