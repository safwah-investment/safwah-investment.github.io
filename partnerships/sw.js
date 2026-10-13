/* Application shell only; private project data is never precached. */
const VERSION='safwah-v3-20261012';
const SHELL=['./','./index.html','./styles.css','./partnerships.css','./core.js','./app.js','./partnership-core.js','./partnerships.js','./word-export.js','./advisor-config.js','./advisor-core.js','./advisor-ui.js','./advisor.css','./pwa.js','./manifest.webmanifest','./assets/favicon.svg','./assets/icon-192.png','./assets/icon-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('safwah-v')&&k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
 if(request.mode==='navigate'){
  event.respondWith(fetch(request).then(response=>{if(response.ok){const copy=response.clone();caches.open(VERSION).then(cache=>cache.put('./index.html',copy))}return response}).catch(()=>caches.match('./index.html')));
  return;
 }
 event.respondWith(caches.match(request).then(hit=>hit||fetch(request)));
});
