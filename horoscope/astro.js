/* horoscope/astro.js — ตัวคำนวณดวงทั้งหมดจากวันเดือนปีเกิด (+ เวลาเกิดถ้ามี)
   ใช้ตัวเดียวกันทั้งหน้าเว็บ (window.ASTRO) และ node (plan.js ที่ Routine เรียกตอนเที่ยงคืน)
   ไม่มีการเดา — ทุกอย่างในไฟล์นี้เป็น "กติกา" หรือ "การคำนวณตำแหน่งดาว" ส่วนคำทำนายอยู่ที่อื่น

   1 ทักษาพยากรณ์   ดาวประจำวันเกิด (แบบไทย วันใหม่เริ่ม 06:00 · พุธกลางคืน = ราหู) → 8 ภูมิ · สี · เลข
   2 มหาทักษา       ดาวเสวยอายุ + ดาวแทรก (รอบ 108 ปี) จากดาววันเกิดและอายุจริง
   3 ราศี            ดวงอาทิตย์ (ราศีเกิด) · ดวงจันทร์ · ลัคนา (ต้องมีเวลาเกิด) แบบนิรายนะ (อายนางศ์ลาหิรี)
                     ตำแหน่งดาวตามสูตรของ Meeus (Astronomical Algorithms) ความคลาดเคลื่อน < 0.3 องศา
                     ลัคนาคิดที่พิกัดจังหวัดที่เกิด (ไม่ได้เลือก = กรุงเทพฯ) เวลาไทย UTC+7
                     เกิดต่างประเทศ: พิกัดเมือง + เขตเวลาของที่นั่นตามปีเกิด (รวมเวลาออมแสง)
   4 นักษัตรจีน      ปีเกิดเปลี่ยนที่วันลิบชุน (ดวงอาทิตย์ 315 องศา ราว 4 ก.พ.) · ธาตุจากราก (ต้นปี)
                     ความสัมพันธ์ ชง / ชงร่วม / ชงอ้อม / ส่ง / เสริม · นักษัตรของแต่ละวัน (วันชง)
   5 เลขศาสตร์       เลขชีวิต (เก็บเลขพิเศษ 11 22 33) · เลขปี · เลขประจำวันส่วนตัว */
(function (root) {
  'use strict';

  var DAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];      // getUTCDay() 0-6
  // วงทักษา (ตามเข็มนาฬิกา) — ราหูแทนพุธกลางคืน
  var RING = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'เสาร์', 'พฤหัสบดี', 'ราหู', 'ศุกร์'];
  var NUM = { 'อาทิตย์': 1, 'จันทร์': 2, 'อังคาร': 3, 'พุธ': 4, 'พฤหัสบดี': 5, 'ศุกร์': 6, 'เสาร์': 7, 'ราหู': 8 };
  var COLOR = {
    'อาทิตย์': 'แดง', 'จันทร์': 'เหลือง', 'อังคาร': 'ชมพู', 'พุธ': 'เขียว',
    'พฤหัสบดี': 'ส้ม', 'ศุกร์': 'ฟ้า', 'เสาร์': 'ม่วง', 'ราหู': 'เทา'
  };
  var ROLES = ['บริวาร', 'อายุ', 'เดช', 'ศรี', 'มูละ', 'อุตสาหะ', 'มนตรี', 'กาลกิณี'];
  var MEANING = {
    'บริวาร': { theme: 'คนรอบตัว ครอบครัว เพื่อนร่วมงาน ลูกน้อง', stars: 4 },
    'อายุ': { theme: 'สุขภาพ ความสบายใจ ชีวิตประจำวัน', stars: 4 },
    'เดช': { theme: 'อำนาจ ชื่อเสียง การเป็นที่ยอมรับ ความกล้าตัดสินใจ', stars: 5 },
    'ศรี': { theme: 'โชคลาภ เงินทอง เสน่ห์ สิ่งดี ๆ เข้ามา', stars: 5 },
    'มูละ': { theme: 'ทรัพย์สิน บ้าน การเก็บออม รากฐานชีวิต', stars: 3 },
    'อุตสาหะ': { theme: 'ความขยัน งานหนัก ความพยายามที่ต้องลงแรง', stars: 3 },
    'มนตรี': { theme: 'ผู้ใหญ่อุปถัมภ์ คนช่วยเหลือ คำแนะนำดี ๆ', stars: 4 },
    'กาลกิณี': { theme: 'อุปสรรค เรื่องไม่คาดคิด ต้องระวังและใจเย็น', stars: 2 }
  };
  // มหาทักษา: จำนวนปีที่ดาวแต่ละดวงเสวยอายุ รวม 108 ปี
  var DASA = { 'อาทิตย์': 6, 'จันทร์': 15, 'อังคาร': 8, 'พุธ': 17, 'เสาร์': 10, 'พฤหัสบดี': 19, 'ราหู': 12, 'ศุกร์': 21 };
  var SIGNS = ['เมษ', 'พฤษภ', 'เมถุน', 'กรกฎ', 'สิงห์', 'กันย์', 'ตุลย์', 'พิจิก', 'ธนู', 'มังกร', 'กุมภ์', 'มีน'];
  var ANIMALS = [['ชวด', 'หนู'], ['ฉลู', 'วัว'], ['ขาล', 'เสือ'], ['เถาะ', 'กระต่าย'], ['มะโรง', 'งูใหญ่'], ['มะเส็ง', 'งูเล็ก'],
                 ['มะเมีย', 'ม้า'], ['มะแม', 'แพะ'], ['วอก', 'ลิง'], ['ระกา', 'ไก่'], ['จอ', 'หมา'], ['กุน', 'หมู']];
  var ELEMENTS = ['ไม้', 'ไม้', 'ไฟ', 'ไฟ', 'ดิน', 'ดิน', 'ทอง', 'ทอง', 'น้ำ', 'น้ำ'];
  var BKK = { lat: 13.7563, lon: 100.5018 };
  // จังหวัดที่เกิด → พิกัดตัวเมือง (ใช้คิดลัคนา) · ลองจิจูดต่างกัน 1° = เวลาต่างกัน 4 นาที ละติจูดมีผลกับการขึ้นของราศี
  var PROVINCES = [
    ['กรุงเทพมหานคร', 13.75, 100.50], ['กระบี่', 8.09, 98.91], ['กาญจนบุรี', 14.02, 99.53], ['กาฬสินธุ์', 16.43, 103.51],
    ['กำแพงเพชร', 16.48, 99.52], ['ขอนแก่น', 16.44, 102.83], ['จันทบุรี', 12.61, 102.10], ['ฉะเชิงเทรา', 13.69, 101.07],
    ['ชลบุรี', 13.36, 100.98], ['ชัยนาท', 15.19, 100.13], ['ชัยภูมิ', 15.81, 102.03], ['ชุมพร', 10.49, 99.18],
    ['เชียงราย', 19.91, 99.83], ['เชียงใหม่', 18.79, 98.98], ['ตรัง', 7.56, 99.61], ['ตราด', 12.24, 102.52],
    ['ตาก', 16.88, 99.13], ['นครนายก', 14.21, 101.21], ['นครปฐม', 13.82, 100.06], ['นครพนม', 17.41, 104.78],
    ['นครราชสีมา', 14.97, 102.10], ['นครศรีธรรมราช', 8.43, 99.96], ['นครสวรรค์', 15.70, 100.14], ['นนทบุรี', 13.86, 100.51],
    ['นราธิวาส', 6.43, 101.82], ['น่าน', 18.78, 100.77], ['บึงกาฬ', 18.36, 103.65], ['บุรีรัมย์', 14.99, 103.10],
    ['ปทุมธานี', 14.02, 100.53], ['ประจวบคีรีขันธ์', 11.81, 99.80], ['ปราจีนบุรี', 14.05, 101.37], ['ปัตตานี', 6.87, 101.25],
    ['พระนครศรีอยุธยา', 14.35, 100.57], ['พะเยา', 19.17, 99.90], ['พังงา', 8.45, 98.53], ['พัทลุง', 7.62, 100.08],
    ['พิจิตร', 16.44, 100.35], ['พิษณุโลก', 16.82, 100.26], ['เพชรบุรี', 13.11, 99.94], ['เพชรบูรณ์', 16.42, 101.16],
    ['แพร่', 18.14, 100.14], ['ภูเก็ต', 7.88, 98.39], ['มหาสารคาม', 16.18, 103.30], ['มุกดาหาร', 16.54, 104.72],
    ['แม่ฮ่องสอน', 19.30, 97.97], ['ยโสธร', 15.79, 104.15], ['ยะลา', 6.54, 101.28], ['ร้อยเอ็ด', 16.05, 103.65],
    ['ระนอง', 9.96, 98.64], ['ระยอง', 12.68, 101.28], ['ราชบุรี', 13.54, 99.82], ['ลพบุรี', 14.80, 100.65],
    ['ลำปาง', 18.29, 99.49], ['ลำพูน', 18.58, 99.01], ['เลย', 17.49, 101.72], ['ศรีสะเกษ', 15.12, 104.32],
    ['สกลนคร', 17.16, 104.15], ['สงขลา', 7.19, 100.60], ['สตูล', 6.62, 100.07], ['สมุทรปราการ', 13.60, 100.60],
    ['สมุทรสงคราม', 13.41, 100.00], ['สมุทรสาคร', 13.55, 100.27], ['สระแก้ว', 13.82, 102.07], ['สระบุรี', 14.53, 100.91],
    ['สิงห์บุรี', 14.89, 100.40], ['สุโขทัย', 17.01, 99.82], ['สุพรรณบุรี', 14.47, 100.12], ['สุราษฎร์ธานี', 9.14, 99.33],
    ['สุรินทร์', 14.88, 103.49], ['หนองคาย', 17.88, 102.74], ['หนองบัวลำภู', 17.20, 102.44], ['อ่างทอง', 14.59, 100.45],
    ['อำนาจเจริญ', 15.86, 104.63], ['อุดรธานี', 17.41, 102.79], ['อุตรดิตถ์', 17.62, 100.10], ['อุทัยธานี', 15.38, 100.03],
    ['อุบลราชธานี', 15.24, 104.85]
  ];
  // เกิดต่างประเทศ → [ชื่อ, lat, lon, เขตเวลา IANA] · ประเทศใหญ่ที่มีหลายเขตเวลาแยกเป็นเมือง
  // เวลาเกิดที่ใส่ = เวลาตามนาฬิกาที่นั่น แปลงเป็นเวลาสากลด้วยฐานข้อมูลเขตเวลาของเบราว์เซอร์ (รวมเวลาออมแสงตามปีเกิด)
  var FOREIGN = [
    ['เมียนมา (ย่างกุ้ง)', 16.87, 96.20, 'Asia/Yangon'], ['ลาว (เวียงจันทน์)', 17.97, 102.63, 'Asia/Vientiane'],
    ['กัมพูชา (พนมเปญ)', 11.56, 104.92, 'Asia/Phnom_Penh'], ['เวียดนาม (ฮานอย)', 21.03, 105.85, 'Asia/Ho_Chi_Minh'],
    ['เวียดนาม (โฮจิมินห์)', 10.82, 106.63, 'Asia/Ho_Chi_Minh'], ['มาเลเซีย (กัวลาลัมเปอร์)', 3.14, 101.69, 'Asia/Kuala_Lumpur'],
    ['สิงคโปร์', 1.35, 103.82, 'Asia/Singapore'], ['อินโดนีเซีย (จาการ์ตา)', -6.21, 106.85, 'Asia/Jakarta'],
    ['ฟิลิปปินส์ (มะนิลา)', 14.60, 120.98, 'Asia/Manila'], ['จีน (ปักกิ่ง)', 39.90, 116.40, 'Asia/Shanghai'],
    ['จีน (เซี่ยงไฮ้)', 31.23, 121.47, 'Asia/Shanghai'], ['จีน (กวางโจว)', 23.13, 113.26, 'Asia/Shanghai'],
    ['จีน (คุนหมิง)', 25.04, 102.71, 'Asia/Shanghai'], ['ฮ่องกง', 22.32, 114.17, 'Asia/Hong_Kong'],
    ['ไต้หวัน (ไทเป)', 25.03, 121.57, 'Asia/Taipei'], ['ญี่ปุ่น (โตเกียว)', 35.68, 139.69, 'Asia/Tokyo'],
    ['เกาหลีใต้ (โซล)', 37.57, 126.98, 'Asia/Seoul'], ['อินเดีย (นิวเดลี)', 28.61, 77.21, 'Asia/Kolkata'],
    ['อินเดีย (มุมไบ)', 19.08, 72.88, 'Asia/Kolkata'], ['บังกลาเทศ (ธากา)', 23.81, 90.41, 'Asia/Dhaka'],
    ['เนปาล (กาฐมาณฑุ)', 27.72, 85.32, 'Asia/Kathmandu'], ['ศรีลังกา (โคลัมโบ)', 6.93, 79.86, 'Asia/Colombo'],
    ['ปากีสถาน (การาจี)', 24.86, 67.01, 'Asia/Karachi'], ['สหรัฐอาหรับเอมิเรตส์ (ดูไบ)', 25.20, 55.27, 'Asia/Dubai'],
    ['อิสราเอล (เทลอาวีฟ)', 32.09, 34.78, 'Asia/Jerusalem'], ['ตุรกี (อิสตันบูล)', 41.01, 28.98, 'Europe/Istanbul'],
    ['คาซัคสถาน (อัลมาตี)', 43.24, 76.89, 'Asia/Almaty'],
    ['สหราชอาณาจักร (ลอนดอน)', 51.51, -0.13, 'Europe/London'], ['ไอร์แลนด์ (ดับลิน)', 53.35, -6.26, 'Europe/Dublin'],
    ['ฝรั่งเศส (ปารีส)', 48.86, 2.35, 'Europe/Paris'], ['เยอรมนี (เบอร์ลิน)', 52.52, 13.40, 'Europe/Berlin'],
    ['เยอรมนี (มิวนิก)', 48.14, 11.58, 'Europe/Berlin'], ['เนเธอร์แลนด์ (อัมสเตอร์ดัม)', 52.37, 4.90, 'Europe/Amsterdam'],
    ['เบลเยียม (บรัสเซลส์)', 50.85, 4.35, 'Europe/Brussels'], ['สวิตเซอร์แลนด์ (ซูริก)', 47.38, 8.54, 'Europe/Zurich'],
    ['ออสเตรีย (เวียนนา)', 48.21, 16.37, 'Europe/Vienna'], ['อิตาลี (โรม)', 41.90, 12.50, 'Europe/Rome'],
    ['สเปน (มาดริด)', 40.42, -3.70, 'Europe/Madrid'], ['โปรตุเกส (ลิสบอน)', 38.72, -9.14, 'Europe/Lisbon'],
    ['สวีเดน (สตอกโฮล์ม)', 59.33, 18.07, 'Europe/Stockholm'], ['นอร์เวย์ (ออสโล)', 59.91, 10.75, 'Europe/Oslo'],
    ['เดนมาร์ก (โคเปนเฮเกน)', 55.68, 12.57, 'Europe/Copenhagen'], ['ฟินแลนด์ (เฮลซิงกิ)', 60.17, 24.94, 'Europe/Helsinki'],
    ['โปแลนด์ (วอร์ซอ)', 52.23, 21.01, 'Europe/Warsaw'], ['เช็ก (ปราก)', 50.08, 14.44, 'Europe/Prague'],
    ['ฮังการี (บูดาเปสต์)', 47.50, 19.04, 'Europe/Budapest'], ['กรีซ (เอเธนส์)', 37.98, 23.73, 'Europe/Athens'],
    ['ยูเครน (เคียฟ)', 50.45, 30.52, 'Europe/Kiev'], ['รัสเซีย (มอสโก)', 55.76, 37.62, 'Europe/Moscow'],
    ['รัสเซีย (เซนต์ปีเตอร์สเบิร์ก)', 59.93, 30.34, 'Europe/Moscow'], ['รัสเซีย (เยคาเตรินบุร์ก)', 56.84, 60.61, 'Asia/Yekaterinburg'],
    ['รัสเซีย (โนโวซีบีสค์)', 55.01, 82.93, 'Asia/Novosibirsk'], ['รัสเซีย (วลาดีวอสตอค)', 43.12, 131.89, 'Asia/Vladivostok'],
    ['สหรัฐอเมริกา (นิวยอร์ก)', 40.71, -74.01, 'America/New_York'], ['สหรัฐอเมริกา (ชิคาโก)', 41.88, -87.63, 'America/Chicago'],
    ['สหรัฐอเมริกา (เดนเวอร์)', 39.74, -104.99, 'America/Denver'], ['สหรัฐอเมริกา (ลอสแอนเจลิส)', 34.05, -118.24, 'America/Los_Angeles'],
    ['สหรัฐอเมริกา (ฮาวาย)', 21.31, -157.86, 'Pacific/Honolulu'], ['แคนาดา (โทรอนโต)', 43.65, -79.38, 'America/Toronto'],
    ['แคนาดา (แวนคูเวอร์)', 49.28, -123.12, 'America/Vancouver'], ['เม็กซิโก (เม็กซิโกซิตี)', 19.43, -99.13, 'America/Mexico_City'],
    ['บราซิล (เซาเปาลู)', -23.55, -46.63, 'America/Sao_Paulo'], ['อาร์เจนตินา (บัวโนสไอเรส)', -34.60, -58.38, 'America/Argentina/Buenos_Aires'],
    ['ออสเตรเลีย (ซิดนีย์)', -33.87, 151.21, 'Australia/Sydney'], ['ออสเตรเลีย (เมลเบิร์น)', -37.81, 144.96, 'Australia/Melbourne'],
    ['ออสเตรเลีย (บริสเบน)', -27.47, 153.03, 'Australia/Brisbane'], ['ออสเตรเลีย (เพิร์ท)', -31.95, 115.86, 'Australia/Perth'],
    ['นิวซีแลนด์ (โอ๊คแลนด์)', -36.85, 174.76, 'Pacific/Auckland'], ['แอฟริกาใต้ (โจฮันเนสเบิร์ก)', -26.20, 28.05, 'Africa/Johannesburg'],
    ['อียิปต์ (ไคโร)', 30.04, 31.24, 'Africa/Cairo']
  ];
  function placeOf(name) {
    var i;
    for (i = 0; i < PROVINCES.length; i++) if (PROVINCES[i][0] === name) return { name: name, lat: PROVINCES[i][1], lon: PROVINCES[i][2], tz: null, known: true, foreign: false };
    for (i = 0; i < FOREIGN.length; i++) if (FOREIGN[i][0] === name) return { name: name, lat: FOREIGN[i][1], lon: FOREIGN[i][2], tz: FOREIGN[i][3], known: true, foreign: true };
    return { name: 'กรุงเทพมหานคร', lat: BKK.lat, lon: BKK.lon, tz: null, known: false, foreign: false };
  }
  // เวลาตามนาฬิกาของเขตเวลา tz ณ วันเวลานั้น ห่างจากเวลาสากลกี่นาที (ไทย = +420 เสมอ)
  // ใช้ Intl ของเบราว์เซอร์ = ฐานข้อมูลเขตเวลา IANA ย้อนหลังครบ รวมเวลาออมแสงและการเปลี่ยนเขตเวลาในอดีต
  function tzOffset(pl, y, m, d, hh, mm) {
    if (!pl || !pl.tz) return 420;
    try {
      var fmt = new Intl.DateTimeFormat('en-US', { timeZone: pl.tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' });
      var wall = Date.UTC(y, m - 1, d, hh == null ? 12 : hh, mm == null ? 0 : mm), off = 0;
      for (var k = 0; k < 3; k++) {
        var t = wall - off * 60000, p = {};
        fmt.formatToParts(new Date(t)).forEach(function (x) { p[x.type] = x.value; });
        off = (Date.UTC(+p.year, +p.month - 1, +p.day, (+p.hour) % 24, +p.minute) - t) / 60000;
      }
      return off;
    } catch (e) { return Math.round(pl.lon / 15) * 60; }   // เครื่องไม่มีข้อมูลเขตเวลา → ประมาณจากลองจิจูด
  }

  var R = Math.PI / 180;
  function mod(a, n) { return ((a % n) + n) % n; }
  function sin(x) { return Math.sin(x * R); }
  function cos(x) { return Math.cos(x * R); }

  /* ---------- วันที่ / เวลา ---------- */
  // "YYYY-MM-DD" (ค.ศ.) + "HH:MM" หรือ null → ส่วนประกอบ · ปีที่เป็น พ.ศ. แปลงให้
  function parseBirth(date, time) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(date || ''));
    if (!m) return null;
    var y = +m[1]; if (y > 2400) y -= 543;
    var t = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(time || ''));
    return { y: y, m: +m[2], d: +m[3], hh: t ? +t[1] : null, mm: t ? +t[2] : null };
  }
  // เลขวันจูเลียน (Meeus 7.1) — ชั่วโมงเป็นเวลาสากล (UT) ติดลบได้
  function jd(y, m, d, hourUT) {
    if (m <= 2) { y -= 1; m += 12; }
    var A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5 + (hourUT || 0) / 24;
  }
  // เวลาท้องถิ่นที่เกิด → JD · b.off = ห่างจากเวลาสากลกี่นาที (ไทย 420) · ไม่มีเวลา = เที่ยงวัน
  function jdLocal(b, hh, mm) {
    var h = (hh == null ? 12 : hh) + (mm == null ? 0 : mm) / 60 - (b.off == null ? 420 : b.off) / 60;
    return jd(b.y, b.m, b.d, h);
  }
  function weekday(y, m, d) { return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); }
  function isoOf(dt) { return dt.toISOString().slice(0, 10); }
  function dateOf(y, m, d) { return new Date(Date.UTC(y, m - 1, d)); }

  /* ---------- 1 ทักษา ---------- */
  // วันเกิดแบบไทย: วันใหม่เริ่มตอนรุ่งเช้า 06:00 · วันพุธ 18:00 ถึงรุ่งเช้า = พุธกลางคืน (ราหู)
  function birthDay(b) {
    var dow = weekday(b.y, b.m, b.d), night = false, shifted = false;
    if (b.hh != null) {
      var t = b.hh * 60 + b.mm;
      if (t < 360) { dow = mod(dow - 1, 7); shifted = true; night = true; }
      else if (t >= 1080) night = true;
    }
    var rahu = dow === 3 && night;
    return {
      dow: dow, planet: rahu ? 'ราหู' : DAYS[dow], label: rahu ? 'พุธกลางคืน' : DAYS[dow],
      shifted: shifted, calendarDow: weekday(b.y, b.m, b.d), timeKnown: b.hh != null
    };
  }
  function rolesOf(planet) {
    var s = RING.indexOf(planet), out = {};
    ROLES.forEach(function (r, i) { out[r] = RING[(s + i) % RING.length]; });
    return out;
  }
  function roleOf(birthPlanet, planet) {
    var r = rolesOf(birthPlanet);
    return ROLES.filter(function (k) { return r[k] === planet; })[0];
  }
  // โครงดวงประจำวันของคนเกิดดาว birthPlanet ในวันที่ดาว todayPlanet
  function taksaDay(birthPlanet, todayPlanet) {
    var r = rolesOf(birthPlanet), role = roleOf(birthPlanet, todayPlanet);
    return {
      todayRole: role, theme: MEANING[role].theme, stars: MEANING[role].stars,
      luckyColor: COLOR[r['ศรี']], powerColor: COLOR[r['เดช']], supportColor: COLOR[r['มนตรี']], avoidColor: COLOR[r['กาลกิณี']],
      luckyNumber: String(NUM[r['เดช']]) + String(NUM[r['ศรี']])
    };
  }

  /* ---------- 2 มหาทักษา (ดาวเสวยอายุ) ----------
     เริ่มจากดาววันเกิด เวียนตามวงทักษา · ช่วงที่ n ตกภูมิที่ n ของเจ้าชะตาเสมอ (บริวาร อายุ เดช ศรี ...)
     ดาวแทรก: ในช่วงของดาว P เริ่มจาก P เอง เวียนตามวง ยาว = ปีของ P × ปีของดาวแทรก ÷ 108 */
  var YEAR = 365.2425;
  function addYears(birthDate, years) { return new Date(birthDate.getTime() + years * YEAR * 86400000); }
  function mahataksa(b, bd, todayIso) {
    var born = dateOf(b.y, b.m, b.d), today = new Date(todayIso + 'T00:00:00Z');
    var age = (today - born) / 86400000 / YEAR, round = Math.floor(age / 108), inRound = age - round * 108;
    var s = RING.indexOf(bd.planet), acc = 0, periods = [], cur = null;
    for (var i = 0; i < 8; i++) {
      var p = RING[(s + i) % 8], len = DASA[p];
      var per = { planet: p, role: ROLES[i], fromAge: acc + round * 108, toAge: acc + len + round * 108,
                  from: isoOf(addYears(born, acc + round * 108)), to: isoOf(addYears(born, acc + len + round * 108)) };
      periods.push(per);
      if (inRound >= acc && inRound < acc + len) cur = per;
      acc += len;
    }
    var sub = null, subs = [], si = RING.indexOf(cur.planet), a2 = cur.fromAge;
    for (var j = 0; j < 8; j++) {
      var q = RING[(si + j) % 8], l2 = DASA[cur.planet] * DASA[q] / 108;
      var sp = { planet: q, role: roleOf(bd.planet, q), from: isoOf(addYears(born, a2)), to: isoOf(addYears(born, a2 + l2)) };
      subs.push(sp);
      if (age >= a2 && age < a2 + l2) sub = sp;
      a2 += l2;
    }
    return { age: age, periods: periods, current: cur, sub: sub, subs: subs };
  }

  /* ---------- 3 ตำแหน่งดาว + ราศี ---------- */
  function T(j) { return (j - 2451545.0) / 36525; }
  // ดวงอาทิตย์ (Meeus บทที่ 25 แบบความแม่นยำต่ำ ~0.01°) ลองจิจูดปรากฏ แบบสายนะ
  function sunLong(j) {
    var t = T(j);
    var L0 = 280.46646 + 36000.76983 * t + 0.0003032 * t * t;
    var M = 357.52911 + 35999.05029 * t - 0.0001537 * t * t;
    var C = (1.914602 - 0.004817 * t - 0.000014 * t * t) * sin(M) + (0.019993 - 0.000101 * t) * sin(2 * M) + 0.000289 * sin(3 * M);
    var om = 125.04 - 1934.136 * t;
    return mod(L0 + C - 0.00569 - 0.00478 * sin(om), 360);
  }
  // ดวงจันทร์ (Meeus บทที่ 47 ใช้พจน์หลัก 25 พจน์ ~0.2°)
  function moonLong(j) {
    var t = T(j);
    var Lp = 218.3164477 + 481267.88123421 * t;
    var D = 297.8501921 + 445267.1114034 * t;
    var M = 357.5291092 + 35999.0502909 * t;
    var Mp = 134.9633964 + 477198.8675055 * t;
    var F = 93.2720950 + 483202.0175233 * t;
    var E = 1 - 0.002516 * t;
    var s = 6.288774 * sin(Mp) + 1.274027 * sin(2 * D - Mp) + 0.658314 * sin(2 * D) + 0.213618 * sin(2 * Mp)
      - 0.185116 * E * sin(M) - 0.114332 * sin(2 * F) + 0.058793 * sin(2 * D - 2 * Mp) + 0.057066 * E * sin(2 * D - M - Mp)
      + 0.053322 * sin(2 * D + Mp) + 0.045758 * E * sin(2 * D - M) - 0.040923 * E * sin(M - Mp) - 0.034720 * sin(D)
      - 0.030383 * E * sin(M + Mp) + 0.015327 * sin(2 * D - 2 * F) - 0.012528 * sin(Mp + 2 * F) + 0.010980 * sin(Mp - 2 * F)
      + 0.010675 * sin(4 * D - Mp) + 0.010034 * sin(3 * Mp) + 0.008548 * sin(4 * D - 2 * Mp) - 0.007888 * E * sin(2 * D + M - Mp)
      - 0.006766 * E * sin(2 * D + M) - 0.005163 * sin(D - Mp) + 0.004987 * E * sin(D + M) + 0.004036 * E * sin(2 * D - M + Mp)
      + 0.003994 * sin(2 * D + 2 * Mp);
    return mod(Lp + s, 360);
  }
  // อายนางศ์ลาหิรี (ระยะห่างจักรราศีนิรายนะ-สายนะ) ~23.85° ที่ ค.ศ. 2000 เพิ่มปีละ ~50.29 ฟิลิปดา
  function ayanamsa(j) { return 23.853 + (j - 2451545.0) / 365.25 * 0.0139683; }
  // ลัคนา (จุดขอบฟ้าทิศตะวันออก) จากเวลาดาราคติท้องถิ่น
  function ascendant(j, lat, lon) {
    var t = T(j);
    var gmst = 280.46061837 + 360.98564736629 * (j - 2451545.0) + 0.000387933 * t * t - t * t * t / 38710000;
    var lst = mod(gmst + lon, 360), eps = 23.4392911 - 0.0130042 * t;
    return mod(Math.atan2(cos(lst), -(sin(lst) * cos(eps) + Math.tan(lat * R) * sin(eps))) / R, 360);
  }
  function signOf(tropical, j) { return Math.floor(mod(tropical - ayanamsa(j), 360) / 30); }
  function zodiac(b, place) {
    var jb = jdLocal(b, b.hh, b.mm), pl = placeOf(place);
    var out = { sun: signOf(sunLong(jb), jb), moon: null, moonRange: null, lagna: null, place: pl };
    if (b.hh != null) {
      out.moon = signOf(moonLong(jb), jb);
      out.lagna = signOf(ascendant(jb, pl.lat, pl.lon), jb);
    } else {
      // ไม่มีเวลาเกิด: ดวงจันทร์เดินวันละ ~13° ดูว่าทั้งวันอยู่ราศีเดียวไหม
      var j0 = jdLocal(b, 0, 0), j1 = jdLocal(b, 23, 59);
      var a = signOf(moonLong(j0), j0), c = signOf(moonLong(j1), j1);
      if (a === c) out.moon = a; else out.moonRange = [a, c];
    }
    return out;
  }

  /* ---------- 4 นักษัตรจีน ---------- */
  // ปีนักษัตรแบบจีนเปลี่ยนที่ลิบชุน (ดวงอาทิตย์สายนะ 315°) — เกิด ม.ค. ถึงต้น ก.พ. ก่อนลิบชุน = ปีก่อนหน้า
  function chineseYearOf(y, m, d, hh, mm, off) {
    var yy = y;
    if (m <= 2) {
      var j = jd(y, m, d, (hh == null ? 12 : hh) + (mm == null ? 0 : mm) / 60 - (off == null ? 420 : off) / 60), s = sunLong(j);
      if (s >= 270 && s < 315) yy = y - 1;
    }
    var stem = mod(yy - 4, 10);
    return { year: yy, branch: mod(yy - 4, 12), stem: stem, element: ELEMENTS[stem], yang: stem % 2 === 0 };
  }
  // นักษัตรของวัน (ก้านดิน) — อ้างอิง 1 ม.ค. 2000 = วันอู่อู่ (戊午) · ตรวจทวนกับ 1 ต.ค. 1949 = วันเจี่ยจื่อ (甲子)
  function dayBranch(iso) {
    var p = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso), n = jd(+p[1], +p[2], +p[3], 12);
    var idx = mod(Math.round(n - 2451545) + 54, 60);
    return { index60: idx, branch: idx % 12, stem: idx % 10 };
  }
  // ความสัมพันธ์ของนักษัตร 2 ตัว: ตัวเอง · ชง(ปะทะ) · ชงร่วม(ทำร้าย) · ชงอ้อม(แตก) · ส่ง(หกประสาน) · เสริม(สามประสาน) · ปกติ
  var BREAK = { '0-9': 1, '1-4': 1, '2-11': 1, '3-6': 1, '5-8': 1, '7-10': 1 };
  function relation(a, b) {
    if (a === b) return 'same';
    if (mod(a - b, 12) === 6) return 'clash';
    if ((a + b) % 12 === 7) return 'harm';
    if (BREAK[Math.min(a, b) + '-' + Math.max(a, b)]) return 'break';
    if ((a + b) % 12 === 1) return 'six';
    if (a % 4 === b % 4) return 'three';
    return 'none';
  }
  var YEAR_REL = { same: 'ชงตัวเอง', clash: 'ชงตรง', harm: 'ชงร่วม', 'break': 'ชงอ้อม', six: 'ปีส่ง', three: 'ปีเสริม', none: 'ปีปกติ' };
  var DAY_REL = { same: 'วันตรงนักษัตร', clash: 'วันชง', harm: 'วันชงเล็ก', 'break': 'วันชงเล็ก', six: 'วันส่งเสริมมาก', three: 'วันส่งเสริม', none: 'วันปกติ' };

  /* ---------- 5 เลขศาสตร์ ---------- */
  function digits(n) { return String(n).split('').reduce(function (s, c) { return s + (+c || 0); }, 0); }
  function reduce(n, master) {
    while (n > 9 && !(master && (n === 11 || n === 22 || n === 33))) n = digits(n);
    return n;
  }
  function lifePath(b) { return reduce(digits(b.d) + digits(b.m) + digits(b.y), true); }
  function personalYear(b, year) { return reduce(digits(b.d) + digits(b.m) + digits(year), false); }
  function personalDay(b, iso) {
    var p = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    return reduce(personalYear(b, +p[1]) + digits(+p[2]) + digits(+p[3]), false);
  }

  /* ---------- อายุ / วันเกิดครั้งถัดไป ---------- */
  function ageParts(b, iso) {
    var p = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso), ty = +p[1], tm = +p[2], td = +p[3];
    var y = ty - b.y, m = tm - b.m, d = td - b.d;
    if (d < 0) { m -= 1; d += new Date(Date.UTC(ty, tm - 1, 0)).getUTCDate(); }
    if (m < 0) { y -= 1; m += 12; }
    var next = dateOf(ty, b.m, b.d), today = dateOf(ty, tm, td);
    if (next < today) next = dateOf(ty + 1, b.m, b.d);
    return { y: y, m: m, d: d, daysToBirthday: Math.round((next - today) / 86400000) };
  }

  /* ---------- รวมทั้งหมดของคนหนึ่งคน ณ วันหนึ่ง ---------- */
  function profile(date, time, todayIso, place) {
    var b = parseBirth(date, time);
    if (!b) return null;
    var bd = birthDay(b), ty = +todayIso.slice(0, 4);
    b.off = tzOffset(placeOf(place), b.y, b.m, b.d, b.hh, b.mm);
    var cy = chineseYearOf(b.y, b.m, b.d, b.hh, b.mm, b.off);
    var tp = /^(\d{4})-(\d{2})-(\d{2})/.exec(todayIso);
    var nowYear = chineseYearOf(+tp[1], +tp[2], +tp[3], 12, 0);
    var db = dayBranch(todayIso);
    var todayPlanet = DAYS[weekday(+tp[1], +tp[2], +tp[3])];
    return {
      birth: b, day: bd, age: ageParts(b, todayIso),
      taksa: Object.assign({ todayPlanet: todayPlanet }, taksaDay(bd.planet, todayPlanet)),
      dasa: mahataksa(b, bd, todayIso),
      zodiac: zodiac(b, place),
      chinese: cy,
      thisYear: { info: nowYear, rel: relation(cy.branch, nowYear.branch) },
      today: { branch: db.branch, rel: relation(cy.branch, db.branch) },
      num: { life: lifePath(b), year: personalYear(b, ty), day: personalDay(b, todayIso) }
    };
  }

  var API = {
    DAYS: DAYS, RING: RING, NUM: NUM, COLOR: COLOR, ROLES: ROLES, MEANING: MEANING, DASA: DASA,
    SIGNS: SIGNS, ANIMALS: ANIMALS, ELEMENTS: ELEMENTS, YEAR_REL: YEAR_REL, DAY_REL: DAY_REL, PROVINCES: PROVINCES, FOREIGN: FOREIGN, placeOf: placeOf, tzOffset: tzOffset,
    parseBirth: parseBirth, jd: jd, birthDay: birthDay, rolesOf: rolesOf, roleOf: roleOf, taksaDay: taksaDay,
    mahataksa: mahataksa, sunLong: sunLong, moonLong: moonLong, ayanamsa: ayanamsa, ascendant: ascendant,
    zodiac: zodiac, chineseYearOf: chineseYearOf, dayBranch: dayBranch, relation: relation,
    lifePath: lifePath, personalYear: personalYear, personalDay: personalDay, ageParts: ageParts, profile: profile
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.ASTRO = API;
})(typeof window !== 'undefined' ? window : this);
