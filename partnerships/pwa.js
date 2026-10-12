/* Minimal optional installation workflow for the offline-capable app shell. */
(()=>{'use strict';let installPrompt=null;
if('serviceWorker'in navigator&&(location.protocol==='https:'||location.hostname==='localhost')){
 navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
window.addEventListener('beforeinstallprompt',event=>{
 event.preventDefault();installPrompt=event;
 const container=document.querySelector('.header-actions');if(!container||document.getElementById('install-safwah'))return;
 const b=document.createElement('button');b.type='button';b.id='install-safwah';b.className='btn btn-outline btn-small';b.textContent='تثبيت صفوة';container.prepend(b);
 b.addEventListener('click',async()=>{if(!installPrompt)return;const waiting=installPrompt;installPrompt=null;await waiting.prompt();b.remove()});
});
window.addEventListener('appinstalled',()=>{installPrompt=null;document.getElementById('install-safwah')?.remove()});
})();
