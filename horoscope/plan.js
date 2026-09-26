// ทักษาพยากรณ์ — คำนวณ "โครง" ดวงของแต่ละวันเกิด ณ วันที่กำหนด (ส่วนที่เป็นกติกา ไม่ใช่ส่วนที่แต่ง)
// ใช้: node horoscope/plan.js 2026-09-27   (ไม่ใส่วันที่ = วันนี้ตามเวลาไทย)
//
// หลัก: ดาวประจำวันเกิดเป็น "บริวาร" แล้ววนตามวงทักษา (ตามเข็มนาฬิกา)
//   อาทิตย์(1) → จันทร์(2) → อังคาร(3) → พุธ(4) → เสาร์(7) → พฤหัสบดี(5) → ราหู(8) → ศุกร์(6)
// ได้ภูมิ 8 ภูมิเรียงกัน: บริวาร อายุ เดช ศรี มูละ อุตสาหะ มนตรี กาลกิณี
// ดวงประจำวัน = ดาวของ "วันนี้" ตกภูมิไหนของคนเกิดวันนั้น → เรื่องเด่นของวัน
// สีมงคล/สีกาลกิณี/เลขมงคล มาจากดาวในภูมิ ศรี · เดช · มนตรี · กาลกิณี ของคนเกิดวันนั้น
// (วันพุธใช้พุธกลางวัน · ราหูใช้แทนพุธกลางคืนในวง)

const RING = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'เสาร์', 'พฤหัสบดี', 'ราหู', 'ศุกร์'];
const NUM = { 'อาทิตย์': 1, 'จันทร์': 2, 'อังคาร': 3, 'พุธ': 4, 'พฤหัสบดี': 5, 'ศุกร์': 6, 'เสาร์': 7, 'ราหู': 8 };
const COLOR = {
  'อาทิตย์': 'แดง', 'จันทร์': 'เหลือง', 'อังคาร': 'ชมพู', 'พุธ': 'เขียว',
  'พฤหัสบดี': 'ส้ม', 'ศุกร์': 'ฟ้า', 'เสาร์': 'ม่วง', 'ราหู': 'เทา'
};
const ROLES = ['บริวาร', 'อายุ', 'เดช', 'ศรี', 'มูละ', 'อุตสาหะ', 'มนตรี', 'กาลกิณี'];
const MEANING = {
  'บริวาร': { theme: 'คนรอบตัว ครอบครัว เพื่อนร่วมงาน ลูกน้อง', stars: 4 },
  'อายุ': { theme: 'สุขภาพ ความสบายใจ ชีวิตประจำวัน', stars: 4 },
  'เดช': { theme: 'อำนาจ ชื่อเสียง การเป็นที่ยอมรับ ความกล้าตัดสินใจ', stars: 5 },
  'ศรี': { theme: 'โชคลาภ เงินทอง เสน่ห์ สิ่งดี ๆ เข้ามา', stars: 5 },
  'มูละ': { theme: 'ทรัพย์สิน บ้าน การเก็บออม รากฐานชีวิต', stars: 3 },
  'อุตสาหะ': { theme: 'ความขยัน งานหนัก ความพยายามที่ต้องลงแรง', stars: 3 },
  'มนตรี': { theme: 'ผู้ใหญ่อุปถัมภ์ คนช่วยเหลือ คำแนะนำดี ๆ', stars: 4 },
  'กาลกิณี': { theme: 'อุปสรรค เรื่องไม่คาดคิด ต้องระวังและใจเย็น', stars: 2 }
};
const DAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];   // getUTCDay() 0-6

function rolesOf(birthPlanet) {
  const s = RING.indexOf(birthPlanet), out = {};
  ROLES.forEach(function (r, i) { out[r] = RING[(s + i) % RING.length]; });
  return out;
}

function plan(iso) {
  const d = new Date(iso + 'T00:00:00Z');
  const todayPlanet = DAYS[d.getUTCDay()];
  return {
    date: iso,
    todayPlanet: todayPlanet,
    days: DAYS.map(function (bd) {
      const r = rolesOf(bd);
      const role = ROLES.find(function (k) { return r[k] === todayPlanet; });
      return {
        birthDay: bd,
        todayRole: role,
        theme: MEANING[role].theme,
        stars: MEANING[role].stars,
        luckyColor: COLOR[r['ศรี']],          // สีเสริมโชคลาภ
        powerColor: COLOR[r['เดช']],          // สีเสริมอำนาจ/ความมั่นใจ
        supportColor: COLOR[r['มนตรี']],      // สีเสริมผู้อุปถัมภ์
        avoidColor: COLOR[r['กาลกิณี']],      // สีกาลกิณี
        luckyNumber: String(NUM[r['เดช']]) + String(NUM[r['ศรี']])
      };
    })
  };
}

if (require.main === module) {
  const iso = process.argv[2] || new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  console.log(JSON.stringify(plan(iso), null, 2));
}
module.exports = { plan: plan, rolesOf: rolesOf };
