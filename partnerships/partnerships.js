/* صفوة | استوديو الشراكات — standalone implementation, no copied third-party source. */
(()=>{'use strict';
const K=window.SafwahPartnershipCore,A=window.SafwahApp,C=window.SafwahCore;
if(!K||!A||!C)return;
const root=document.getElementById('partnership-studio'),E=C.escapeHtml;
const nf=new Intl.NumberFormat('en-US',{maximumFractionDigits:2}),pf=new Intl.NumberFormat('en-US',{maximumFractionDigits:8});
const uid=()=>crypto?.randomUUID?.()||'sf_'+Date.now()+'_'+Math.random().toString(36).slice(2);
const stamp=()=>new Date().toISOString(),today=()=>new Date().toISOString().slice(0,10);
const fmt=n=>Number.isFinite(n)?nf.format(n):'غير محدد',pct=n=>Number.isFinite(n)?pf.format(n)+'%':'لم تحدد',money=n=>Number.isFinite(n)?fmt(n)+' ر.س':'غير محدد';
const viewValue=v=>v===null||v===undefined||Number.isNaN(v)?'':String(v);
const text=v=>E(String(v??''));
const safeDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(v||'')?v:'';
const projectList=()=>A.getSnapshot().partnerships||[];
let currentId=null,step='identity',openHelper=false,helperAnswer='اختر سؤالًا، وسأوضح القاعدة التي تعتمدها الأداة وما تحتاج إليه من بيانات.';
const steps=[['identity','تعريف العلاقة'],['parties','الأطراف والمساهمات'],['ledger','الالتزامات والدفعات'],['calculation','الحصص والتقييم'],['governance','الاتفاق والحوكمة'],['alternatives','البدائل والاعتماد'],['execution','التنفيذ والتقرير']];
const legalForms=['يحدد لاحقًا','شركة ذات مسؤولية محدودة','شركة مساهمة مبسطة','شركة مساهمة','شركة تضامن','اتفاق تعاقدي مستقل','أخرى'];
const statuses={draft:'مسودة',review:'قيد المراجعة',ready:'جاهز للنقاش',completed:'مغلق'};
const roles={partner:'شريك',financier:'ممّول',operator:'عامل / مدير',investor:'مستثمر',advisor:'مستشار',other:'دور آخر'};
const entryLabels={commitment:'التزام أو مساهمة متفق عليها',paid:'دفعة مدفوعة فعلًا'};
const categories={cash:'نقد',asset:'أصل',work:'عمل',ip:'ملكية فكرية',fee:'أتعاب',license:'ترخيص',loan:'تمويل/قرض',other:'أخرى'};
function blankParty(){return {id:uid(),name:'',role:'partner',cash:null,assets:null,ip:null,other:null,work:'no',marketSalary:null,salaryPaid:null,months:null,profitPct:null,currentPct:null,notes:''}}
function blankProject(type='operating'){
 return {id:uid(),title:'',client:'',type,stage:'draft',legalForm:'يحدد لاحقًا',city:'',objective:'',createdAt:stamp(),updatedAt:stamp(),parties:type==='existing'?[blankParty(),blankParty(),{...blankParty(),name:'المستثمر الجديد',role:'investor',newInvestor:true,currentPct:0}]:[blankParty(),blankParty()],profile:'balanced',
 ledger:[],investor:{name:'مستثمر جديد',preMoney:null,cashIn:null,cashOut:null,sellerId:''},
 terms:Object.fromEntries(Object.keys(K.TERM_TITLES).map(key=>[key,{value:'',status:'pending'}])),
 alternatives:[],final:{shares:{},status:'pending',approvedBy:'',approvedAt:''},economics:{revenue:null,opex:null,capex:null},tasks:[],audit:[]};
}
function get(){return projectList().find(p=>p.id===currentId)||null}
function audit(project,action){project.audit=Array.isArray(project.audit)?project.audit:[];project.audit.unshift({at:stamp(),action});project.audit=project.audit.slice(0,80)}
function persist(project,action='تحديث بيانات شراكة'){if(!project)return;project.updatedAt=stamp();if(action)audit(project,action);A.upsertPartnership(project,action)}
const opts=(dict,val)=>Object.entries(dict).map(([key,label])=>`<option value="${text(key)}" ${String(key)===String(val)?'selected':''}>${text(label)}</option>`).join('');
function f(label,html,hint=''){return `<label class="ps-field"><span>${text(label)}</span>${html}${hint?`<small>${text(hint)}</small>`:''}</label>`}
function pInput(key,label,val,type='text',attrs='',hint=''){return f(label,`<input data-project-field="${key}" type="${type}" value="${text(viewValue(val))}" ${attrs}>`,hint)}
function partyInput(p,key,label,type='text',attrs='',hint=''){return f(label,`<input data-party="${text(p.id)}" data-field="${key}" type="${type}" value="${text(viewValue(p[key]))}" ${attrs}>`,hint)}
function statusChip(status){let statusText=K.STATUSES[status]||statuses[status]||status||'مسودة';let cls=status==='approved'||status==='ready'?'ps-positive':status==='pending'?'ps-muted':'ps-proposed';return `<span class="ps-pill ${cls}">${text(statusText)}</span>`}
function portfolio(){const data=projectList(),owners=A.getSnapshot().owners||[];
 return `<div class="ps-intro-grid">
  <div class="ps-feature"><div class="ps-feature-icon">01</div><h2>تأسيس شراكة</h2><p>حدد المساهمة المالية والعملية والحقوق ونسب الربح المبدئية.</p></div>
  <div class="ps-feature"><div class="ps-feature-icon">02</div><h2>دخول مستثمر</h2><p>احسب تمويل الشركة وبيع حصة المالك دون الخلط بينهما.</p></div>
  <div class="ps-feature"><div class="ps-feature-icon">03</div><h2>تنظيم الشراكات القائمة</h2><p>ثبّت الوضع الراهن والأدوار والالتزامات والهيكل المتفق عليه.</p></div>
 </div>
 <div class="ps-summary-bar"><span><b>${data.length}</b> ملفات محفوظة</span><span><b>${data.filter(x=>x.final?.status==='approved').length}</b> ملفات سُجّل لها اعتماد داخلي</span><span><b>${owners.length}</b> ملاك مسجلون في صفوة</span></div>
 <section class="card ps-card"><div class="section-head"><h2>ابدأ ملف شراكة</h2><span class="subtle">اختر طبيعة العلاقة أولًا</span></div>
 <div class="ps-type-grid">${Object.entries(K.TYPES).map(([id,name])=>`<button type="button" class="ps-type-btn" data-ps-action="new" data-id="${id}"><span class="ps-type-dot">${({operating:'◈',deal:'◇',startup:'✦',existing:'↗',mudaraba:'◉',reorganization:'↻'})[id]}</span><strong>${text(name)}</strong><small>إنشاء ملف مستقل</small></button>`).join('')}</div>
 <div class="ps-inline-actions"><button type="button" class="btn btn-outline" data-ps-action="sample">تحميل مثال تعليمي كامل</button><label class="btn btn-outline ps-import-file">استيراد ملف شراكة JSON<input type="file" data-ps-import accept=".json,application/json" hidden></label><button type="button" class="btn btn-outline" data-ps-action="help">كيف تعمل طريقة صفوة؟</button></div>
 </section>
 <section class="card ps-card"><div class="section-head"><h2>ملفات الشراكات</h2><span class="subtle">المحفوظة على جهازك</span></div>
 ${data.length?`<div class="ps-project-list">${data.map(p=>`<div class="ps-project-row"><div class="ps-project-title"><strong>${text(p.title||'شراكة بلا اسم')}</strong><small>${text(K.TYPES[p.type]||p.type)} · ${text(p.client||'لم تحدد الجهة')} · تحديث ${text((p.updatedAt||'').slice(0,10))}</small></div><div>${statusChip(p.final?.status||p.stage)}</div><div class="small-actions"><button class="btn btn-primary btn-small" data-ps-action="open" data-id="${text(p.id)}">فتح</button><button class="btn btn-outline btn-small" data-ps-action="clone" data-id="${text(p.id)}">نسخ</button><button class="btn btn-danger btn-small" data-ps-action="delete" data-id="${text(p.id)}">حذف</button></div></div>`).join('')}</div>`:'<div class="empty">لا توجد ملفات بعد. اختر نوع الشراكة لإنشاء الملف الأول، أو حمّل المثال التعليمي للتعرّف على التطبيق.</div>'}
 </section>${helpBox()}`;
}
function stageNav(){return `<nav class="ps-steps" aria-label="مراحل ملف الشراكة">${steps.map(([key,title],i)=>`<button type="button" data-ps-action="step" data-id="${key}" class="ps-step ${key===step?'active':''}" ${key===step?'aria-current="step"':''}><span>${i+1}</span>${text(title)}</button>`).join('')}</nav>`}
function workspace(p){const h=K.health(p),calc=h.results;
 return `<div class="ps-workspace-header"><div><button type="button" class="ps-back" data-ps-action="back">← جميع الملفات</button><span class="eyebrow">PARTNERSHIP WORKSPACE</span><h2>${text(p.title||'شراكة جديدة')}</h2><p>${text(K.TYPES[p.type]||p.type)} · ${text(p.client||'الجهة غير محددة')} · ${statusChip(p.final?.status)}</p></div>
 <div class="ps-header-actions"><button type="button" class="btn btn-outline btn-small" data-ps-action="duplicate-current">نسخ الملف</button><button type="button" class="btn btn-primary btn-small" data-ps-action="export-word">تنزيل Word</button></div></div>
 ${stageNav()}
 <div class="ps-wizard-layout"><main class="ps-work-main">${renderStep(p,calc,h)}</main><aside class="ps-work-side">${sidebar(p,h)}</aside></div>
 <div class="ps-bottom-nav"><button type="button" class="btn btn-outline" data-ps-action="prev" ${step===steps[0][0]?'disabled':''}>المرحلة السابقة</button><span>الحفظ تلقائي عند تعديل الحقول</span><button type="button" class="btn btn-primary" data-ps-action="next" ${step===steps.at(-1)[0]?'disabled':''}>المرحلة التالية</button></div>`;
}
function renderStep(p,calc,h){switch(step){case'identity':return identity(p);case'parties':return parties(p);case'ledger':return ledger(p,h.ledger);case'calculation':return calculation(p,calc);case'governance':return governance(p);case'alternatives':return alternatives(p,calc);case'execution':return execution(p,h);default:return identity(p)}}
function identity(p){return `<section class="card ps-card"><div class="section-head"><h2>1. تعريف المشروع والقرار المطلوب</h2>${statusChip(p.stage)}</div><div class="ps-form-grid">
 ${pInput('title','اسم المشروع أو الصفقة',p.title,'text','required maxlength="180" placeholder="اسم واضح ومختصر"')}
 ${pInput('client','الجهة / صاحب المشروع',p.client,'text','maxlength="160" placeholder="مثال: صفوة أو إحدى الشركات"')}
 ${f('طبيعة الشراكة',`<select data-project-field="type">${opts(K.TYPES,p.type)}</select>`)}
 ${f('مرحلة الملف',`<select data-project-field="stage">${opts(statuses,p.stage)}</select>`)}
 ${f('الشكل القانوني المقترح',`<select data-project-field="legalForm">${legalForms.map(x=>`<option ${x===p.legalForm?'selected':''}>${text(x)}</option>`).join('')}</select>`, 'التصنيف المبدئي لا ينشئ شركة ولا يثبت حصة.')}
 ${pInput('city','المدينة / السوق',p.city,'text','maxlength="120" placeholder="المدينة المنورة أو غيرها"')}
 ${f('الهدف والقرار المطلوب',`<textarea data-project-field="objective" rows="5" maxlength="3000" placeholder="ما النتيجة المقصودة، ومن صاحب القرار، ومتى يلزم القرار؟">${text(p.objective)}</textarea>`)}
 </div></section>
 <section class="card ps-card"><h2>كيف تقرأ هذا المسار؟</h2><div class="ps-process"><span>تعريف العلاقة</span><b>←</b><span>توثيق المساهمات</span><b>←</b><span>تقدير الحصص</span><b>←</b><span>اتفاق الأطراف</span><b>←</b><span>خطة التنفيذ</span></div>
 <p class="tiny-note">يفصل النظام عمدًا بين التقدير الاسترشادي للحصص، والملكية التي يعتمدها الشركاء، والتسجيل الرسمي للملكية. لا تنتقل ملكية بمجرد إدخال البيانات.</p>
 <div class="ps-inline-actions"><button class="btn btn-outline" data-ps-action="import-owners">نسخ بيانات ملاك صفوة الحاليين إلى هذا الملف</button></div></section>`}
function parties(p){return `<section class="card ps-card"><div class="section-head"><h2>2. الأطراف والمساهمات</h2><button class="btn btn-primary btn-small" data-ps-action="add-party">+ إضافة طرف</button></div><p class="muted">ادخل قيمة كل مساهمة مرة واحدة فقط. وتبقى الدفعات الفعلية بسجل مستقل، حتى لا تُحسب مرتين.</p>
 ${p.parties.map((x,i)=>`<div class="ps-party-card"><div class="ps-party-head"><h3>الطرف ${i+1} <small>${text(x.name||'لم يسمَّ بعد')}${x.newInvestor?' · مستثمر جديد':''}</small></h3><button class="btn btn-danger btn-small" data-ps-action="remove-party" data-id="${text(x.id)}">حذف الطرف</button></div>
 <div class="ps-form-grid">${partyInput(x,'name','اسم الشريك','text','maxlength="160" placeholder="اسم شخص أو شركة"')}
 ${f('صفته في العلاقة',`<select data-party="${text(x.id)}" data-field="role">${opts(roles,x.role)}</select>`)}
 ${partyInput(x,'cash','رأس المال النقدي المقوّم (ريال)', 'text','inputmode="decimal"')}
 ${partyInput(x,'assets','قيمة الأصول والعينيات (ريال)','text','inputmode="decimal"')}
 ${partyInput(x,'ip','قيمة الملكية الفكرية (ريال)','text','inputmode="decimal"')}
 ${partyInput(x,'other','التزامات قابلة للتقييم (ريال)','text','inputmode="decimal"')}
 ${f('هل يقدم عملًا للمشروع؟',`<select data-party="${text(x.id)}" data-field="work">${opts({no:'لا',yes:'نعم'},x.work)}</select>`)}
 ${partyInput(x,'marketSalary','القيمة السوقية الشهرية للعمل (ريال)','text','inputmode="decimal"')}
 ${partyInput(x,'salaryPaid','المقابل الشهري المدفوع (ريال)','text','inputmode="decimal"')}
 ${partyInput(x,'months','مدة العمل بالأشهر','text','inputmode="decimal"')}
 ${partyInput(x,'profitPct','نسبة الأرباح المقترحة (%)','text','inputmode="decimal" placeholder="اختياري"')}
 ${p.type==='existing'&&!x.newInvestor?partyInput(x,'currentPct','نسبة الملكية الحالية (%)','text','inputmode="decimal"'):''}
 ${f('الدور والحقوق الخاصة',`<textarea data-party="${text(x.id)}" data-field="notes" rows="2" maxlength="1500">${text(x.notes)}</textarea>`)}
 </div></div>`).join('')}
 <div class="ps-inline-actions"><button class="btn btn-outline" data-ps-action="add-party">إضافة شريك آخر</button><button class="btn btn-outline" data-ps-action="import-owners">استيراد ملاك صفوة إلى هذا الملف</button></div>
 <p class="tiny-note">قيمة العمل = الجزء غير المدفوع من أجر السوق × مدة الالتزام. الأرقام قابلة للتفاوض وليست تقريرًا محاسبيًا أو إثباتًا نظاميًا لرأس المال.</p></section>`}
function ledger(p,summary){const refs=p.ledger.filter(x=>x.entry==='commitment');return `<section class="card ps-card"><div class="section-head"><h2>3. السجل المالي والدفعات</h2><button class="btn btn-primary btn-small" data-ps-action="add-ledger">+ تسجيل التزام أو دفعة</button></div>
 <p class="muted">سجل الالتزام مرة واحدة، ثم اربط به الدفعات الفعلية. المدفوع ليس إضافة تلقائية جديدة إلى رأس المال.</p>
 <div class="ps-metrics"><div><small>التزامات مسجلة</small><b>${money(summary.committed)}</b></div><div><small>مدفوع مرتبط</small><b>${money(summary.paid)}</b></div></div>
 ${summary.warnings.length?`<div class="ps-warning-list">${summary.warnings.map(x=>`<p>⚠ ${text(x)}</p>`).join('')}</div>`:''}
 ${p.ledger.length?p.ledger.map((l,i)=>`<div class="ps-compact-card"><div class="ps-party-head"><h3>القيد ${i+1}</h3><button class="btn btn-danger btn-small" data-ps-action="remove-ledger" data-id="${text(l.id)}">حذف</button></div>
 <div class="ps-form-grid">
 ${f('الطرف',`<select data-ledger="${text(l.id)}" data-field="partyId">${opts(Object.fromEntries(p.parties.map(x=>[x.id,x.name||'طرف دون اسم'])),l.partyId)}</select>`)}
 ${f('نوع الحركة',`<select data-ledger="${text(l.id)}" data-field="entry">${opts(entryLabels,l.entry)}</select>`)}
 ${f('التصنيف',`<select data-ledger="${text(l.id)}" data-field="category">${opts(categories,l.category)}</select>`)}
 ${f('قيمة الحركة',`<input data-ledger="${text(l.id)}" data-field="amount" inputmode="decimal" value="${text(viewValue(l.amount))}">`)}
 ${f('تاريخ الحركة',`<input type="date" data-ledger="${text(l.id)}" data-field="date" value="${text(safeDate(l.date))}">`)}
 ${f('الالتزام الذي تتبعه الدفعة',`<select data-ledger="${text(l.id)}" data-field="parentId"><option value="">${l.entry==='paid'?'اختر الالتزام':'لا ينطبق'}</option>${refs.filter(x=>x.id!==l.id).map(x=>`<option value="${text(x.id)}" ${x.id===l.parentId?'selected':''}>${text(x.reference||x.id.slice(0,8))} · ${text(p.parties.find(z=>z.id===x.partyId)?.name||'طرف')}</option>`).join('')}</select>`)}
 ${f('مرجع المستند / وصف الالتزام',`<input data-ledger="${text(l.id)}" data-field="reference" value="${text(l.reference||'')}" maxlength="160">`)}
 ${f('حالة القيد',`<select data-ledger="${text(l.id)}" data-field="status">${opts(K.STATUSES,l.status)}</select>`)}
 </div></div>`).join(''):'<div class="empty">لا توجد التزامات أو دفعات مسجلة بعد.</div>'}</section>`}
function barRows(rows,key='suggested'){return `<div class="ps-result-rows">${rows.map((r,i)=>`<div class="ps-result-row"><div class="ps-result-name"><span class="ps-bullet" style="background:${['#19384e','#ad8854','#347d7e','#6c718d','#9b6170','#6b8750'][i%6]}"></span>${text(r.name)}</div><strong>${pct(r[key])}</strong><div class="ps-track"><span style="width:${Math.max(0,Math.min(100,Number(r[key])||0))}%;background:${['#19384e','#ad8854','#347d7e','#6c718d','#9b6170','#6b8750'][i%6]}"></span></div></div>`).join('')}</div>`}
function calculation(p,res){const isExisting=p.type==='existing',isStartup=p.type==='startup',isMud=p.type==='mudaraba';
 return `<section class="card ps-card"><div class="section-head"><h2>4. حساب الحصص والتقييم</h2><span class="subtle">المحرك الحسابي مستقل عن الاعتماد</span></div>
 ${isStartup?`<div class="ps-form-grid">${f('منهج الترجيح المبدئي',`<select data-project-field="profile">${opts(Object.fromEntries(Object.entries(K.PROFILES).map(([k,v])=>[k,v.label])),p.profile)}</select>`,'الترجيحات تُستخدم فقط لمسار المشروع الناشئ ويمكن مراجعتها تفاوضيًا.')}</div>`:''}
 ${isExisting?`<div class="ps-form-grid">
 ${f('اسم المستثمر الجديد',`<input data-investor="name" value="${text(p.investor.name||'')}" maxlength="160">`)}
 ${f('تقييم الشركة قبل دخول المستثمر (ريال)',`<input data-investor="preMoney" inputmode="decimal" value="${text(viewValue(p.investor.preMoney))}">`)}
 ${f('مبلغ يضخ داخل الشركة Cash-in',`<input data-investor="cashIn" inputmode="decimal" value="${text(viewValue(p.investor.cashIn))}">`)}
 ${f('مبلغ يدفع إلى مالك بائع Cash-out',`<input data-investor="cashOut" inputmode="decimal" value="${text(viewValue(p.investor.cashOut))}">`)}
 ${f('المالك الذي يبيع الحصة',`<select data-investor="sellerId"><option value="">دون بيع حصة</option>${p.parties.map(x=>`<option value="${text(x.id)}" ${x.id===p.investor.sellerId?'selected':''}>${text(x.name||'طرف غير مسمى')}</option>`).join('')}</select>`)}
 </div><p class="tiny-note">التقييم بعد الاستثمار = التقييم قبل الاستثمار + المبلغ الداخل للشركة فقط. شراء الحصص من مالك قائم لا يزيد أصول الشركة بذاته.</p>`:''}
 ${isMud?'<div class="ps-callout"><b>المضاربة:</b> في هذا المسار تُعرض نسب ربح متفق عليها، ولا تُستنتج ملكية في الشركة من الجهد أو رأس مال المضاربة.</div>':''}
 ${res.issues.length?`<div class="ps-warning-list">${res.issues.map(x=>`<p>⚠ ${text(x)}</p>`).join('')}</div>`:''}
 ${res.rows.length?`<div class="ps-metrics"><div><small>${isExisting?'تقييم بعد الاستثمار':'إجمالي المساهمات المقوّمة'}</small><b>${money(isExisting?res.financial?.postMoney:res.scoreTotal)}</b></div><div><small>${isExisting?'نسبة المستثمر الجديد':isMud?'نسب الربح': 'نوع التوزيع'}</small><b>${isExisting?pct(res.financial?.investorPct):isMud?'اتفاق الأطراف':res.weighted?'مرجّح استرشاديًا':'مباشر بالقيمة'}</b></div></div>
 <h3>${isMud?'نسب الربح المتفق عليها':'النسب الاسترشادية'}</h3>${barRows(isMud?res.profitRows:res.rows,isMud?'profit':'suggested')}`:''}
 ${!isMud&&res.rows.length?`<div class="ps-inline-actions"><button class="btn btn-secondary" data-ps-action="copy-calc">نقل هذه النسب إلى مسودة الملكية المتفق عليها</button></div>`:''}
 ${!isMud&&res.agreed?`<div class="ps-callout"><strong>ملكية معتمدة داخليًا ومستقلة عن الحساب:</strong>${res.agreed.map(x=>` <span>${text(x.name)} ${pct(x.pct)}</span>`).join(' · ')}</div>`:''}
 <p class="tiny-note">أي نسبة في هذه الشاشة تقدير حسابي فقط؛ لا تنتقل الملكية أو تعتمد اتفاقات من خلال الحساب.</p></section>`}
function governance(p){const defaults={management:'تحديد المدير اليومي وحدود صلاحياته',majority:'التصويت بحسب النسب أو النصاب المتفق عليه',finance:'تحديد آلية تمويل الاحتياجات الإضافية',profit:'توضيح نسب توزيع الربح والخسائر',duration:'تحديد مدة الشراكة أو شروط انتهائها',exit:'حق العرض الأول وآلية التقييم',dispute:'التسوية الودية ثم الجهة المختصة',ip:'تحديد مالك العلامة وآلية الترخيص',transfer:'قيود التنازل عن الحصص',reporting:'تحديد دورية التقارير وحق الاطلاع'};
 return `<section class="card ps-card"><div class="section-head"><h2>5. مسودة البنود والحوكمة</h2><span class="subtle">القرارات غير المحسومة تظهر صراحة</span></div>
 <p class="muted">كل بند يبدأ «لم يُحسم»، ثم يُقترح نصه، وبعد اتفاق الأطراف يمكنك تسجيله «معتمد إداريًا». الاعتماد هنا تدوين يدوي وليس إثباتًا للتوقيع.</p>
 <div class="ps-inline-actions"><button class="btn btn-outline" data-ps-action="suggest-terms">توليد أسئلة وبنود إرشادية للمراجعة</button></div>
 ${Object.entries(K.TERM_TITLES).map(([key,title],i)=>{const term=p.terms?.[key]||{value:'',status:'pending'};return `<div class="ps-term-card"><div class="ps-term-head"><strong>${i+1}. ${text(title)}</strong>${statusChip(term.status)}</div><div class="ps-term-fields">${f('النص المقترح أو قرار الشركاء',`<textarea data-term="${key}" data-field="value" rows="2" placeholder="${text(defaults[key])}">${text(term.value)}</textarea>`)}${f('حالة القرار',`<select data-term="${key}" data-field="status">${opts(K.STATUSES,term.status)}</select>`)}</div></div>`}).join('')}
 <div class="ps-callout">الصياغة النهائية يجب أن تُراجع مع مختص وفق الشكل النظامي للشركة وطبيعة الصفقة؛ بعض البنود يمكن أن يكون لها أثر قانوني حتى لو سميت «مسودة».</div></section>`}
function alternatives(p,res){const alternatives=K.compareAlternatives(p),totalFinal=p.parties.reduce((a,x)=>a+(K.n(p.final?.shares?.[x.id])||0),0);
 return `<section class="card ps-card"><div class="section-head"><h2>6. مقارنة البدائل</h2><button class="btn btn-primary btn-small" data-ps-action="add-alternative">+ بديل جديد</button></div>
 ${p.type==='mudaraba'?'<p class="ps-callout">في المضاربة تُناقش بدائل نسب الأرباح والالتزامات في البنود، لا ملكية تلقائية ناتجة عن توزيع الأرباح.</p>':''}
 ${p.alternatives.length?p.alternatives.map((alt,i)=>`<div class="ps-compact-card"><div class="ps-party-head"><h3>البديل ${i+1}: ${text(alt.name||'غير مسمى')}</h3><button data-ps-action="remove-alternative" data-id="${text(alt.id)}" class="btn btn-danger btn-small">حذف</button></div>
 <div class="ps-form-grid">${f('اسم البديل',`<input data-alt="${text(alt.id)}" data-field="name" value="${text(alt.name)}">`)}
 ${f('حالة البديل',`<select data-alt="${text(alt.id)}" data-field="status">${opts(K.STATUSES,alt.status)}</select>`)}
 ${p.parties.map(x=>f(`${x.name||'طرف'} · النسبة المقترحة (%)`,`<input data-alt="${text(alt.id)}" data-share="${text(x.id)}" value="${text(viewValue(alt.shares?.[x.id]))}" inputmode="decimal">`)).join('')}
 ${f('أثر البديل والمخاطر',`<textarea data-alt="${text(alt.id)}" data-field="notes" rows="3">${text(alt.notes)}</textarea>`)}
 </div><div class="ps-inline-actions"><button class="btn btn-outline btn-small" data-ps-action="choose-alt" data-id="${text(alt.id)}">نسخ نسب البديل إلى مسودة الملكية</button></div></div>`).join(''):'<div class="empty">لم تُسجل بدائل بعد. أنشئ بديلًا للمقارنة مع التوزيع الحسابي.</div>'}
 </section><section class="card ps-card"><div class="section-head"><h2>الهيكل المتفق عليه</h2>${statusChip(p.final?.status)}</div><p class="muted">هذه النسب مستقلة عن الحاسبة. لا يغيّر الحساب أو تعديل البدائل قرار الملكية المسجل.</p>
 <div class="ps-form-grid">${p.parties.map(x=>f(`الملكية المتفق عليها · ${x.name||'طرف'} (%)`,`<input inputmode="decimal" data-final-share="${text(x.id)}" value="${text(viewValue(p.final.shares?.[x.id]))}">`)).join('')}
 ${f('من سجل موافقة الأطراف؟',`<input data-final="approvedBy" value="${text(p.final.approvedBy)}" maxlength="200" placeholder="الجهة أو أسماء الأطراف"`)}
 ${f('تاريخ القرار',`<input type="date" data-final="approvedAt" value="${text(safeDate(p.final.approvedAt))}">`)}
 </div><div class="ps-metrics"><div><small>إجمالي الملكية المدخلة</small><b>${pct(totalFinal)}</b></div><div><small>حالة التسجيل</small><b>${text(K.STATUSES[p.final.status]||'لم يحسم')}</b></div></div>
 <div class="ps-inline-actions"><button class="btn btn-secondary" data-ps-action="approve-final">تسجيل اعتماد الأطراف</button><button class="btn btn-outline" data-ps-action="unapprove-final">إعادة إلى مقترح</button></div>
 <p class="tiny-note">لا تمثل هذه الوظيفة تصديق توقيع ولا إيداع عقد تأسيس أو نقل حصة لدى الجهة المختصة.</p></section>`}
function execution(p,h){const finance=K.evaluateFinance(p.economics);return `<section class="card ps-card"><div class="section-head"><h2>7. التشغيل والمالية وخطة التنفيذ</h2><button class="btn btn-primary btn-small" data-ps-action="add-task">+ إضافة مهمة</button></div>
 <h3>تقدير مبسط للتدفق التشغيلي السنوي</h3><p class="muted">هذه حسابات إيضاحية قبل الضرائب وتكاليف التمويل والإهلاك. يمكن تركها فارغة إذا لم تتوفر بيانات موثوقة.</p>
 <div class="ps-form-grid">${f('إيرادات السنة المتوقعة (ريال)',`<input data-econ="revenue" inputmode="decimal" value="${text(viewValue(p.economics.revenue))}">`)}
 ${f('مصروفات التشغيل السنوية (ريال)',`<input data-econ="opex" inputmode="decimal" value="${text(viewValue(p.economics.opex))}">`)}
 ${f('الاستثمار الأولي CAPEX (ريال)',`<input data-econ="capex" inputmode="decimal" value="${text(viewValue(p.economics.capex))}">`)}</div>
 ${finance.ok?`<div class="ps-metrics ps-metrics-three"><div><small>الفائض التشغيلي السنوي</small><b>${money(finance.operatingSurplus)}</b></div><div><small>هامش التشغيل</small><b>${pct(finance.operatingMargin)}</b></div><div><small>استرداد الاستثمار التقديري</small><b>${finance.payback===null?'غير متاح':fmt(finance.payback)+' سنة'}</b></div></div>
 <div class="ps-sensitivity">${finance.sensitivity.map(s=>`<div><small>${text(s.case)}</small><strong>${money(s.surplus)}</strong></div>`).join('')}</div>`:''}
 <div class="divider"></div><h3>خطة العمل والمسؤوليات</h3>
 ${p.tasks.length?p.tasks.map((t,i)=>`<div class="ps-task-row"><strong>${i+1}</strong><input data-task="${text(t.id)}" data-field="title" value="${text(t.title)}" placeholder="العمل المطلوب" aria-label="العمل المطلوب"><input data-task="${text(t.id)}" data-field="owner" value="${text(t.owner)}" placeholder="المسؤول" aria-label="المسؤول"><input type="date" data-task="${text(t.id)}" data-field="due" value="${text(safeDate(t.due))}" aria-label="الموعد"><select data-task="${text(t.id)}" data-field="status" aria-label="حالة التنفيذ">${opts({pending:'لم تبدأ',doing:'جار التنفيذ',done:'مكتملة'},t.status)}</select><button class="ps-icon-danger" data-ps-action="remove-task" data-id="${text(t.id)}" aria-label="حذف المهمة">×</button></div>`).join(''):'<div class="empty">لم تضاف مهام تنفيذ بعد.</div>'}
 <div class="divider"></div><div class="section-head"><h3>تقرير واتفاق مبدئي</h3><span class="subtle">معد للمراجعة</span></div>
 <div class="ps-inline-actions"><button class="btn btn-primary" data-ps-action="export-word">تنزيل التقرير Word</button><button class="btn btn-outline" data-ps-action="print">طباعة / PDF</button><button class="btn btn-outline" data-ps-action="export-json">نسخة JSON مستقلة</button><button class="btn btn-outline" data-ps-action="export-html">HTML</button></div>
 <div class="ps-report-preview">${reportHtml(p,h)}</div>
 </section>`}
function sidebar(p,h){const top=Math.min(100,h.readiness);return `<div class="card ps-side-card"><h3>مؤشرات اكتمال الملف</h3><div class="ps-ready"><strong>${top}%</strong><small>اكتمال موضوعات الاتفاق بالنص، وليس اعتمادها</small></div><div class="progress"><span style="width:${top}%"></span></div>
 <div class="ps-side-meta"><span>عدد الأطراف</span><b>${p.parties.length}</b></div><div class="ps-side-meta"><span>بنود لم تعتمد</span><b>${h.termsUnapproved.length}</b></div><div class="ps-side-meta"><span>بنود بحاجة لاستكمال</span><b>${h.termsUnset.length}</b></div><div class="ps-side-meta"><span>تنبيهات السجل المالي</span><b>${h.ledger.warnings.length}</b></div></div>
 <div class="card ps-side-card"><h3>مراجعة المخاطر والفجوات</h3>${h.warnings.length?`<div class="ps-side-warnings">${h.warnings.slice(0,6).map(t=>`<p><span>!</span>${text(t)}</p>`).join('')}</div>`:'<p class="muted">لم تظهر تنبيهات في الفحوص المبرمجة. يجب إجراء مراجعة بشرية للمستندات.</p>'}</div>
 <div class="card ps-side-card"><h3>المساعد الإرشادي لصفوة</h3><p class="muted">مساعد قائم على قواعد معلنة من بيانات الملف. لا يتصل حاليًا بنموذج ذكاء اصطناعي خارجي.</p>
 <div class="ps-helper-links"><button data-ps-action="ask" data-id="shares">كيف حُسبت الحصص؟</button><button data-ps-action="ask" data-id="difference">ما الفرق بين الملكية والأرباح؟</button><button data-ps-action="ask" data-id="missing">ما الذي ينقص ملفي؟</button><button data-ps-action="ask" data-id="legal">هل هذه وثيقة ملزمة؟</button></div>
 ${openHelper?`<div class="ps-helper-answer">${text(helperAnswer)}</div>`:''}</div><div class="card ps-side-card"><h3>مراجع التحقق</h3><p class="muted">قبل اعتماد الوثائق، راجع الأنظمة السارية والمتطلبات بحسب النشاط والشكل القانوني.</p><a class="ps-legal-link" target="_blank" rel="noopener noreferrer" href="https://laws.boe.gov.sa/">بوابة الأنظمة السعودية ↗</a><a class="ps-legal-link" target="_blank" rel="noopener noreferrer" href="https://mc.gov.sa/">وزارة التجارة ↗</a></div>`}
function helpBox(){return `<section class="ps-guidelines ${openHelper?'open':''}"><div class="ps-guideline-head"><strong>طريقة احتساب الملكية في صفوة</strong><button class="btn btn-outline btn-small" data-ps-action="help">${openHelper?'إخفاء':'عرض'}</button></div>${openHelper?`<p>تجمع المنصة مساهمات كل شريك القابلة للتقدير، وتعرض حصة استرشادية من إجمالي المساهمات. في الشركات القائمة يفصل الحساب الضخ في الشركة عن المبلغ المدفوع لمالك بائع. في المضاربة تُعرض نسب الربح، لا حصص ملكية ناشئة تلقائيًا.</p><p>كل نسبة أو موافقة داخل المنصة تحتاج تحققًا مستقلاً مع الأطراف والمستشار المختص. لا تخزن كلمات مرور أو هويات أو معلومات سرية في الإصدار المحلي.</p>`:''}</section>`}
function render(){if(!root)return;const p=get();if(currentId&&!p)currentId=null;root.innerHTML=currentId?workspace(p):portfolio()}
function numeric(key,v){const x=K.n(v);if(v==='')return null;if(!Number.isFinite(x)||x<0)throw new Error(`تحقق من الحقل (${key})؛ المطلوب عدد غير سالب.`);return x}
function updateEntity(p,selector,field,value){const arr={party:p.parties,ledger:p.ledger,alt:p.alternatives,task:p.tasks}[selector],row=arr.find(x=>x.id===field.id);if(!row)throw new Error('السجل غير موجود.');const k=field.key;if(k==='shares'){row.shares=row.shares||{};row.shares[field.share]=numeric('النسبة',value)}else if(['cash','assets','ip','other','marketSalary','salaryPaid','months','profitPct','currentPct','amount'].includes(k))row[k]=numeric(k,value);else row[k]=value;
 if(selector==='alt'&&k!=='status')row.status='proposed';if(selector==='ledger'&&k!=='status')row.status='proposed';return row}
function changed(e){const el=e.target,p=get();if(!p)return;try{
 const v=el.value;
 if(el.dataset.projectField){const k=el.dataset.projectField;p[k]=v;if(k==='type'){p.final.status='proposed';p.final.approvedBy='';p.final.approvedAt='';}}
 else if(el.dataset.party){updateEntity(p,'party',{id:el.dataset.party,key:el.dataset.field},v);p.final.status='proposed';}
 else if(el.dataset.ledger){updateEntity(p,'ledger',{id:el.dataset.ledger,key:el.dataset.field},v);}
 else if(el.dataset.investor){const k=el.dataset.investor;p.investor[k]=['preMoney','cashIn','cashOut'].includes(k)?numeric(k,v):v;}
 else if(el.dataset.term){const key=el.dataset.term,k=el.dataset.field;p.terms[key]??={value:'',status:'pending'};p.terms[key][k]=v;if(k==='value')p.terms[key].status=v.trim()?'proposed':'pending';}
 else if(el.dataset.alt){updateEntity(p,'alt',{id:el.dataset.alt,key:el.dataset.share?'shares':el.dataset.field,share:el.dataset.share},v)}
 else if(el.dataset.finalShare){p.final.shares[el.dataset.finalShare]=numeric('نسبة الملكية',v);p.final.status='proposed';}
 else if(el.dataset.final){p.final[el.dataset.final]=v;p.final.status='proposed'}
 else if(el.dataset.econ){p.economics[el.dataset.econ]=numeric(el.dataset.econ,v)}
 else if(el.dataset.task){updateEntity(p,'task',{id:el.dataset.task,key:el.dataset.field},v)}
 else return;
 persist(p,'تحديث '+(p.title||'الملف'));render();
 }catch(err){A.message(err.message,true);render()}}
function showAssistance(p,topic){const results=K.health(p);const content={shares:'النسبة الحسابية = القيمة المقومة لكل طرف ÷ مجموع القيم المقومة لجميع الأطراف × 100. الشركات الناشئة تستخدم وزنًا تفاوضيًا مختارًا. الملكية المعتمدة تُسجل في مرحلة البدائل ولا تُعدل تلقائيًا.',difference:'الملكية ترتبط بحقوق الحصص في الكيان، والربح حق اقتصادي يمكن تنظيمه باتفاق متوافق مع النظام. الإدارة والصلاحيات عنصران مستقلان كذلك. في المضاربة لا تُحوّل نسبة الربح إلى ملكية في الشركة.',missing:results.warnings.length?`أبرز الفجوات: ${results.warnings.slice(0,5).join('، ')}`:'تعبئة الحقول الأساسية لا تعني التحقق القانوني. افحص الصلاحيات والتوقيعات وصحة المساهمات والمستندات.',legal:'هذه المنصة تجمع وتقيّم وتوثّق ما يدخله المستخدم بصورة استرشادية. اعتماد بند في النظام لا يثبت اتفاقًا موقعًا أو نقلًا نظاميًا للملكية. يُراجع عقد التأسيس والمحاضر مع المختص.'};helperAnswer=content[topic]||'حدد السؤال المطلوب.';openHelper=true}
function askDelete(label){return confirm(`هل تريد حذف ${label}؟ لا يمكن التراجع عن الحذف إلا باستيراد نسخة احتياطية.`)}
function action(btn){const what=btn.dataset.psAction,id=btn.dataset.id;let p=get();const fresh=()=>{render()};
 try{switch(what){
 case 'new':{p=blankProject(id);p.title='ملف '+(K.TYPES[id]||'شراكة');persist(p,'إنشاء ملف شراكة');currentId=p.id;step='identity';break}
 case 'open':currentId=id;step='identity';break;
 case 'back':currentId=null;break;
 case 'step':step=id;break;
 case 'prev':{let i=steps.findIndex(x=>x[0]===step);step=steps[Math.max(0,i-1)][0];break}
 case 'next':{let i=steps.findIndex(x=>x[0]===step);step=steps[Math.min(steps.length-1,i+1)][0];break}
 case 'help':openHelper=!openHelper;break;
 case 'ask':if(p)showAssistance(p,id);break;
 case 'sample':{p=sampleProject();persist(p,'تحميل مثال تعليمي');currentId=p.id;step='identity';A.message('تم إنشاء مثال تعليمي مستقل. جميع الأسماء والقيم افتراضية.');break}
 case 'clone':case 'duplicate-current':{const source=what==='clone'?projectList().find(x=>x.id===id):p;if(!source)break;p=structuredClone(source);p.id=uid();p.title=(source.title||'ملف')+' · نسخة';p.createdAt=stamp();p.final.status='proposed';p.final.approvedBy='';p.final.approvedAt='';p.audit=[];persist(p,'نسخ ملف شراكة');currentId=p.id;step='identity';break}
 case 'delete':if(askDelete('هذا الملف')){A.removePartnership(id);if(currentId===id)currentId=null}break;
 case 'add-party':p.parties.push(blankParty());p.final.status='proposed';persist(p,'إضافة طرف');break;
 case 'remove-party':{const who=p.parties.find(x=>x.id===id);if(p.parties.length<=2)throw new Error('يلزم وجود طرفين على الأقل في الملف.');if(p.ledger.some(x=>x.partyId===id))throw new Error('لا يمكن حذف طرف له التزامات مالية مرتبطة قبل تسويتها أو حذفها.');if(askDelete('الطرف '+(who?.name||''))){p.parties=p.parties.filter(x=>x.id!==id);delete p.final.shares[id];p.final.status='proposed';p.alternatives.forEach(x=>delete x.shares[id]);persist(p,'حذف طرف')}}break;
 case 'import-owners':{const owners=A.getSnapshot().owners||[];if(!owners.length)throw new Error('سجل ملاك صفوة فارغ. أضف ملاكًا في القسم المخصص أولًا.');if(!confirm('ستُستبدل قائمة أطراف هذا الملف بنسخة من ملاك صفوة الحاليين. ولا تبقى متزامنة تلقائيًا معهم. متابعة؟'))break;
 p.parties=owners.map(o=>({...blankParty(),id:uid(),name:o.name,role:'partner',cash:K.finite(o.capital)?K.n(o.capital):null,currentPct:K.finite(o.pct)?K.n(o.pct):null}));if(p.type==='existing')p.parties.push({...blankParty(),name:p.investor.name||'المستثمر الجديد',role:'investor',newInvestor:true,currentPct:0});p.final={shares:{},status:'proposed',approvedBy:'',approvedAt:''};p.ledger=[];p.alternatives=[];persist(p,'نسخ ملاك صفوة إلى ملف شراكة');A.message('تم استيراد الملاك كلقطة مستقلة. راجع القيم والنسب.');break}
 case 'add-ledger':p.ledger.push({id:uid(),partyId:p.parties[0]?.id||'',entry:'commitment',category:'cash',amount:null,date:'',parentId:'',reference:'',status:'proposed'});persist(p,'إضافة حركة مالية');break;
 case 'remove-ledger':if(askDelete('السجل المالي')){p.ledger=p.ledger.filter(x=>x.id!==id&&x.parentId!==id);persist(p,'حذف قيد مالي')}break;
 case 'copy-calc':{const res=K.calculate(p);if(res.type==='mudaraba')throw new Error('المضاربة لا تنشئ حصص ملكية بهذه الطريقة.');if(res.issues.some(x=>/يلزم|دون اسم|سالبة|مجموع|تقييم|أكمل|حدد المالك|تجاوز|خلل|لا توجد|أدخل/.test(x)))throw new Error('راجع المدخلات الأساسية أولًا قبل نسخ النتائج.');if(res.rows.some(x=>x.id==='incoming'))throw new Error('أضف المستثمر الجديد طرفًا في القائمة قبل نقل نسبه إلى الهيكل المقترح.');p.final={shares:Object.fromEntries(res.rows.map(x=>[x.id,x.suggested])),status:'proposed',approvedBy:'',approvedAt:''};persist(p,'نسخ التوزيع الاسترشادي إلى مقترح');step='alternatives';break}
 case 'suggest-terms':{const hints={management:'يحدد الشركاء المدير التنفيذي وصلاحيات التوقيع وحدود التفويض.',majority:'تُحدد المسائل العادية والجسيمة والنصاب اللازم لكل منها.',finance:'يُوضح مصدر التمويل اللاحق وأثر عدم مشاركة شريك في التمويل.',profit:'تُحدد آلية توزيع الربح والخسارة بعد تحقق النتيجة القابلة للتوزيع وبما يسمح به النظام.',duration:'تُحدد مدة العلاقة وحالات انتهائها وتجديدها.',exit:'ينظّم التخارج وتقييم الحصة والأولوية في الشراء والجدول الزمني للسداد.',dispute:'يُبدأ بالتفاوض الودي مدة متفق عليها، ثم يُحدد مسار الفصل القانوني.',ip:'تُحدد ملكية العلامات والحقوق الفكرية والنطاق الجغرافي والترخيص.',transfer:'تُراجع قيود التنازل ونقل الملكية وإجراءات القيد النظامي.',reporting:'تُحدد دورة التقارير المحاسبية وحق الاطلاع والمراجعة.'};for(const [key,value]of Object.entries(hints)){if(!p.terms[key]?.value){p.terms[key]={value,status:'proposed'}}}persist(p,'اقتراح بنود إرشادية');A.message('أُضيفت بنود مبدئية. راجع كل بند وعدّله قبل تسجيل الموافقة.');break}
 case 'add-alternative':p.alternatives.push({id:uid(),name:'بديل '+(p.alternatives.length+1),shares:{},notes:'',status:'proposed'});persist(p,'إضافة بديل');break;
 case 'remove-alternative':if(askDelete('البديل')){p.alternatives=p.alternatives.filter(x=>x.id!==id);persist(p,'حذف بديل')}break;
 case 'choose-alt':{const alt=p.alternatives.find(x=>x.id===id);if(!alt)break;p.final={shares:structuredClone(alt.shares),status:'proposed',approvedBy:'',approvedAt:''};persist(p,'نسخ بديل إلى الهيكل المقترح');A.message('نُقلت نسب البديل كمسودة ولم تُعتمد.');break}
 case 'approve-final':{const values=p.parties.map(x=>K.n(p.final.shares?.[x.id]));if(values.some(x=>!Number.isFinite(x)||x<0||x>100)||Math.abs(K.sum(values)-100)>1e-7)throw new Error('يلزم تحديد نسب كل الأطراف بمجموع 100% قبل الاعتماد.');if(!p.final.approvedBy.trim()||!p.final.approvedAt)throw new Error('أدخل أسماء من اعتمدوا القرار وتاريخه.');p.final.status='approved';persist(p,'تسجيل قرار الملاك داخليًا');A.message('سُجل اعتماد إداري بحسب مدخلات المستخدم دون إثبات التوقيعات.');break}
 case 'unapprove-final':p.final.status='proposed';persist(p,'إعادة الملكية المقترحة');break;
 case 'add-task':p.tasks.push({id:uid(),title:'',owner:'',due:'',status:'pending'});persist(p,'إضافة مهمة');break;
 case 'remove-task':if(askDelete('المهمة')){p.tasks=p.tasks.filter(x=>x.id!==id);persist(p,'حذف مهمة')}break;
 case 'export-word':exportWord(p);break;
 case 'export-json':exportJson(p);break;
 case 'export-html':exportHtml(p);break;
 case 'print':print(p);break;
 default:return;
 }fresh();
 }catch(err){A.message(err.message||'تعذر إتمام العملية',true)}}
function reportTable(headers,rows){return `<div class="table-scroll"><table class="data-table"><thead><tr>${headers.map(x=>`<th>${text(x)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(x=>`<td>${text(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`}
function reportHtml(p,h=K.health(p)){const res=h.results,financial=K.evaluateFinance(p.economics),alts=K.compareAlternatives(p);
 const sec=(head,body)=>`<section><h3>${text(head)}</h3>${body}</section>`;
 let html=`<header class="ps-report-head"><strong>صفوة الاستثمارية | SAFWAH INVESTMENT</strong><h2>تقرير شراكة ومسودة نقاط اتفاق</h2><p>الملف: ${text(p.title||'لم يسم')} · تاريخ الإعداد: ${today()} · هذه وثيقة أولية للمراجعة</p></header>`;
 html+=sec('1. ملخص المشروع',`<p>طبيعة العلاقة: ${text(K.TYPES[p.type]||p.type)}. الجهة: ${text(p.client||'لم تحدد')}. المكان: ${text(p.city||'لم يحدد')}. الشكل المقترح: ${text(p.legalForm)}.</p><p>القرار المطلوب: ${text(p.objective||'لم يحدد')}</p>`);
 html+=sec('2. الأطراف والمساهمات',reportTable(['الطرف','الدور','نقد','أصول','فكرية','عمل مقوّم','الربح المقترح'],p.parties.map(x=>{const v=K.partnerValue(x,K.PROFILES[p.type==='startup'?p.profile:'balanced']||K.PROFILES.balanced);return[x.name,roles[x.role]||x.role,money(K.n(x.cash)),money(K.n(x.assets)),money(K.n(x.ip)),money(v.parts.effort),pct(K.n(x.profitPct))]})));
 html+=sec('3. التوزيع والتقييم',`<p>${res.weighted?'توزيع ترجيحي استرشادي وفق نمط '+text(K.PROFILES[p.profile]?.label||'القيمة المباشرة'):'توزيع استرشادي بحسب نوع العلاقة'}. ${res.financial?'قيمة الشركة قبل التمويل '+money(res.financial.preMoney)+' وبعده '+money(res.financial.postMoney):''}</p>${reportTable(['الطرف','الملكية/الربح الاسترشادي'],(res.type==='mudaraba'?res.profitRows:res.rows).map(x=>[x.name,pct(res.type==='mudaraba'?x.profit:x.suggested)]))}<p>الهيكل المسجل: ${text(K.STATUSES[p.final.status]||'مسودة')}. من سجله: ${text(p.final.approvedBy||'غير محدد')}. تاريخه: ${text(p.final.approvedAt||'غير محدد')}.</p>`);
 html+=sec('4. الالتزامات والدفعات',`<p>إجمالي الالتزامات: ${money(h.ledger.committed)}، والمدفوع المرتبط: ${money(h.ledger.paid)}.</p>${p.ledger.length?reportTable(['الطرف','الحركة','التصنيف','القيمة','مرجع'],p.ledger.map(l=>[p.parties.find(x=>x.id===l.partyId)?.name||'',entryLabels[l.entry]||l.entry,categories[l.category]||l.category,money(K.n(l.amount)),l.reference||''])):'<p>لم يسجل التزام.</p>'}`);
 html+=sec('5. بنود الاتفاق والحوكمة',reportTable(['البند','الصياغة/القرار','الحالة'],Object.entries(K.TERM_TITLES).map(([k,title])=>[title,p.terms?.[k]?.value||'يحدد لاحقًا',K.STATUSES[p.terms?.[k]?.status]||'لم يحسم'])));
 html+=sec('6. البدائل',alts.length?alts.map(a=>`<p>${text(a.name)} · ${text(K.STATUSES[a.status])} · مجموع النسب ${pct(a.total)}. ${a.rows.map(r=>text(r.name)+' '+pct(r.pct)).join(' · ')}</p>`).join(''):'<p>لم تعرض بدائل بعد.</p>');
 html+=sec('7. المؤشرات وخطة العمل',`${financial.ok?`<p>الفائض السنوي المبسط ${money(financial.operatingSurplus)}؛ هامش التشغيل ${pct(financial.operatingMargin)}؛ مدة الاسترداد ${financial.payback!==null?fmt(financial.payback)+' سنة':'غير متاحة'}.</p>`:'<p>لم تتوفر بيانات مالية مكتملة.</p>'}${p.tasks.length?reportTable(['الخطوة','المسؤول','الموعد','الحالة'],p.tasks.map(t=>[t.title,t.owner,t.due,t.status==='done'?'منجز':t.status==='doing'?'جار':'لم يبدأ'])):'<p>لم توضع مهام بعد.</p>'}`);
 html+=sec('8. فجوات ومخاطر',h.warnings.length?`<ul>${h.warnings.map(x=>`<li>${text(x)}</li>`).join('')}</ul>`:'<p>لا توجد تنبيهات حسابية ظاهرة في المدخلات الحالية. يلزم التحقق من المستندات والحقوق خارجيًا.</p>');
 html+=`<p class="ps-disclaimer">حدود التقرير: المحتوى مدخلات المستخدم وحسابات استرشادية، وليس تقرير تقييم مستقلًا أو وثيقة موقعة أو سند ملكية أو استشارة قانونية. يجب التحقق من الصلاحيات والترخيص وحقوق الملكية واتفاق الأطراف وفق الأنظمة المعمول بها قبل التنفيذ.</p>`;
 return html;}
function reportPlain(p){const res=K.health(p);const chunks=[`صفوة الاستثمارية | SAFWAH INVESTMENT`,`تقرير شراكة ومسودة نقاط اتفاق`,`الملف: ${p.title||'غير مسمى'}`,`التاريخ: ${today()}`,`النوع: ${K.TYPES[p.type]}`,`الجهة: ${p.client||'لم تحدد'}`,`الشكل القانوني المقترح: ${p.legalForm||'لم يحدد'}`,`القرار المطلوب: ${p.objective||'لم يحدد'}`,'','الأطراف والمساهمات'];
 p.parties.forEach(x=>{let v=K.partnerValue(x,K.PROFILES[p.type==='startup'?p.profile:'balanced']||K.PROFILES.balanced);chunks.push(`${x.name||'طرف'} | ${roles[x.role]||x.role} | نقد ${money(K.n(x.cash))} | أصل ${money(K.n(x.assets))} | جهد ${money(v.parts.effort)} | ربح ${pct(K.n(x.profitPct))}`)});
 chunks.push('','الحسابات والاستحقاقات');(res.results.type==='mudaraba'?res.results.profitRows:res.results.rows).forEach(x=>chunks.push(`${x.name} : ${pct(res.results.type==='mudaraba'?x.profit:x.suggested)}`));chunks.push('','الملكية المدخلة: '+K.STATUSES[p.final.status]);p.parties.forEach(x=>chunks.push(`${x.name} : ${pct(K.n(p.final.shares[x.id]))}`));chunks.push('','القرارات');Object.entries(K.TERM_TITLES).forEach(([k,title])=>chunks.push(`${title}: ${p.terms?.[k]?.value||'لم يحدد'} [${K.STATUSES[p.terms?.[k]?.status]||'لم يحسم'}]`));chunks.push('','التنفيذ');p.tasks.forEach(t=>chunks.push(`${t.title}: ${t.owner||'لم يحدد'} موعد ${t.due||'لم يحدد'}`));chunks.push('','التنبيهات');res.warnings.forEach(x=>chunks.push(x));chunks.push('','مسودة استرشادية ليست عقدًا موقعًا أو موافقة رسمية أو إثباتًا للملكية.');return chunks.join('\n');}
function download(filename,body,mime){const b=new Blob([body],{type:mime}),url=URL.createObjectURL(b),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),6000)}
function cleanName(p){return(p.title||'sharakah').replace(/[\\/:*?"<>|\r\n]/g,'_').slice(0,45)}
function exportWord(p){if(!window.SafwahDocx)throw new Error('وحدة Word غير محملة');const bytes=window.SafwahDocx.build(reportPlain(p),`صفوة | ${p.title||'تقرير'}`);download(`SAFWAH-${cleanName(p)}.docx`,bytes,'application/vnd.openxmlformats-officedocument.wordprocessingml.document');A.message('جرى إنشاء ملف Word قابل للتحرير.');}
function exportJson(p){download(`SAFWAH-${cleanName(p)}.json`,JSON.stringify(p,null,2),'application/json;charset=utf-8');A.message('حُفظ ملف الشراكة بصورة مستقلة.');}
function exportHtml(p){const report=reportHtml(p),template=`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>صفوة | ${text(p.title)}</title><style>body{font-family:Tahoma,Arial,sans-serif;line-height:1.85;padding:30px;max-width:960px;margin:auto;color:#19384e}h2,h3{color:#19384e}section{margin:18px 0}table{width:100%;border-collapse:collapse}td,th{border:1px solid #c5cbd0;padding:7px;text-align:right}th{background:#f3f5f5}.ps-disclaimer{border-top:1px solid #ccc;padding-top:15px;font-size:12px}.table-scroll{overflow-x:auto}@media print{@page{size:A4;margin:14mm}body{padding:0}}</style></head><body>${report}</body></html>`;download(`SAFWAH-${cleanName(p)}.html`,template,'text/html;charset=utf-8');}
function print(p){document.getElementById('print-area').innerHTML=reportHtml(p);window.print()}
function sampleProject(){const p=blankProject('operating');p.title='مثال تعليمي: شراكة تشغيل مجمع تجاري';p.client='مثال افتراضي';p.city='المدينة المنورة';p.objective='اختبار نسب الأطراف وتنظيم حقوق الإدارة والتقارير والأرباح';p.parties[0]={...p.parties[0],name:'الممول الأول (مثال)',cash:500000,assets:200000,role:'financier',work:'no',profitPct:55};p.parties[1]={...p.parties[1],name:'الشريك التشغيلي (مثال)',cash:100000,work:'yes',marketSalary:20000,salaryPaid:5000,months:12,role:'operator',profitPct:45};p.terms.management={value:'يتولى الشريك التشغيلي الإدارة ضمن ميزانية معتمدة، وتحتفظ الشراكة بسلطات محفوظة.',status:'proposed'};p.terms.reporting={value:'تقرير مالي وتشغيلي كل شهر، ومراجعة ربع سنوية للمؤشرات.',status:'proposed'};p.ledger=[{id:uid(),partyId:p.parties[0].id,entry:'commitment',category:'cash',amount:500000,date:today(),parentId:'',reference:'TEST-01',status:'proposed'}];p.economics={revenue:1200000,opex:900000,capex:700000};p.tasks=[{id:uid(),title:'تدقيق عقد التأسيس المقترح',owner:'المستشار القانوني',due:'',status:'pending'},{id:uid(),title:'توثيق الأصول والمساهمات',owner:'المالية',due:'',status:'pending'}];return p}
root.addEventListener('click',event=>{const b=event.target.closest('[data-ps-action]');if(!b)return;event.preventDefault();action(b)});
root.addEventListener('change',async event=>{
 if(event.target.matches('[data-ps-import]')){
  const input=event.target,file=input.files?.[0];input.value='';if(!file)return;
  if(file.size>2_000_000){A.message('ملف الشراكة يتجاوز الحجم المقبول (2 ميجابايت).',true);return;}
  try{
   const parsed=JSON.parse(await file.text());
   if(!parsed||typeof parsed.title!=='string'||!Array.isArray(parsed.parties)||!Array.isArray(parsed.ledger)||!Array.isArray(parsed.alternatives)||!parsed.final||!K.TYPES[parsed.type])throw new Error('بنية الملف لا توافق نموذج الشراكة.');
   if(!confirm('سيُستورد الملف كنسخة جديدة مستقلة على هذا الجهاز. هل تريد المتابعة؟'))return;
   parsed.id=uid();parsed.title=(parsed.title||'ملف مستورد')+' · مستورد';parsed.createdAt=stamp();parsed.final.status='proposed';parsed.final.approvedBy='';parsed.final.approvedAt='';parsed.audit=[];
   persist(parsed,'استيراد ملف شراكة مستقل');currentId=parsed.id;step='identity';render();A.message('تم استيراد الملف. راجع جميع البيانات قبل استخدامها.');
  }catch(err){A.message('تعذر استيراد الملف: '+err.message,true)}
  return;
 }
 changed(event);
});
const demoButton=document.createElement('button');demoButton.type='button';demoButton.className='btn btn-outline btn-small';demoButton.dataset.tab='partnerships';demoButton.textContent='استوديو الشراكات';document.querySelector('.hero-buttons')?.append(demoButton);
const oldStats=document.getElementById('dashboard-stats');if(oldStats){const link=document.createElement('div');link.className='ps-dashboard-link';link.innerHTML='<div><strong>شراكات صفوة واتفاقات الملاك</strong><p>رتّب المساهمات والحوكمة والبدائل والتوثيق والقرارات، مع مسودات Word.</p></div><button type="button" class="btn btn-primary" data-tab="partnerships">فتح الاستوديو</button>';oldStats.after(link)}
render();
window.SafwahPartnerships={open(id){currentId=id;step='identity';A.navigate('partnerships');render()},getCurrent:()=>get(),render,report:()=>get()?reportHtml(get()):''};
})();
