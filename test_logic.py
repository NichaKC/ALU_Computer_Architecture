"""ทดสอบ logic.py: เทียบกับการคำนวณจริงและตารางในหนังสือ  รัน:  python test_logic.py"""
from logic import *


def test_small_circuits():
    for S in range(4):
        for d in range(16):
            A, B, C, D = (d >> 3) & 1, (d >> 2) & 1, (d >> 1) & 1, d & 1
            assert mux4(A, B, C, D, S)['Y'] == [A, B, C, D][S]
    for a in (0, 1):
        for b in (0, 1):
            g = nand_gates(a, b)
            assert (g['F'], g['na'], g['ab'], g['aob']) == (1 - (a & b), 1 - a, a & b, a | b)
            for op in (0, 1):
                assert logic_unit(a, b, op)['result'] == (a | b if op else a & b)
            for c in (0, 1):
                r = full_adder(a, b, c)
                assert (r['co'], r['s']) == ((a + b + c) >> 1, (a + b + c) & 1)


def test_alu():
    for N in (4, 8):
        for A in range(1 << N):
            for B in range(1 << N):
                sA, sB = to_signed(A, N), to_signed(B, N)
                assert alu_n(N, A, B, 0, 0, 2)['res'] == (A + B) % (1 << N)
                assert alu_n(N, A, B, 1, 1, 2)['res'] == from_signed(sA - sB, N)
                assert alu_n(N, A, B, 0, 0, 0)['res'] == A & B
                assert alu_n(N, A, B, 0, 0, 1)['res'] == A | B
                assert alu_n(N, A, B, 1, 1, 3, 'slt')['res'] == (1 if sA < sB else 0)
                assert alu_n(N, A, B, 1, 1, 2, 'zero')['zero'] == (1 if A == B else 0)
                ov = not (-(1 << (N - 1)) <= sA + sB < (1 << (N - 1)))
                assert alu_n(N, A, B, 0, 0, 2)['ovf'] == ov


def test_mul_div():
    for N in (4, 8):
        step = 1 if N == 4 else 7
        for a in range(0, 1 << N, step):
            for b in range(0, 1 << N, step if N == 4 else 5):
                assert gen_mul1(a, b, N)[-1]['regs']['prod'] == a * b
                assert gen_mul2(a, b, N)[-1]['regs']['prod'] == a * b
                assert gen_mul2(a, b, N, True)[-1]['regs']['prod'] == a * b
                if b:
                    r = gen_div1(a, b, N)[-1]['regs']
                    assert (r['quot'], r['rem']) == (a // b, a % b)
                    r = gen_div2(a, b, N)[-1]['regs']['rem']
                    assert (r >> N, r % (1 << N)) == (a % b, a // b)


def test_book_tables():
    # ตาราง 3.6 (2 × 3): Product หลังแต่ละขั้น
    p = [bits(s['regs']['prod'], 8) for s in gen_mul1(2, 3, 4)]
    assert p[:7] == ['00000000', '00000010', '00000010', '00000010', '00000110', '00000110', '00000110']
    # รูป 3.18 (คูณแบบที่ 3)
    p = [bits(s['regs']['prod'], 8) for s in gen_mul2(2, 3, 4, True)]
    assert p == ['00000011', '00100011', '00010001', '00110001', '00011000', '00011000', '00001100', '00001100', '00000110', '00000110']
    # รูป 3.22 (7 ÷ 2)
    last = gen_div1(7, 2, 4)[-1]['regs']
    assert (bits(last['quot'], 4), bits(last['rem'], 8)) == ('0011', '00000001')


if __name__ == '__main__':
    for t in (test_small_circuits, test_book_tables, test_alu, test_mul_div):
        t()
        print('ผ่าน', t.__name__)
