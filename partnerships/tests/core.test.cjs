const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../core.js');
const owners=[{id:'a',name:'أ',type:'person',pct:60},{id:'b',name:'ب',type:'person',pct:40}];
test('direct ownership must total exactly 100%',()=>{
 assert.equal(C.validOwners(owners),true);
 assert.equal(C.validOwners(owners.map((x,i)=>({...x,pct:i===0?61:40}))),false);
});
test('noncorporate and one-level corporate look-through',()=>{
 const x=C.lookThrough([{name:'شريك',type:'person',pct:55},{name:'شركة',type:'entity',pct:45,beneficiaries:'مستفيد أول | 60\nمستفيد ثاني | 40'}]);
 assert.equal(x.gaps.length,0); assert.equal(x.tracedPct,100);
 assert.equal(x.rows.find(r=>r.name==='مستفيد أول').pct,27);
 assert.equal(x.rows.find(r=>r.name==='مستفيد ثاني').pct,18);
});
test('missing UBO does not falsely appear traced',()=>{
 const x=C.lookThrough([{name:'شركة',type:'entity',pct:100,beneficiaries:'أ | 60'}]);
 assert.equal(x.gaps.length,1);assert.equal(x.tracedPct,0);
});
test('ownership of an asset is separate and sum must be 100%',()=>{
 assert.equal(C.assetOwnership([{ownerId:'x',pct:60},{ownerId:'y',pct:40}],[{id:'x',name:'الأول'},{id:'y',name:'الثاني'}]).errors.length,0);
 assert.equal(C.assetOwnership([{ownerId:'x',pct:60}],[{id:'x',name:'الأول'}]).errors.length,1);
});
test('cash-in dilutes shareholders, no cash-out',()=>{
 const r=C.investmentScenario({owners,valuation:1000,cashIn:250,cashOut:0,sellerId:'',investorName:'م'});
 assert.equal(r.ok,true);assert.equal(r.postMoney,1250);assert.equal(r.investorPct,20);
 assert.equal(r.rows[0].after,48);assert.equal(r.rows[1].after,32);assert.equal(r.totalAfter,100);
});
test('cash-out purchases only seller share, no company increase',()=>{
 const r=C.investmentScenario({owners,valuation:1000,cashIn:0,cashOut:200,sellerId:'a',investorName:'م'});
 assert.equal(r.ok,true);assert.equal(r.postMoney,1000);assert.equal(r.investorPct,20);
 assert.equal(r.rows[0].after,40);assert.equal(r.rows[1].after,40);
});
test('mixed transaction separates paid to company and seller',()=>{
 const r=C.investmentScenario({owners,valuation:1000,cashIn:200,cashOut:100,sellerId:'a',investorName:'م'});
 assert.equal(r.ok,true);assert.equal(r.paidToCompany,200);assert.equal(r.paidToSeller,100);
 assert.equal(r.investorPct,25);assert.ok(Math.abs(r.totalAfter-100)<1e-6);
});
test('cash-out may not exceed seller value',()=>{
 const r=C.investmentScenario({owners,valuation:1000,cashIn:0,cashOut:700,sellerId:'a',investorName:'م'});
 assert.equal(r.ok,false);assert.match(r.errors.join(','),/تتجاوز/);
});
test('commission and referral are indicative',()=>{
 const r=C.commission({asking:2_000_000,rate:2.5,referralRate:20});
 assert.deepEqual([r.gross,r.referral,r.net],[50000,10000,40000]);
});
test('votes use frozen ownership percentages',()=>{
 const d={threshold:75,snapshot:owners,votes:{a:'yes',b:'yes'}};
 assert.equal(C.votesResult(d).passes,true);
 d.votes.b='no';assert.equal(C.votesResult(d).passes,false);
 assert.equal(C.votesResult(d).yes,60);
});
test('HTML output escapes untrusted names',()=>{
 assert.equal(C.escapeHtml('<img src=x onerror=1>'),'&lt;img src=x onerror=1&gt;');
});

test('opportunity-shaped commission data uses commissionRate',()=>{
 const r=C.commission({asking:3_000_000,commissionRate:2.5,referralRate:20});
 assert.equal(r.ok,true);assert.equal(r.net,60000);
});
