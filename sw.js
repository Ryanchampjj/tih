var CACHE = 'tih-portal-v1';
var ASSETS = ['./', './index.html', './manifest.json', './icon.png'];
self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(ASSETS).catch(function(){}); }));
  self.skipWaiting();
});
self.addEventListener('activate', function(e){ e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function(e){
  e.respondWith(caches.match(e.request).then(function(r){ return r || fetch(e.request); }).catch(function(){ return fetch(e.request); }));
});
