/* SAFWAH Multi-Owner Workspace — source written independently for Safwah.
 * No SHARAKAH code is copied. No server, cloud or authentication in this MVP.
 */
(()=>{'use strict';
  const C=window.SafwahCore, $=id=>document.getElementById(id), E=C.escapeHtml;
  const STORE='safwah_ownership_workspace_v1';
  const stages={new:'جديدة',review:'تحت الدراسة',ready:'جاهزة للعرض',negotiation:'تحت التفاوض',closed:'مغلقة',rejected:'مستبعدة'};
  const docs={missing:'غير مستكملة',partial:'جزئية',checked:'مراجعة داخلية'};
  const typeNames={person:'فرد',entity:'جهة اعتبارية',other:'جهة أخرى'};
  const blank=()=>({version:1,owners:[],assetOwners:[],opportunities:[],decisions:[],partnerships:[],ownershipStatus:{status:'draft',approvedBy:'',date:''},history:[],updatedAt:null});
  const uid=()=>typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():'id_'+Date.now()+'_'+Math.random().toString(36).slice(2);
  const nf=new Intl.NumberFormat('en-US',{maximumFractionDigits:2});
  const pf=new Intl.NumberFormat('en-US',{maximumFractionDigits:5});
  const fmt=n=>Number.isFinite(Number(n))?nf.format(Number(n)):'غير محدد';
  const rate=n=>Number.isFinite(Number(n))?pf.format(Number(n))+'%':'غير محدد';
  const money=n=>n===null||n===undefined||n===''?'غير محدد':fmt(n)+' ر.س';
  const safeUrl=x=>{try{const u=new URL(String(x));return ['https:','http:'].includes(u.protocol)?u.href:''}catch{return ''}};
  const num=v=>C.num(v),date=()=>new Date().toISOString().slice(0,10);
  let state=load(),currentAllocation=null,toastTimeout,activeTab='dashboard';

  function load(){try{const x=JSON.parse(localStorage.getItem(STORE)||'null');if(!x||x.version!==1||!Array.isArray(x.owners)||!Array.isArray(x.opportunities)||!Array.isArray(x.assetOwners)||!Array.isArray(x.decisions))return blank();return {...blank(),...x,partnerships:Array.isArray(x.partnerships)?x.partnerships:[]};}catch{return blank()}}
  function notify(message,problem=false){const el=$('notice');el.textContent=message;el.hidden=false;el.classList.toggle('error',problem);clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>{el.hidden=true},4600)}
  function save(action,detail=''){
    state.updatedAt=new Date().toISOString();
    if(action)state.history.unshift({at:state.updatedAt,action,detail});
    if(state.history.length>100)state.history.length=100;
    try{localStorage.setItem(STORE,JSON.stringify(state))}catch{notify('تعذر الحفظ محليًا. صدّر نسخة JSON قبل مغادرة الصفحة.',true)}
    render();
    document.dispatchEvent(new CustomEvent('safwah-data-saved',{detail:{action}}));
  }
  function setTab(id){
    if(!document.querySelector(`[data-panel="${id}"]`))return;
    activeTab=id;
    document.querySelectorAll('.panel').forEach(el=>el.classList.toggle('active',el.dataset.panel===id));
    document.querySelectorAll('.nav-link').forEach(el=>{const yes=el.dataset.tab===id;el.classList.toggle('active',yes);el.setAttribute('aria-current',yes?'page':'false')});
    window.scrollTo({top:0,behavior:'instant'});
    if(id==='reports')renderReport();
  }
  function formObject(form){return Object.fromEntries(new FormData(form).entries())}
  function setField(form,key,value){const el=form.elements.namedItem(key);if(el)el.value=value??''}
  function resetOwner(){const f=$('owner-form');f.reset();setField(f,'id','');$('owner-form-heading').textContent='إضافة مالك';toggleBeneficiary()}
  function resetAssetOwner(){const f=$('asset-owner-form');f.reset();setField(f,'id','');$('asset-owner-heading').textContent='إضافة مالك أصل'}
  function resetOpportunity(){const f=$('opportunity-form');f.reset();setField(f,'id','');$('opportunity-heading').textContent='تسجيل فرصة جديدة'}
  function toggleBeneficiary(){$('beneficiary-field').hidden=formObject($('owner-form')).type!=='entity'}
  function invalidateOwnership(){state.ownershipStatus={status:'draft',approvedBy:'',date:''}}
  function ensureNumber(input,name,{allowBlank=false,min=0,max=Infinity}={}){
    if(allowBlank&&input==='')return null;
    const n=num(input);
    if(!Number.isFinite(n)||n<min||n>max)throw new Error(`قيمة «${name}» غير صالحة.`);
    return n;
  }
  function requestDelete(message,callback){if(window.confirm(message))callback()}

  function saveOwner(event){
    event.preventDefault();const d=formObject(event.currentTarget);try{
      const name=d.name.trim(),pct=ensureNumber(d.pct,'حصة الملكية',{min:0,max:100});
      if(!name)throw new Error('اسم المالك مطلوب.');
      const owner={id:d.id||uid(),name,type:d.type==='entity'?'entity':'person',pct,
        capital:ensureNumber(d.capital,'المساهمة',{allowBlank:true,min:0}),role:d.role.trim(),
        beneficiaries:d.type==='entity'?d.beneficiaries.trim():'',notes:d.notes.trim()};
      const index=state.owners.findIndex(o=>o.id===owner.id);
      if(index>=0)state.owners[index]=owner;else state.owners.push(owner);
      invalidateOwnership();save(index>=0?'تعديل مالك صفوة':'إضافة مالك صفوة',name);
      resetOwner();notify('حُفظ المالك. راجع مجموع نسب الملكية قبل اعتماد السجل.');
    }catch(e){notify(e.message,true)}
  }
  function editOwner(id){const o=state.owners.find(x=>x.id===id);if(!o)return;setTab('owners');const f=$('owner-form');for(const key of ['id','name','type','pct','capital','role','beneficiaries','notes'])setField(f,key,o[key]);$('owner-form-heading').textContent='تعديل بيانات المالك';toggleBeneficiary();f.scrollIntoView({block:'center',behavior:'smooth'})}
  function deleteOwner(id){const o=state.owners.find(x=>x.id===id);if(!o)return;requestDelete(`هل تريد حذف «${o.name}» من سجل ملاك صفوة؟ لا تتغير لقطات التصويت السابقة.`,()=>{state.owners=state.owners.filter(x=>x.id!==id);invalidateOwnership();save('حذف مالك صفوة',o.name);notify('حُذف المالك من السجل الحالي.')})}

  function saveAssetOwner(event){event.preventDefault();const d=formObject(event.currentTarget);const name=d.name.trim();if(!name)return notify('اسم مالك الأصل مطلوب.',true);
    const item={id:d.id||uid(),name,type:d.type,representative:d.representative.trim(),notes:d.notes.trim()};
    const pos=state.assetOwners.findIndex(o=>o.id===item.id);
    if(pos>=0)state.assetOwners[pos]=item;else state.assetOwners.push(item);
    save(pos>=0?'تعديل مالك أصل':'إضافة مالك أصل',name);resetAssetOwner();notify('حُفظ مالك الأصل.');
  }
  function editAssetOwner(id){const o=state.assetOwners.find(x=>x.id===id);if(!o)return;setTab('asset-owners');const f=$('asset-owner-form');for(const key of ['id','name','type','representative','notes'])setField(f,key,o[key]);$('asset-owner-heading').textContent='تعديل مالك أصل';f.scrollIntoView({block:'center',behavior:'smooth'})}
  function deleteAssetOwner(id){const o=state.assetOwners.find(x=>x.id===id);if(!o)return;if(state.opportunities.some(p=>(p.ownerships||[]).some(a=>a.ownerId===id)))return notify('هذا المالك مرتبط بفرص. غيّر توزيع ملاك الفرص أولًا.',true);
    requestDelete('حذف مالك الأصل من السجل؟',()=>{state.assetOwners=state.assetOwners.filter(x=>x.id!==id);save('حذف مالك أصل',o.name)})}

  function saveOpportunity(event){event.preventDefault();const d=formObject(event.currentTarget);try{
    const asking=ensureNumber(d.asking,'السعر',{allowBlank:true}),area=ensureNumber(d.area,'المساحة',{allowBlank:true});
    const commissionRate=ensureNumber(d.commissionRate,'العمولة',{min:0,max:100});
    const referralRate=ensureNumber(d.referralRate,'نسبة الإحالة',{min:0,max:100});
    let url=d.url.trim();if(url&&!(url.startsWith('https://')||url.startsWith('http://')))throw new Error('الرابط يجب أن يبدأ بـ https:// أو http://');
    if(url){try{const parsed=new URL(url);if(!['http:','https:'].includes(parsed.protocol))throw new Error()}catch{throw new Error('رابط الموقع غير صحيح.')}}
    const previous=state.opportunities.find(o=>o.id===d.id);
    const item={id:d.id||uid(),title:d.title.trim(),category:d.category,city:d.city.trim(),asking,area,commissionRate,referralRate,
      stage:d.stage,documents:d.documents,url,notes:d.notes.trim(),ownerships:previous?.ownerships||[],created:previous?.created||new Date().toISOString()};
    if(!item.title)throw new Error('اسم الفرصة مطلوب.');
    const idx=state.opportunities.findIndex(o=>o.id===item.id);
    if(idx<0)state.opportunities.push(item);else state.opportunities[idx]=item;
    save(idx>=0?'تعديل فرصة':'إضافة فرصة',item.title);resetOpportunity();notify('حُفظت الفرصة. سجّل ملاكها ونسبهم من بطاقة الفرصة.');
  }catch(e){notify(e.message,true)}}
  function editOpportunity(id){const o=state.opportunities.find(x=>x.id===id);if(!o)return;setTab('opportunities');const f=$('opportunity-form');for(const key of ['id','title','category','city','asking','area','commissionRate','referralRate','stage','documents','url','notes'])setField(f,key,o[key]);$('opportunity-heading').textContent='تعديل الفرصة';f.scrollIntoView({block:'center',behavior:'smooth'})}
  function deleteOpportunity(id){const o=state.opportunities.find(x=>x.id===id);if(!o)return;const connected=state.decisions.some(d=>d.opportunityId===id);if(connected)return notify('هذه الفرصة مرتبطة بقرار. احتفظ بالسجل أو احذف القرار أولًا.',true);
    requestDelete(`حذف فرصة «${o.title}»؟`,()=>{state.opportunities=state.opportunities.filter(x=>x.id!==id);save('حذف فرصة',o.title)})}
  function openAllocation(id){const o=state.opportunities.find(x=>x.id===id);if(!o)return;currentAllocation=id;$('allocation-title').textContent='ملاك الفرصة: '+o.title;
    if(!state.assetOwners.length){$('allocation-list').innerHTML='<div class="empty">لا يوجد ملاك أصول. أضفهم أولًا في سجل ملاك الأصول.</div>';$('allocation-dialog').showModal();return}
    $('allocation-list').innerHTML=state.assetOwners.map(owner=>{
      const present=(o.ownerships||[]).find(a=>a.ownerId===owner.id);
      return `<div class="allocation-row"><label>${E(owner.name)}</label><label>حصة الأصل %<input type="number" min="0" max="100" step="any" data-asset-id="${E(owner.id)}" value="${present?E(present.pct):''}" placeholder="غير مشارك" /></label></div>`;
    }).join('');$('allocation-dialog').showModal();
  }
  function saveAllocation(event){event.preventDefault();const o=state.opportunities.find(x=>x.id===currentAllocation);if(!o)return;
    try{const values=[...$('allocation-list').querySelectorAll('input[data-asset-id]')].filter(x=>x.value!=='').map(el=>({ownerId:el.dataset.assetId,pct:ensureNumber(el.value,'حصة الأصل',{min:0,max:100})})).filter(x=>x.pct>0);
      o.ownerships=values;const check=C.assetOwnership(values,state.assetOwners);save('تعديل ملاك فرصة',o.title);$('allocation-dialog').close();notify(check.errors.length?'حُفظ توزيع غير مكتمل للمراجعة: '+check.errors.join(' '):'حُفظ توزيع ملكية الأصل (100%).',Boolean(check.errors.length));
    }catch(e){notify(e.message,true)}}

  function saveDecision(event){event.preventDefault();if(!C.validOwners(state.owners))return notify('يجب أن يساوي مجموع نسب ملاك صفوة 100% قبل فتح التصويت.',true);
    const d=formObject(event.currentTarget);let threshold;try{threshold=ensureNumber(d.threshold,'عتبة التصويت',{min:1,max:100})}catch(e){return notify(e.message,true)}
    const name=d.title.trim();if(!name)return notify('موضوع القرار مطلوب.',true);
    const decision={id:uid(),title:name,opportunityId:d.opportunityId||null,threshold,notes:d.notes.trim(),votes:{},
      snapshot:state.owners.map(o=>({id:o.id,name:o.name,pct:Number(o.pct)})),status:'proposed',created:new Date().toISOString(),recordedAt:null,recordedBy:null};
    state.decisions.unshift(decision);save('إنشاء قرار للتصويت',name);event.currentTarget.reset();notify('فُتح التصويت بنسبة ملكية مجمّدة.');
  }
  function vote(decisionId,ownerId,value){const d=state.decisions.find(x=>x.id===decisionId);if(!d||d.status==='recorded')return;
    if(!d.snapshot.some(o=>o.id===ownerId))return;
    if(!['yes','no','abstain',''].includes(value))return;
    if(value==='')delete d.votes[ownerId];else d.votes[ownerId]=value;
    save('تسجيل اختيار تصويت',d.title);}
  function recordDecision(id){const d=state.decisions.find(x=>x.id===id);if(!d||d.status==='recorded')return;const res=C.votesResult(d);
    if(!res.passes)return notify('لم تُستوف عتبة الموافقة المحددة للمحضر.',true);
    const input=document.querySelector(`[data-record-name="${id}"]`),who=input?.value.trim();
    if(!who)return notify('أدخل اسم الشخص الذي سجّل نتيجة المحضر داخليًا.',true);
    d.status='recorded';d.recordedBy=who;d.recordedAt=new Date().toISOString();save('تسجيل محضر تصويت داخلي',d.title);notify('سُجل المحضر الداخلي. لا يثبت توقيع الملاك أو الموافقة النظامية.');}
  function deleteDecision(id){const d=state.decisions.find(x=>x.id===id);if(!d)return;requestDelete(`حذف سجل القرار «${d.title}»؟`,()=>{state.decisions=state.decisions.filter(x=>x.id!==id);save('حذف قرار',d.title)})}
  function reproduceDecision(id){const d=state.decisions.find(x=>x.id===id);if(!d)return;if(!C.validOwners(state.owners))return notify('أكمل الملكية الحالية أولًا.',true);
    const copy={...d,id:uid(),title:d.title+' (مراجعة)',votes:{},snapshot:state.owners.map(o=>({id:o.id,name:o.name,pct:Number(o.pct)})),status:'proposed',created:new Date().toISOString(),recordedBy:null,recordedAt:null};
    state.decisions.unshift(copy);save('نسخة جديدة لقرار',d.title);notify('أُنشئت نسخة قرار جديدة بملكية اليوم دون تعديل المحضر السابق.')}

  function render(){renderDashboard();renderOwners();renderAssetOwners();renderOpportunities();renderDecisions();renderScenarioSelectors();if(activeTab==='reports')renderReport()}
  function renderDashboard(){
    const total=C.ownersTotal(state.owners),closed=state.opportunities.filter(x=>x.stage==='closed').length;
    const fees=state.opportunities.reduce((s,o)=>{
      if(o.stage==='closed'||o.stage==='rejected'||o.asking===null)return s;
      const c=C.commission(o);return s+(c.ok?c.net:0);
    },0);
    const kpis=[['ملاك صفوة',state.owners.length,'سجل المساهمين'],['الملكية المدخلة',rate(total),'المجموع المستهدف 100%'],['الفرص المسجلة',state.opportunities.length,closed+' فرص مغلقة'],['العمولة النظرية',money(fees),'من الفرص المفتوحة فقط']];
    $('dashboard-stats').innerHTML=kpis.map(a=>`<div class="stat-card"><div class="label">${E(a[0])}</div><div class="number">${E(a[1])}</div><div class="hint">${E(a[2])}</div></div>`).join('');
    const complete=C.validOwners(state.owners),traced=C.lookThrough(state.owners);
    $('ownership-health').innerHTML=`<div class="ownership-total"><strong>${rate(total)}</strong><span class="chip ${complete?'ready':'alert'}">${complete?'مكتملة حسابيًا':'تحتاج استكمالًا'}</span></div><div class="progress"><span style="width:${Math.min(100,Math.max(0,total))}%"></span></div><p class="tiny-note">${complete?'مجموع الحصص المباشرة 100%.':'مجموع الحصص لا يساوي 100%. لا يمكن تسجيل اعتماد الملكية أو التصويت.'}</p><p class="muted">ملكية غير مباشرة موصوفة: ${rate(traced.tracedPct)} من إجمالي الشركة.</p>`;
    const issues=[];
    if(!state.owners.length)issues.push('لم تُضف أسماء ملاك صفوة بعد.');
    else if(!complete)issues.push('نسب ملكية صفوة لا تساوي 100%.');
    if(traced.gaps.length)issues.push(`الملكية غير المباشرة غير مكتملة لدى ${traced.gaps.length} جهات اعتبارية.`);
    const unverified=state.opportunities.filter(o=>C.assetOwnership(o.ownerships,state.assetOwners).errors.length).length;
    if(unverified)issues.push(`${unverified} فرص تحتاج توثيق توزيع ملاك الأصول.`);
    const docsUnready=state.opportunities.filter(o=>o.documents!=='checked').length;
    if(docsUnready)issues.push(`${docsUnready} فرص لم تكتمل فيها مراجعة المستندات الداخلية.`);
    if(!state.decisions.length)issues.push('لم تُفتح قرارات للتصويت بعد.');
    $('dashboard-alerts').innerHTML=issues.length?`<div class="list-check">${issues.map(x=>`<div class="check-item warn"><span class="bullet">!</span><span>${E(x)}</span></div>`).join('')}</div>`:'<div class="check-item ok"><span class="bullet">✓</span>لا توجد نواقص ظاهرة في حقول هذا النموذج؛ لا يعني ذلك اجتياز العناية الواجبة.</div>';
    const recent=state.opportunities.slice(-5).reverse();
    $('dashboard-opportunities').innerHTML=recent.length?`<div class="table-scroll"><table class="data-table"><thead><tr><th>الفرصة</th><th>المدينة</th><th>القيمة المطلوبة</th><th>المرحلة</th></tr></thead><tbody>${recent.map(o=>`<tr><td>${E(o.title)}</td><td>${E(o.city||'غير محددة')}</td><td>${E(money(o.asking))}</td><td>${E(stages[o.stage]||o.stage)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">لا توجد فرص مسجلة بعد.</div>';
  }

  function renderOwners(){
    const total=C.ownersTotal(state.owners),valid=C.validOwners(state.owners),approved=state.ownershipStatus.status==='approved';
    $('owners-count').textContent=state.owners.length+' ملاك';$('owners-total').textContent=rate(total);$('owners-progress').style.width=Math.min(100,Math.max(0,total))+'%';
    $('ownership-state').textContent=approved?'اعتماد مسجل':valid?'مكتملة حسابيًا':'مسودة غير مكتملة';
    $('ownership-state').className='chip '+(approved?'ready':valid?'ready':'alert');
    $('owners-validation').textContent=valid?'المجموع 100%. يلزم التحقق من المستندات والموافقات قبل اعتبار السجل نهائيًا.':`المجموع الحالي ${rate(total)}، والفارق عن 100% هو ${rate(Math.abs(100-total))}.`;
    $('ownership-approved-by').value=state.ownershipStatus.approvedBy||'';
    $('ownership-approved-date').value=state.ownershipStatus.date||'';
    $('owners-list').innerHTML=state.owners.length?`<table class="data-table"><thead><tr><th>المالك</th><th>الصفة</th><th>الملكية المباشرة</th><th>المساهمة المدخلة</th><th>الدور</th><th>إدارة</th></tr></thead><tbody>${state.owners.map(o=>`<tr><td><b>${E(o.name)}</b></td><td>${E(typeNames[o.type]||o.type)}</td><td class="num">${E(rate(o.pct))}</td><td>${E(money(o.capital))}</td><td>${E(o.role||'غير محدد')}</td><td><div class="small-actions"><button class="btn btn-outline" data-action="edit-owner" data-id="${E(o.id)}">تعديل</button><button class="btn btn-danger" data-action="delete-owner" data-id="${E(o.id)}">حذف</button></div></td></tr>`).join('')}</tbody></table>`:'<div class="empty">أضف جميع ملاك صفوة ثم حدد النسب وفق المستندات الفعلية.</div>';
    const look=C.lookThrough(state.owners);
    let html='';
    if(look.consolidated.length)html+='<div class="subtle" style="margin-bottom:12px">إجمالي الملكيات التي يمكن تتبعها اعتمادًا على أسماء أدخلها المستخدم:</div>'+look.consolidated.map(x=>`<span class="ubo-tag">${E(x.name)} <b dir="ltr">${rate(x.pct)}</b></span>`).join('');
    if(look.gaps.length)html+='<div class="divider"></div>'+look.gaps.map(x=>`<div class="well"><strong>${E(x.entity)} (${rate(x.share)} من صفوة)</strong><small class="alert-text">${E(x.explanation)}</small></div>`).join('');
    if(!html)html='<div class="empty">لا توجد بيانات لتحليل الملكية غير المباشرة.</div>';
    $('ubo-list').innerHTML=html+'<p class="tiny-note">لا يُثبت تشابه الأسماء هوية المستفيد الحقيقي، ولا تتتبع النسخة الحالية سلاسل شركات من ثلاثة مستويات فأكثر.</p>';
  }

  function renderAssetOwners(){
    $('asset-owners-list').innerHTML=state.assetOwners.length?`<table class="data-table"><thead><tr><th>مالك الأصل</th><th>النوع</th><th>الممثل</th><th>عدد الفرص</th><th>إدارة</th></tr></thead><tbody>${state.assetOwners.map(o=>`<tr><td><b>${E(o.name)}</b><small>${E(o.notes)}</small></td><td>${E(typeNames[o.type]||o.type)}</td><td>${E(o.representative||'غير محدد')}</td><td>${state.opportunities.filter(p=>(p.ownerships||[]).some(a=>a.ownerId===o.id)).length}</td><td><div class="small-actions"><button class="btn btn-outline" data-action="edit-asset-owner" data-id="${E(o.id)}">تعديل</button><button class="btn btn-danger" data-action="delete-asset-owner" data-id="${E(o.id)}">حذف</button></div></td></tr>`).join('')}</tbody></table>`:'<div class="empty">لم يُدرج أي مالك أصل حتى الآن.</div>';
  }

  function renderOpportunities(){
    $('opportunities-count').textContent=state.opportunities.length+' فرص';
    $('opportunities-list').innerHTML=state.opportunities.length?`<div class="opportunity-list">${state.opportunities.map(o=>{
      const c=o.asking===null?null:C.commission(o),ownership=C.assetOwnership(o.ownerships,state.assetOwners);
      return `<article class="opportunity-card"><div class="card-top"><div><h3>${E(o.title)}</h3><span class="subtle">${E(o.category)} • ${E(o.city||'موقع غير محدد')}</span></div><span class="chip ${o.stage==='closed'?'closed':o.stage==='ready'?'ready':o.stage==='rejected'?'danger':'alert'}">${E(stages[o.stage]||o.stage)}</span></div>
      <div class="details"><div><div class="detail-key">القيمة المطلوبة</div><div class="detail-value">${E(money(o.asking))}</div></div><div><div class="detail-key">المساحة</div><div class="detail-value">${o.area===null?'غير محددة':E(fmt(o.area))+' م²'}</div></div><div><div class="detail-key">العمولة النظرية لصفوة</div><div class="detail-value">${E(c?.ok?money(c.net):'غير محددة')}</div></div><div><div class="detail-key">توثيق ملاك الأصل</div><div class="detail-value">${ownership.errors.length?'غير مكتمل':E(rate(ownership.total))}</div></div></div>
      <div class="note">الملاك: ${ownership.rows.length?ownership.rows.map(x=>E(x.name)+' '+rate(x.pct)).join('، '):'لم يُحددوا'}<br>المستندات: ${E(docs[o.documents]||'غير محدد')} ${safeUrl(o.url)?`• <a href="${E(safeUrl(o.url))}" rel="noopener noreferrer" target="_blank">الرابط المرفق</a>`:''}</div>
      ${ownership.errors.length?`<div class="inline-warning">${E(ownership.errors.join(' '))}</div>`:''}
      <div class="card-actions"><button class="btn btn-primary" data-action="edit-allocations" data-id="${E(o.id)}">ملاك الفرصة</button><button class="btn btn-outline" data-action="edit-opportunity" data-id="${E(o.id)}">تحرير</button><button class="btn btn-danger" data-action="delete-opportunity" data-id="${E(o.id)}">حذف</button></div></article>`;
    }).join('')}</div>`:'<div class="empty">لا توجد فرص في سجل صفوة. أضف الفرصة الأولى من النموذج أعلاه.</div>';
    const sel=$('decision-opportunity'),old=sel.value;
    sel.innerHTML='<option value="">قرار عام</option>'+state.opportunities.map(o=>`<option value="${E(o.id)}">${E(o.title)}</option>`).join('');sel.value=state.opportunities.some(o=>o.id===old)?old:'';
  }

  function renderDecisions(){
    $('decisions-list').innerHTML=state.decisions.length?state.decisions.map(d=>{
      const v=C.votesResult(d),sealed=d.status==='recorded';const related=state.opportunities.find(o=>o.id===d.opportunityId);
      return `<article class="decision-card"><div class="decision-top"><div><h2>${E(d.title)}</h2><span class="subtle">${E(related?.title||'قرار عام')} • تاريخ الإنشاء: ${E((d.created||'').slice(0,10))} • العتبة: ${E(rate(d.threshold))}</span></div><span class="chip ${sealed?'ready':'alert'}">${sealed?'محضر داخلي مسجل':'مقترح قيد التصويت'}</span></div>
      ${d.notes?`<p class="muted">${E(d.notes)}</p>`:''}
      <div class="vote-grid">${(d.snapshot||[]).map(o=>`<div class="vote-item"><label>${E(o.name)} (${E(rate(o.pct))})</label><select data-vote="${E(d.id)}" data-owner-id="${E(o.id)}" ${sealed?'disabled':''}><option value="" ${(d.votes?.[o.id]||'')===''?'selected':''}>لم يصوّت</option><option value="yes" ${d.votes?.[o.id]==='yes'?'selected':''}>موافق</option><option value="no" ${d.votes?.[o.id]==='no'?'selected':''}>غير موافق</option><option value="abstain" ${d.votes?.[o.id]==='abstain'?'selected':''}>ممتنع</option></select></div>`).join('')}</div>
      <div class="vote-bars"><span class="vote-yes" style="width:${v.yes}%"></span><span class="vote-no" style="width:${v.no}%"></span><span class="vote-abstain" style="width:${v.abstain}%"></span></div>
      <div class="vote-stats"><span>موافق: <b>${rate(v.yes)}</b></span><span>غير موافق: <b>${rate(v.no)}</b></span><span>ممتنع: <b>${rate(v.abstain)}</b></span><span>دون تصويت: <b>${rate(v.uncast)}</b></span></div>
      <div class="well" style="margin-top:15px">${v.passes?'بلغت الأصوات المؤيدة العتبة المحددة حسابيًا.':'لم تبلغ الأصوات المؤيدة العتبة المحددة.'}${sealed?`<br>سجّل المحضر: ${E(d.recordedBy||'غير محدد')} • ${E((d.recordedAt||'').slice(0,10))}`:''}</div>
      <div class="decision-footer"><div class="small-actions">${!sealed?`<input style="min-width:185px;max-width:250px" data-record-name="${E(d.id)}" placeholder="اسم مسجل المحضر" aria-label="اسم مسجل المحضر" /><button class="btn btn-primary" data-action="record-decision" data-id="${E(d.id)}" ${!v.passes?'disabled':''}>تسجيل محضر داخلي</button>`:''}<button class="btn btn-outline" data-action="copy-decision" data-id="${E(d.id)}">نسخة قرار جديدة</button><button class="btn btn-danger" data-action="delete-decision" data-id="${E(d.id)}">حذف</button></div><span class="tiny-note">التصويت توثيقي ولا يثبت توقيعات المشاركين</span></div></article>`;
    }).join(''):'<div class="card"><div class="empty">لا توجد قرارات مسجلة.</div></div>';
  }

  function renderScenarioSelectors(){const sel=$('scenario-seller'),old=sel.value;sel.innerHTML='<option value="">دون بائع</option>'+state.owners.map(o=>`<option value="${E(o.id)}">${E(o.name)} (${E(rate(o.pct))})</option>`).join('');sel.value=state.owners.some(o=>o.id===old)?old:''}
  function calculateScenario(event){event?.preventDefault();const d=formObject($('scenario-form'));
    const result=C.investmentScenario({owners:state.owners,valuation:d.valuation,cashIn:d.cashIn,cashOut:d.cashOut,sellerId:d.sellerId,investorName:d.investorName});
    if(!result.ok){$('scenario-result').innerHTML=`<div class="well"><strong>تعذر احتساب السيناريو</strong><p class="alert-text">${E(result.errors.join(' '))}</p></div>`;return}
    $('scenario-result').innerHTML=`<div class="scenario-summary"><div class="scenario-metric"><small>التقييم قبل الاستثمار</small><b>${E(money(result.preMoney))}</b></div><div class="scenario-metric"><small>التقييم بعد الاستثمار</small><b>${E(money(result.postMoney))}</b></div><div class="scenario-metric"><small>يذهب إلى صفوة</small><b>${E(money(result.paidToCompany))}</b></div><div class="scenario-metric"><small>يذهب للبائع</small><b>${E(money(result.paidToSeller))}</b></div></div><h3 style="margin-top:22px">حصص الملاك بعد الصفقة</h3><div class="bars-list">${result.rows.map(row=>`<div class="comparison-row"><span>${E(row.name)}</span><div class="comparison-track"><div style="width:${Math.min(100,Math.max(0,row.after))}%"></div></div><span>${E(rate(row.after))}</span></div>`).join('')}</div><p class="tiny-note">مجموع النسب الناتجة: ${E(rate(result.totalAfter))}. يُحتفظ بالكسور الحسابية؛ الفروق الضئيلة المحتملة ناتجة عن العرض.</p>`;
  }

  function reportHtml(){
    const total=C.ownersTotal(state.owners),look=C.lookThrough(state.owners),valid=C.validOwners(state.owners);
    const col=(a)=>a.map(x=>`<tr>${x.map(y=>`<td>${E(y)}</td>`).join('')}</tr>`).join('');
    const tab=(headers,rows)=>`<div style="overflow:auto"><table><thead><tr>${headers.map(x=>`<th>${E(x)}</th>`).join('')}</tr></thead><tbody>${col(rows)}</tbody></table></div>`;
    let html=`<h2>تقرير صفوة الاستثماري: الملاك والفرص والقرارات</h2><p class="small">تاريخ التقرير: ${date()} | سجل إداري استرشادي لا يُثبت الملكية أو المستفيد الحقيقي أو الموافقات.</p>`;
    html+=`<h3>1. وضع ملكية صفوة</h3><p>عدد الملاك: ${state.owners.length} | مجموع النسب: ${rate(total)} | الحالة: ${state.ownershipStatus.status==='approved'?'اعتماد مسجل بواسطة المستخدم':'مسودة'} | ${valid?'المجموع مكتمل حسابيًا':'المجموع غير مكتمل'}</p>`;
    html+=state.owners.length?tab(['المالك','النوع','الملكية المباشرة','المساهمة','الدور'],state.owners.map(o=>[o.name,typeNames[o.type]||o.type,rate(o.pct),money(o.capital),o.role||'غير محدد'])):'<p>لا يوجد ملاك مدخلون.</p>';
    if(state.ownershipStatus.status==='approved')html+=`<p class="small">مسجل الاعتماد: ${E(state.ownershipStatus.approvedBy)} | ${E(state.ownershipStatus.date)}. تسجيل إداري دون تحقق مستقل.</p>`;
    html+=`<h3>2. تحليل ملكية غير مباشرة أولي</h3><p>قابل للتتبع حسابيًا: ${rate(look.tracedPct)}.</p>`;
    if(look.consolidated.length)html+=tab(['الاسم المدخل','الحصة المجمعة','المسارات'],look.consolidated.map(o=>[o.name,rate(o.pct),o.paths.join('، ')]));
    if(look.gaps.length)html+=`<p class="alert-text">فجوات الملكية غير المباشرة: ${E(look.gaps.map(x=>x.entity+'، '+x.explanation).join(' | '))}</p>`;
    html+='<h3>3. الفرص والأصول</h3>';
    html+=state.opportunities.length?tab(['الفرصة','المدينة','القيمة','الملاك المدخلون','المرحلة','العمولة النظرية'],state.opportunities.map(o=>{
      const m=C.assetOwnership(o.ownerships,state.assetOwners),c=o.asking!==null?C.commission(o):null;
      return [o.title,o.city||'غير محددة',money(o.asking),m.rows.length?m.rows.map(x=>x.name+' '+rate(x.pct)).join('، '):'غير محددين',stages[o.stage]||o.stage,c?.ok?money(c.net):'غير محددة'];
    })):'<p>لم تسجل فرص.</p>';
    html+='<h3>4. القرارات</h3>';
    html+=state.decisions.length?tab(['الموضوع','العتبة','المؤيد','المعارض','حالة القرار'],state.decisions.map(d=>{const r=C.votesResult(d);return[d.title,rate(d.threshold),rate(r.yes),rate(r.no),d.status==='recorded'?'محضر داخلي مسجل':'مقترح']})):'<p>لم تسجل قرارات.</p>';
    html+='<h3>5. ملفات الشراكات</h3>';
    html+=state.partnerships?.length?tab(['اسم الملف','المسار','الجهة','الأطراف','حالة الهيكل'],state.partnerships.map(p=>[p.title,p.type,p.client,p.parties?.length||0,p.final?.status==='approved'?'قرار معتمد داخليًا':'مسودة'])):'<p>لم تسجل ملفات شراكات بعد.</p>';
    html+='<h3>6. الملاحظات وحدود هذا التقرير</h3><ul><li>الملكية المدخلة لا تُعد توثيقًا قانونيًا، ولا بديلًا لعقد التأسيس والسجلات الرسمية.</li><li>يُتحقق من صكوك ملكية الأصول، والتفويضات، والتراخيص، والقيود، وأهلية المستثمرين بصورة مستقلة.</li><li>عمولات الفرص افتراضية ولا تتضمن تكاليف التنفيذ أو الضرائب، ولا تثبت استحقاق عمولة.</li><li>محاضر التصويت وصفية وتخضع للوائح الشركة ونظامها وللتوقيعات المطلوبة.</li><li>تحليل Look-through على مستوى واحد فقط ويتطلب مستندات للتحقق من هوية المستفيد النهائي.</li></ul>';
    return html;
  }
  function renderReport(){$('report-view').innerHTML=reportHtml();$('report-date').textContent=date()}
  function exportFile(name,content,type){const blob=new Blob([content],{type}),href=URL.createObjectURL(blob);const a=document.createElement('a');a.href=href;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),4000)}
  function exportJson(){exportFile('safwah-workspace-'+date()+'.json',JSON.stringify(state,null,2),'application/json;charset=utf-8');notify('نُزّلت نسخة احتياطية على جهازك. احفظها في مكان آمن.');}
  function exportHtml(){const report=`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"/><title>تقرير صفوة ${date()}</title><style>body{font-family:Tahoma,Arial,sans-serif;padding:35px;line-height:1.8;color:#192d3c}h1,h2,h3{color:#123045}table{border-collapse:collapse;width:100%;font-size:12px}th,td{border:1px solid #bccbd2;padding:8px;text-align:right}th{background:#eef1f2}.small{font-size:11px;color:#657787}.alert-text{color:#a54242}@media print{body{padding:0}@page{size:A4;margin:12mm}}</style></head><body>${reportHtml()}</body></html>`;
    exportFile('safwah-report-'+date()+'.html',report,'text/html;charset=utf-8');notify('نُزّل التقرير بصيغة HTML.');}
  function exportCsv(){const rows=[['نوع السجل','الاسم','الوصف','الملكية أو المرحلة','القيمة المالية','ملاحظة']];
    state.owners.forEach(o=>rows.push(['مالك صفوة',o.name,typeNames[o.type]||o.type,rate(o.pct),o.capital??'',o.notes]));
    state.assetOwners.forEach(o=>rows.push(['مالك أصل',o.name,typeNames[o.type]||o.type,'','',o.notes]));
    state.opportunities.forEach(o=>rows.push(['فرصة',o.title,o.city,stages[o.stage]||o.stage,o.asking??'',(o.ownerships||[]).map(a=>state.assetOwners.find(x=>x.id===a.ownerId)?.name+':'+rate(a.pct)).join('; ')]));
    state.decisions.forEach(d=>rows.push(['قرار',d.title,d.notes,d.status==='recorded'?'محضر مسجل':'مقترح',C.votesResult(d).yes,`عتبة ${rate(d.threshold)}`]));
    (state.partnerships||[]).forEach(p=>rows.push(['شراكة',p.title,p.client,p.type,p.parties?.length||0,p.objective||'']));
    const csv='\ufeff'+rows.map(row=>row.map(value=>{const raw=String(value??'');const clean=/^\s*[=+@-]/.test(raw)?String.fromCharCode(39)+raw:raw;return '"'+clean.replace(/"/g,'""')+'"'}).join(',')).join('\r\n');
    exportFile('safwah-data-'+date()+'.csv',csv,'text/csv;charset=utf-8');notify('نُزّلت بيانات CSV.');}
  function printReport(){$('print-area').innerHTML=reportHtml();window.print()}
  async function importJson(event){const f=event.target.files?.[0];event.target.value='';if(!f)return;if(f.size>4_000_000)return notify('حجم الملف يتجاوز 4 ميجابايت.',true);
    try{const x=JSON.parse(await f.text());if(x.version!==1||!Array.isArray(x.owners)||!Array.isArray(x.assetOwners)||!Array.isArray(x.opportunities)||!Array.isArray(x.decisions))throw new Error('تنسيق النسخة غير متوافق مع الإصدار الأول.');
      if(!window.confirm('سيستبدل الاستيراد جميع البيانات الحالية على هذا المتصفح. هل تريد المتابعة؟'))return;
      if(x.opportunities.some(o=>!o||!Array.isArray(o.ownerships)) ||
         x.decisions.some(d=>!d||!Array.isArray(d.snapshot)||!d.votes||typeof d.votes!=='object') ||
         x.owners.some(o=>!o||typeof o.name!=='string') || x.assetOwners.some(o=>!o||typeof o.name!=='string'))
        throw new Error('بنية بعض سجلات الملاك أو التصويت أو توزيع الفرص غير سليمة.');
      state={...blank(),...x,ownershipStatus:x.ownershipStatus||{status:'draft',approvedBy:'',date:''},history:Array.isArray(x.history)?x.history:[],partnerships:Array.isArray(x.partnerships)?x.partnerships:[]};
      save('استيراد نسخة احتياطية',f.name);resetOwner();resetAssetOwner();resetOpportunity();notify('تم استيراد الملف إلى مساحة العمل المحلية.');
    }catch(e){notify('فشل الاستيراد: '+e.message,true)}}
  function demo(){if(state.owners.length||state.opportunities.length||state.decisions.length){if(!window.confirm('سيُستبدل المشروع الحالي بمثال تعليمي. يرجى تنزيل نسخة قبل المتابعة. هل توافق؟'))return}
    const [a,b,c,p,q]=[uid(),uid(),uid(),uid(),uid()];state=blank();
    state.owners=[{id:a,name:'المالك الأول (مثال)',type:'person',pct:45,capital:450000,role:'شريك',beneficiaries:'',notes:''},{id:b,name:'المالك الثاني (مثال)',type:'person',pct:35,capital:350000,role:'مدير',beneficiaries:'',notes:''},{id:c,name:'شركة استثمار افتراضية',type:'entity',pct:20,capital:200000,role:'شريك مؤسسي',beneficiaries:'مستفيد أ | 60\nمستفيد ب | 40',notes:''}];
    state.assetOwners=[{id:p,name:'مالك عقاري افتراضي أ',type:'person',representative:'',notes:''},{id:q,name:'مالك عقاري افتراضي ب',type:'person',representative:'',notes:''}];
    state.opportunities=[{id:uid(),title:'فرصة تعليمية: أرض استثمارية',category:'عقاري',city:'المدينة المنورة',asking:8000000,area:4000,commissionRate:2.5,referralRate:20,stage:'review',documents:'partial',url:'',notes:'بيانات افتراضية للتجربة وليست عرضًا حقيقيًا.',ownerships:[{ownerId:p,pct:60},{ownerId:q,pct:40}],created:new Date().toISOString()}];
    save('تحميل بيانات تعليمية','جميع الأسماء والأرقام افتراضية');setTab('dashboard');notify('حُمّلت بيانات تعليمية افتراضية. لا تعتمد عليها تجاريًا.');}

  document.addEventListener('click',e=>{
    const tab=e.target.closest('[data-tab]');if(tab){setTab(tab.dataset.tab);return}
    const el=e.target.closest('[data-action]');if(!el)return;const action=el.dataset.action,id=el.dataset.id;
    const actions={
      'clear-owner':resetOwner,'edit-owner':()=>editOwner(id),'delete-owner':()=>deleteOwner(id),
      'clear-asset-owner':resetAssetOwner,'edit-asset-owner':()=>editAssetOwner(id),'delete-asset-owner':()=>deleteAssetOwner(id),
      'clear-opportunity':resetOpportunity,'edit-opportunity':()=>editOpportunity(id),'delete-opportunity':()=>deleteOpportunity(id),
      'edit-allocations':()=>openAllocation(id),'close-allocation':()=>$('allocation-dialog').close(),
      'record-decision':()=>recordDecision(id),'delete-decision':()=>deleteDecision(id),'copy-decision':()=>reproduceDecision(id),
      'approve-ownership':()=>{
        if(!C.validOwners(state.owners))return notify('اعتماد الحصص يتطلب نسبًا مجموعها 100%.',true);
        const who=$('ownership-approved-by').value.trim(),when=$('ownership-approved-date').value;
        if(!who||!when)return notify('حدد من اعتمد النسب وتاريخ تسجيل القرار.',true);
        state.ownershipStatus={status:'approved',approvedBy:who,date:when};save('تسجيل اعتماد سجل الملاك',who);notify('سُجل الاعتماد داخليًا دون التحقق من التوقيع أو الأثر النظامي.');
      },
      'print':printReport,'export-html':exportHtml,'export-json':exportJson,'export-csv':exportCsv,'load-demo':demo
    };actions[action]?.();
  });
  document.addEventListener('change',e=>{
    if(e.target.matches('#owner-form [name="type"]'))toggleBeneficiary();
    if(e.target.matches('[data-vote]'))vote(e.target.dataset.vote,e.target.dataset.ownerId,e.target.value);
  });
  $('owner-form').addEventListener('submit',saveOwner);
  $('asset-owner-form').addEventListener('submit',saveAssetOwner);
  $('opportunity-form').addEventListener('submit',saveOpportunity);
  $('decision-form').addEventListener('submit',saveDecision);
  $('scenario-form').addEventListener('submit',calculateScenario);
  $('allocation-form').addEventListener('submit',saveAllocation);
  $('export-backup').addEventListener('click',exportJson);
  $('import-file').addEventListener('change',importJson);
  $('allocation-dialog').addEventListener('click',e=>{if(e.target===$('allocation-dialog'))$('allocation-dialog').close()});
  toggleBeneficiary();render();
  window.SafwahApp={
    getSnapshot:()=>structuredClone(state),getReportHtml:reportHtml,
    upsertPartnership(project,action='تحديث ملف الشراكة'){
      if(!project||typeof project.id!=='string'||!Array.isArray(project.parties)||typeof project.title!=='string')throw new Error('ملف الشراكة غير صالح.');
      const index=state.partnerships.findIndex(p=>p.id===project.id);
      const normalized=structuredClone(project);
      if(index>=0)state.partnerships[index]=normalized;else state.partnerships.unshift(normalized);
      save(action,normalized.title);return normalized.id;
    },
    removePartnership(id){const index=state.partnerships.findIndex(p=>p.id===id);if(index<0)return false;const name=state.partnerships[index].title;state.partnerships.splice(index,1);save('حذف ملف شراكة',name);return true},
    navigate:setTab,
    message:notify
  };
})();
