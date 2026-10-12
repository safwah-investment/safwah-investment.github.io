/* Safwah Partnerships & Investment Studio. Independent calculation library.
   Advisory financial models; does not create or transfer legal ownership. */
(function(root,factory){const lib=factory();if(typeof module==='object'&&module.exports)module.exports=lib;else root.SafwahPartnershipCore=lib;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const EPS=1e-7;
const PROFILES={
 balanced:{cash:1,assets:1,ip:1,other:1,effort:1,label:'القيمة المباشرة'},
 capital:{cash:1.5,assets:1.2,ip:.7,other:.8,effort:.6,label:'التمويل والأصول'},
 operations:{cash:1,assets:1,ip:.8,other:.8,effort:1.5,label:'التشغيل والعمل'},
 innovation:{cash:.9,assets:.8,ip:1.6,other:.8,effort:1.15,label:'الابتكار والملكية الفكرية'},
 deal:{cash:1.4,assets:1.3,ip:.7,other:1,effort:.85,label:'الصفقة المحددة'}
};
const TYPES={operating:'مشروع تشغيلي',deal:'صفقة تجارية',startup:'مشروع ناشئ',existing:'دخول مستثمر في شركة قائمة',mudaraba:'مضاربة',reorganization:'إعادة تنظيم شراكة'};
const TERM_TITLES={management:'الإدارة اليومية',majority:'آلية اتخاذ القرارات',finance:'التمويل الإضافي',profit:'توزيع الأرباح والخسائر',duration:'مدة العلاقة',exit:'تخارج الشريك',dispute:'فض النزاع',ip:'العلامة والملكية الفكرية',transfer:'نقل الحصص والقيود',reporting:'التقارير والرقابة'};
const STATUSES={pending:'لم يحسم',proposed:'مقترح',approved:'معتمد إداريًا'};
function n(v){if(v===null||v===undefined||String(v).trim()==='')return NaN;let s=String(v).trim().replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/[۰-۹]/g,c=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/٫/g,'.').replace(/[\s٬,]/g,'');if(!/^-?(?:\d+\.?\d*|\.\d+)$/.test(s))return NaN;return Number(s)}
const finite=v=>Number.isFinite(n(v)), sum=a=>a.reduce((s,v)=>s+(Number.isFinite(v)?v:0),0), round=(v,precision=8)=>Math.round((v+Number.EPSILON)*10**precision)/10**precision;
const norm=v=>finite(v)?n(v):0;
const percent=v=>finite(v)&&n(v)>=0&&n(v)<=100;
const allocation=(values,totalPct=100)=>{const total=sum(values);return total>0?values.map(v=>round(Math.max(0,v)/total*totalPct)):values.map(()=>0)};
function valuation({pre,investment,investorPct}){
 const amount=n(investment), pct=n(investorPct), preVal=n(pre);
 if(finite(investment)&&amount<0)return {ok:false,error:'مبلغ الاستثمار لا يمكن أن يكون سالبًا'};
 if(amount>0&&pct>0&&pct<100){const post=amount/(pct/100);return {ok:true,pre:round(post-amount,2),post:round(post,2),investorPct:round(pct),investment:amount,derivedFrom:'amount_percent'};}
 if(preVal>0&&amount>=0){const post=preVal+amount;return {ok:true,pre:preVal,post,investorPct:round(amount/post*100),investment:amount,derivedFrom:'pre_amount'};}
 return {ok:false,error:'حدد مبلغ الاستثمار مع النسبة، أو تقييم الشركة ومبلغ الاستثمار'};
}
function partnerValue(p,weight){
 const market=norm(p.marketSalary),received=norm(p.salaryPaid),months=norm(p.months);
 const effort=p.work==='no'?0:Math.max(0,market-received)*Math.max(0,months);
 const parts={cash:norm(p.cash),assets:norm(p.assets),ip:norm(p.ip),other:norm(p.other),effort};
 const amounts=Object.fromEntries(Object.entries(parts).map(([key,v])=>[key,round(v*(weight[key]??1),2)]));
 return {id:p.id,name:p.name||'طرف غير مسمى',parts,weighted:amounts,total:round(sum(Object.values(amounts)),2)};
}
function calculate(project){
 const issues=[], type=project?.type||'operating', parties=Array.isArray(project?.parties)?project.parties:[];
 if(parties.length<2)issues.push('يلزم إدراج طرفين على الأقل.');
 if(parties.some(p=>!String(p.name||'').trim()))issues.push('يوجد طرف دون اسم.');
 const fields=['cash','assets','ip','other','marketSalary','salaryPaid','months'];
 for(const p of parties){for(const key of fields){if(finite(p[key])&&n(p[key])<0)issues.push(`قيمة ${key} للطرف ${p.name||'غير المسمى'} سالبة.`);} if(finite(p.months)&&n(p.months)>240)issues.push(`تحقق من مدة الجهد الطويلة للطرف ${p.name}.`);}
 const weight=type==='startup'?(PROFILES[project.profile]||PROFILES.balanced):PROFILES.balanced;
 const scored=parties.map(p=>partnerValue(p,weight)),totalValue=sum(scored.map(x=>x.total));
 let rows=allocation(scored.map(x=>x.total)).map((share,i)=>({...scored[i],suggested:share}));
 let financial=null, profitRows=[];
 if(type==='existing'){
  const current=parties.filter(p=>!p.newInvestor).map(p=>({id:p.id,name:p.name,pct:n(p.currentPct)}));
  if(!current.length||current.some(p=>!percent(p.pct))||Math.abs(sum(current.map(p=>p.pct))-100)>EPS)issues.push('يجب تحديد الحصص الحالية لكل مالك بمجموع 100%.');
  const pre=n(project?.investor?.preMoney),ci=n(project?.investor?.cashIn),co=n(project?.investor?.cashOut);
  if(!(pre>0)||!(ci>=0)||!(co>=0)||!(ci+co>0))issues.push('أكمل تقييم الشركة وقيمة الضخ أو شراء الحصة.');
  const seller=current.find(p=>p.id===project?.investor?.sellerId);
  if(co>0&&!seller)issues.push('حدد المالك الذي ستُشترى منه الحصة.');
  if(seller&&co>pre*seller.pct/100+EPS)issues.push('المبلغ المدفوع للبائع يتجاوز القيمة الاسترشادية لحصته.');
  if(!issues.length){
   const post=pre+ci,bought=co/post*100,investorPct=(ci+co)/post*100;
   rows=current.map(p=>({id:p.id,name:p.name,before:p.pct,suggested:round(p.pct*pre/post-(p.id===seller?.id?bought:0))}));
   const incoming=parties.find(x=>x.newInvestor);
   rows.push({id:incoming?.id||'incoming',name:String(incoming?.name||project.investor.name||'المستثمر الجديد'),before:0,suggested:round(investorPct)});
   financial={preMoney:pre,postMoney:post,cashIn:ci,cashOut:co,investorPct:round(investorPct)};
  }
 }
 if(type==='mudaraba'){
  rows=parties.map(p=>({id:p.id,name:p.name,suggested:null,profit:percent(p.profitPct)?n(p.profitPct):null,capital:norm(p.cash)}));
  if(!parties.some(p=>p.role==='financier')||!parties.some(p=>p.role==='operator'))issues.push('حدد طرفًا ممولًا وطرفًا عاملًا على الأقل.');
  const sumProfit=sum(rows.map(p=>p.profit));
  if(rows.some(p=>p.profit===null)||Math.abs(sumProfit-100)>EPS||rows.some(p=>p.profit<=0))issues.push('في هذا النموذج، يجب أن تكون نسب الربح موجبة ومحددة ومجموعها 100%.');
  const sponsorCapital=sum(parties.filter(p=>p.role==='financier').map(p=>norm(p.cash)));
  if(!(sponsorCapital>0))issues.push('أدخل رأس مال مقدمًا من طرف ممول.');
  profitRows=rows.map(p=>({id:p.id,name:p.name,profit:p.profit}));
 }
 if(['operating','deal','startup','reorganization'].includes(type)&&!(totalValue>0))issues.push('أدخل مساهمة مالية أو عينية أو جهدًا قابلًا للتقدير.');
 if(type!=='mudaraba'&&type!=='existing'){
   profitRows=parties.map((p,i)=>({id:p.id,name:p.name,profit:percent(p.profitPct)?n(p.profitPct):null,base:rows[i].suggested}));
   const specified=profitRows.filter(x=>x.profit!==null);
   if(specified.length&& (specified.length!==parties.length||Math.abs(sum(specified.map(x=>x.profit))-100)>EPS))issues.push('نسب الأرباح المدخلة غير مكتملة أو مجموعها لا يساوي 100%.');
 }
 let agreed=null;
 if(project.final?.status==='approved'){
   const values=parties.map(p=>n(project.final.shares?.[p.id]));
   if(values.some(v=>!Number.isFinite(v)||v<0||v>100)||Math.abs(sum(values)-100)>EPS)issues.push('الملكية المعتمدة تحتاج نسبًا لكل طرف مجموعها 100%.');
   else agreed=parties.map((p,i)=>({id:p.id,name:p.name,pct:values[i]}));
 }
 const sumSuggested=sum(rows.map(x=>x.suggested));
 if(type!=='mudaraba'&&!issues.length&&Math.abs(sumSuggested-100)>0.00001)issues.push('خلل في مجموع الحصص الحسابية.');
 if(rows.some(x=>x.suggested>=50-0.000001&&x.suggested<=50.000001))issues.push('حصة 50% قد تؤدي إلى تعطل القرارات دون آلية ترجيح متفق عليها.');
 if(rows.some(x=>x.suggested>75))issues.push('توجد حصة مرتفعة لأحد الأطراف؛ راجع نصاب القرارات وحقوق الأقلية.');
 return {type,profile:project.profile||'balanced',weighted:type==='startup',rows,financial,profitRows,agreed,issues,scoreTotal:totalValue,sumSuggested:round(sumSuggested)};
}
function contributions(project){
 const ledger=Array.isArray(project?.ledger)?project.ledger:[], warnings=[];
 const rows=ledger.filter(e=>e.entry==='commitment').map(e=>{const linked=ledger.filter(x=>x.entry==='paid'&&x.parentId===e.id);const paid=sum(linked.map(x=>n(x.amount)));const amount=n(e.amount);if(linked.some(x=>!finite(x.amount)))warnings.push(`دفعة مرتبطة بالالتزام ${e.reference||e.id} دون مبلغ صالح.`);if(paid>amount+EPS)warnings.push(`المدفوع يتجاوز الالتزام ${e.reference||e.id}.`);return {...e,paid:round(paid,2),remaining:finite(e.amount)?round(amount-paid,2):null};});
 for(const entry of ledger){if(entry.entry==='paid'&&!ledger.some(e=>e.id===entry.parentId&&e.entry==='commitment'))warnings.push(`دفعة غير مرتبطة بالتزام: ${entry.reference||'دون مرجع'}.`);}
 const seen=new Set();for(const row of ledger){const marker=[row.partyId,row.entry,row.date,row.amount,row.reference].join('|');if(seen.has(marker))warnings.push('يوجد احتمال تكرار دفعة أو التزام في السجل.');seen.add(marker);}
 return {rows,warnings:[...new Set(warnings)],committed:round(sum(rows.map(x=>norm(x.amount))),2),paid:round(sum(rows.map(x=>x.paid)),2)};
}
function evaluateFinance(economics={}){
 const revenue=n(economics.revenue),opex=n(economics.opex),capex=n(economics.capex);
 if(![revenue,opex,capex].every(Number.isFinite)||revenue<0||opex<0||capex<0)return {ok:false};
 const profit=revenue-opex,roi=capex>0?profit/capex*100:null,payback=capex>0&&profit>0?capex/profit:null;
 return {ok:true,revenue,opex,capex,operatingSurplus:round(profit,2),operatingMargin:revenue>0?round(profit/revenue*100,2):null,roi:roi!==null?round(roi,2):null,payback:payback!==null?round(payback,2):null,
 sensitivity:[{case:'متشائم',surplus:round(revenue*.8-opex*1.1,2)},{case:'أساسي',surplus:round(profit,2)},{case:'متفائل',surplus:round(revenue*1.2-opex*.95,2)}]};
}
function compareAlternatives(project){const parties=project?.parties||[],baseline=calculate({...project,final:{status:'pending',shares:{}}}),baseMap=Object.fromEntries(baseline.rows.map(x=>[x.id,x.suggested]));return (project.alternatives||[]).map(a=>({id:a.id,name:a.name||'بديل',rows:parties.map(p=>{const pct=n(a.shares?.[p.id]);const base=n(baseMap[p.id]);return {id:p.id,name:p.name,pct:Number.isFinite(pct)?pct:null,delta:Number.isFinite(pct)&&Number.isFinite(base)?round(pct-base):null}}),total:sum(parties.map(p=>n(a.shares?.[p.id]))),status:a.status||'proposed'}))}
function health(project){const res=calculate(project),ledger=contributions(project),terms=project.terms||{},unset=Object.keys(TERM_TITLES).filter(k=>!String(terms[k]?.value||'').trim());const pending=Object.keys(TERM_TITLES).filter(k=>terms[k]?.status!=='approved');return {warnings:[...new Set([...res.issues,...ledger.warnings,...unset.map(k=>`لم يحدد: ${TERM_TITLES[k]}.`)])],termsUnset:unset,termsUnapproved:pending,results:res,ledger,readiness:Math.max(0,Math.round((Object.keys(TERM_TITLES).length-unset.length)/Object.keys(TERM_TITLES).length*100))}}
return {EPS,PROFILES,TYPES,TERM_TITLES,STATUSES,n,finite,sum,round,percent,allocation,valuation,partnerValue,calculate,contributions,evaluateFinance,compareAlternatives,health};
});
