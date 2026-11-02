"use strict";
/* ---------- Fig 3.1 : 4-to-1 MUX ---------- */
register({
  id: 'mux', sec: '3.4', fig: '3.1', name: 'อุปกรณ์ MUX 4-to-1',
  title: 'Multiplexer 4-to-1 (MUX)',
  desc: 'MUX ทำหน้าที่เหมือนสวิตช์: เอาต์พุต Y เท่ากับ A เมื่อ S = 00, B เมื่อ S = 01, C เมื่อ S = 10 และ D เมื่อ S = 11 ด้านซ้ายคือสัญลักษณ์ ด้านขวาคือวงจรระดับเกต (AND 3 อินพุต 4 ตัว + OR)',
  mount(stage) {
    const st = { A: 1, B: 0, C: 1, D: 0, S: 2 };
    mountCombo(stage, {
      wide: true, circuit: 'mux',
      state: st,
      controls: [
        { k: 'A', label: 'A' }, { k: 'B', label: 'B' }, { k: 'C', label: 'C' }, { k: 'D', label: 'D' },
        { k: 'S', label: 'S[1:0]', bits: 2, ctl: true },
      ],
      draw(st, r) {
        const { s1, s0, n1, n0, data, top, mid, ands, Y } = r, sel = st.S, names = ['A', 'B', 'C', 'D'];
        const g = new Sch();
        // ---- symbol view
        g.t(40, 20, 'MUX symbol', 't-disp', 'start', 'style="font-size:14px;fill:var(--muted)"');
        const ys = [150, 220, 290, 360];
        ys.forEach((y, i) => { g.w([[62, y], [150, y]], data[i], { path: i === sel, arrow: true }); g.add(pin(44, y, { name: names[i], val: data[i], key: names[i], w: 28 })); });
        g.add(`<rect class="g" x="150" y="110" width="64" height="290" rx="32"/>`);
        ['00', '01', '10', '11'].forEach((l, i) => g.t(158, ys[i] + 5, `'${l}'`, 't-sm', 'start', 'style="fill:var(--ink)"'));
        g.w([[194, ys[sel]], [214, 255]], data[sel], { path: true });
        g.w([[182, 72], [182, 110]], 'ctl', { arrow: true });
        g.add(pin(182, 60, { name: 'S', val: st.S, text: bin(st.S, 2), key: 'S', ctl: true, side: 'top', w: 40 }));
        g.w([[214, 255], [262, 255]], Y, { path: true });
        g.add(pin(280, 255, { name: 'Y', val: Y, side: 'right', w: 28 }));
        // ---- gate level
        const ox = 0;
        g.t(720, 20, 'gate level MUX', 't-disp', 'start', 'style="font-size:14px;fill:var(--muted)"');
        const C1 = 480, C1n = 540, C0 = 630, C0n = 690, YB = 485;
        g.add(pin(C1, 60, { name: 'S[1]', val: s1, key: 'S1', side: 'top', ctl: true, w: 28 }));
        g.add(pin(C0, 60, { name: 'S[0]', val: s0, key: 'S0', side: 'top', ctl: true, w: 28 }));
        g.w([[C1, 72], [C1, YB]], s1); g.d(C1, 96, s1);
        g.w([[C1, 96], [496, 96]], s1); g.add(gNOT(496, 96, 38, 24)); g.w([[534, 96], [C1n, 96], [C1n, YB]], n1);
        g.w([[C0, 72], [C0, YB]], s0); g.d(C0, 96, s0);
        g.w([[C0, 96], [646, 96]], s0); g.add(gNOT(646, 96, 38, 24)); g.w([[684, 96], [C0n, 96], [C0n, YB]], n0);
        const gx = 740, gw = 72, gh = 66, gyc = [150, 250, 350, 450];
        const topCol = [C0n, C0, C0n, C0], midCol = [C1n, C1n, C1, C1];
        gyc.forEach((yc, i) => {
          g.w([[topCol[i], yc - 20], [gx, yc - 20]], top[i], { path: i === sel }); g.d(topCol[i], yc - 20, top[i]);
          g.w([[midCol[i], yc], [gx, yc]], mid[i], { path: i === sel }); g.d(midCol[i], yc, mid[i]);
          g.w([[398, yc + 20], [gx, yc + 20]], data[i], { path: i === sel });
          g.add(pin(380, yc + 20, { name: names[i], val: data[i], key: names[i], w: 28 }));
          g.add(gAND(gx, yc - gh / 2, gw, gh, ands[i] ? 'on' : ''));
        });
        const ox2 = 870, oy = 250, oh = 130, ow = 82, oin = [270, 300, 330, 360];
        const xs = [852, 836, 836, 852];
        gyc.forEach((yc, i) => g.w([[gx + gw, yc], [xs[i], yc], [xs[i], oin[i]], [ox2 + orInd(oin[i], oy, oh, ow), oin[i]]], ands[i], { path: i === sel }));
        g.add(gOR(ox2, oy, ow, oh, Y ? 'on' : ''));
        g.w([[ox2 + ow, oy + oh / 2], [985, oy + oh / 2]], Y, { path: true });
        g.add(pin(1002, oy + oh / 2, { name: 'Y', val: Y, w: 28, side: 'bottom' }));
        return g.svg(1040, 510);
      },
      act(a, k) {
        if (a === 'tog' && (k === 'S1' || k === 'S0')) { st.S ^= (k === 'S1' ? 2 : 1); return true; }
      },
      readout(st, r) {
        return `<dl class="readout"><dt>เลือกอินพุต</dt><dd>${'ABCD'[st.S]} (S = ${bin(st.S, 2)})</dd><dt>Y</dt><dd>${r.Y}</dd></dl>`;
      },
      info(st, r) {
        const rows = r.table.map(([s, n, v]) => [s, n, `Y = ${n} = ${v}`]);
        return `<div class="card"><h3>ตารางการเลือก</h3>${ttTable(['S[1:0]', 'ส่งผ่าน', 'ค่าตอนนี้'], rows, st.S)}</div>
        <div class="card"><h3>สมการตรรกะ</h3><div class="eq">Y = A·S̄₁·S̄₀ + B·S̄₁·S₀ + C·S₁·S̄₀ + D·S₁·S₀</div>
        <p class="note">AND แต่ละตัวจะเปิดได้แค่ตัวเดียวตามค่า S จึงมีข้อมูลจากอินพุตเดียวที่ผ่านไปถึง OR</p></div>`;
      },
    });
  }
});

/* ---------- Fig 3.2 : 1-bit logical unit ---------- */
register({
  id: 'logic', sec: '3.4', fig: '3.2', name: 'Logical unit AND/OR',
  title: 'The 1-bit logical unit for AND and OR',
  desc: 'ใช้สัญญาณ Operation เลือกผลจาก MUX: Operation = 0 ได้ a AND b, Operation = 1 ได้ a OR b',
  mount(stage) {
    const st = { a: 1, b: 0, op: 1 };
    mountCombo(stage, {
      state: st, circuit: 'logic',
      controls: [{ k: 'a', label: 'a' }, { k: 'b', label: 'b' }, { k: 'op', label: 'Operation', ctl: true }],
      draw(st, r) {
        const and = r.and_, or = r.or_, R = r.result, g = new Sch();
        const pA = st.op === 0, pO = st.op === 1;
        g.add(pin(60, 90, { name: 'a', val: st.a, key: 'a' }));
        g.add(pin(60, 230, { name: 'b', val: st.b, key: 'b' }));
        g.w([[77, 90], [140, 90]], st.a, { path: true });
        g.w([[140, 90], [240, 90]], st.a, { path: pA, arrow: true }); g.d(140, 90, st.a);
        g.w([[140, 90], [140, 200], [240 + orInd(200, 180, 80, 100), 200]], st.a, { path: pO, arrow: true });
        g.w([[77, 230], [175, 230]], st.b, { path: true }); g.d(175, 230, st.b);
        g.w([[175, 230], [240 + orInd(230, 180, 80, 100), 230]], st.b, { path: pO, arrow: true });
        g.w([[175, 230], [175, 125], [240, 125]], st.b, { path: pA, arrow: true });
        g.add(gAND(240, 72, 100, 70, and ? 'on' : ''));
        g.add(gOR(240, 180, 100, 80, or ? 'on' : ''));
        g.w([[340, 107], [430, 107]], and, { path: pA, arrow: true });
        g.w([[340, 220], [430, 220]], or, { path: pO, arrow: true });
        g.add(gMUX(430, 70, 52, 190, ['0', '1'], [107, 220]));
        g.w([[456, 52], [456, 70]], st.op, { arrow: true });
        g.add(pin(456, 40, { name: 'Operation', val: st.op, key: 'op', ctl: true, side: 'right' }));
        g.w([[482, 165], [560, 165]], R, { path: true, arrow: true });
        g.add(pin(590, 165, { name: 'Result', val: R, side: 'right' }));
        return g.svg(700, 290);
      },
      readout(st, r) { return `<dl class="readout"><dt>a AND b</dt><dd>${r.and_}</dd><dt>a OR b</dt><dd>${r.or_}</dd><dt>Result</dt><dd>${r.result} (${st.op ? 'OR' : 'AND'})</dd></dl>`; },
      info(st, r) {
        return `<div class="card"><h3>ตารางความจริง</h3>${ttTable(['a', 'b', 'AND (Op=0)', 'OR (Op=1)'], r.table, st.a * 2 + st.b)}</div>
        <div class="card"><h3>หมายเหตุจากหนังสือ</h3><p class="note">วงจร AND และ OR ทำงานตลอดเวลา MUX แค่เลือกว่าจะส่งผลตัวไหนออกไปที่ Result เส้นสีเหลืองคือเส้นทางที่ MUX เลือกอยู่</p></div>`;
      },
    });
  }
});

/* ---------- Fig 3.3 : NAND ---------- */
register({
  id: 'nand', sec: '3.4', fig: '3.3', name: 'NAND gate',
  title: 'NAND gate: symbol, transistor และวงจรที่สร้างจาก NAND',
  desc: 'F = ¬(a·b): เป็น 0 เฉพาะตอน a และ b เป็น 1 พร้อมกัน ระดับทรานซิสเตอร์ NMOS สองตัวต่ออนุกรม เมื่อทั้งคู่นำกระแส F ถูกดึงลงกราวด์ และเราสร้าง NOT, AND, OR จาก NAND ได้',
  mount(stage) {
    const st = { a: 1, b: 1 };
    mountCombo(stage, {
      wide: true, state: st, circuit: 'nand',
      controls: [{ k: 'a', label: 'A' }, { k: 'b', label: 'B' }],
      draw(st, r) {
        const a = st.a, b = st.b, F = r.F, g = new Sch();
        const H = 't-disp" style="font-size:13.5px;fill:var(--muted)';
        // 1) symbol
        g.t(30, 30, 'NAND gate symbol', H);
        g.add(pin(50, 80, { name: 'A', val: a, key: 'a', w: 28 })); g.add(pin(50, 130, { name: 'B', val: b, key: 'b', w: 28 }));
        g.w([[64, 80], [130, 80]], a); g.w([[64, 130], [130, 130]], b);
        g.add(gAND(130, 64, 80, 82, F ? '' : 'on')); g.add(bubble(210, 105));
        g.w([[220, 105], [256, 105]], F); g.add(pin(276, 105, { name: 'F', val: F, side: 'bottom', w: 28 }));
        // 2) transistor level
        g.t(30, 205, 'Transistor level (NMOS)', H);
        const X = 180, both = r.both;
        g.t(X, 232, 'Vcc', 't-lbl', 'middle');
        g.w([[X, 240], [X, 252]], 1, { path: true });
        g.add(`<polyline class="sw" points="${X},252 ${X + 9},257 ${X - 9},264 ${X + 9},271 ${X - 9},278 ${X + 9},285 ${X},290"/>`);
        g.t(X + 16, 275, 'R', 't-sm');
        g.w([[X, 290], [X, 302]], F, { path: true });
        g.d(X, 302, F); g.w([[X, 302], [258, 302]], F, { path: !both, arrow: true });
        g.add(pin(276, 302, { name: 'F', val: F, side: 'bottom', w: 28 }));
        const sw = (y1, y2, on, lbl, inV, inKey, upV, path) => {
          g.w([[X, y1], [X, y1 + 9]], upV, { path }); g.w([[X, y2 - 9], [X, y2]], upV === 1 && on ? upV : (on ? upV : 0), { path });
          g.add(on ? `<line class="sw" x1="${X}" y1="${y1 + 9}" x2="${X}" y2="${y2 - 9}" style="stroke:var(--hi)"/>` : `<line class="sw" x1="${X}" y1="${y2 - 9}" x2="${X + 15}" y2="${y1 + 12}"/>`);
          g.add(`<circle cx="${X}" cy="${y1 + 9}" r="2.8" class="dot neutral"/><circle cx="${X}" cy="${y2 - 9}" r="2.8" class="dot neutral"/>`);
          g.add(`<line class="sw" x1="${X - 16}" y1="${y1 + 6}" x2="${X - 16}" y2="${y2 - 6}"/>`);
          const ym = (y1 + y2) / 2;
          g.w([[64, ym], [X - 16, ym]], inV); g.add(pin(50, ym, { name: lbl, val: inV, key: inKey, w: 28 }));
          g.t(X + 22, ym + 4, on ? 'ON' : 'OFF', 't-val', 'start', `style="fill:${on ? 'var(--hi)' : 'var(--muted)'}"`);
        };
        sw(302, 352, a, 'A', a, 'a', F, both);
        sw(352, 402, b, 'B', b, 'b', a ? F : 0, both);
        g.w([[X, 402], [X, 420]], 0, { path: both });
        g.add(`<line class="sw" x1="${X - 14}" y1="420" x2="${X + 14}" y2="420"/><line class="sw" x1="${X - 9}" y1="426" x2="${X + 9}" y2="426"/><line class="sw" x1="${X - 4}" y1="432" x2="${X + 4}" y2="432"/>`);
        g.t(X + 20, 430, 'GND', 't-sm');
        g.t(30, 458, both ? 'A=B=1: มีทางลงกราวด์ → F = 0' : 'ไม่มีทางลงกราวด์ → F ถูกดึงขึ้นผ่าน R → F = 1', 't-sm');
        // 3) gates built from NAND
        const nand = (x, y, w, h, out) => g.add(gAND(x, y, w, h, out ? 'on' : '')).add(bubble(x + w, y + h / 2));
        // NOT
        g.t(380, 30, 'logical NOT: ¬(A·A) = Ā', H);
        const na = r.na;
        g.add(pin(400, 80, { name: 'A', val: a, key: 'a', w: 28 })); g.w([[414, 80], [450, 80]], a, { path: true }); g.d(450, 80, a);
        g.w([[450, 80], [450, 66], [520, 66]], a, { path: true }); g.w([[450, 80], [450, 94], [520, 94]], a, { path: true });
        nand(520, 52, 70, 56, na); g.w([[600, 80], [700, 80]], na, { path: true }); g.add(pin(722, 80, { name: 'Ā', val: na, side: 'right', w: 28 }));
        // AND
        g.t(380, 150, 'logical AND: ¬(¬(A·B)) = A·B', H);
        const n1 = r.n1, ab = r.ab;
        g.add(pin(400, 190, { name: 'A', val: a, key: 'a', w: 28 })); g.add(pin(400, 240, { name: 'B', val: b, key: 'b', w: 28 }));
        g.w([[414, 190], [480, 190]], a, { path: true }); g.w([[414, 240], [480, 240]], b, { path: true });
        nand(480, 175, 76, 80, n1);
        g.w([[566, 215], [600, 215]], n1, { path: true }); g.d(600, 215, n1);
        g.w([[600, 215], [600, 203], [640, 203]], n1, { path: true }); g.w([[600, 215], [600, 227], [640, 227]], n1, { path: true });
        nand(640, 190, 66, 50, ab); g.w([[716, 215], [744, 215]], ab, { path: true });
        g.add(pin(764, 215, { name: 'A·B', val: ab, side: 'right', w: 28 }));
        // OR
        g.t(380, 290, 'logical OR: ¬(Ā·B̄) = A+B (de Morgan)', H);
        const nb = r.nb, aob = r.aob;
        g.add(pin(400, 335, { name: 'A', val: a, key: 'a', w: 28 })); g.add(pin(400, 425, { name: 'B', val: b, key: 'b', w: 28 }));
        g.w([[414, 335], [450, 335]], a, { path: true }); g.d(450, 335, a);
        g.w([[450, 335], [450, 324], [490, 324]], a, { path: true }); g.w([[450, 335], [450, 346], [490, 346]], a, { path: true });
        nand(490, 313, 60, 44, na);
        g.w([[414, 425], [450, 425]], b, { path: true }); g.d(450, 425, b);
        g.w([[450, 425], [450, 414], [490, 414]], b, { path: true }); g.w([[450, 425], [450, 436], [490, 436]], b, { path: true });
        nand(490, 403, 60, 44, nb);
        g.w([[560, 335], [610, 335], [610, 360], [650, 360]], na, { path: true });
        g.w([[560, 425], [610, 425], [610, 410], [650, 410]], nb, { path: true });
        nand(650, 345, 70, 80, aob); g.w([[730, 385], [744, 385]], aob, { path: true });
        g.add(pin(764, 385, { name: 'A+B', val: aob, side: 'right', w: 28 }));
        return g.svg(860, 470);
      },
      readout(st, r) { return `<dl class="readout"><dt>NAND</dt><dd>${r.F}</dd><dt>NOT A</dt><dd>${r.na}</dd><dt>A·B</dt><dd>${r.ab}</dd><dt>A+B</dt><dd>${r.aob}</dd></dl>`; },
      info(st, r) {
        return `<div class="card"><h3>ตารางความจริง NAND</h3>${ttTable(['A', 'B', 'F = ¬(A·B)'], r.table, st.a * 2 + st.b)}</div>
        <div class="card"><h3>ทรานซิสเตอร์ NMOS</h3><p class="note">เมื่อจ่ายแรงดันบวกพอที่ขา gate จะเกิด n-channel ให้กระแสไหลระหว่าง source กับ drain ได้ (แสดงเป็นสวิตช์ ON) ถ้าสวิตช์ทั้งสองตัว ON พร้อมกัน F ต่อลงกราวด์จึงเป็น 0</p></div>`;
      },
    });
  }
});

/* ---------- Fig 3.4 : full adder ---------- */
register({
  id: 'fa', sec: '3.4', fig: '3.4', name: '1-bit full adder',
  title: 'A 1-bit adder (full adder)',
  desc: 'บวก a + b + CarryIn ได้ Sum และ CarryOut ตามตาราง 3.3: s = a ⊕ b ⊕ cᵢ และ cₒ = b·cᵢ + a·b + a·cᵢ',
  mount(stage) {
    const st = { a: 1, b: 0, ci: 1 };
    mountCombo(stage, {
      state: st, circuit: 'fa',
      controls: [{ k: 'a', label: 'a' }, { k: 'b', label: 'b' }, { k: 'ci', label: 'CarryIn', ctl: true }],
      draw(st, r) {
        const { a, b, ci } = st, { x1, s, ab, ac, bc, co } = r;
        const g = new Sch();
        g.add(pin(56, 80, { name: 'a', val: a, key: 'a' })); g.add(pin(56, 140, { name: 'b', val: b, key: 'b' })); g.add(pin(56, 200, { name: 'cᵢ', val: ci, key: 'ci', ctl: true }));
        const X1 = [250, 60, 82, 110];
        g.w([[73, 80], [X1[0] - 9 + orInd(80, 60, 110, 82), 80]], a, { arrow: true }); g.d(150, 80, a);
        g.w([[73, 140], [X1[0] - 9 + orInd(140, 60, 110, 82), 140]], b, { arrow: true }); g.d(180, 140, b);
        g.w([[73, 200], [430 - 9 + orInd(200, 95, 125, 82), 200]], ci, { arrow: true }); g.d(210, 200, ci);
        g.w([[150, 80], [150, 322], [430, 322]], a, { arrow: true }); g.d(150, 262, a);
        g.w([[150, 262], [430, 262]], a, { arrow: true });
        g.w([[180, 140], [180, 382], [430, 382]], b, { arrow: true }); g.d(180, 288, b);
        g.w([[180, 288], [430, 288]], b, { arrow: true });
        g.w([[210, 200], [210, 408], [430, 408]], ci, { arrow: true }); g.d(210, 348, ci);
        g.w([[210, 348], [430, 348]], ci, { arrow: true });
        g.add(gXOR(250, 60, 82, 110, x1 ? 'on' : ''));
        g.w([[332, 115], [380, 115], [380, 118], [430 - 9 + orInd(118, 95, 125, 82), 118]], x1, { arrow: true });
        g.add(gXOR(430, 95, 82, 125, s ? 'on' : ''));
        g.w([[512, 157], [640, 157]], s, { path: true, arrow: true }); g.add(pin(668, 157, { name: 'Sum (s)', val: s, side: 'bottom' }));
        g.add(gAND(430, 250, 70, 50, ab ? 'on' : '')); g.add(gAND(430, 310, 70, 50, ac ? 'on' : '')); g.add(gAND(430, 370, 70, 50, bc ? 'on' : ''));
        const oy = 300, oh = 110, ow = 80, ox = 570;
        g.w([[500, 275], [536, 275], [536, 318], [ox + orInd(318, oy, oh, ow), 318]], ab, { path: !!ab, arrow: true });
        g.w([[500, 335], [548, 335], [548, 355], [ox + orInd(355, oy, oh, ow), 355]], ac, { path: !!ac, arrow: true });
        g.w([[500, 395], [536, 395], [536, 392], [ox + orInd(392, oy, oh, ow), 392]], bc, { path: !!bc, arrow: true });
        g.add(gOR(ox, oy, ow, oh, co ? 'on' : ''));
        g.w([[ox + ow, oy + oh / 2], [640, oy + oh / 2]], co, { path: !!co, arrow: true });
        g.add(pin(668, oy + oh / 2, { name: 'CarryOut (cₒ)', val: co, side: 'bottom' }));
        g.t(520, 270, 'a·b', 't-sm'); g.t(520, 330, 'a·cᵢ', 't-sm'); g.t(520, 412, 'b·cᵢ', 't-sm');
        return g.svg(760, 450);
      },
      readout(st, r) { return `<dl class="readout"><dt>a + b + cᵢ</dt><dd>${st.a} + ${st.b} + ${st.ci} = ${r.total} (= ${bin(r.total, 2)}₂)</dd><dt>Sum</dt><dd>${r.s}</dd><dt>CarryOut</dt><dd>${r.co}</dd></dl>`; },
      info(st, r) {
        return `<div class="card"><h3>Table 3.3 ตารางตรรกะ full adder</h3>${ttTable(['a', 'b', 'cᵢ', 'cₒ', 's', '(base 2)'], r.table, st.a * 4 + st.b * 2 + st.ci)}</div>
        <div class="card"><h3>สมการ 3.13–3.15</h3><div class="eq">s = ā·b̄·cᵢ + ā·b·c̄ᵢ + a·b̄·c̄ᵢ + a·b·cᵢ</div><div class="eq">s = a ⊕ b ⊕ cᵢ</div><div class="eq">cₒ = b·cᵢ + a·b + a·cᵢ</div><p class="note">วงจร Sum ใช้ XOR สองตัวต่อกัน ส่วน CarryOut คือ AND สามตัวรวมกันด้วย OR (เป็น 1 เมื่อมีอินพุตเป็น 1 อย่างน้อยสองตัว)</p></div>`;
      },
    });
  }
});
