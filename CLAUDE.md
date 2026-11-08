# TIH Portal — ศูนย์รวมระบบงาน รพ.ไทยอินเตอร์เนชั่นแนล เกาะพะงัน

พอร์ทัลรวมลิงก์ระบบงานภายในโรงพยาบาล เป็น **PWA สแตติกล้วน** ติดตั้งลงหน้าจอโฮมได้
ไม่มี build step / ไม่มี framework / ไม่มี package.json — แก้ไฟล์แล้ว push ขึ้น `main` = ขึ้นจริง

## โครงสร้างไฟล์

| ไฟล์ | หน้าที่ |
|---|---|
| `index.html` | ทั้งเว็บอยู่ในไฟล์นี้ไฟล์เดียว (HTML + CSS + JS inline) |
| `links.json` | **แหล่งความจริงของลิงก์ทุกปุ่ม** — เปลี่ยนลิงก์แก้ที่นี่ที่เดียว |
| `sw.js` | Service worker (cache + offline) |
| `manifest.json` | PWA manifest |
| `logo.png`, `icon.png` | โลโก้ + ไอคอนแอป |
| `hr/fix/car/maid/risk/cheer/sign/goodday.png` | รูปไทล์เมนู (จัตุรัส 1:1) |

## กฎสำคัญ (กับดักที่ต้องระวัง)

### 1. แก้ไฟล์เสร็จ ต้องบั๊ม cache version ใน `sw.js`
บรรทัดแรกของ `sw.js` คือ `var CACHE = 'tih-portal-v13';`
**ทุกครั้งที่แก้ไฟล์ที่อยู่ใน `ASSETS`** (index.html, manifest.json, รูปต่างๆ) ต้องเลข v +1
ไม่งั้นเครื่องที่ติดตั้งแอปไว้แล้วจะยังเห็นของเก่า

เพิ่มรูปใหม่ → ต้องเพิ่มชื่อไฟล์ลง array `ASSETS` ด้วย

### 2. เปลี่ยนลิงก์ปุ่ม → แก้ `links.json` เท่านั้น
ตอนเปิดหน้า JS จะ `fetch('links.json')` มาทับ `href` ของทุกปุ่มเสมอ
ส่วน `href` ที่ฝังอยู่ใน `index.html` เป็นแค่ **fallback ตอนออฟไลน์** — ไม่ต้องแก้ตาม (แต่อย่าลบทิ้ง)

`links.json` ถูกตั้งเป็น **network-only** ใน sw.js โดยเจตนา (ลิงก์ต้องสดตลอด) — อย่าย้ายไปใช้ cache

### 3. ระบบล็อกอิน (SSO) — จำ login จนกว่าจะกด "ออกจากระบบ"
- Backend auth: `https://attendance-live-thaiinter.vercel.app`
  - `GET /api/employees` → รายชื่อพนักงาน (ใช้ทำ dropdown แผนก/ชื่อ)
  - `POST /api/verifypin` body `{for:'portal', empId, pin}` → คืน `{ok, token}`
- token เก็บใน `localStorage` key = `tih_sso`
- **พอร์ทัลจงใจไม่เช็ค `exp` ของ token** (ดู commit `0ae9779`) เพื่อไม่ให้เด้ง login ทุก 12 ชม.
  ตัวกันปลอมจริงอยู่ที่เซิร์ฟเวอร์ของแต่ละแอปที่ตรวจตั๋วเองทุกครั้ง
  → **อย่า "ซ่อม" ด้วยการเพิ่มเช็ค exp กลับเข้ามา** ถือเป็น regression
- กดปุ่มในเมนู = แนบ token ต่อท้าย URL เป็น `?tk=...`
- **ปุ่ม "สแกนหน้า เข้า/ออกงาน" ไม่ผ่าน login gate โดยเจตนา** (เป็นที่ตั้ง PIN ครั้งแรก)

### 4. เพิ่มปุ่มใหม่ในเมนู ต้องแก้ 5 จุด
1. เพิ่ม `<a class="tile c-xxx" href="...">` + รูปใน `index.html`
2. เพิ่ม key `"xxx"` ใน `links.json`
3. เพิ่ม `xxx:'.c-xxx'` ใน object `MAP` (script ท้าย index.html)
4. เพิ่ม `'.c-xxx'` ใน array `GATED` (script ล็อกอิน) — ถ้าปุ่มนี้ต้องล็อกอินก่อน
5. เพิ่มไฟล์รูปใน `ASSETS` ของ `sw.js` + บั๊ม cache version

## สไตล์โค้ด

- **JavaScript แบบ ES5**: ใช้ `var` + `function(){}` ไม่ใช้ arrow function / `const` / template literal
  (เขียนแบบนี้ทั้งไฟล์อยู่แล้ว รองรับมือถือเก่า) — เขียนใหม่ให้เข้ากับของเดิม
- **ห้ามใส่ framework / build tool / dependency** ใดๆ
- ข้อความ UI และคอมเมนต์ในโค้ด ใช้**ภาษาไทย**
- ฟอนต์ Sarabun โหลดจาก Google Fonts
- สีหลัก: น้ำเงิน `#2B4CA0` · แดง `#E8252B` · พื้นหลัง `#AACCD6`
- เมนูเป็น grid 2 คอลัมน์ ไทล์จัตุรัสชนกันสนิท (สไตล์ Chobani) — รูปใหม่ต้องเป็นสี่เหลี่ยมจัตุรัส

## หมายเหตุ

- ในเครื่องผู้ใช้ที่เปิดผ่านแอป LINE จะติดตั้ง PWA ไม่ได้ — หน้าเว็บมีข้อความบอกให้เปิดในเบราว์เซอร์ก่อน
- `index.html` ตั้ง service worker ให้ `reg.update()` ทุก 60 วินาที และรีโหลดหน้าอัตโนมัติเมื่อมี SW ใหม่
