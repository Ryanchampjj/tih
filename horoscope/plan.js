// โครงดวงประจำวัน ณ วันที่กำหนด — ส่วนที่เป็น "กติกา" (ไม่ใช่ส่วนที่แต่ง) ให้ Routine เขียนข้อความตาม
// ใช้: node horoscope/plan.js 2026-09-29   (ไม่ใส่วันที่ = วันนี้ตามเวลาไทย)
// ตัวคำนวณทั้งหมดอยู่ที่ astro.js (ตัวเดียวกับที่หน้าเว็บใช้) — ไฟล์นี้แค่จัดรูปสำหรับวันหนึ่งวัน
//
// days     8 ช่อง: ทักษาของคนเกิดแต่ละดาว (อาทิตย์ … เสาร์ ตามลำดับวัน แล้วช่องที่ 8 = พุธกลางคืน/ราหู)
// dayAnimal / animals  นักษัตรของวันนี้ตามปฏิทินจีน และวันนี้เป็นวันอะไรของคนเกิดปีนักษัตรแต่ละปี (12 ช่อง)
// numbers  เลขประจำวันส่วนตัว 1-9 (แต่ละคนได้เลขไหนหน้าเว็บคิดเองจากวันเดือนเกิด)
const A = require('./astro.js');

function plan(iso) {
  const p = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!p) throw new Error('วันที่ต้องเป็น YYYY-MM-DD');
  const todayPlanet = A.DAYS[new Date(Date.UTC(+p[1], +p[2] - 1, +p[3])).getUTCDay()];
  const births = A.DAYS.map((d) => ({ birthDay: d, planet: d })).concat([{ birthDay: 'พุธกลางคืน', planet: 'ราหู' }]);
  const db = A.dayBranch(iso);
  return {
    date: iso,
    todayPlanet: todayPlanet,
    dayAnimal: A.ANIMALS[db.branch][0],
    days: births.map((b) => Object.assign({ birthDay: b.birthDay, planet: b.planet }, A.taksaDay(b.planet, todayPlanet))),
    animals: A.ANIMALS.map((a, i) => ({ animal: a[0], relation: A.DAY_REL[A.relation(i, db.branch)] })),
    numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9]
  };
}

if (require.main === module) {
  const iso = process.argv[2] || new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  console.log(JSON.stringify(plan(iso), null, 2));
}
module.exports = { plan: plan, rolesOf: A.rolesOf };
