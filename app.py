"""
app.py — เว็บเซิร์ฟเวอร์ (FastAPI) ของ ALU Lab

หน้าเว็บ (public/) มีหน้าที่วาดรูปวงจรอย่างเดียว ทุกครั้งที่ผู้ใช้เปลี่ยนค่า
หน้าเว็บจะส่งค่าอินพุตมาที่ POST /api/simulate แล้ว Python (logic.py) เป็นคนคำนวณ
ผลลัพธ์ส่งกลับเป็น JSON ให้หน้าเว็บนำไปวาด

    POST /api/simulate        {"circuit": "alu1", "inputs": {...}}  → ผลการคำนวณ
    GET  /api/source/{name}   โค้ด Python ของฟังก์ชันที่ใช้คำนวณวงจรนั้น (ไว้โชว์ตอนอธิบาย)
    GET  /api/health          ตรวจว่าเซิร์ฟเวอร์ทำงาน

รันในเครื่อง:  uvicorn app:app --reload   แล้วเปิด http://127.0.0.1:8000
"""
import inspect
import os
from typing import Any, Dict

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import logic

app = FastAPI(title='ALU Lab API')
HERE = os.path.dirname(os.path.abspath(__file__))


# ---------------------------------------------------------------- รับค่าอินพุตอย่างปลอดภัย
def bit(inp, key):
    return 1 if int(inp.get(key, 0)) else 0


def num(inp, key, lo, hi):
    v = int(inp.get(key, 0))
    if not lo <= v <= hi:
        raise HTTPException(400, '%s ต้องอยู่ระหว่าง %d ถึง %d' % (key, lo, hi))
    return v


def width(inp):
    n = int(inp.get('N', 4))
    if n not in (4, 8):
        raise HTTPException(400, 'N ต้องเป็น 4 หรือ 8')
    return n


# ---------------------------------------------------------------- วงจรแต่ละตัว → ฟังก์ชันใน logic.py
def run_alu_n(p, variant):
    N = width(p)
    m = (1 << N) - 1
    return logic.alu_n(N, num(p, 'A', 0, m), num(p, 'B', 0, m), bit(p, 'binv'), bit(p, 'cin'), num(p, 'op', 0, 3), variant)


def mul_inputs(p):
    N = width(p)
    m = (1 << N) - 1
    return num(p, 'mc', 0, m), num(p, 'mp', 0, m), N


def div_inputs(p):
    N = width(p)
    m = (1 << N) - 1
    return num(p, 'dvd', 0, m), num(p, 'dvs', 0, m), N


CIRCUITS = {
    # ชื่อวงจร: (ฟังก์ชันที่เรียก, ฟังก์ชันใน logic.py ที่จะโชว์โค้ด)
    'mux': (lambda p: logic.mux4(bit(p, 'A'), bit(p, 'B'), bit(p, 'C'), bit(p, 'D'), num(p, 'S', 0, 3)), [logic.mux4]),
    'logic': (lambda p: logic.logic_unit(bit(p, 'a'), bit(p, 'b'), bit(p, 'op')), [logic.logic_unit]),
    'nand': (lambda p: logic.nand_gates(bit(p, 'a'), bit(p, 'b')), [logic.nand, logic.nand_gates]),
    'fa': (lambda p: logic.full_adder(bit(p, 'a'), bit(p, 'b'), bit(p, 'ci')), [logic.full_adder]),
    'alu1': (lambda p: logic.alu1(bit(p, 'a'), bit(p, 'b'), bit(p, 'less'), bit(p, 'binv'), bit(p, 'cin'), num(p, 'op', 0, 3)), [logic.alu1]),
    'alu1msb': (lambda p: logic.alu1(bit(p, 'a'), bit(p, 'b'), bit(p, 'less'), bit(p, 'binv'), bit(p, 'cin'), num(p, 'op', 0, 3)), [logic.alu1]),
    'alu32': (lambda p: run_alu_n(p, 'basic'), [logic.alu_n, logic.alu1]),
    'aluslt': (lambda p: run_alu_n(p, 'slt'), [logic.alu_n, logic.alu1]),
    'aluzero': (lambda p: run_alu_n(p, 'zero'), [logic.alu_n, logic.alu1]),
    'mul1': (lambda p: logic.gen_mul1(*mul_inputs(p)), [logic.gen_mul1]),
    'mul2': (lambda p: logic.gen_mul2(*mul_inputs(p), v3=False), [logic.gen_mul2]),
    'mul3': (lambda p: logic.gen_mul2(*mul_inputs(p), v3=True), [logic.gen_mul2]),
    'div1': (lambda p: logic.gen_div1(*div_inputs(p)), [logic.gen_div1]),
    'div2': (lambda p: logic.gen_div2(*div_inputs(p)), [logic.gen_div2]),
}


class SimRequest(BaseModel):
    circuit: str
    inputs: Dict[str, Any] = {}


@app.get('/api/health')
def health():
    return {'ok': True, 'circuits': list(CIRCUITS)}


@app.post('/api/simulate')
def simulate(req: SimRequest):
    if req.circuit not in CIRCUITS:
        raise HTTPException(404, 'ไม่รู้จักวงจร ' + req.circuit)
    try:
        return CIRCUITS[req.circuit][0](req.inputs)
    except (TypeError, ValueError):
        raise HTTPException(400, 'ค่าอินพุตไม่ถูกต้อง')


@app.get('/api/source/{circuit}')
def source(circuit: str):
    if circuit not in CIRCUITS:
        raise HTTPException(404, 'ไม่รู้จักวงจร ' + circuit)
    out = []
    for f in CIRCUITS[circuit][1]:
        try:
            code = inspect.getsource(f)
        except (OSError, TypeError):
            code = '# ไม่พบซอร์สโค้ดของ %s' % f.__name__
        out.append({'name': f.__name__, 'code': code})
    return {'file': 'logic.py', 'functions': out}


# หน้าเว็บ (HTML/CSS/JS) — บน Vercel ไฟล์ใน public/ จะถูกเสิร์ฟผ่าน CDN อยู่แล้ว
# บรรทัดนี้ทำให้ตอนรันในเครื่องด้วย uvicorn เปิดหน้าเว็บได้เหมือนกัน
app.mount('/', StaticFiles(directory=os.path.join(HERE, 'public'), html=True), name='site')
