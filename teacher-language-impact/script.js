const levels = {
  1:{words:["معلّم","طالب","درس","كتاب","علم","شكر","احترام","قدوة"],title:"صف معلمك بثلاث كلمات",task:"اختر ثلاث كلمات بسيطة تصف معلمك، ثم كوّن جملة قصيرة بالعربية.",example:"مثال: معلمي طيب. معلمي يعلمني العربية."},
  2:{words:["صبور","مخلص","متعاون","مبتسم","نافع","مجتهد","متفهم"],title:"اكتب رسالة قصيرة",task:"اكتب ثلاثة أسطر بالعربية تبدأ بعبارة: تعلمت من معلمي…",example:"مثال: تعلمت من معلمي أن أتكلم بالعربية كل يوم. أشكره على صبره وتشجيعه."},
  3:{words:["تجربة","موقف","تأثير","تشجيع","ثقة","تطور","نجاح"],title:"احكِ موقفًا لا تنساه",task:"اكتب من 80 إلى 100 كلمة بالعربية عن موقف ترك أثرًا فيك.",example:"فكر في: ماذا حدث؟ ماذا قال معلمك؟ ماذا تغيّر بعد ذلك؟"},
  4:{words:["أثر","منهج","توجيه","استقلالية","دافعية","قدوة","تعلّم"],title:"اكتب قصة أثر",task:"اكتب نصًا عربيًا قصيرًا يشرح كيف غيّر معلمٌ طريقة تعلمك أو تفكيرك.",example:"يمكنك تحويل القصة لاحقًا إلى تسجيل صوتي أو مقابلة قصيرة."}
};

const seedStories = [
  {student:"طالب من إندونيسيا",country:"إندونيسيا",level:"المستوى الثاني",message:"علمني معلمي ألا أخاف من الخطأ، وأن الكلام الكثير هو طريق إتقان العربية."},
  {student:"طالب من نيجيريا",country:"نيجيريا",level:"المستوى الثالث",message:"شجعني معلمي على القراءة كل يوم، وبعد أشهر أصبحت أفهم النصوص وأتحدث بثقة أكبر."},
  {student:"طالب من البوسنة",country:"البوسنة",level:"المستوى الأول",message:"معلمي صبور ومبتسم. أنا أحب درس العربية معه."}
];

const rtlLanguages = new Set(["ar","fa","ur","he","ps","sd","ug","ckb","dv"]);
const browserLocale = (navigator.languages && navigator.languages[0]) || navigator.language || "ar";
const browserLanguage = browserLocale.toLowerCase().split("-")[0];
const urlParams = new URLSearchParams(location.search);
const proxyLanguage = (urlParams.get("_x_tr_tl") || "").toLowerCase().split("-")[0];
const isTranslateProxy = location.hostname.includes("translate.goog") || location.hostname.includes("translate.google");
const stayArabic = urlParams.get("stay") === "ar";

const languageAliases = {
  "fas":"fa","per":"fa","urd":"ur","pus":"ps","ara":"ar","eng":"en","fra":"fr","fre":"fr",
  "ind":"id","msa":"ms","tur":"tr","rus":"ru","bos":"bs","som":"so","hau":"ha","yor":"yo",
  "swa":"sw","uzb":"uz","kaz":"kk","kir":"ky","tgk":"tg","aze":"az","ben":"bn","hin":"hi",
  "tam":"ta","tel":"te","mal":"ml","sin":"si","tha":"th","vie":"vi","khm":"km","mya":"my",
  "zho":"zh-CN","chi":"zh-CN","kor":"ko","jpn":"ja","por":"pt","spa":"es","deu":"de","ger":"de"
};

function normalizeLanguage(code){
  if(!code) return "ar";
  const clean = String(code).trim().toLowerCase();
  const base = clean.split("-")[0];
  return languageAliases[clean] || languageAliases[base] || clean;
}

function languageName(code){
  try{
    const display = new Intl.DisplayNames([browserLocale], {type:"language"});
    return display.of(code) || code.toUpperCase();
  }catch(e){ return String(code).toUpperCase(); }
}

function countryName(code){
  try{
    const display = new Intl.DisplayNames([browserLocale], {type:"region"});
    return display.of(code) || code;
  }catch(e){ return code; }
}

function setDirection(code){
  const normalized=normalizeLanguage(code);
  document.documentElement.lang=normalized;
  document.documentElement.dir = rtlLanguages.has(normalized.split("-")[0]) ? "rtl" : "ltr";
}

function translationUrl(code){
  const clean = new URL(location.href);
  clean.searchParams.delete("stay");
  clean.searchParams.delete("_x_tr_sl");
  clean.searchParams.delete("_x_tr_tl");
  clean.searchParams.delete("_x_tr_hl");
  return "https://translate.google.com/translate?sl=ar&tl=" + encodeURIComponent(normalizeLanguage(code)) + "&u=" + encodeURIComponent(clean.toString());
}

function chooseCountryLanguage(apiLanguages){
  const langs = String(apiLanguages || "")
    .split(",")
    .map(normalizeLanguage)
    .filter(Boolean);
  if(!langs.length) return browserLanguage;

  const browserBase = normalizeLanguage(browserLanguage).split("-")[0];
  const matching = langs.find(lang => normalizeLanguage(lang).split("-")[0] === browserBase);
  return matching || langs[0];
}

async function detectStudentCountry(){
  try{
    const controller = new AbortController();
    const timer = setTimeout(()=>controller.abort(), 3500);
    const response = await fetch("https://ipapi.co/json/", {
      signal: controller.signal,
      headers: {"Accept":"application/json"}
    });
    clearTimeout(timer);
    if(!response.ok) throw new Error("country detection failed");
    const data = await response.json();
    return {
      code: data.country_code || data.country || "",
      name: data.country_name || "",
      languages: data.languages || ""
    };
  }catch(e){
    return null;
  }
}

async function configureLanguageExperience(){
  const button = document.getElementById("languageButton");
  const status = document.getElementById("languageStatus");
  const notice = document.getElementById("languageNotice");
  const noticeText = document.getElementById("languageNoticeText");
  const countryInput = document.querySelector('input[name="country"]');

  if(isTranslateProxy){
    const target = normalizeLanguage(proxyLanguage || browserLanguage);
    setDirection(target);
    status.textContent = languageName(target);
    notice.hidden = false;
    noticeText.textContent = "واجهة مساندة مترجمة آليًا — تبقى أنشطة العربية والنماذج التدريبية بالعربية.";
    button.addEventListener("click",()=>{ location.href = location.origin + location.pathname + "?stay=ar"; });
    return;
  }

  const detected = await detectStudentCountry();
  const target = detected ? chooseCountryLanguage(detected.languages) : normalizeLanguage(browserLanguage);

  if(detected && countryInput && !countryInput.value){
    countryInput.value = detected.name || countryName(detected.code);
  }

  setDirection("ar");
  status.textContent = detected
    ? (detected.code + " · " + languageName(target))
    : languageName(target);

  if(detected){
    notice.hidden = false;
    noticeText.textContent =
      "تم تحديد بلد الطالب تقريبياً: " +
      (detected.name || countryName(detected.code)) +
      " — لغة الواجهة المساندة: " + languageName(target) + ".";
  }else if(browserLanguage !== "ar"){
    notice.hidden = false;
    noticeText.textContent =
      "تعذر تحديد البلد، لذلك استُخدمت لغة الجهاز: " + languageName(target) + ".";
  }

  if(target === "ar" || stayArabic){
    button.addEventListener("click",()=>{ notice.hidden = !notice.hidden; });
    return;
  }

  button.addEventListener("click",()=>{ location.href = translationUrl(target); });

  const sessionKey = "teacherImpactAutoLang:" + (detected?.code || "device") + ":" + target;
  const alreadyRedirected = sessionStorage.getItem(sessionKey) === "1";
  if(!alreadyRedirected && !stayArabic){
    sessionStorage.setItem(sessionKey,"1");
    setTimeout(()=>{ location.href = translationUrl(target); }, 850);
  }
}
configureLanguageExperience();

function renderLevel(n){
  const data=levels[n];
  document.querySelectorAll(".level-tab").forEach(b=>b.classList.toggle("active",b.dataset.level===String(n)));
  document.getElementById("levelWords").innerHTML=data.words.map(w=>`<span>${w}</span>`).join("");
  document.getElementById("levelTitle").textContent=data.title;
  document.getElementById("levelTask").textContent=data.task;
  document.getElementById("levelExample").textContent=data.example;
}
document.querySelectorAll(".level-tab").forEach(b=>b.addEventListener("click",()=>renderLevel(b.dataset.level)));
renderLevel(1);

const messageField=document.getElementById("messageField");
const count=document.getElementById("charCount");
messageField.addEventListener("input",()=>count.textContent=messageField.value.length);
document.querySelectorAll("[data-prompt]").forEach(btn=>btn.addEventListener("click",()=>{
  messageField.value=btn.dataset.prompt;
  count.textContent=messageField.value.length;
  document.getElementById("participate").scrollIntoView({behavior:"smooth"});
  setTimeout(()=>messageField.focus(),400);
}));

const wordForm=document.getElementById("threeWordsForm");
wordForm.addEventListener("submit",e=>{
  e.preventDefault();
  const input=document.getElementById("threeWords");
  const words=input.value.split(/[،,]/).map(x=>x.trim()).filter(Boolean).slice(0,3);
  if(!words.length)return;
  const cloud=document.getElementById("wordCloud");
  words.forEach((w,i)=>{
    const el=document.createElement(i===0?"b":"span"); el.textContent=w; cloud.appendChild(el);
  });
  input.value="";
});

function getStories(){
  try{return [...JSON.parse(localStorage.getItem("teacherImpactStories")||"[]"),...seedStories]}
  catch(e){return seedStories}
}
function escapeHTML(str=""){
  return String(str).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));
}
function renderWall(){
  const wall=document.getElementById("wallGrid");
  wall.innerHTML=getStories().map((s,i)=>`
    <article class="wall-card ${i===0?"new":""}">
      <span class="flag">${escapeHTML(s.country||"طالب دولي")}</span>
      <blockquote>“${escapeHTML(s.message)}”</blockquote>
      <footer>${escapeHTML(s.student||"طالب في المعهد")} · ${escapeHTML(s.level||"")}</footer>
    </article>`).join("");
}
renderWall();

document.getElementById("impactForm").addEventListener("submit",e=>{
  e.preventDefault();
  const fd=new FormData(e.currentTarget);
  const story={
    student:(fd.get("student")||"طالب في المعهد").toString().trim(),
    country:fd.get("country").toString().trim(),
    level:fd.get("level").toString(),
    teacher:fd.get("teacher").toString().trim(),
    message:fd.get("message").toString().trim()
  };
  if(!story.country||!story.level||!story.message)return;
  const submit=e.currentTarget.querySelector('button[type="submit"]');
  if(submit) submit.disabled=true;
  try{
    const saved=JSON.parse(localStorage.getItem("teacherImpactStories")||"[]");
    saved.unshift(story);
    localStorage.setItem("teacherImpactStories",JSON.stringify(saved.slice(0,20)));
    e.currentTarget.reset(); count.textContent="0";
    document.getElementById("formStatus").textContent="تمت إضافة مشاركتك إلى جدار الأثر على هذا الجهاز.";
  }catch(err){
    document.getElementById("formStatus").textContent="تعذر الحفظ على هذا الجهاز. تحقق من إعدادات التخزين في المتصفح.";
    if(submit) submit.disabled=false;
    return;
  }
  if(submit) submit.disabled=false;
  renderWall();
  document.getElementById("wall").scrollIntoView({behavior:"smooth"});
});

const menuButton=document.getElementById("menuButton");
const mobileNavWrap=document.getElementById("mobileNavWrap");
if(menuButton && mobileNavWrap){
  const closeMobileMenu=()=>{
    mobileNavWrap.classList.remove("open");
    menuButton.setAttribute("aria-expanded","false");
    menuButton.setAttribute("aria-label","فتح القائمة");
  };
  menuButton.addEventListener("click",()=>{
    const open=!mobileNavWrap.classList.contains("open");
    mobileNavWrap.classList.toggle("open",open);
    menuButton.setAttribute("aria-expanded",String(open));
    menuButton.setAttribute("aria-label",open?"إغلاق القائمة":"فتح القائمة");
  });
  mobileNavWrap.querySelectorAll("a").forEach(a=>a.addEventListener("click",closeMobileMenu));
  window.addEventListener("resize",()=>{
    if(window.innerWidth>=1100) closeMobileMenu();
  });
}
