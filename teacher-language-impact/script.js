const levels = {
  1:{words:["معلّم","طالب","درس","كتاب","علم","شكر","احترام","قدوة"],title:"صف معلمك بثلاث كلمات",task:"اختر ثلاث كلمات بسيطة تصف معلمك، ثم كوّن جملة قصيرة.",example:"مثال: معلمي طيب. معلمي يعلمني العربية."},
  2:{words:["صبور","مخلص","متعاون","مبتسم","نافع","مجتهد","متفهم"],title:"اكتب رسالة قصيرة",task:"اكتب ثلاثة أسطر تبدأ بعبارة: تعلمت من معلمي…",example:"مثال: تعلمت من معلمي أن أتكلم بالعربية كل يوم. أشكره على صبره وتشجيعه."},
  3:{words:["تجربة","موقف","تأثير","تشجيع","ثقة","تطور","نجاح"],title:"احكِ موقفًا لا تنساه",task:"اكتب من 80 إلى 100 كلمة عن موقف ترك أثرًا فيك.",example:"فكر في: ماذا حدث؟ ماذا قال معلمك؟ ماذا تغيّر بعد ذلك؟"},
  4:{words:["أثر","منهج","توجيه","استقلالية","دافعية","قدوة","تعلّم"],title:"اكتب قصة أثر",task:"اكتب نصًا قصيرًا يشرح كيف غيّر معلمٌ طريقة تعلمك أو تفكيرك.",example:"يمكنك تحويل القصة لاحقًا إلى تسجيل صوتي أو مقابلة قصيرة."}
};

const seedStories = [
  {student:"طالب من إندونيسيا",country:"إندونيسيا",level:"المستوى الثاني",message:"علمني معلمي ألا أخاف من الخطأ، وأن الكلام الكثير هو طريق إتقان العربية."},
  {student:"طالب من نيجيريا",country:"نيجيريا",level:"المستوى الثالث",message:"شجعني معلمي على القراءة كل يوم، وبعد أشهر أصبحت أفهم النصوص وأتحدث بثقة أكبر."},
  {student:"طالب من البوسنة",country:"البوسنة",level:"المستوى الأول",message:"معلمي صبور ومبتسم. أنا أحب درس العربية معه."}
];

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
  return str.replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));
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
  const saved=JSON.parse(localStorage.getItem("teacherImpactStories")||"[]");
  saved.unshift(story);
  localStorage.setItem("teacherImpactStories",JSON.stringify(saved.slice(0,20)));
  e.currentTarget.reset(); count.textContent="0";
  document.getElementById("formStatus").textContent="تمت إضافة مشاركتك إلى جدار الأثر على هذا الجهاز.";
  renderWall();
  document.getElementById("wall").scrollIntoView({behavior:"smooth"});
});
