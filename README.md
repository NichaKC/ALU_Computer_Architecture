# ALU Lab — จำลองวงจรบทที่ 3 Arithmetic for Computers

เว็บจำลองวงจรแบบโต้ตอบ ครอบคลุมรูป 3.1–3.27 ในหนังสือ เขียนด้วย HTML + CSS + JavaScript ล้วน ไม่มี library และไม่ต้อง build

## วิธีรัน
- ดับเบิลคลิก `index.html` เปิดในเบราว์เซอร์ได้เลย
- หรือรันเซิร์ฟเวอร์ในโฟลเดอร์นี้: `python -m http.server 8000` แล้วเปิด http://localhost:8000
- `alu-lab-single-file.html` คือเวอร์ชันรวมทุกอย่างไว้ไฟล์เดียว (ส่งต่อง่าย)

## โครงสร้างไฟล์
| ไฟล์ | หน้าที่ |
|---|---|
| `index.html` | โครงหน้า: เมนูซ้าย, หัวเรื่อง, พื้นที่วาดวงจร (`#stage`) |
| `css/style.css` | ธีมสว่าง/มืด, สีสัญญาณ (เขียว = 1, เทา = 0, เหลืองวิ่ง = เส้นทางที่เลือก) |
| `js/engine.js` | ตัววาดวงจร: คลาส `Sch` (สาย, จุดต่อ), เกต AND/OR/XOR/NOT/MUX, ขาอินพุต `pin()`, และ `mountCombo()` สำหรับวงจร combinational |
| `js/combo.js` | รูป 3.1 MUX, 3.2 Logical unit, 3.3 NAND, 3.4 Full adder |
| `js/alu.js` | รูป 3.5 One-bit ALU (LSB/MSB), 3.6 Word ALU, 3.7 slt + overflow, 3.8 Zero detection |
| `js/seq.js` | ตัวจำลองทีละขั้น `mountSeq()`, datapath, flowchart, การคูณแบบ 1–3 (3.10–3.18), การหาร (3.20–3.23) |
| `js/fp.js` | IEEE 754 (3.24, ตาราง 3.7–3.8), การบวก floating point (3.26–3.27) |
| `js/main.js` | สร้างเมนูและสลับหน้าตาม `#hash` |

## หลักการทำงาน
1. **วงจร combinational** — เก็บค่าอินพุตใน `state` → คำนวณตรรกะทุกเกต → วาด SVG ใหม่ทั้งหมด สีของสายมาจากค่าที่คำนวณได้ (`vc()` ใน engine.js) เส้นที่ MUX เลือกส่ง `{ path: true }` เพื่อให้มีเส้นวิ่ง
2. **One-bit ALU** — `alu1(v)` คำนวณ b′ = Binvert ? b̄ : b, AND, OR, Sum, CarryOut, Overflow แล้ว MUX เลือกตาม Operation (0 AND, 1 OR, 2 add, 3 Less)
3. **Word ALU** — `aluN()` ต่อ `alu1` แบบ ripple carry แล้วป้อน Set (หรือ Set ⊕ Overflow ในรูป 3.7) กลับเข้า Less₀
4. **วงจรแบบลำดับ (คูณ/หาร/FP)** — ฟังก์ชัน `genMul1/genMul2/genDiv1/genDiv2/genFPAdd` สร้างรายการทุกขั้นล่วงหน้า แต่ละขั้นเก็บค่ารีจิสเตอร์ สายที่ทำงาน และกล่อง flowchart ที่ใช้ ปุ่มถัดไป/ย้อนกลับแค่เลื่อน index

## การเพิ่มวงจรใหม่
เรียก `register({ id, sec, fig, name, title, desc, mount(stage) { ... } })` ในไฟล์ใดก็ได้ (ก่อน `main.js`) แล้ววงจรจะขึ้นในเมนูเอง

## การตรวจสอบ
- ตารางขั้นตอนตรงกับตาราง 3.6, รูป 3.18 และรูป 3.22 ในหนังสือทุกบิต
- ALU / คูณ / หาร ทดสอบกับอินพุตทุกคู่ที่ 4 บิต ได้ผลถูกทั้งหมด
- การบวก FP ทดสอบกับตัวเลขสุ่ม 200,000 คู่ เทียบกับ `Math.fround(a + b)` ได้ผลตรงทุกคู่
