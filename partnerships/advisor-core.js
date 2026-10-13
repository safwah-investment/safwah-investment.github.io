/* SAFWAH advisory engine: original deterministic rules, no external network or model. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SafwahAdvisorCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const OFFICIAL_REFERENCES=Object.freeze([
 {id:'companies13',title:'نظام الشركات — المادة 13',subject:'مساهمات رأس المال وحصة العمل',url:'https://laws.boe.gov.sa/BoeLaws/Laws/LawDetails/a8376aea-1bc3-49d4-9027-aed900b555af/1',hint:'تمييز الحصص النقدية والعينية عن العمل، بحسب الشكل القانوني.'},
 {id:'companies23',title:'نظام الشركات — المادة 23',subject:'الأرباح والخسائر',url:'https://laws.boe.gov.sa/BoeLaws/Laws/LawDetails/a8376aea-1bc3-49d4-9027-aed900b555af/1',hint:'التحقق من توزيع الأرباح والخسائر وأثر حصة العمل.'},
 {id:'companies25',title:'نظام الشركات — المادة 25',subject:'نقل الملكية والقيد',url:'https://laws.boe.gov.sa/BoeLaws/Laws/LawDetails/a8376aea-1bc3-49d4-9027-aed900b555af/1',hint:'الحساب أو المحضر لا يغني عن القيد النظامي لنقل الحصص والأسهم.'},
 {id:'civil529',title:'نظام المعاملات المدنية — المادة 529',subject:'عقد الشركة المدنية',url:'https://laws.boe.gov.sa/BoeLaws/Laws/LawDetails/655fdb42-8c96-422b-b8c4-b04f0095c94c/1',hint:'تحديد طبيعة العلاقة وأولوية النظام الخاص عند انطباقه.'},
 {id:'realestate',title:'الهيئة العامة للعقار',subject:'الحقوق العقارية والوساطة',url:'https://rega.gov.sa/',hint:'التحقق من صفة المالك والتراخيص والاشتراطات الحالية.'},
 {id:'ministry',title:'وزارة التجارة',subject:'التأسيس والإجراءات',url:'https://mc.gov.sa/',hint:'استكمال الإجراءات الرسمية والشكل القانوني قبل التوقيع أو نقل الملكية.'}
]);
const num=value=>{if(value===null||value===undefined||value==='')return null;let v=Number(String(value).replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/[,٬]/g,''));return Number.isFinite(v)?v:null};
const total=arr=>arr.reduce((a,v)=>a+(num(v)||0),0);
const pct=n=>Number.isFinite(n)?new Intl.NumberFormat('en-US',{maximumFractionDigits:5}).format(n)+'%':'غير محددة';
const sar=n=>Number.isFinite(n)?new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(n)+' ر.س':'غير محدد';
const item=(id,severity,title,evidence,action,source)=>({id,severity,title,evidence,action,source});
function assess(workspace={},project=null){
 const owners=Array.isArray(workspace.owners)?workspace.owners:[],opps=Array.isArray(workspace.opportunities)?workspace.opportunities:[],decisions=Array.isArray(workspace.decisions)?workspace.decisions:[],projs=Array.isArray(workspace.partnerships)?workspace.partnerships:[];
 const t=total(owners.map(o=>o.pct)),risks=[];
 if(!owners.length)risks.push(item('owners-empty','important','سجل ملاك صفوة فارغ','لم تدخل بيانات ملكية الشركة بعد.','أدخل الملاك وفق المستندات المعتمدة.','owners'));
 else if(Math.abs(t-100)>0.000001)risks.push(item('owners-total','critical','مجموع حصص الملاك لا يساوي 100%',`المجموع الحالي ${pct(t)}.`,'راجع نسب جميع الأطراف قبل أي اعتماد أو محاكاة.','owners'));
 if(owners.some(o=>o.type==='entity'&&!String(o.beneficiaries||'').trim()))risks.push(item('ubo-gaps','important','ملكية غير مباشرة تحتاج استكمالاً','توجد جهة اعتبارية دون بيان ملاكها النهائيين.','أكمل سلسلة الملكية وافحص المستفيد الحقيقي من المستندات.','owners'));
 for(const o of opps){
   if(o.documents!=='checked')risks.push(item('op-doc-'+o.id,'important','مستندات فرصة لم تستكمل',`الفرصة: ${String(o.title||'غير مسماة').slice(0,120)}.`,'تحقق من الصك والتفويض والترخيص قبل اعتماد العرض.','opportunities'));
   const allocations=Array.isArray(o.ownerships)?o.ownerships:[];const percentSum=total(allocations.map(x=>x.pct));
   if(!allocations.length||Math.abs(percentSum-100)>0.000001)risks.push(item('op-owners-'+o.id,'important','ملكية أصل غير مكتملة',`الفرصة: ${String(o.title||'غير مسماة').slice(0,120)}، النسب الموثقة في البرنامج ${pct(percentSum)}.`,'أكمل تسجيل الملاك ولا تعتبر البيانات إثباتًا للملكية.','asset-owners'));
 }
 for(const d of decisions){if(d.status!=='recorded')risks.push(item('decision-'+d.id,'review','قرار لم يسجل محضره',`القرار: ${String(d.title||'دون عنوان').slice(0,100)}.`,'راجع النصاب والقرار والتوقيع الخارجي.','decisions'))}
 if(project){const p=project,parties=Array.isArray(p.parties)?p.parties:[],terms=p.terms||{},riskPrefix='project-'+p.id+'-';
  if(parties.some(x=>!String(x.name||'').trim()))risks.push(item(riskPrefix+'names','important','أطراف ملف الشراكة غير مكتملين','يوجد شريك لم يحدد اسمه.','استكمل الأطراف وصفاتهم وأدوارهم.','partnerships'));
  for(const k of ['management','majority','profit','finance','exit','dispute','reporting'])if(!String(terms[k]?.value||'').trim())risks.push(item(riskPrefix+k,'review','بند لم يحسم: '+({management:'الإدارة',majority:'القرارات',profit:'الأرباح',finance:'التمويل',exit:'التخارج',dispute:'النزاعات',reporting:'التقارير'}[k]),'البند لم يسجل له نص محدد.','اعرض المسألة على الأطراف وسجّل المقترح وحالة القرار.','partnerships'));
  const powers=Array.isArray(p.authoritiesDetailed)?p.authoritiesDetailed:[];
  if(!powers.length)risks.push(item(riskPrefix+'powers','important','لا توجد مصفوفة صلاحيات',`ملف الشراكة: ${String(p.title||'غير مسمى').slice(0,90)}.`,'حدد صاحب القرار وحد الصرف والتوقيع والنصاب.','partnerships'));
  const rights=Array.isArray(p.rightsDetailed)?p.rightsDetailed:[];
  if(p.type==='reorganization'&&!rights.length)risks.push(item(riskPrefix+'rights','important','نطاق الحقوق غير موثق','مسار إعادة التنظيم يحتاج فصل حقوق النشاط والعلامة والأرباح.','حدد النطاق ونوع الحق وصاحبه والمدة عند الاقتضاء.','partnerships'));
  if(p.final?.status==='approved'&&(!p.final?.approvedBy||!p.final?.approvedAt))risks.push(item(riskPrefix+'approval','critical','اعتماد دون بيانات كافية','يجب إظهار المعتمدين والتاريخ بوضوح.','استكمل بيانات القرار ولا تعامل الموافقة كإثبات للتوقيع.','partnerships'));
 }
 const unique=[...new Map(risks.map(x=>[x.id,x])).values()];
 return {ownersCount:owners.length,ownersPercent:t,opportunitiesCount:opps.length,decisionsCount:decisions.length,partnershipsCount:projs.length,projectTitle:project?.title||null,risks:unique,critical:unique.filter(x=>x.severity==='critical').length,important:unique.filter(x=>x.severity==='important').length};
}
function buildContext(workspace={},project=null,tab='dashboard',share=false){const a=assess(workspace,project);const pr=project?{type:project.type||'',legalForm:project.legalForm||'',parties:(project.parties||[]).map((p,i)=>({party:i+1,role:p.role||'',cash:num(p.cash),assets:num(p.assets),ip:num(p.ip),work:p.work||'',profit:num(p.profitPct)})),terms:Object.fromEntries(Object.entries(project.terms||{}).map(([k,v])=>[k,{defined:!!String(v?.value||'').trim(),status:v?.status||'pending'}])),riskCount:a.risks.length,financial:{revenue:num(project.economics?.revenue),opex:num(project.economics?.opex),capex:num(project.economics?.capex)},detailedRecords:{roles:(project.rolesDetailed||[]).length,rights:(project.rightsDetailed||[]).length,authorities:(project.authoritiesDetailed||[]).length}}:null;
 return {version:3,section:tab,portfolio:{owners:a.ownersCount,ownershipPercent:a.ownersPercent,opportunities:a.opportunitiesCount,decisions:a.decisionsCount,partnerships:a.partnershipsCount},partnership:pr,risks:a.risks.slice(0,12).map(r=>({severity:r.severity,title:r.title,...(share?{}:{evidence:r.evidence})}))};
}
function answerLocal(question,workspace={},project=null,tab='dashboard'){
 const q=String(question||'').toLowerCase().trim(),a=assess(workspace,project),refs=[];let response='';
 if(/(مخاطر|فجوات|ينقص|جاهز|اكتمال|تدقيق|افحص)/.test(q)){
  response=a.risks.length?`رصدت ${a.critical} مسائل حرجة و${a.important} مسائل مهمة، من أصل ${a.risks.length} ملاحظات.\n`+a.risks.slice(0,6).map((r,i)=>`${i+1}. ${r.title}: ${r.evidence} الإجراء: ${r.action}`).join('\n'):'لم تظهر ملاحظات من الفحوص الآلية الحالية. هذا لا يثبت صحة المستندات أو اكتمال المتطلبات النظامية.';
  if(!a.risks.length)refs.push('companies25');
 }else if(/(حاسب|احسب|حصص|نسبة|ملكية|مساهم|توزيع)/.test(q)){
  response=`ملكية صفوة المباشرة المدخلة: ${pct(a.ownersPercent)} موزعة على ${a.ownersCount} ملاك.\nالنسبة الاسترشادية لأي شراكة = القيمة المقومة للطرف ÷ مجموع القيم × 100. قيمة الجهد غير المدفوع = فرق الأجر الشهري × الأشهر. في دخول المستثمر يختلف ضخ الشركة عن شراء حصة بائع. الملكية المسجلة تحتاج اتفاقًا وإجراءً نظاميًا، ولا تُثبتها الحاسبة.`;
  refs.push('companies13','companies25');
 }else if(/(ربح|خسار|مضارب|أجر)/.test(q)){
  response='فرّق بين حصة رأس المال ونسبة الربح والمقابل المالي والإدارة. في مسار المضاربة تُحدد نسب ربح موجبة متفق عليها، دون استنتاج حصة ملكية. وفي الشركات يُراجع توزيع الأرباح والخسائر بحسب الشكل القانوني وعقد التأسيس.';refs.push('companies23','civil529');
 }else if(/(صلاحيات|توقيع|مدير|حوكمة|نصاب|تصويت)/.test(q)){
  response='الملكية ليست تفويضًا إداريًا تلقائيًا. سجل لكل قرار: صاحبه، النصاب المطلوب، الحد المالي، صاحب التوقيع، والتقرير الدوري. افصل الأعمال اليومية عن القرارات المحفوظة للملاك. محاضر البرنامج وصفية وليست توقيعًا رسميًا.';refs.push('companies25');
 }else if(/(تقييم|استثمار|cash|شراء|بائع|تمويل)/.test(q)){
  response='إذا كانت قيمة الشركة قبل التمويل P وضخ المستثمر I، تصبح القيمة بعد التمويل P + I. وإذا اشترى المستثمر حصة من مالك قائم، فإن المبلغ المدفوع للبائع لا يزيد أصول الشركة. في الصفقة المختلطة افصل Cash-in وCash-out وحدد البائع وتاريخ التقييم ومصدره.';
 }else if(/(نظام|مادة|قانون|شرع|عقد|مرجع|مراجع)/.test(q)){
  response='أهم المراجع المرتبطة بملف الشراكة: نظام الشركات (المواد 13 و23 و25) ونظام المعاملات المدنية (المادة 529)، إضافة إلى متطلبات النشاط والترخيص. النصوص المرجعية ليست بديلًا عن رأي قانوني بشأن وقائع الصفقة.';refs.push('companies13','companies23','companies25','civil529');
 }else if(/(خطه|خطة|تنفيذ|ماذا افعل|خطوات)/.test(q)){
  response='الخطوات المقترحة: 1) استكمال هوية الأطراف والملكية. 2) تدقيق المساهمات والدفعات ومستنداتها. 3) فصل الملكية عن الحقوق والأدوار والصلاحيات. 4) تقييم البدائل والمخاطر. 5) تسجيل البنود التي حسمت والقرارات المعلقة. 6) مراجعة المختص قبل التوقيع والتنفيذ.\nأولوية حالية: '+(a.risks[0]?.title||'التحقق من المستندات الخارجية.');
 }else{
  response='يمكنني تحليل الملف الحالي أو شرح حساب الحصص، ومخاطر الملاك، والتمويل، والأرباح، والحوكمة، والمراجع النظامية. اطرح سؤالًا محددًا، أو اختر «فحص الملف». هذه إجابات ناتجة عن قواعد تحليل محلية وليست محادثة بنموذج ذكاء اصطناعي خارجي.';
 }
 return {answer:response,references:OFFICIAL_REFERENCES.filter(r=>refs.includes(r.id)),riskCount:a.risks.length,mode:'rules'};
}
return {OFFICIAL_REFERENCES,assess,buildContext,answerLocal,pct,sar,num};
});
