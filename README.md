# ALU Lab — เว็บจำลองวงจรบทที่ 3 (logic คำนวณด้วย Python)

เว็บไซต์จำลองวงจร 14 วงจร หัวข้อ 3.4–3.7 (รูป 3.1–3.23) พร้อมขึ้น Vercel

- **หน้าเว็บ (HTML/CSS/JS ใน `public/`)** ทำหน้าที่วาดรูปวงจรอย่างเดียว
- **Python (`logic.py`)** ทำหน้าที่คำนวณ logic ทั้งหมด หน้าเว็บส่งค่าอินพุตไปที่ API แล้วนำผลกลับมาวาด
- ทุกหน้ามีกล่อง **"โค้ด Python ที่คำนวณวงจรนี้"** ดึงโค้ดจริงจาก `logic.py` มาแสดง ใช้ประกอบตอนอธิบายได้เลย

```
ผู้ใช้กดเปลี่ยนค่า → JavaScript ส่ง POST /api/simulate
                   → FastAPI (app.py) เรียกฟังก์ชันใน logic.py
                   → ได้ผลเป็น JSON → JavaScript วาดสายสีเขียว/เทา และเส้นทางที่ทำงาน
```

## โครงสร้างไฟล์
| ไฟล์ | หน้าที่ |
|---|---|
| `logic.py` | **ตรรกะของทุกวงจร (ส่วนที่ใช้อธิบาย)** `mux4`, `logic_unit`, `nand_gates`, `full_adder`, `alu1`, `alu_n`, `gen_mul1`, `gen_mul2`, `gen_div1`, `gen_div2` |
| `app.py` | เว็บเซิร์ฟเวอร์ FastAPI: `POST /api/simulate`, `GET /api/source/{วงจร}`, `GET /api/health` และเสิร์ฟหน้าเว็บ |
| `test_logic.py` | ชุดทดสอบ logic (เทียบกับตารางในหนังสือและการคำนวณจริง) |
| `requirements.txt` | แพ็กเกจ Python ที่ต้องใช้ (fastapi, uvicorn) |
| `.python-version` | บอก Vercel ให้ใช้ Python 3.12 |
| `public/index.html` | โครงหน้าเว็บ |
| `public/js/engine.js` | ตัววาด SVG + ฟังก์ชัน `api()` ที่เรียก Python + กล่องแสดงโค้ด Python |
| `public/js/combo.js` | หน้าวาดรูป 3.1–3.4 |
| `public/js/alu.js` | หน้าวาดรูป 3.5–3.8 |
| `public/js/seq.js` | หน้าวาด datapath + flowchart ของการคูณ/หาร |
| `public/js/main.js` | เมนูและการสลับหน้า |

## รันในเครื่อง
```bash
pip install -r requirements.txt
uvicorn app:app --reload
```
แล้วเปิด http://127.0.0.1:8000

> เปิดไฟล์ `public/index.html` ตรงๆ ไม่ได้ เพราะต้องมี Python API ทำงานอยู่ด้วย

ทดสอบ logic: `python test_logic.py`

## อัพขึ้น Vercel
**วิธีที่ 1: ผ่าน GitHub (แนะนำ)**
1. สร้าง repository ใหม่บน GitHub แล้วอัพไฟล์ทั้งหมดในโฟลเดอร์นี้ขึ้นไป (ให้ `app.py` อยู่ระดับบนสุดของ repo)
2. เข้า vercel.com → **Add New… → Project** → เลือก repo นั้น
3. Vercel จะเจอ `app.py` กับ `requirements.txt` และตั้งค่าเป็น FastAPI ให้เอง ไม่ต้องแก้อะไร → กด **Deploy**
4. ได้ลิงก์ `https://ชื่อโปรเจกต์.vercel.app`

**วิธีที่ 2: ผ่าน Vercel CLI**
```bash
npm i -g vercel
vercel          # ตอบคำถามตามค่า default
vercel --prod   # deploy จริง
```
ทดสอบแบบเดียวกับบน Vercel ในเครื่องได้ด้วย `vercel dev`

## API
```
POST /api/simulate
{"circuit": "alu32", "inputs": {"N": 4, "A": 5, "B": 3, "binv": 1, "cin": 1, "op": 2}}
→ {"res": 2, "cout": 1, "ovf": 0, "set": 0, "less0": 0, "zero": 0, "cells": [...]}
```
ชื่อวงจร: `mux`, `logic`, `nand`, `fa`, `alu1`, `alu1msb`, `alu32`, `aluslt`, `aluzero`, `mul1`, `mul2`, `mul3`, `div1`, `div2`
เปิด http://127.0.0.1:8000/docs เพื่อลองเรียก API จากหน้าเอกสารอัตโนมัติของ FastAPI ได้

## หลักการของ logic.py (ใช้ตอนนำเสนอ)
1. **MUX / gates** — คำนวณทุกเกตตามสมการในหนังสือ เช่น `Y = A·S̄1·S̄0 + …` และคืนค่ากลางทุกจุดให้หน้าเว็บระบายสีสาย
2. **`alu1()`** — b′ = b̄ ถ้า Binvert = 1 แล้วคำนวณ AND, OR, Sum, CarryOut พร้อมกัน MUX เลือกตาม Operation (0 AND, 1 OR, 2 add, 3 Less) และหา Overflow ตามตาราง 3.1
3. **`alu_n()`** — ต่อ `alu1()` แบบ ripple carry ป้อน Set (รูป 3.6) หรือ Set ⊕ Overflow (รูป 3.7) กลับเข้า Less ของ ALU0
4. **`gen_mul1/gen_mul2/gen_div1/gen_div2()`** — จำลองฮาร์ดแวร์ทีละขั้น คืนรายการขั้นทั้งหมด แต่ละขั้นมีค่ารีจิสเตอร์ คำอธิบาย และสาย/กล่อง flowchart ที่ทำงาน

## การตรวจสอบ
- ผลตรงกับตาราง 3.6 (2 × 3), รูป 3.18 และรูป 3.22 (7 ÷ 2) ทุกบิต
- ALU ทดสอบอินพุตทุกคู่ที่ 4 และ 8 บิต คูณ/หารทุกคู่ที่ 4 บิต
