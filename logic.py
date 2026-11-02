"""
logic.py — ตรรกะของทุกวงจรในบทที่ 3 (ไม่มีส่วนแสดงผล จึงทดสอบแยกได้)

ฟังก์ชันหลัก
    mux4()          MUX 4-to-1 (รูป 3.1)
    logic_unit()    1-bit logical unit AND/OR (รูป 3.2)
    nand_gates()    NAND และวงจร NOT/AND/OR ที่สร้างจาก NAND (รูป 3.3)
    full_adder()    1-bit full adder (รูป 3.4, ตาราง 3.3)
    alu1()          one-bit ALU (รูป 3.5)
    alu_n()         word ALU แบบ ripple carry (รูป 3.6, 3.7, 3.8)
    gen_mul1()      การคูณแบบที่ 1 (รูป 3.10–3.11, ตาราง 3.6)
    gen_mul2()      การคูณแบบที่ 2 และ 3 (รูป 3.12–3.18)
    gen_div1()      การหาร (รูป 3.20–3.22)
    gen_div2()      การหารแบบปรับปรุง (รูป 3.23)

ฟังก์ชัน gen_* คืนค่าเป็น list ของ "ขั้น" (dict) แต่ละขั้นเก็บ
    regs    ค่าในรีจิสเตอร์หลังทำขั้นนั้น
    label   ชื่อขั้น (ตามตารางในหนังสือ)
    explain คำอธิบายภาษาไทย
    node    กล่องใน flowchart ที่กำลังทำ
    edges   ลูกศรใน flowchart ที่เพิ่งผ่าน
    active  สาย/บล็อกใน datapath ที่ทำงานในขั้นนั้น
"""
OPNAME = ['AND', 'OR', 'add', 'Less']


# ---------------------------------------------------------------- helpers
def bits(n, w):
    """แปลงเลขไม่ติดลบเป็นสตริงฐานสองยาว w บิต"""
    return format(n % (1 << w), '0{}b'.format(w))


def to_signed(n, w):
    return n - (1 << w) if n >= 1 << (w - 1) else n


def from_signed(n, w):
    return n % (1 << w)

# ---------------------------------------------------------------- Fig 3.1
def mux4(A, B, C, D, S):
    """MUX 4-to-1 ระดับเกต: Y = A·S̄1·S̄0 + B·S̄1·S0 + C·S1·S̄0 + D·S1·S0"""
    s1, s0 = (S >> 1) & 1, S & 1
    n1, n0 = 1 - s1, 1 - s0                       # ผ่าน NOT gate
    data = [A, B, C, D]
    top = [n0, s0, n0, s0]                        # อินพุตบนของ AND แต่ละตัว (มาจาก S0 หรือ S̄0)
    mid = [n1, n1, s1, s1]                        # อินพุตกลาง (มาจาก S1 หรือ S̄1)
    ands = [data[i] & top[i] & mid[i] for i in range(4)]
    Y = 1 if any(ands) else 0                     # OR 4 อินพุต
    table = [[bits(s, 2), 'ABCD'[s], data[s]] for s in range(4)]
    return dict(s1=s1, s0=s0, n1=n1, n0=n0, data=data, top=top, mid=mid, ands=ands, Y=Y, table=table)


# ---------------------------------------------------------------- Fig 3.2
def logic_unit(a, b, op):
    """Operation = 0 → a AND b,  Operation = 1 → a OR b"""
    and_, or_ = a & b, a | b
    result = or_ if op else and_                  # MUX 2-to-1
    table = [[x, y, x & y, x | y] for x in (0, 1) for y in (0, 1)]
    return dict(and_=and_, or_=or_, result=result, table=table)


# ---------------------------------------------------------------- Fig 3.3
def nand(a, b):
    return 1 - (a & b)


def nand_gates(a, b):
    """สร้าง NOT, AND, OR จาก NAND อย่างเดียว"""
    F = nand(a, b)
    not_a = nand(a, a)                            # ¬(A·A) = Ā
    not_b = nand(b, b)
    and_ab = nand(F, F)                           # ¬(¬(A·B)) = A·B
    or_ab = nand(not_a, not_b)                    # ¬(Ā·B̄) = A + B  (de Morgan)
    both_on = a & b                               # ทรานซิสเตอร์ NMOS ทั้งสองตัวนำกระแส → F ต่อลงกราวด์
    table = [[x, y, nand(x, y)] for x in (0, 1) for y in (0, 1)]
    return dict(F=F, na=not_a, nb=not_b, n1=F, ab=and_ab, aob=or_ab, both=both_on, table=table)


# ---------------------------------------------------------------- Fig 3.4
def full_adder(a, b, ci):
    """s = a ⊕ b ⊕ cᵢ (3.14),  cₒ = b·cᵢ + a·b + a·cᵢ (3.15)"""
    x1 = a ^ b                                    # XOR ตัวแรก
    s = x1 ^ ci                                   # XOR ตัวที่สอง
    ab, ac, bc = a & b, a & ci, b & ci            # AND สามตัว
    co = ab | ac | bc                             # OR สามอินพุต
    table = []
    for x in (0, 1):
        for y in (0, 1):
            for z in (0, 1):
                t = x + y + z
                table.append([x, y, z, t >> 1, t & 1, '%d + %d + %d = %s' % (x, y, z, bits(t, 2))])
    return dict(x1=x1, s=s, ab=ab, ac=ac, bc=bc, co=co, total=a + b + ci, table=table)


# ---------------------------------------------------------------- Fig 3.5
def alu1(a, b, less, binv, cin, op):
    """one-bit ALU: Binvert เลือก b หรือ b̄ แล้ว MUX 4-to-1 เลือกผลตาม Operation"""
    bb = 1 - b if binv else b                       # b' หลังผ่าน MUX Binvert
    and_ = a & bb
    or_ = a | bb
    s = a ^ bb ^ cin                                # สมการ 3.14
    cout = (a & bb) | (a & cin) | (bb & cin)        # สมการ 3.15
    res = [and_, or_, s, less][op]
    # overflow detection ตามตาราง 3.1 (ใช้กับ MSB)
    ovf = (a & bb & (1 - s)) | ((1 - a) & (1 - bb) & s)
    return dict(bb=bb, and_=and_, or_=or_, sum=s, cout=cout, res=res, set=s, ovf=ovf)


# ---------------------------------------------------------------- Fig 3.6–3.8
def alu_n(N, A, B, binv, cin, op, variant='basic'):
    """
    word ALU ขนาด N บิต
    variant = 'basic' (รูป 3.6: Less0 = Set)
              'slt'   (รูป 3.7: Less0 = Set xor Overflow)
              'zero'  (รูป 3.8: เหมือน slt + มีขา Zero, ใช้ Bnegate = Binvert = CarryIn)
    """
    cells = []
    c = cin
    for i in range(N):
        v = dict(a=(A >> i) & 1, b=(B >> i) & 1, less=0, binv=binv, cin=c, op=op)
        r = alu1(**v)
        cells.append([v, r])
        c = r['cout']
    msb = cells[-1][1]
    less0 = msb['set'] ^ msb['ovf'] if variant in ('slt', 'zero') else msb['set']
    cells[0][0]['less'] = less0                     # Set ของ MSB ป้อนกลับเข้า Less ของ ALU0
    cells[0][1] = alu1(**cells[0][0])
    res = sum(r['res'] << i for i, (v, r) in enumerate(cells))
    return dict(cells=cells, res=res, set=msb['set'], ovf=msb['ovf'], less0=less0,
                cout=c, zero=1 if res == 0 else 0, binv=binv, cin=cin)


# ---------------------------------------------------------------- Fig 3.10–3.11
def gen_mul1(mc, mp, N):
    M2 = 1 << (2 * N)
    prod = 0
    S = []

    def snap(**o):
        o['regs'] = dict(mcand=mc, mplier=mp, prod=prod)
        o.setdefault('active', [])
        S.append(o)

    snap(iter=0, label='Initialization', explain='ตั้งค่า Multiplicand = %d, Multiplier = %d, Product = 0' % (mc, mp),
         node='start', edges=[])
    mc0, mp0 = mc, mp
    for i in range(1, N + 1):
        back = 'e_start' if i == 1 else 'e_rn'
        if mp & 1:
            prod = (prod + mc) % M2
            snap(iter=i, label='1a: Prod <= Prod + Mcand', explain='Multiplier0 = 1 จึงบวก Multiplicand เข้า Product',
                 node='1a', edges=['e_t1', back], test='Multiplier0 = 1', alu_op='+', changed=['prod'],
                 active=['mp0', 'mc_alu', 'prod_alu', 'alu_prod', 'ctl_alu', 'ctl_write', 'alu'])
        else:
            snap(iter=i, label='1: No operation', explain='Multiplier0 = 0 จึงไม่บวก',
                 node='test', edges=[back], test='Multiplier0 = 0', active=['mp0'])
        was1a = S[-1]['node'] == '1a'
        mc = (mc * 2) % M2
        snap(iter=i, label='2: Shift left Mcand', explain='เลื่อน Multiplicand ไปทางซ้าย 1 บิต',
             node='s2', edges=['e_a2' if was1a else 'e_t0'], active=['ctl_mc'], changed=['mcand'])
        mp >>= 1
        snap(iter=i, label='3: Shift right Mplier', explain='เลื่อน Multiplier ไปทางขวา 1 บิต (ครบ %d/%d รอบ)' % (i, N),
             node='s3', edges=['e_23'], active=['ctl_mp'], changed=['mplier'])
    snap(iter=None, label='Done', explain='ครบ %d รอบ  Product = %d = %d × %d' % (N, prod, mc0, mp0),
         node='done', edges=['e_3r', 'e_ry'])
    return S


# ---------------------------------------------------------------- Fig 3.12–3.18
def gen_mul2(mc, mp, N, v3=False):
    """v3=False: แบบที่ 2 (รูป 3.12–3.13), v3=True: แบบที่ 3 (รูป 3.16–3.18)"""
    MN = 1 << N
    prod = mp if v3 else 0
    carry = 0
    S = []
    tn = 'Product0' if v3 else 'Multiplier0'

    def snap(**o):
        o['regs'] = dict(mcand=mc, mplier=mp, prod=prod)
        o['carry'] = carry
        o.setdefault('active', [])
        S.append(o)

    mp0 = mp
    snap(iter=0, label='Initialization',
         explain=('ใส่ Multiplier (%d) ไว้ในครึ่งขวาของ Product' % mp) if v3 else
         'Multiplicand = %d, Multiplier = %d, Product = 0' % (mc, mp), node='start', edges=[])
    for i in range(1, N + 1):
        test_w = 'p0' if v3 else 'mp0'
        back = 'e_start' if i == 1 else 'e_rn'
        bit0 = prod & 1 if v3 else mp & 1
        if bit0:
            left = (prod >> N) + mc
            carry = 1 if left >= MN else 0          # ตัวทดจาก ALU n บิต จะถูกเลื่อนเข้าบิตบนสุดตอน shift
            prod = ((left % MN) << N) | (prod % MN)
            snap(iter=i, label='1a: Prod = Prod + Mcand',
                 explain='%s = 1 จึงบวก Multiplicand เข้าครึ่งซ้ายของ Product%s' % (tn, ' (มีตัวทด c)' if carry else ''),
                 node='1a', edges=['e_t1', back], test='%s = 1' % tn, alu_op='+', changed=['prod'],
                 active=[test_w, 'mc_alu', 'prod_alu', 'alu_prod', 'ctl_alu', 'ctl_write', 'alu'])
        else:
            snap(iter=i, label='1: No operation', explain='%s = 0 จึงไม่บวก' % tn,
                 node='test', edges=[back], test='%s = 0' % tn, active=[test_w])
        was1a = S[-1]['node'] == '1a'
        prod = (prod >> 1) | (carry << (2 * N - 1))
        carry = 0
        snap(iter=i, label='2: Shift right Product',
             explain='เลื่อน Product ไปทางขวา 1 บิต' + (' (ครบ %d/%d รอบ)' % (i, N) if v3 else ''),
             node='s2', edges=['e_a2' if was1a else 'e_t0'], active=['ctl_shift'], changed=['prod'])
        if not v3:
            mp >>= 1
            snap(iter=i, label='3: Shift right Mplier', explain='เลื่อน Multiplier ไปทางขวา 1 บิต (ครบ %d/%d รอบ)' % (i, N),
                 node='s3', edges=['e_23'], active=['ctl_mp'], changed=['mplier'])
    snap(iter=None, label='Done', explain='Product = %d = %d × %d' % (prod, mc, mp0),
         node='done', edges=['e_2r' if v3 else 'e_3r', 'e_ry'])
    return S


# ---------------------------------------------------------------- Fig 3.20–3.22
def gen_div1(dvd, dvs, N):
    M2, MN = 1 << (2 * N), 1 << N
    div, rem, q = dvs << N, dvd, 0
    S = []

    def snap(**o):
        o['regs'] = dict(div=div, rem=rem, quot=q)
        o.setdefault('active', [])
        S.append(o)

    snap(iter=0, label='Initial values', explain='Divisor (%d) อยู่ครึ่งซ้าย, Remainder = Dividend (%d)' % (dvs, dvd),
         node='start', edges=[])
    if dvs == 0:
        snap(iter=None, label='หารด้วยศูนย์', explain='Divisor = 0 ต้องตรวจจับแยก', node='start', edges=[])
        return S
    for i in range(1, N + 2):                     # ทำ n + 1 รอบ
        neg = rem < div                           # ผลลบติดลบหรือไม่ (บิตเครื่องหมาย)
        rem = (rem - div) % M2
        snap(iter=i, label='1: Rem = Rem − Div',
             explain='ลบ Divisor ออกจาก Remainder' + (' ได้ค่าติดลบ' if neg else ''),
             node='s1', edges=['e_start' if i == 1 else 'e_rn'], alu_op='−', changed=['rem'],
             active=['div_alu', 'rem_alu', 'alu_rem', 'ctl_alu', 'ctl_write', 'alu'])
        if not neg:
            q = (q * 2 + 1) % MN
            snap(iter=i, label='2a: Rem ≥ 0 ⟹ sll Q, Q0 = 1', explain='ไม่ติดลบ: เลื่อน Quotient ซ้ายแล้วใส่ 1',
                 node='2a', edges=['e_1t', 'e_ta'], test='Remainder ≥ 0', changed=['quot'],
                 active=['rem_sign', 'ctl_q'])
        else:
            rem = (rem + div) % M2
            q = (q * 2) % MN
            snap(iter=i, label='2b: Rem < 0 ⟹ +Div, sll Q, Q0 = 0', explain='ติดลบ: บวก Divisor คืน (restore) แล้วเลื่อน Quotient ซ้ายใส่ 0',
                 node='2b', edges=['e_1t', 'e_tb'], test='Remainder < 0', alu_op='+', changed=['rem', 'quot'],
                 active=['rem_sign', 'div_alu', 'rem_alu', 'alu_rem', 'ctl_alu', 'ctl_write', 'ctl_q', 'alu'])
        div >>= 1
        snap(iter=i, label='3: Shift Div right', explain='เลื่อน Divisor ไปทางขวา 1 บิต (ครบ %d/%d รอบ)' % (i, N + 1),
             node='s3', edges=['e_b3' if neg else 'e_a3'], active=['ctl_div'], changed=['div'])
    snap(iter=None, label='Done', explain='Quotient = %d, Remainder = %d  (%d = %d × %d + %d)' % (q, rem, dvd, q, dvs, rem),
         node='done', edges=['e_3r', 'e_ry'])
    return S


# ---------------------------------------------------------------- Fig 3.23
def gen_div2(dvd, dvs, N):
    """วงจรหารปรับปรุง: Remainder 2n บิต (ครึ่งขวาเก็บ Quotient) และเลื่อนซ้ายแทนการเลื่อน Divisor"""
    MN = 1 << N
    rem = dvd
    S = []

    def snap(rem_show=None, **o):
        r = rem if rem_show is None else rem_show
        o['regs'] = dict(div=dvs, rem=r % (MN * MN))
        o['carry'] = 1 if r >= MN * MN else 0     # ครึ่งซ้ายระหว่างทางอาจเกิน n บิตได้ 1 บิต
        o.setdefault('active', [])
        S.append(o)

    snap(iter=0, label='Initial values', explain='Remainder = Dividend (%d) อยู่ครึ่งขวา, Divisor = %d' % (dvd, dvs),
         node='start', edges=[])
    if dvs == 0:
        snap(iter=None, label='หารด้วยศูนย์', explain='Divisor = 0 ต้องตรวจจับแยก', node='start', edges=[])
        return S
    rem <<= 1
    snap(iter=0, label='0: Shift Rem left', explain='เลื่อน Remainder ทั้งก้อนไปทางซ้าย 1 บิตก่อนเริ่มวน',
         node='s0', edges=['e_start'], active=['ctl_shift'], changed=['rem'])
    ALU = ['div_alu', 'rem_alu', 'alu_rem', 'ctl_alu', 'ctl_write', 'alu']
    for i in range(1, N + 1):
        left, right = rem >> N, rem % MN
        diff = left - dvs
        back = 'e_01' if i == 1 else 'e_rn'
        if diff >= 0:
            rem = (diff << N) | right
            snap(iter=i, label='1: Rem.left = Rem.left − Div', explain='ลบ Divisor ออกจากครึ่งซ้ายของ Remainder',
                 node='s1', edges=[back], alu_op='−', changed=['rem'], active=ALU)
            rem = rem * 2 + 1
            snap(iter=i, label='2a: Rem ≥ 0 ⟹ sll Rem, R0 = 1', explain='ไม่ติดลบ: เลื่อน Remainder ซ้ายแล้วใส่ 1',
                 node='2a', edges=['e_1t', 'e_ta'], test='Remainder ≥ 0', changed=['rem'], active=['rem_sign', 'ctl_shift'])
        else:
            snap(rem_show=((diff % MN) << N) | right, iter=i, label='1: Rem.left = Rem.left − Div',
                 explain='ลบ Divisor ออกจากครึ่งซ้าย ได้ค่าติดลบ (%d)' % diff,
                 node='s1', edges=[back], alu_op='−', changed=['rem'], active=ALU)
            rem = rem * 2
            snap(iter=i, label='2b: Rem < 0 ⟹ +Div, sll Rem, R0 = 0', explain='ติดลบ: บวก Divisor คืน แล้วเลื่อน Remainder ซ้ายใส่ 0',
                 node='2b', edges=['e_1t', 'e_tb'], test='Remainder < 0', alu_op='+', changed=['rem'],
                 active=['rem_sign', 'ctl_shift'] + ALU)
    left, right = rem >> N, rem % MN
    rem = ((left >> 1) << N) | right
    snap(iter=None, label='Shift left half right', explain='เลื่อนครึ่งซ้ายกลับไปทางขวา 1 บิต เพื่อชดเชยการเลื่อนเกินหนึ่งครั้ง',
         node='s3', edges=['e_ry'], active=['ctl_shift'], changed=['rem'])
    snap(iter=None, label='Done', explain='ครึ่งซ้าย = Remainder = %d, ครึ่งขวา = Quotient = %d' % (rem >> N, rem % MN),
         node='done', edges=['e_3d'])
    return S
