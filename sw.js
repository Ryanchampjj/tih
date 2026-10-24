var CACHE = 'tih-portal-v41';   // v41 24/10/2569: วิทยุแจ้งเหตุฉุกเฉิน — รับ web push + แตะแจ้งเตือนเปิด #radio=<id> · ไม่แตะคำขอข้ามโดเมน (API attendance-live / Supabase) · v40 04/10/2569: ล็อกอินก่อนทุกอย่าง · สแกนหน้าแนบตั๋ว · แถวการแจ้งเตือน · ต่ออายุตั๋วอัตโนมัติ
var ASSETS = ['./', './index.html', './go.html', './app.html', './manifest.json', './icon.png',
  './logo.png', './hr.png', './fix.png', './car.png', './maid.png', './risk.png',
  './cheer.png', './sign.png', './goodday.png', './horo.png'];
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
  // คำขอข้ามโดเมน (API attendance-live · เสียงแจ้งเหตุใน Supabase · Realtime · ฟอนต์) และคำขอที่ไม่ใช่ GET
  // = ไม่ยุ่งเลย ปล่อยเบราว์เซอร์จัดการเอง → ไม่มีวันเสิร์ฟคำตอบ API เก่าจาก cache (24/10/2569)
  if (req.method !== 'GET' || req.url.indexOf(self.location.origin + '/') !== 0) return;
  // links.json: network-only เสมอ ห้ามเสิร์ฟจาก cache (ลิงก์ต้องสดตลอด)
  // ดวงรายวัน (horoscope/*.json) ก็เช่นกัน — เปลี่ยนทุกวันตอน 00:01
  if (req.url.indexOf('links.json') !== -1 || req.url.indexOf('/horoscope/') !== -1) {
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

/* ---------- แจ้งเตือนเข้ามือถือ (Web Push) — วิทยุแจ้งเหตุฉุกเฉิน (attendance-live/api/radio.js · 24/10/2569) ----------
   payload: { title, body, tag:'radio-<id>', url:'https://ryanchampjj.github.io/tih/#radio=<id>', kind:'radio', id }
   - ต้อง showNotification ทุกครั้ง (iOS บังคับ — push ที่ไม่โชว์อะไรเลย ระบบจะตัดสิทธิ์รับแจ้งเตือน)
   - มีหน้าพอร์ทัลเปิดบนจออยู่ → postMessage {type:'radio',id} ให้หน้าเล่นเสียงทันทีด้วย (หน้ากันเล่นซ้ำกับ Realtime เอง) */
self.addEventListener('push', function(e){
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data ? e.data.text() : '' }; }
  var radio = d.kind === 'radio' || /^radio-/.test(d.tag || '');
  var opts = {
    body: d.body || '',
    tag: d.tag || 'tih',
    renotify: true,
    icon: 'icon.png',
    badge: 'icon.png',
    data: { url: d.url || './', kind: d.kind || '', id: d.id || null }
  };
  if (radio) { opts.requireInteraction = true; opts.vibrate = [400, 150, 400, 150, 800]; }
  e.waitUntil(Promise.all([
    self.registration.showNotification(d.title || 'ระบบงาน TIH', opts),
    radio ? self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list){
      list.forEach(function(c){ if (c.visibilityState === 'visible') c.postMessage({ type: 'radio', id: d.id }); });
    }) : null
  ]));
});

/* แตะแจ้งเตือน: หน้าพอร์ทัลเปิดค้างอยู่ → ดึงขึ้นมา + บอกให้เล่นคลิปนั้น (ไม่เปิดหน้าใหม่) · ไม่มี → เปิด #radio=<id> */
self.addEventListener('notificationclick', function(e){
  e.notification.close();
  var data = e.notification.data || {}, url = data.url || './';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list){
      var scope = self.registration.scope;
      for (var i = 0; i < list.length; i++) {
        var c = list[i];
        if (data.kind === 'radio' && c.url.indexOf(scope) === 0 && 'focus' in c) {
          return c.focus().then(function(fc){ (fc || c).postMessage({ type: 'radio', id: data.id, click: true }); }).catch(function(){ return self.clients.openWindow(url); });
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
