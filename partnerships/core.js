/* SAFWAH Ownership & Opportunities — original standalone implementation.
 * All numbers and draft decisions are indicative, not legal registration.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SafwahCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const EPS = 1e-7;
  const num = x => {
    if (x === '' || x === null || x === undefined) return NaN;
    const n = Number(x);
    return Number.isFinite(n) ? n : NaN;
  };
  const sum = arr => arr.reduce((s, x) => s + (Number(x) || 0), 0);
  const pct = x => Number.isFinite(num(x)) ? Math.max(0, num(x)) : 0;
  const round = (x, digits = 8) => Math.round((x + Number.EPSILON) * 10 ** digits) / 10 ** digits;
  const ownersTotal = owners => sum(owners.map(o => o.pct));
  const validOwners = owners => Array.isArray(owners) && owners.length > 0 && owners.every(o =>
    typeof o.name === 'string' && o.name.trim() && Number.isFinite(num(o.pct)) && num(o.pct) >= 0 && num(o.pct) <= 100
  ) && Math.abs(ownersTotal(owners) - 100) < EPS;

  function parseBeneficiaries(text) {
    const lines = String(text || '').split(/\r?\n/).map(x => x.trim()).filter(Boolean);
    const records = [], errors = [];
    lines.forEach((line, index) => {
      const pieces = line.split('|').map(x => x.trim());
      const stake = num(pieces[1]);
      if (pieces.length !== 2 || !pieces[0] || !(stake > 0 && stake <= 100)) {
        errors.push(`السطر ${index + 1}: استخدم الاسم | النسبة (أكبر من صفر وحتى 100).`);
      } else records.push({name:pieces[0], pct:stake});
    });
    return { records, errors, total:round(sum(records.map(x => x.pct))) };
  }

  function lookThrough(owners) {
    const rows = [], gaps = [];
    for (const owner of owners || []) {
      const direct = pct(owner.pct);
      if (owner.type !== 'entity') {
        rows.push({name:owner.name, via:'ملكية مباشرة', pct:round(direct)});
        continue;
      }
      const parsed = parseBeneficiaries(owner.beneficiaries);
      if (parsed.errors.length || Math.abs(parsed.total - 100) > EPS) {
        gaps.push({entity:owner.name, share:direct, explanation: parsed.errors.join(' ') || 'توزيع ملاك الجهة الاعتبارية غير مكتمل إلى 100%.'});
        continue;
      }
      for (const b of parsed.records) {
        rows.push({name:b.name, via:owner.name, pct:round(direct * b.pct / 100)});
      }
    }
    // Merge identical names only for a consolidated view; names must be independently verified.
    const grouped = new Map();
    for (const row of rows) {
      const name = row.name.trim();
      if (!grouped.has(name)) grouped.set(name, {name, pct:0, paths:[]});
      const item = grouped.get(name);
      item.pct += row.pct;
      item.paths.push(row.via);
    }
    return {rows, consolidated:[...grouped.values()].map(x=>({...x,pct:round(x.pct)})), gaps,
      tracedPct:round(sum(rows.map(x=>x.pct)))};
  }

  function assetOwnership(allocations, assetOwners) {
    const errors = [], seen = new Set();
    const rows = (allocations || []).map(a => {
      const who = (assetOwners || []).find(x => x.id === a.ownerId);
      if (!who) errors.push('يوجد مالك أصل غير موجود في السجل.');
      if (seen.has(a.ownerId)) errors.push('تكرر المالك في نفس الفرصة.');
      seen.add(a.ownerId);
      const p = num(a.pct);
      if (!(p > 0 && p <= 100)) errors.push('نسبة ملكية الأصل يجب أن تزيد على صفر ولا تتجاوز 100%.');
      return {name:who?.name || 'مالك غير موجود',pct:p};
    });
    const total = sum(rows.map(x=>x.pct));
    if (!rows.length) errors.push('لم تُوثق أسماء ملاك الفرصة.');
    else if (Math.abs(total - 100) > EPS) errors.push('مجموع حصص ملاك الفرصة يجب أن يساوي 100%.');
    return {rows,total:round(total),errors};
  }

  function investmentScenario({owners,valuation,cashIn,cashOut,sellerId,investorName}) {
    const errors=[];
    if (!validOwners(owners)) errors.push('سجل ملكية صفوة يجب أن يكتمل إلى 100% قبل محاكاة التخفيف.');
    const pre = num(valuation), injection = num(cashIn), purchase = num(cashOut);
    if (!(pre > 0)) errors.push('أدخل تقييمًا قبل الاستثمار أكبر من صفر.');
    if (!(injection >= 0) || !(purchase >= 0)) errors.push('المبالغ يجب أن تكون صفرًا أو أكثر.');
    if (injection + purchase <= 0) errors.push('يجب وجود ضخ مالي أو شراء حصة على الأقل.');
    const seller = (owners || []).find(o => o.id === sellerId);
    if (purchase > 0 && !seller) errors.push('حدد الشريك الذي يبيع حصته.');
    if (seller && pre > 0 && purchase > pre * Number(seller.pct) / 100 + EPS)
      errors.push('قيمة الشراء تتجاوز القيمة التقديرية لحصة البائع.');
    if (errors.length) return {ok:false,errors};
    const post = pre + injection;
    const acquiredPct = 100 * purchase / post;
    const investorPct = 100 * (injection + purchase) / post;
    const dilutionFactor = pre / post;
    const rows = owners.map(o => ({id:o.id, name:o.name, before:num(o.pct),
      after:round(num(o.pct) * dilutionFactor - (o.id === sellerId ? acquiredPct : 0))}));
    rows.push({id:'new-investor',name:String(investorName || 'المستثمر الجديد').trim(),before:0,after:round(investorPct)});
    if (rows.some(x=>x.after < -EPS)) return {ok:false,errors:['تنتج المعطيات حصة سالبة؛ راجع المبالغ.']};
    return {ok:true,preMoney:pre,postMoney:post,paidToCompany:injection,paidToSeller:purchase,
      investorPct:round(investorPct),rows, totalAfter:round(sum(rows.map(x=>x.after)))};
  }

  function commission({asking,rate,commissionRate,referralRate}) {
    const price=num(asking),r=num(rate ?? commissionRate), referral=num(referralRate);
    if (!(price >= 0) || !(r >= 0 && r <= 100) || !(referral >= 0 && referral <= 100))
      return {ok:false,errors:['قيمة العقار ونسب العمولة أو الإحالة غير صالحة.']};
    const gross=price*r/100;
    return {ok:true,gross:round(gross,2),referral:round(gross*referral/100,2),
      net:round(gross*(1-referral/100),2)};
  }

  function votesResult(decision) {
    const voters=decision?.snapshot || [];
    const total = sum(voters.map(o=>o.pct));
    const yes=sum(voters.filter(o=>decision.votes?.[o.id]==='yes').map(o=>o.pct));
    const no=sum(voters.filter(o=>decision.votes?.[o.id]==='no').map(o=>o.pct));
    const abstain=sum(voters.filter(o=>decision.votes?.[o.id]==='abstain').map(o=>o.pct));
    const threshold=num(decision?.threshold);
    const valid = Math.abs(total-100)<EPS && Number.isFinite(threshold) && threshold>0 && threshold<=100;
    return {total:round(total),yes:round(yes),no:round(no),abstain:round(abstain),
      uncast:round(Math.max(0,total-yes-no-abstain)),threshold,
      valid,passes:valid&&yes+EPS>=threshold};
  }

  const escapeHtml = x => String(x ?? '').replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  return {num,pct,round,ownersTotal,validOwners,parseBeneficiaries,lookThrough,assetOwnership,investmentScenario,commission,votesResult,escapeHtml};
});
