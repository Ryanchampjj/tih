var CACHE = 'tih-portal-v7';
var ASSETS = ['./', './index.html', './manifest.json', './icon.png',
  './logo.png', './hr.png', './fix.png', './car.png', './maid.png', './risk.png'];
self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(ASSETS).catch(function(){}); }));
  self.skipWaiting();
});
self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){ if(k!==CACHE) return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});
self.addEventListener('fetch', function(e){
  var req = e.request;
  // links.json: network-only เสมอ ห้ามเสิร์ฟจาก cache (ลิงก์ต้องสดตลอด)
  if (req.url.indexOf('links.json') !== -1) {
    e.respondWith(fetch(req, {cache: 'no-store'}));
    return;
  }
  // network-first for page navigations (HTML) so updates show immediately
  if (req.mode === 'navigate' || (req.headers.get('accept')||'').indexOf('text/html') !== -1) {
    e.respondWith(
      fetch(req).then(function(res){
        var copy = res.clone();
        caches.open(CACHE).then(function(c){ c.put(req, copy).catch(function(){}); });
        return res;
      }).catch(function(){ return caches.match(req).then(function(r){ return r || caches.match('./index.html'); }); })
    );
    return;
  }
  // cache-first for static assets
  e.respondWith(caches.match(req).then(function(r){ return r || fetch(req); }).catch(function(){ return fetch(req); }));
});
