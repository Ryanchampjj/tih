var CACHE = 'tih-portal-v43';   // v43 25/10/2569: วิทยุแจ้งเหตุเปลี่ยนเป็นปุ่มเปิดแอป Zello (พี่เคาะ) — ถอดปุ่มกดพูด/ฟังสด/แจ้งเตือนเสียงออกจากหน้า + ลบ push/notificationclick ของวิทยุออกจากไฟล์นี้ (พอร์ทัลไม่รับ web push แล้ว) · v42 24/10/2569: วิทยุแจ้งเหตุกลับมาแบบช่วงทดลอง (ปุ่มล่างสุดของหน้า เห็นเฉพาะคนใน PILOT_EMPS) · v41 24/10/2569: วิทยุแจ้งเหตุฉุกเฉิน — รับ web push + แตะแจ้งเตือนเปิด #radio=<id> · ไม่แตะคำขอข้ามโดเมน (API attendance-live / Supabase) · v40 04/10/2569: ล็อกอินก่อนทุกอย่าง · สแกนหน้าแนบตั๋ว · แถวการแจ้งเตือน · ต่ออายุตั๋วอัตโนมัติ
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
  // คำขอข้ามโดเมน (API attendance-live · ฟอนต์ · ลิงก์ร้านแอป/Zello) และคำขอที่ไม่ใช่ GET
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

