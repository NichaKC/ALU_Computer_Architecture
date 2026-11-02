"use strict";
/* ---------- one-bit ALU (Fig 3.5) ---------- */
function alu1(v) {
  const bb = v.binv ? 1 - v.b : v.b;
  const and = v.a & bb, or = v.a | bb, sum = v.a ^ bb ^ v.cin;
  const cout = (v.a & bb) | (v.a & v.cin) | (bb & v.cin);
  const res = [and, or, sum, v.less][v.op];
  const ovf = (v.a & bb & (1 - sum)) | ((1 - v.a) & (1 - bb) & sum);
  return { bb, and, or, sum, cout, res, set: sum, ovf };
}
const OPNAME = ['AND', 'OR', 'add', 'Less'];

function drawALU1(v, msb, interactive) {
  const r = alu1(v), g = new Sch(), op = v.op;
  const k = name => interactive ? name : null;
  const P = new Set();
  if (op === 0) ['aMain', 'aAnd', 'bbOut', 'bbUp1', 'bbUp2', 'and', 'res'].forEach(x => P.add(x));
  if (op === 1) ['aMain', 'aCol1', 'aOr', 'bbOut', 'bbUp1', 'bbOr', 'or', 'res'].forEach(x => P.add(x));
  if (op === 2) ['aMain', 'aCol1', 'aAdd', 'bbOut', 'bbAdd', 'cin', 'sum', 'sum2', 'res'].forEach(x => P.add(x));
  if (op === 3) ['less', 'res'].forEach(x => P.add(x));
  if (op !== 3) P.add(v.binv ? 'bInv' : 'bIn'), P.add('bMain');
  const p = n => ({ path: P.has(n), arrow: false });
  const pa = n => ({ path: P.has(n), arrow: true });
  // pins
  g.add(pin(60, 85, { name: 'a', val: v.a, key: k('a') }));
  g.add(pin(60, 295, { name: 'b', val: v.b, key: k('b') }));
  g.add(pin(60, 420, { name: 'Less', val: v.less, key: k('less') }));
  g.add(pin(232, 30, { name: 'Binvert', val: v.binv, key: k('binv'), ctl: true, side: 'top' }));
  g.add(pin(520, 30, { name: 'CarryIn', val: v.cin, key: k('cin'), ctl: true, side: 'top' }));
  g.add(pin(636, 30, { name: 'Operation', val: op, text: bin(op, 2), key: k('op'), ctl: true, side: 'top', w: 40 }));
  // a
  g.w([[77, 85], [300, 85]], v.a, p('aMain')); g.d(300, 85, v.a);
  g.w([[300, 85], [380, 85]], v.a, pa('aAnd'));
  g.w([[300, 85], [300, 175]], v.a, p('aCol1')); g.d(300, 175, v.a);
  g.w([[300, 175], [380 + orInd(175, 160, 60, 80), 175]], v.a, pa('aOr'));
  g.w([[300, 175], [300, 290], [420, 290]], v.a, pa('aAdd'));
  // b and Binvert mux
  g.w([[77, 295], [110, 295]], v.b, p('bMain')); g.d(110, 295, v.b);
  g.w([[110, 295], [210, 295]], v.b, pa('bIn'));
  g.w([[110, 295], [110, 355], [134, 355]], v.b, p('bInv'));
  g.add(gNOT(134, 355, 42, 26));
  g.w([[176, 355], [210, 355]], 1 - v.b, pa('bInv'));
  g.w([[232, 42], [232, 270]], v.binv, { arrow: true });
  g.add(gMUX(210, 270, 44, 110, ['0', '1'], [295, 355]));
  g.w([[254, 325], [330, 325]], r.bb, p('bbOut')); g.d(330, 325, r.bb);
  g.w([[330, 325], [330, 205]], r.bb, p('bbUp1')); g.d(330, 205, r.bb);
  g.w([[330, 205], [330, 115], [380, 115]], r.bb, pa('bbUp2'));
  g.w([[330, 205], [380 + orInd(205, 160, 60, 80), 205]], r.bb, pa('bbOr'));
  g.w([[330, 325], [330, 340], [420, 340]], r.bb, pa('bbAdd'));
  // gates
  g.add(gAND(380, 70, 80, 60, r.and ? 'on' : ''));
  g.add(gOR(380, 160, 80, 60, r.or ? 'on' : ''));
  g.add(gBOX(420, 268, 80, 94, '+', '', 't-lbl" style="font-size:22px'));
  // carry in
  g.w([[520, 42], [520, 244], [460, 244], [460, 268]], v.cin, pa('cin'));
  // outputs to main mux
  g.w([[460, 100], [610, 100]], r.and, pa('and'));
  g.w([[460, 190], [610 + 0, 190]], r.or, pa('or'));
  g.w([[77, 420], [610, 420]], v.less, pa('less'));
  if (msb) { g.w([[500, 315], [570, 315]], r.sum, p('sum')); g.d(570, 315, r.sum); g.w([[570, 315], [610, 315]], r.sum, pa('sum2')); }
  else g.w([[500, 315], [610, 315]], r.sum, pa('sum'));
  g.add(gMUX(610, 60, 52, 400, ['0', '1', '2', '3'], [100, 190, 315, 420]));
  g.w([[636, 42], [636, 60]], op ? 1 : 0, { arrow: true });
  g.w([[662, 260], [706, 260]], r.res, pa('res'));
  g.add(pin(736, 260, { name: 'Result', val: r.res, side: 'bottom' }));
  g.t(560, 92, 'a AND b', 't-sm'); g.t(560, 182, 'a OR b', 't-sm');
  if (!msb) {
    g.w([[460, 362], [460, 468]], r.cout, { arrow: true, path: op === 2 });
    g.add(pin(460, 484, { name: 'CarryOut', val: r.cout, side: 'right' }));
    return g.svg(800, 520);
  }
  // MSB extras
  g.w([[570, 315], [570, 486], [706, 486]], r.sum, { arrow: true }); g.d(570, 486, r.sum);
  g.add(pin(736, 486, { name: 'Set', val: r.sum, side: 'bottom' }));
  g.w([[570, 486], [570, 528]], r.sum, { arrow: true });
  g.d(232, 248, v.binv); g.w([[232, 248], [276, 248], [276, 528]], v.binv, { arrow: true });
  g.w([[300, 290], [300, 528]], v.a, { arrow: true }); g.d(300, 290, v.a);
  g.w([[330, 340], [330, 528]], r.bb, { arrow: true }); g.d(330, 340, r.bb);
  g.w([[460, 362], [460, 528]], r.cout, { arrow: true });
  g.add(gBOX(256, 528, 340, 60, '', r.ovf ? 'act' : ''));
  g.t(426, 553, 'Overflow detection', 't-disp', 'middle', 'style="font-size:15px"');
  g.t(426, 574, 'a·b′·s̄ + ā·b̄′·s', 't-sm', 'middle');
  g.w([[596, 558], [706, 558]], r.ovf, { arrow: true, path: !!r.ovf });
  g.add(pin(736, 558, { name: 'Overflow', val: r.ovf, side: 'bottom' }));
  return g.svg(800, 610);
}

function alu1Info(v, r, msb) {
  const rows = [['0', '0', '–', 'AND', 'a AND b'], ['0', '1', '–', 'OR', 'a OR b'], ['0', '2 (10)', '0', 'add', 'a + b'], ['1', '2 (10)', '1', 'sub', 'a + b̄ + 1'], ['1', '3 (11)', '1', 'slt', 'Result = Less'], ['1', '1', '–', 'NOT (a = 0)', '0 + b̄ = b̄']];
  const cur = v.op === 0 && !v.binv ? 0 : v.op === 1 && !v.binv ? 1 : v.op === 2 && !v.binv && !v.cin ? 2 : v.op === 2 && v.binv && v.cin ? 3 : v.op === 3 && v.binv ? 4 : v.op === 1 && v.binv ? 5 : -1;
  return `<div class="card"><h3>สัญญาณควบคุมตามหนังสือ</h3>${ttTable(['Binvert', 'Operation', 'CarryIn', 'คำสั่ง', 'ผล'], rows, cur)}</div>
  <div class="card"><h3>ค่าภายในวงจร</h3><dl class="readout">
   <dt>b′ (ออกจาก MUX Binvert)</dt><dd>${r.bb}</dd><dt>a AND b′</dt><dd>${r.and}</dd><dt>a OR b′</dt><dd>${r.or}</dd>
   <dt>Sum = a ⊕ b′ ⊕ CarryIn</dt><dd>${r.sum}</dd><dt>CarryOut</dt><dd>${r.cout}</dd>${msb ? `<dt>Set</dt><dd>${r.set}</dd><dt>Overflow</dt><dd>${r.ovf}</dd>` : ''}</dl>
   <p class="note" style="margin-top:8px">วงจร full adder และ logic gates ทำงานตลอดเวลา ไม่ว่า MUX จะเลือกค่าไหน (เชิงอรรถหน้า 74)</p></div>`;
}

for (const msb of [false, true]) register({
  id: msb ? 'alu1msb' : 'alu1', sec: '3.4', fig: '3.5', name: msb ? 'One-bit ALU (MSB)' : 'One-bit ALU (31 LSBs)',
  title: msb ? 'One-bit ALU for MSB' : 'A one-bit ALU (for 31 LSBs)',
  desc: msb ? 'ALU ตัวบิตบนสุด (ALU31) เพิ่มขา Set (บิตเครื่องหมายของผลบวก/ลบ) และวงจร Overflow detection ตามตาราง 3.1 ที่ดูจาก a, b′ และผลบวก'
    : 'รวม AND, OR, full adder และขา Less เข้าด้วยกันด้วย MUX 4-to-1 ที่เลือกด้วย Operation ส่วน Binvert เลือกว่าจะใช้ b หรือ b̄ (ใช้ทำการลบ)',
  mount(stage) {
    const st = { a: 1, b: 1, less: 0, binv: 1, cin: 1, op: 2 };
    mountCombo(stage, {
      state: st,
      controls: [{ k: 'a', label: 'a' }, { k: 'b', label: 'b' }, { k: 'less', label: 'Less' }, { k: 'binv', label: 'Binvert', ctl: true }, { k: 'cin', label: 'CarryIn', ctl: true }, { k: 'op', label: 'Operation', bits: 2, ctl: true, names: OPNAME }],
      draw: st => drawALU1(st, msb, true),
      readout(st) { const r = alu1(st); return `<dl class="readout"><dt>เลือก</dt><dd>${OPNAME[st.op]}</dd><dt>Result</dt><dd>${r.res}</dd>${msb ? `<dt>Set</dt><dd>${r.set}</dd><dt>Overflow</dt><dd>${flag(r.ovf)}</dd>` : `<dt>CarryOut</dt><dd>${r.cout}</dd>`}</dl>`; },
      info: st => alu1Info(st, alu1(st), msb),
    });
  }
});

/* ---------- N-bit ALU (Fig 3.6, 3.7, 3.8) ---------- */
function aluN(st, variant) {
  const N = st.N, A = st.A, B = st.B, binv = variant === 'zero' ? st.bneg : st.binv, cin0 = variant === 'zero' ? st.bneg : st.cin, op = st.op;
  const bits = [];
  let c = cin0;
  for (let i = 0; i < N; i++) {
    const v = { a: Math.floor(A / 2 ** i) % 2, b: Math.floor(B / 2 ** i) % 2, less: 0, binv, cin: c, op };
    const r = alu1(v); bits.push({ v, r }); c = r.cout;
  }
  const msb = bits[N - 1].r, set = msb.set, ovf = msb.ovf;
  const less0 = variant === 'slt' || variant === 'zero' ? set ^ ovf : set;
  bits[0].v.less = less0; bits[0].r = alu1(bits[0].v);
  let res = 0; bits.forEach((b, i) => res += b.r.res * 2 ** i);
  return { bits, res, set, ovf, less0, cout: c, zero: res === 0 ? 1 : 0, binv, cin0 };
}

function drawALUN(st, variant) {
  const N = st.N, R = aluN(st, variant), g = new Sch();
  const D = 80, BH = 60, X0 = 300, X1 = 420, Y0 = 100, yOf = i => Y0 + i * D, op = st.op;
  const zeroV = variant === 'zero', lastY = yOf(N - 1);
  const W = zeroV ? 860 : 740;
  // control pins
  if (zeroV) g.add(pin(250, 30, { name: 'Bnegate', val: st.bneg, key: 'bneg', ctl: true, side: 'top' }));
  else {
    g.add(pin(250, 30, { name: 'Binvert', val: st.binv, key: 'binv', ctl: true, side: 'top' }));
    g.add(pin(360, 30, { name: 'CarryIn', val: st.cin, key: 'cin', ctl: true, side: 'top' }));
  }
  g.add(pin(520, 30, { name: 'Operation', val: op ? 1 : 0, text: bin(op, 2), key: 'op', ctl: true, side: 'top', w: 40 }));
  g.w([[250, 42], [250, lastY - 14]], R.binv);
  g.w([[520, 42], [520, lastY - 14]], op ? 1 : 0);
  if (zeroV) { g.d(250, 62, R.binv); g.w([[250, 62], [360, 62], [360, Y0]], R.cin0, { arrow: true, path: op === 2 || op === 3 }); }
  else g.w([[360, 42], [360, Y0]], R.cin0, { arrow: true, path: op === 2 || op === 3 });
  for (let i = 0; i < N; i++) {
    const y = yOf(i), { v, r } = R.bits[i], isM = i === N - 1, pick = st.pick === i;
    g.d(250, y - 14, R.binv); g.w([[250, y - 14], [322, y - 14], [322, y]], R.binv, { arrow: true });
    g.d(520, y - 14, op ? 1 : 0); g.w([[520, y - 14], [398, y - 14], [398, y]], op ? 1 : 0, { arrow: true });
    const dataPath = op !== 3;
    g.w([[172, y + 12], [X0, y + 12]], v.a, { arrow: true, path: dataPath }); g.add(pin(158, y + 12, { name: `a${i}`, val: v.a, key: `A${i}`, w: 24, h: 17 }));
    g.w([[172, y + 30], [X0, y + 30]], v.b, { arrow: true, path: dataPath }); g.add(pin(158, y + 30, { name: `b${i}`, val: v.b, key: `B${i}`, w: 24, h: 17 }));
    if (i > 0) { g.w([[172, y + 48], [X0, y + 48]], 0, { arrow: true }); g.add(pin(158, y + 48, { name: 'Less', val: 0, w: 24, h: 17, text: '0' })); }
    g.add(`<rect class="blk pick ${pick ? 'sel' : ''}" data-act="pick" data-k="${i}" x="${X0}" y="${y}" width="${X1 - X0}" height="${BH}" rx="3" tabindex="0" role="button" aria-label="ดูภายใน ALU${i}"/>`);
    g.t(360, y + 27, `ALU${i}`, 't-lbl', 'middle', 'style="pointer-events:none"');
    g.t(360, y + 45, `${OPNAME[op]}`, 't-sm', 'middle', 'style="pointer-events:none"');
    if (i < N - 1) { g.w([[360, y + BH], [360, yOf(i + 1)]], r.cout, { arrow: true, path: op === 2 || op === 3 }); g.t(368, y + BH + 13, `c${i + 1}=${r.cout}`, 't-sm'); }
    // result
    const ry = y + 20;
    if (zeroV) {
      const xi = 610 + i * 7;
      g.w([[X1, ry], [xi, ry]], r.res, { arrow: false, path: true });
      g.t(440, ry - 6, `Result${i} = ${r.res}`, 't-sm', 'start', `style="fill:${r.res ? 'var(--hi)' : 'var(--muted)'};font-weight:700"`);
    } else {
      g.w([[X1, ry], [590, ry]], r.res, { arrow: true, path: true });
      g.add(pin(612, ry, { name: `Result${i}`, val: r.res, side: 'right', w: 28, h: 18 }));
    }
  }
  // MSB outputs
  const m = R.bits[N - 1].r, my = lastY;
  g.w([[X1, my + 38], [470, my + 38]], m.set); g.t(436, my + 34, 'Set', 't-sm');
  g.d(470, my + 38, m.set);
  const ovEnd = zeroV ? 790 : 590;
  g.w([[X1, my + 54], [ovEnd, my + 54]], m.ovf, { arrow: true }); g.add(pin(ovEnd + 22, my + 54, { name: 'Overflow', val: m.ovf, side: 'right', w: 28, h: 18 }));
  const loopY = my + (variant === 'basic' ? 90 : 150);
  if (variant === 'basic') {
    g.w([[470, my + 38], [470, loopY], [220, loopY], [220, Y0 + 48], [X0, Y0 + 48]], R.less0, { arrow: true, path: op === 3 });
  } else {
    // XOR(Set, Overflow) -> Less0  (Fig 3.7)
    const gx = 500, gy = my + 78, gh = 50, gw = 60;
    g.w([[470, my + 38], [470, gy + 14], [gx - 9 + orInd(gy + 14, gy, gh, gw), gy + 14]], m.set, { arrow: true });
    g.d(486, my + 54, m.ovf); g.w([[486, my + 54], [486, gy + 36], [gx - 9 + orInd(gy + 36, gy, gh, gw), gy + 36]], m.ovf, { arrow: true });
    g.add(gXOR(gx, gy, gw, gh, R.less0 ? 'on' : ''));
    g.w([[gx + gw, gy + gh / 2], [580, gy + gh / 2], [580, loopY], [220, loopY], [220, Y0 + 48], [X0, Y0 + 48]], R.less0, { arrow: true, path: op === 3 });
    g.t(gx + gw + 6, gy + gh / 2 - 6, 'Set ⊕ Ovf', 't-sm');
  }
  g.t(228, loopY - 6, `Less0 = ${R.less0}`, 't-sm', 'start', 'style="font-weight:700"');
  if (zeroV) {
    const oh = Math.max(90, N * 14 + 26), cy = (Y0 + lastY + 20) / 2, oy = cy - oh / 2, ox = 680, ow = 70;
    for (let i = 0; i < N; i++) {
      const ry = yOf(i) + 20, xi = 610 + i * 7, iy = oy + 13 + i * ((oh - 26) / Math.max(1, N - 1));
      g.w([[xi, ry], [xi, iy], [ox + orInd(iy, oy, oh, ow), iy]], R.bits[i].r.res, { path: true });
      g.d(xi, ry, R.bits[i].r.res);
    }
    const any = R.res ? 1 : 0;
    g.add(gOR(ox, oy, ow, oh, any ? 'on' : ''));
    g.w([[ox + ow, cy], [ox + ow + 10, cy]], any, { path: true });
    g.add(gNOT(ox + ow + 10, cy, 40, 26));
    g.w([[ox + ow + 50, cy], [800, cy]], R.zero, { arrow: true, path: true });
    g.add(pin(822, cy, { name: 'Zero', val: R.zero, side: 'bottom', w: 28 }));
  }
  return g.svg(W, loopY + 24);
}

function numField(id, label, val, N) {
  const s = toSigned(val, N);
  let bits = ''; for (let i = N - 1; i >= 0; i--) { const b = Math.floor(val / 2 ** i) % 2; bits += `<button class="${b ? 'on' : ''}" data-act="bit" data-k="${id}" data-v="${i}" aria-label="${id} bit ${i}">${b}</button>`; }
  return `<div class="field"><span>${label} (ฐานสิบ มีเครื่องหมาย ${-(2 ** (N - 1))}…${2 ** (N - 1) - 1})</span>
    <input class="num" type="number" id="in-${id}" data-k="${id}" min="${-(2 ** (N - 1))}" max="${2 ** (N - 1) - 1}" value="${s}"><div class="bitrow">${bits}</div></div>`;
}

const ALU_PRESETS = [
  { n: 'AND', binv: 0, cin: 0, op: 0 }, { n: 'OR', binv: 0, cin: 0, op: 1 }, { n: 'add', binv: 0, cin: 0, op: 2 },
  { n: 'sub', binv: 1, cin: 1, op: 2 }, { n: 'slt', binv: 1, cin: 1, op: 3 },
];

for (const variant of ['basic', 'slt', 'zero']) register({
  id: { basic: 'alu32', slt: 'aluslt', zero: 'aluzero' }[variant], sec: variant === 'basic' ? '3.4' : '3.5',
  fig: { basic: '3.6', slt: '3.7', zero: '3.8' }[variant],
  name: { basic: 'Word ALU จาก one-bit ALUs', slt: 'ALU ทำ slt แก้ overflow', zero: 'Zero detection' }[variant],
  title: { basic: 'Word ALU ที่ประกอบจาก one-bit ALUs', slt: 'A word ALU implementing slt with accounting on overflow', zero: 'วงจรเพิ่มเพื่อตรวจว่าผลลัพธ์เป็นศูนย์ (Zero detection)' }[variant],
  desc: {
    basic: 'ต่อ one-bit ALU เรียงกันแบบ ripple carry: CarryOut ของบิตหนึ่งเป็น CarryIn ของบิตถัดไป ขา Set ของ MSB ป้อนกลับเข้าขา Less ของ ALU0 สำหรับคำสั่ง slt (หนังสือใช้ 32 บิต ที่นี่ย่อเหลือ 4 หรือ 8 บิตให้ดูง่าย) คลิกที่กล่อง ALU เพื่อดูวงจรข้างใน',
    slt: 'ถ้าการลบเกิด overflow บิตเครื่องหมายของผลลบจะกลับด้าน จึงใช้ Less₀ = Overflow XOR Set (สมการ 3.16) แทนการใช้ Set ตรงๆ ลองตั้ง rs = −5, rt = 4 (4 บิต) เพื่อเห็นความต่าง',
    zero: 'รวม Binvert กับ CarryIn เป็นสัญญาณเดียวชื่อ Bnegate แล้วนำ Result ทุกบิตเข้า NOR (OR ตามด้วย NOT) ได้ Zero = 1 เมื่อผลลัพธ์เป็นศูนย์ทุกบิต ใช้กับคำสั่ง beq',
  }[variant],
  mount(stage) {
    const st = variant === 'basic' ? { N: 4, A: 5, B: 3, binv: 1, cin: 1, op: 2, pick: 3, bneg: 1 }
      : variant === 'slt' ? { N: 4, A: fromSigned(-5, 4), B: 4, binv: 1, cin: 1, op: 3, pick: 3, bneg: 1 }
        : { N: 4, A: 6, B: 6, binv: 1, cin: 1, op: 2, pick: 0, bneg: 1 };
    const presetOn = p => (variant === 'zero' ? st.bneg === p.binv && p.binv === p.cin : st.binv === p.binv && st.cin === p.cin) && st.op === p.op;
    mountCombo(stage, {
      wide: true, state: st,
      hint: 'คลิกบิต a/b หรือสัญญาณควบคุมบนวงจรได้ คลิกกล่อง ALUi เพื่อดูวงจรภายในด้านล่าง',
      draw: st => drawALUN(st, variant),
      panel(st) {
        const N = st.N;
        const ctl = variant === 'zero'
          ? `<div class="ctl-row"><span class="lbl ctrl">Bnegate</span><button class="bit ${st.bneg ? 'on' : ''}" data-act="tog" data-k="bneg">${st.bneg}</button></div>`
          : `<div class="ctl-row"><span class="lbl ctrl">Binvert</span><button class="bit ${st.binv ? 'on' : ''}" data-act="tog" data-k="binv">${st.binv}</button></div>
             <div class="ctl-row"><span class="lbl ctrl">CarryIn</span><button class="bit ${st.cin ? 'on' : ''}" data-act="tog" data-k="cin">${st.cin}</button></div>`;
        return `<div class="ctl-group"><h3>ความกว้าง</h3><span class="seg"><button class="${N === 4 ? 'on' : ''}" data-act="width" data-v="4">4 บิต</button><button class="${N === 8 ? 'on' : ''}" data-act="width" data-v="8">8 บิต</button></span></div>
        <div class="ctl-group"><h3>Operand</h3>${numField('A', variant === 'basic' ? 'A' : 'A (rs)', st.A, N)}${numField('B', variant === 'basic' ? 'B' : 'B (rt)', st.B, N)}</div>
        <div class="ctl-group"><h3>คำสั่ง</h3><div class="btns presets">${ALU_PRESETS.filter(p => variant !== 'zero' || p.binv === p.cin).map((p, i) => `<button class="btn ${presetOn(p) ? 'on' : ''}" data-act="preset" data-v="${ALU_PRESETS.indexOf(p)}">${p.n}</button>`).join('')}</div>
        ${ctl}<div class="ctl-row"><span class="lbl ctrl">Operation</span><span class="seg">${[0, 1, 2, 3].map(v => `<button class="${st.op === v ? 'on' : ''}" data-act="set" data-k="op" data-v="${v}" title="${OPNAME[v]}">${bin(v, 2)}</button>`).join('')}</span></div></div>`;
      },
      readout(st) {
        const R = aluN(st, variant), N = st.N, sA = toSigned(st.A, N), sB = toSigned(st.B, N);
        const sub = R.binv && R.cin0;
        let what = '';
        if (st.op === 2) what = `${sA} ${sub ? '−' : '+'} ${sub ? (sB < 0 ? `(${sB})` : sB) : (sB < 0 ? `(${sB})` : sB)} → ${toSigned(R.res, N)}`;
        if (st.op === 3) what = `${sA} < ${sB} ? → ${R.res}`;
        return `<dl class="readout">
          <dt>A</dt><dd>${bin(st.A, N)} = ${sA}</dd><dt>B</dt><dd>${bin(st.B, N)} = ${sB}</dd>
          <dt>Result</dt><dd><b>${bin(R.res, N)}</b></dd><dt>มีเครื่องหมาย</dt><dd>${toSigned(R.res, N)}</dd><dt>ไม่มีเครื่องหมาย</dt><dd>${R.res}</dd>
          ${what ? `<dt>ความหมาย</dt><dd>${what}</dd>` : ''}
          <dt>CarryOut</dt><dd>${R.cout}</dd><dt>Set (MSB)</dt><dd>${R.set}</dd><dt>Overflow</dt><dd>${flag(R.ovf)}</dd>
          ${variant !== 'basic' ? `<dt>Less₀</dt><dd>${R.less0}</dd>` : ''}${variant === 'zero' ? `<dt>Zero</dt><dd>${R.zero ? '<span class="flag n">1 (เท่ากัน)</span>' : '0'}</dd>` : ''}</dl>`;
      },
      extra(st) {
        const R = aluN(st, variant), i = Math.min(st.pick, st.N - 1), b = R.bits[i];
        return `<div class="card"><h3>ภายใน ALU${i}${i === st.N - 1 ? ' (MSB)' : ''}</h3><div class="canvas" style="border:0;border-radius:8px"><div class="canvas-scroll">${drawALU1(b.v, i === st.N - 1, false)}</div></div></div>`;
      },
      info(st) {
        const R = aluN(st, variant), N = st.N, sA = toSigned(st.A, N), sB = toSigned(st.B, N);
        let h = '';
        if (variant !== 'basic' || st.op === 3) {
          const truth = sA < sB ? 1 : 0, naive = R.set, fixed = R.set ^ R.ovf;
          const row34 = !R.ovf ? (sA < sB ? 1 : 0) : (sA > 0 ? 2 : 3);
          h += `<div class="card"><h3>Table 3.4 การเปรียบเทียบสำหรับ slt</h3>${ttTable(['Overflow', 'รีจิสเตอร์', 'ผลลบ', 'MSB', 'สิ่งที่รู้', 'ต้องการ'], [
            ['0', 'rs > rt', 'result > 0', '0', 'rs > rt', 'rd = 0'], ['0', 'rs < rt', 'result < 0', '1', 'rs < rt', 'rd = 1'],
            ['1', 'rs > 0, rt < 0', 'result < 0', '1', 'rs > rt', 'rd = 0'], ['1', 'rs < 0, rt > 0', 'result > 0', '0', 'rs < rt', 'rd = 1']], (variant === 'zero' ? st.bneg : st.binv && st.cin) ? row34 : -1)}
            <p class="note" style="margin-top:8px">rs = ${sA}, rt = ${sB}: คำตอบที่ถูกคือ ${truth}. ใช้ Set ตรงๆ ได้ ${naive}${naive !== truth ? ' <b style="color:var(--warn)">(ผิด!)</b>' : ''}, ใช้ Set ⊕ Overflow ได้ ${fixed}${fixed !== truth ? ' (ผิด)' : ' ✓'}</p></div>`;
          if (variant !== 'basic') h += `<div class="card"><h3>Table 3.5 ตารางตรรกะสำหรับ slt</h3>${ttTable(['Overflow', 'MSB ของผลลบ', 'Less_LSB'], [[0, 0, 0], [0, 1, 1], [1, 0, 1], [1, 1, 0]], R.ovf * 2 + R.set)}<div class="eq">Less_LSB = OVF xor Result_MSB   (3.16)</div></div>`;
        }
        h += `<div class="card"><h3>Table 3.1 Overflow จากการบวก (A + B′ = C)</h3>${ttTable(['MSB A', 'MSB B′', 'MSB C', 'Overflow'], [[0, 0, 0, 'no'], [0, 0, 1, 'yes'], [0, 1, 0, 'no'], [0, 1, 1, 'no'], [1, 0, 0, 'no'], [1, 0, 1, 'no'], [1, 1, 0, 'yes'], [1, 1, 1, 'no']], (() => { const m = R.bits[N - 1]; return m.v.a * 4 + m.r.bb * 2 + m.r.sum; })())}
          <p class="note" style="margin-top:8px">B′ คือ b หลังผ่าน MUX Binvert (ตอนลบจะเป็น b̄)</p></div>`;
        return h;
      },
      act(a, k, v) {
        const N = st.N;
        if (a === 'pick') { st.pick = Number(k); return true; }
        if (a === 'width') {
          const n = Number(v), conv = x => { let s = toSigned(x, N); if (s < -(2 ** (n - 1)) || s > 2 ** (n - 1) - 1) s = 0; return fromSigned(s, n); };
          st.A = conv(st.A); st.B = conv(st.B); st.N = n; st.pick = Math.min(st.pick, n - 1); if (N === 4 && n === 8 && st.pick === 3) st.pick = 7; return true;
        }
        if (a === 'bit') { const i = Number(v); st[k] = st[k] ^ (2 ** i); return true; }
        if (a === 'preset') { const p = ALU_PRESETS[Number(v)]; st.binv = p.binv; st.cin = p.cin; st.bneg = p.binv; st.op = p.op; return true; }
        if (a === 'tog' && /^[AB]\d+$/.test(k)) { const i = Number(k.slice(1)); st[k[0]] ^= 2 ** i; return true; }
        if (a === 'tog' && k === 'op') { st.op = (st.op + 1) % 4; return true; }
      },
      change(el) {
        if (el.matches('input.num')) { let n = Math.round(Number(el.value) || 0); const N = st.N; n = Math.max(-(2 ** (N - 1)), Math.min(2 ** (N - 1) - 1, n)); st[el.dataset.k] = fromSigned(n, N); }
      },
    });
  }
});
