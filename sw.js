const CACHE='boardmate-shell-v11.4.59';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('boardmate-shell-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const hit=await cache.match(req);
    try{
      const res=await fetch(req,{cache:'no-store'});
      if(res.ok&&res.type==='basic')await cache.put(req,res.clone());
      if(!res.ok&&hit)return hit;
      return res;
    }catch{return hit||new Response('오프라인 상태입니다.',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}});}
  })());
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=new URL(event.notification?.data?.url||'./index.html#/multi',self.location.href).href;
  event.waitUntil((async()=>{
    const list=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of list){try{if('navigate' in client)await client.navigate(target);await client.focus();return;}catch{}}
    if(self.clients.openWindow)await self.clients.openWindow(target);
  })());
});
