/* horoscope/astro.js — ตัวคำนวณดวงทั้งหมดจากวันเดือนปีเกิด (+ เวลาเกิดถ้ามี)
   ใช้ตัวเดียวกันทั้งหน้าเว็บ (window.ASTRO) และ node (plan.js ที่ Routine เรียกตอนเที่ยงคืน)
   ไม่มีการเดา — ทุกอย่างในไฟล์นี้เป็น "กติกา" หรือ "การคำนวณตำแหน่งดาว" ส่วนคำทำนายอยู่ที่อื่น

   1 ทักษาพยากรณ์   ดาวประจำวันเกิด (แบบไทย วันใหม่เริ่ม 06:00 · พุธกลางคืน = ราหู) → 8 ภูมิ · สี · เลข
   2 มหาทักษา       ดาวเสวยอายุ + ดาวแทรก (รอบ 108 ปี) จากดาววันเกิดและอายุจริง
   3 ราศี            ดวงอาทิตย์ (ราศีเกิด) · ดวงจันทร์ · ลัคนา (ต้องมีเวลาเกิด) แบบนิรายนะ (อายนางศ์ลาหิรี)
                     ตำแหน่งดาวตามสูตรของ Meeus (Astronomical Algorithms) ความคลาดเคลื่อน < 0.3 องศา
                     ลัคนาคิดที่พิกัดกรุงเทพฯ เวลาไทย UTC+7
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
  // เวลาไทย (UTC+7) → JD · ไม่มีเวลา = เที่ยงวัน
  function jdLocal(b, hh, mm) {
    var h = (hh == null ? 12 : hh) + (mm == null ? 0 : mm) / 60 - 7;
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
  function zodiac(b) {
    var jb = jdLocal(b, b.hh, b.mm);
    var out = { sun: signOf(sunLong(jb), jb), moon: null, moonRange: null, lagna: null };
    if (b.hh != null) {
      out.moon = signOf(moonLong(jb), jb);
      out.lagna = signOf(ascendant(jb, BKK.lat, BKK.lon), jb);
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
  function chineseYearOf(y, m, d, hh, mm) {
    var yy = y;
    if (m <= 2) {
      var j = jd(y, m, d, (hh == null ? 12 : hh) + (mm == null ? 0 : mm) / 60 - 7), s = sunLong(j);
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
  function profile(date, time, todayIso) {
    var b = parseBirth(date, time);
    if (!b) return null;
    var bd = birthDay(b), ty = +todayIso.slice(0, 4);
    var cy = chineseYearOf(b.y, b.m, b.d, b.hh, b.mm);
    var tp = /^(\d{4})-(\d{2})-(\d{2})/.exec(todayIso);
    var nowYear = chineseYearOf(+tp[1], +tp[2], +tp[3], 12, 0);
    var db = dayBranch(todayIso);
    var todayPlanet = DAYS[weekday(+tp[1], +tp[2], +tp[3])];
    return {
      birth: b, day: bd, age: ageParts(b, todayIso),
      taksa: Object.assign({ todayPlanet: todayPlanet }, taksaDay(bd.planet, todayPlanet)),
      dasa: mahataksa(b, bd, todayIso),
      zodiac: zodiac(b),
      chinese: cy,
      thisYear: { info: nowYear, rel: relation(cy.branch, nowYear.branch) },
      today: { branch: db.branch, rel: relation(cy.branch, db.branch) },
      num: { life: lifePath(b), year: personalYear(b, ty), day: personalDay(b, todayIso) }
    };
  }

  var API = {
    DAYS: DAYS, RING: RING, NUM: NUM, COLOR: COLOR, ROLES: ROLES, MEANING: MEANING, DASA: DASA,
    SIGNS: SIGNS, ANIMALS: ANIMALS, ELEMENTS: ELEMENTS, YEAR_REL: YEAR_REL, DAY_REL: DAY_REL,
    parseBirth: parseBirth, jd: jd, birthDay: birthDay, rolesOf: rolesOf, roleOf: roleOf, taksaDay: taksaDay,
    mahataksa: mahataksa, sunLong: sunLong, moonLong: moonLong, ayanamsa: ayanamsa, ascendant: ascendant,
    zodiac: zodiac, chineseYearOf: chineseYearOf, dayBranch: dayBranch, relation: relation,
    lifePath: lifePath, personalYear: personalYear, personalDay: personalDay, ageParts: ageParts, profile: profile
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.ASTRO = API;
})(typeof window !== 'undefined' ? window : this);
