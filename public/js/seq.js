"use strict";
/* ---------- sequential (step-by-step) engine ---------- */
let CLEANUP = null;

function trapezoid(x, y, w, h, cls, label, sub) {
  const pts = [[x, y], [x + w * 0.42, y], [x + w * 0.5, y + h * 0.32], [x + w * 0.58, y], [x + w, y], [x + w * 0.8, y + h], [x + w * 0.2, y + h]];
  return `<polygon class="blk ${cls}" points="${P(pts)}"/><text x="${x + w / 2}" y="${y + h * 0.72 + 4}" text-anchor="middle" class="t-disp" style="font-size:14px">${label}</text>` +
    (sub ? `<text x="${x + w + 8}" y="${y + h / 2 + 5}" class="t-val" style="fill:var(--ctrl);font-size:15px">${sub}</text>` : '');
}

function regSVG(r, val, prevVal, active, carry) {
  const n = r.bits, bw = Math.min(16, (r.w - 24) / (n + (r.half ? 1 : 0)));
  let s = `<rect class="blk ${active ? 'act' : ''}" x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="3"/>`;
  s += `<text x="${r.x + 8}" y="${r.y + 16}" class="t-disp" style="font-size:13px">${r.title}</text>`;
  if (r.sub) s += `<text x="${r.x + r.w - 8}" y="${r.y + 16}" class="t-sm" text-anchor="end" style="font-family:var(--f-disp)">${r.sub}</text>`;
  const total = bw * n + (r.half ? bw * 0.8 : 0), x0 = r.x + (r.w - total) / 2;
  const b = bin(val, n), pb = prevVal == null ? null : bin(prevVal, n);
  for (let i = 0; i < n; i++) {
    const x = x0 + i * bw + (r.half && i >= n / 2 ? bw * 0.8 : 0) + bw / 2;
    const ch = pb != null && pb[i] !== b[i];
    s += `<text x="${x}" y="${r.y + r.h - 12}" text-anchor="middle" class="reg-bit ${ch ? 'ch' : ''}">${b[i]}</text>`;
  }
  if (r.half) { const hx = x0 + (n / 2) * bw + bw * 0.4; s += `<line x1="${hx}" y1="${r.y + 24}" x2="${hx}" y2="${r.y + r.h - 6}" style="stroke:var(--rule);stroke-width:1.5"/>`; }
  if (carry) s += `<text x="${x0 - 6}" y="${r.y + r.h - 12}" text-anchor="end" class="t-val" style="fill:var(--ctrl)">c=1</text>`;
  if (r.arrow) {
    const ax = r.x + r.w / 2, ay = r.y - 9;
    if (r.arrow === 'left' || r.arrow === 'both') s += `<line x1="${ax + 14}" y1="${ay}" x2="${ax - 12}" y2="${ay}" style="stroke:var(--ink);stroke-width:2"/>` + arrowHead([[ax + 14, ay], [ax - 14, ay]], 'ah neutral', 7);
    if (r.arrow === 'right' || r.arrow === 'both') s += `<line x1="${ax - 14 + (r.arrow === 'both' ? 34 : 0)}" y1="${ay}" x2="${ax + 12 + (r.arrow === 'both' ? 34 : 0)}" y2="${ay}" style="stroke:var(--ink);stroke-width:2"/>` + arrowHead([[ax - 14 + (r.arrow === 'both' ? 34 : 0), ay], [ax + 14 + (r.arrow === 'both' ? 34 : 0), ay]], 'ah neutral', 7);
  }
  return s;
}

function dpDraw(spec, step, prev) {
  const g = new Sch(), act = new Set(step.active || []);
  for (const [name, pts] of Object.entries(spec.wires)) {
    const ctl = name.startsWith('ctl') || spec.ctlWires?.includes(name);
    g.w(pts, act.has(name) ? 1 : (ctl ? 'ctl' : 0), { path: act.has(name), arrow: true });
  }
  for (const r of spec.regs) g.add(regSVG(r, step.regs[r.id], prev ? prev.regs[r.id] : null, (step.changed || []).includes(r.id), r.id === spec.carryReg && step.carry));
  for (const a of spec.alus) g.add(trapezoid(a.x, a.y, a.w, a.h, act.has(a.id) ? 'act' : '', a.label, act.has(a.id) ? step.alu_op || '' : ''));
  const c = spec.ctrl;
  g.add(`<ellipse class="blk ${step.test ? 'act' : ''}" cx="${c.cx}" cy="${c.cy}" rx="${c.rx}" ry="${c.ry}"/><text x="${c.cx}" y="${c.cy + 5}" text-anchor="middle" class="t-disp" style="font-size:14px">Control test</text>`);
  (spec.labels || []).forEach(l => g.t(l[0], l[1], l[2], 't-sm'));
  if (step.test) g.t(c.cx, c.cy + c.ry + 18, step.test, 't-val', 'middle', 'style="fill:var(--ctrl)"');
  return g.svg(spec.w, spec.h);
}

function fcDraw(spec, step) {
  const g = new Sch();
  const en = new Set(step.edges || []);
  for (const e of spec.edges) {
    const a = en.has(e.id);
    g.add(`<polyline class="fc-a ${a ? 'act' : ''}" points="${P(e.pts)}"/>` + arrowHead(e.pts, 'arrowhead ' + (a ? 'act' : ''), 8));
    if (e.label) g.t(e.lx, e.ly, e.label, 'fc-t', e.anchor || 'start', `style="font-size:11.5px;fill:${a ? 'var(--ctrl)' : 'var(--muted)'}"`);
  }
  for (const n of spec.nodes) {
    const a = step.node === n.id, cls = `fc ${a ? 'act' : ''}`;
    const { x, y, w, h } = n;
    if (n.type === 'term') g.add(`<rect class="${cls}" x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="${h / 2}"/>`);
    else if (n.type === 'dec') g.add(`<polygon class="${cls}" points="${x},${y - h / 2} ${x + w / 2},${y} ${x},${y + h / 2} ${x - w / 2},${y}"/>`);
    else g.add(`<rect class="${cls}" x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="2"/>`);
    const L = n.lines, lh = 14.5, y0 = y - (L.length - 1) * lh / 2 + 4.5;
    L.forEach((t, i) => g.t(x, y0 + i * lh, esc(t), 'fc-t', 'middle', a ? 'style="font-weight:600"' : ''));
  }
  return g.svg(spec.w, spec.h);
}

function mountSeq(stage, cfg) {
  const st = { N: cfg.defN || 4, inp: { ...cfg.defaults }, idx: 0, playing: false, speed: 900 };
  let steps = [];
  stage.innerHTML = `
    <div class="bench">
      <div class="canvas wide"><div class="canvas-scroll" data-r="dp"></div>
        <div class="canvas-bar"><span data-r="stepinfo" class="stepinfo"></span><span>ตัวเลขสีส้ม = บิตที่เพิ่งเปลี่ยน</span></div></div>
      <div class="panel" data-r="pn"></div>
    </div>
    <div class="two">
      <div class="card" style="min-width:0"><h3>${cfg.tableTitle || 'ลำดับการทำงาน'}</h3><div data-r="tbl"></div></div>
      <div class="card" style="min-width:0"><h3>Flow chart</h3><div class="canvas-scroll" data-r="fc"></div></div>
    </div>
    <div class="info" data-r="inf"></div>`;
  const R = k => stage.querySelector(`[data-r="${k}"]`);
  let timer = null;
  function stop() { st.playing = false; if (timer) clearInterval(timer); timer = null; }
  CLEANUP = stop;
  // ขอรายการขั้นตอนทั้งหมดจาก Python (logic.py: gen_mul1 / gen_mul2 / gen_div1 / gen_div2)
  let reqId = 0;
  async function reload() {
    const my = ++reqId;
    setBusy(true);
    try {
      const s = await api(cfg.circuit, { ...st.inp, N: st.N });
      if (my !== reqId) return;
      steps = s; st.idx = Math.min(st.idx, steps.length - 1);
      setBusy(false); render();
    } catch (e) {
      if (my === reqId) { setBusy(false); showApiError(R('dp'), e); }
    }
  }
  function panel() {
    const N = st.N, max = 2 ** N - 1;
    let h = '';
    if (cfg.widths) h += `<div class="ctl-group"><h3>ขนาดคำ (n บิต)</h3><span class="seg">${cfg.widths.map(w => `<button class="${N === w ? 'on' : ''}" data-act="width" data-v="${w}">${w} บิต</button>`).join('')}</span></div>`;
    h += `<div class="ctl-group"><h3>อินพุต</h3>${cfg.inputs.map(i => `<div class="field"><span>${i.label} (0…${max})</span><input class="num" type="number" id="seq-${i.k}" data-k="${i.k}" min="${i.min ?? 0}" max="${max}" value="${st.inp[i.k]}"></div>`).join('')}
      ${cfg.examples ? `<div class="btns presets">${cfg.examples.map((e, j) => `<button class="btn" data-act="ex" data-v="${j}">${e.label}</button>`).join('')}</div>` : ''}</div>`;
    h += `<div class="ctl-group"><h3>สั่งงาน</h3><div class="seqctl">
      <button class="btn" data-act="first" aria-label="กลับไปเริ่ม">⏮</button>
      <button class="btn" data-act="prev" aria-label="ย้อนหนึ่งขั้น">◀</button>
      <button class="btn primary" data-act="next">ขั้นถัดไป ▶</button>
      <button class="btn" data-act="play">${st.playing ? '⏸ หยุด' : '⏵ เล่นอัตโนมัติ'}</button>
      <button class="btn" data-act="last" aria-label="ไปขั้นสุดท้าย">⏭</button></div>
      <div class="ctl-row"><span class="note">ความเร็ว</span><span class="seg">${[[1400, 'ช้า'], [900, 'ปกติ'], [450, 'เร็ว']].map(([v, l]) => `<button class="${st.speed === v ? 'on' : ''}" data-act="speed" data-v="${v}">${l}</button>`).join('')}</span></div></div>`;
    h += `<div class="ctl-group"><h3>ขั้นตอนนี้</h3><p class="steptitle">${steps[st.idx].label}</p><p class="note">${steps[st.idx].explain || ''}</p></div>`;
    if (cfg.readout) h += `<div class="ctl-group"><h3>ผลลัพธ์</h3>${cfg.readout(steps, st)}</div>`;
    return h;
  }
  function table() {
    const head = cfg.cols(st.N);
    let h = `<div class="tbl-wrap"><table class="tt"><thead><tr>${head.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>`;
    steps.forEach((s, i) => {
      const prev = i > 0 ? steps[i - 1] : null;
      h += `<tr class="clickable ${i === st.idx ? 'cur' : ''} ${i > st.idx ? 'future' : ''}" data-act="goto" data-v="${i}">${cfg.row(s, prev, st.N).map(c => `<td>${c}</td>`).join('')}</tr>`;
    });
    return h + '</tbody></table></div>';
  }
  function render() {
    if (!steps.length) return;        // ยังรอผลจาก Python
    const s = steps[st.idx], prev = st.idx > 0 ? steps[st.idx - 1] : null;
    R('dp').innerHTML = dpDraw(cfg.dp(st.N), s, prev);
    R('fc').innerHTML = fcDraw(cfg.fc(st.N), s);
    R('tbl').innerHTML = table();
    R('pn').innerHTML = panel();
    R('stepinfo').textContent = `ขั้น ${st.idx} / ${steps.length - 1}${s.iter != null ? ` · Iteration ${s.iter}` : ''}`;
    R('inf').innerHTML = cfg.info ? cfg.info(st.N, steps, st) : '';
    const cur = R('tbl').querySelector('tr.cur');
    if (cur && st.playing) { const box = R('tbl').querySelector('.tbl-wrap'); if (box) box.scrollTop = cur.offsetTop - 80; }
  }
  function go(i) { st.idx = Math.max(0, Math.min(steps.length - 1, i)); render(); }
  function handle(el) {
    const a = el.dataset.act, v = el.dataset.v;
    if (a === 'next') go(st.idx + 1);
    else if (a === 'prev') { stop(); go(st.idx - 1); }
    else if (a === 'first') { stop(); go(0); }
    else if (a === 'last') { stop(); go(steps.length - 1); }
    else if (a === 'goto') { stop(); go(Number(v)); }
    else if (a === 'speed') { st.speed = Number(v); if (st.playing) { stop(); start(); } render(); }
    else if (a === 'play') { if (st.playing) { stop(); render(); } else { if (st.idx >= steps.length - 1) st.idx = 0; start(); render(); } }
    else if (a === 'width') { stop(); st.N = Number(v); const m = 2 ** st.N - 1; for (const k in st.inp) st.inp[k] = Math.min(st.inp[k], m); st.idx = 0; reload(); }
    else if (a === 'ex') { stop(); const e = cfg.examples[Number(v)]; st.N = e.N || st.N; Object.assign(st.inp, e.v); st.idx = 0; reload(); }
  }
  function start() {
    st.playing = true;
    timer = setInterval(() => { if (st.idx >= steps.length - 1) { stop(); render(); return; } st.idx++; render(); }, st.speed);
  }
  stage.onclick = e => { const el = e.target.closest('[data-act]'); if (el && stage.contains(el)) handle(el); };
  stage.onkeydown = null;
  stage.onchange = e => {
    const el = e.target; if (!el.matches('input.num')) return;
    stop(); const m = 2 ** st.N - 1, inp = cfg.inputs.find(i => i.k === el.dataset.k);
    st.inp[el.dataset.k] = Math.max(inp.min ?? 0, Math.min(m, Math.round(Number(el.value) || 0)));
    st.idx = 0; reload();
  };
  reload();
}

/* ---------- datapath layouts ---------- */
const DP = {
  mul1: N => ({
    w: 820, h: 380, regs: [
      { id: 'mcand', x: 150, y: 36, w: 320, h: 60, title: 'Multiplicand', sub: 'Shift left', arrow: 'left', bits: 2 * N },
      { id: 'prod', x: 130, y: 262, w: 340, h: 60, title: 'Product', sub: 'Write', bits: 2 * N },
      { id: 'mplier', x: 600, y: 140, w: 170, h: 56, title: 'Multiplier', sub: 'Shift right', arrow: 'right', bits: N }],
    alus: [{ id: 'alu', x: 160, y: 150, w: 240, h: 56, label: `${2 * N}-bit ALU` }],
    ctrl: { cx: 640, cy: 300, rx: 76, ry: 30 },
    wires: {
      mc_alu: [[350, 96], [350, 150]], alu_prod: [[280, 206], [280, 262]],
      prod_alu: [[190, 322], [190, 352], [90, 352], [90, 120], [205, 120], [205, 150]],
      ctl_alu: [[591, 277], [591, 180], [376, 180]], ctl_mc: [[567, 292], [530, 292], [530, 66], [470, 66]],
      ctl_write: [[567, 308], [470, 308]], ctl_mp: [[716, 300], [795, 300], [795, 168], [770, 168]], mp0: [[700, 196], [700, 281]],
    },
    labels: [[372, 120, `${2 * N} bits`], [196, 344, `${2 * N} bits`], [706, 240, 'Multiplier0'], [612, 216, `${N} bits`]],
  }),
  mul2: N => ({
    w: 820, h: 370, carryReg: 'prod', regs: [
      { id: 'mcand', x: 170, y: 30, w: 200, h: 56, title: 'Multiplicand', bits: N },
      { id: 'prod', x: 110, y: 250, w: 380, h: 60, title: 'Product', sub: 'Shift right · Write', arrow: 'right', bits: 2 * N, half: true },
      { id: 'mplier', x: 600, y: 130, w: 170, h: 56, title: 'Multiplier', sub: 'Shift right', arrow: 'right', bits: N }],
    alus: [{ id: 'alu', x: 150, y: 130, w: 240, h: 56, label: `${N}-bit ALU` }],
    ctrl: { cx: 640, cy: 290, rx: 76, ry: 30 },
    wires: {
      mc_alu: [[330, 86], [330, 130]], alu_prod: [[270, 186], [270, 218], [205, 218], [205, 250]],
      prod_alu: [[150, 310], [150, 345], [70, 345], [70, 108], [195, 108], [195, 130]],
      ctl_alu: [[591, 267], [591, 160], [366, 160]], ctl_shift: [[567, 282], [490, 282]], ctl_write: [[567, 298], [490, 298]],
      ctl_mp: [[716, 290], [795, 290], [795, 158], [770, 158]], mp0: [[700, 186], [700, 272]],
    },
    labels: [[338, 108, `${N} bits`], [158, 338, `${2 * N} bits`], [706, 222, 'Multiplier0']],
  }),
  mul3: N => ({
    w: 820, h: 370, carryReg: 'prod', regs: [
      { id: 'mcand', x: 170, y: 30, w: 200, h: 56, title: 'Multiplicand', bits: N },
      { id: 'prod', x: 110, y: 250, w: 380, h: 60, title: 'Product', sub: 'Shift right · Write', arrow: 'right', bits: 2 * N, half: true }],
    alus: [{ id: 'alu', x: 150, y: 130, w: 240, h: 56, label: `${N}-bit ALU` }],
    ctrl: { cx: 640, cy: 290, rx: 76, ry: 30 },
    wires: {
      mc_alu: [[330, 86], [330, 130]], alu_prod: [[270, 186], [270, 218], [205, 218], [205, 250]],
      prod_alu: [[150, 310], [150, 345], [70, 345], [70, 108], [195, 108], [195, 130]],
      ctl_alu: [[591, 267], [591, 160], [366, 160]], ctl_shift: [[567, 282], [490, 282]], ctl_write: [[567, 298], [490, 298]],
      p0: [[470, 310], [470, 345], [640, 345], [640, 320]],
    },
    labels: [[338, 108, `${N} bits`], [158, 338, `${2 * N} bits`], [500, 340, 'Product0']],
  }),
  div1: N => ({
    w: 820, h: 380, regs: [
      { id: 'div', x: 150, y: 36, w: 320, h: 60, title: 'Divisor', sub: 'Shift right', arrow: 'right', bits: 2 * N },
      { id: 'rem', x: 130, y: 262, w: 340, h: 60, title: 'Remainder', sub: 'Write', bits: 2 * N },
      { id: 'quot', x: 600, y: 140, w: 170, h: 56, title: 'Quotient', sub: 'Shift left', arrow: 'left', bits: N }],
    alus: [{ id: 'alu', x: 160, y: 150, w: 240, h: 56, label: `${2 * N}-bit ALU` }],
    ctrl: { cx: 640, cy: 300, rx: 76, ry: 30 },
    wires: {
      div_alu: [[350, 96], [350, 150]], alu_rem: [[280, 206], [280, 262]],
      rem_alu: [[190, 322], [190, 352], [90, 352], [90, 120], [205, 120], [205, 150]],
      ctl_alu: [[591, 277], [591, 180], [376, 180]], ctl_div: [[567, 292], [530, 292], [530, 66], [470, 66]],
      ctl_write: [[567, 308], [470, 308]], ctl_q: [[716, 300], [795, 300], [795, 168], [770, 168]],
      rem_sign: [[420, 322], [420, 356], [640, 356], [640, 330]],
    },
    labels: [[372, 120, `${2 * N} bits`], [196, 344, `${2 * N} bits`], [690, 214, `${N} bits`], [440, 350, 'Remainder sign']],
  }),
  div2: N => ({
    w: 820, h: 370, carryReg: 'rem', regs: [
      { id: 'div', x: 170, y: 30, w: 200, h: 56, title: 'Divisor', bits: N },
      { id: 'rem', x: 110, y: 250, w: 380, h: 60, title: 'Remainder', sub: 'Shift right · Shift left · Write', arrow: 'both', bits: 2 * N, half: true }],
    alus: [{ id: 'alu', x: 150, y: 130, w: 240, h: 56, label: `${N}-bit ALU` }],
    ctrl: { cx: 640, cy: 290, rx: 76, ry: 30 },
    wires: {
      div_alu: [[330, 86], [330, 130]], alu_rem: [[270, 186], [270, 218], [205, 218], [205, 250]],
      rem_alu: [[150, 310], [150, 345], [70, 345], [70, 108], [195, 108], [195, 130]],
      ctl_alu: [[591, 267], [591, 160], [366, 160]], ctl_shift: [[567, 282], [490, 282]], ctl_write: [[567, 298], [490, 298]],
      rem_sign: [[470, 310], [470, 345], [640, 345], [640, 320]],
    },
    labels: [[338, 108, `${N} bits`], [158, 338, `${2 * N} bits`], [500, 340, 'Remainder sign']],
  }),
};

/* ---------- flowcharts ---------- */
const FC = {
  mul: (N, v) => {
    const v3 = v === 3;
    const nodes = [
      { id: 'start', type: 'term', x: 210, y: 28, w: 120, h: 34, lines: ['Start'] },
      { id: 'test', type: 'dec', x: 210, y: 110, w: 170, h: 72, lines: ['1. Test', v3 ? 'Product0' : 'Multiplier0'] },
      { id: '1a', type: 'box', x: 112, y: 200, w: 210, h: 62, lines: v === 1 ? ['1a. Add multiplicand to', 'product and place the', 'result in Product register'] : ['1a. Add multiplicand to the', 'left half of the product and', 'place the result in the left half'] },
      { id: 's2', type: 'box', x: 230, y: 290, w: 280, h: 40, lines: [v === 1 ? '2. Shift the Multiplicand register left 1 bit' : '2. Shift the Product register right 1 bit'] },
    ];
    const ry = v3 ? 370 : 430, dy = v3 ? 455 : 520;
    if (!v3) nodes.push({ id: 's3', type: 'box', x: 230, y: 350, w: 280, h: 40, lines: ['3. Shift the Multiplier register right 1 bit'] });
    nodes.push({ id: 'rep', type: 'dec', x: 230, y: ry, w: 190, h: 66, lines: [`${N}th repetition?`] });
    nodes.push({ id: 'done', type: 'term', x: 230, y: dy, w: 120, h: 34, lines: ['Done'] });
    const t = v3 ? 'Product0' : 'Multiplier0';
    const edges = [
      { id: 'e_start', pts: [[210, 45], [210, 74]] },
      { id: 'e_t1', pts: [[125, 110], [112, 110], [112, 169]], label: `${t} = 1`, lx: 120, ly: 100, anchor: 'end' },
      { id: 'e_t0', pts: [[295, 110], [355, 110], [355, 270]], label: `${t} = 0`, lx: 300, ly: 100 },
      { id: 'e_a2', pts: [[112, 231], [112, 270]] },
      v3 ? { id: 'e_2r', pts: [[230, 310], [230, 337]] } : { id: 'e_23', pts: [[230, 310], [230, 330]] },
      { id: 'e_ry', pts: [[230, ry + 33], [230, dy - 17]], label: `Yes: ${N} repetitions`, lx: 238, ly: ry + 52 },
      { id: 'e_rn', pts: [[325, ry], [404, ry], [404, 58], [210, 58]], label: `No: < ${N}`, lx: 330, ly: ry - 8 },
    ];
    if (!v3) edges.push({ id: 'e_3r', pts: [[230, 370], [230, 397]] });
    return { w: 420, h: dy + 24, nodes, edges };
  },
  div1: N => ({
    w: 440, h: 570, nodes: [
      { id: 'start', type: 'term', x: 220, y: 24, w: 120, h: 32, lines: ['Start'] },
      { id: 's1', type: 'box', x: 220, y: 92, w: 300, h: 58, lines: ['1. Subtract the Divisor register from the', 'Remainder register and place the', 'result in the Remainder register'] },
      { id: 'test', type: 'dec', x: 220, y: 180, w: 180, h: 60, lines: ['Test Remainder'] },
      { id: '2a', type: 'box', x: 105, y: 285, w: 200, h: 58, lines: ['2a. Shift the Quotient', 'register to the left, setting', 'the new rightmost bit to 1'] },
      { id: '2b', type: 'box', x: 330, y: 292, w: 210, h: 86, lines: ['2b. Restore the original value', 'by adding the Divisor register', 'to the Remainder register. Also', 'shift the Quotient left, setting', 'the new LSB to 0'] },
      { id: 's3', type: 'box', x: 220, y: 385, w: 280, h: 38, lines: ['3. Shift the Divisor register right 1 bit'] },
      { id: 'rep', type: 'dec', x: 220, y: 460, w: 200, h: 60, lines: [`${N + 1}th repetition?`] },
      { id: 'done', type: 'term', x: 220, y: 542, w: 120, h: 32, lines: ['Done'] }],
    edges: [
      { id: 'e_start', pts: [[220, 40], [220, 63]] }, { id: 'e_1t', pts: [[220, 121], [220, 150]] },
      { id: 'e_ta', pts: [[130, 180], [105, 180], [105, 256]], label: 'Remainder ≥ 0', lx: 125, ly: 170, anchor: 'end' },
      { id: 'e_tb', pts: [[310, 180], [330, 180], [330, 249]], label: 'Remainder < 0', lx: 316, ly: 170 },
      { id: 'e_a3', pts: [[105, 314], [105, 345], [170, 345], [170, 366]] }, { id: 'e_b3', pts: [[330, 335], [330, 352], [270, 352], [270, 366]] },
      { id: 'e_3r', pts: [[220, 404], [220, 430]] },
      { id: 'e_rn', pts: [[320, 460], [428, 460], [428, 50], [220, 50]], label: `No: < ${N + 1}`, lx: 326, ly: 452 },
      { id: 'e_ry', pts: [[220, 490], [220, 526]], label: `Yes: ${N + 1} repetitions`, lx: 228, ly: 512 }],
  }),
  div2: N => ({
    w: 440, h: 600, nodes: [
      { id: 'start', type: 'term', x: 220, y: 22, w: 120, h: 30, lines: ['Start'] },
      { id: 's0', type: 'box', x: 220, y: 76, w: 300, h: 34, lines: ['0. Shift the Remainder register left 1 bit'] },
      { id: 's1', type: 'box', x: 220, y: 136, w: 300, h: 46, lines: ['1. Subtract the Divisor register from the', 'left half of the Remainder register'] },
      { id: 'test', type: 'dec', x: 220, y: 214, w: 180, h: 58, lines: ['Test Remainder'] },
      { id: '2a', type: 'box', x: 105, y: 310, w: 200, h: 58, lines: ['2a. Shift the Remainder', 'register left, setting the', 'new rightmost bit to 1'] },
      { id: '2b', type: 'box', x: 330, y: 318, w: 210, h: 86, lines: ['2b. Restore: add the Divisor', 'back to the left half, then', 'shift the Remainder left,', 'setting the new rightmost', 'bit to 0'] },
      { id: 'rep', type: 'dec', x: 220, y: 430, w: 200, h: 58, lines: [`${N}th repetition?`] },
      { id: 's3', type: 'box', x: 220, y: 505, w: 300, h: 34, lines: ['Shift the left half of Remainder right 1 bit'] },
      { id: 'done', type: 'term', x: 220, y: 570, w: 120, h: 30, lines: ['Done'] }],
    edges: [
      { id: 'e_start', pts: [[220, 37], [220, 59]] }, { id: 'e_01', pts: [[220, 93], [220, 113]] }, { id: 'e_1t', pts: [[220, 159], [220, 185]] },
      { id: 'e_ta', pts: [[130, 214], [105, 214], [105, 281]], label: 'Remainder ≥ 0', lx: 125, ly: 204, anchor: 'end' },
      { id: 'e_tb', pts: [[310, 214], [330, 214], [330, 275]], label: 'Remainder < 0', lx: 316, ly: 204 },
      { id: 'e_ar', pts: [[105, 339], [105, 378], [190, 378], [190, 402]] }, { id: 'e_br', pts: [[330, 361], [330, 378], [250, 378], [250, 402]] },
      { id: 'e_rn', pts: [[320, 430], [428, 430], [428, 106], [220, 106]], label: `No: < ${N}`, lx: 326, ly: 422 },
      { id: 'e_ry', pts: [[220, 459], [220, 488]], label: 'Yes', lx: 228, ly: 478 }, { id: 'e_3d', pts: [[220, 522], [220, 555]] }],
  }),
};

/* bit cells with change highlight for tables */
function bitCell(val, prevVal, n, opts = {}) {
  const b = bin(val, n), p = prevVal == null ? null : bin(prevVal, n);
  let s = '';
  for (let i = 0; i < n; i++) {
    if (opts.split && i === n / 2) s += ' ';
    const ch = p != null && p[i] !== b[i];
    s += ch ? `<span class="ch">${b[i]}</span>` : b[i];
  }
  return s;
}

const MUL_EX = [{ label: '2 × 3 (ตัวอย่างหนังสือ)', v: { mc: 2, mp: 3 }, N: 4 }, { label: '8 × 9', v: { mc: 8, mp: 9 }, N: 4 }, { label: '15 × 15', v: { mc: 15, mp: 15 }, N: 4 }];
const mulInfo = (title, notes) => (N, S) => `<div class="card"><h3>${title}</h3>${notes}</div>`;

register({
  id: 'mul1', sec: '3.6', fig: '3.10–3.11', name: 'Multiplication hardware (แบบที่ 1)',
  title: 'ฮาร์ดแวร์สำหรับการคูณเลขฐานสอง (แบบที่ 1)',
  desc: 'เลียนแบบการคูณด้วยมือ: ถ้าบิตของตัวคูณเป็น 1 ให้บวก multiplicand เข้า product แล้วเลื่อน multiplicand ซ้าย และเลื่อน multiplier ขวา ทำ n รอบ รอบละ 3 ขั้นตอนย่อย (หนังสือใช้ 32 บิต ตัวอย่างในตาราง 3.6 ใช้ 4 บิต)',
  mount(stage) {
    mountSeq(stage, {
      defaults: { mc: 2, mp: 3 }, widths: [4, 8], examples: MUL_EX,
      inputs: [{ k: 'mc', label: 'Multiplicand (ตัวตั้ง)' }, { k: 'mp', label: 'Multiplier (ตัวคูณ)' }],
      circuit: 'mul1', dp: DP.mul1, fc: N => FC.mul(N, 1), tableTitle: 'Table 3.6 ตัวอย่างการคูณ',
      cols: () => ['Iter', 'Step', 'Multiplier', 'Multiplicand', 'Product'],
      row: (s, p, N) => [s.iter ?? '', s.label, bitCell(s.regs.mplier, p?.regs.mplier, N), bitCell(s.regs.mcand, p?.regs.mcand, 2 * N), bitCell(s.regs.prod, p?.regs.prod, 2 * N)],
      readout: (S, st) => { const s = S[st.idx]; return `<dl class="readout"><dt>Product ตอนนี้</dt><dd>${bin(s.regs.prod, 2 * st.N)} = ${s.regs.prod}</dd><dt>คำตอบที่ถูก</dt><dd>${st.inp.mc} × ${st.inp.mp} = ${st.inp.mc * st.inp.mp}</dd></dl>`; },
      info: mulInfo('ข้อสังเกตจากหนังสือ', `<p>(1) ต้องใช้ 3 ขั้นตอนย่อยต่อบิต ถ้าคูณ 32 บิตจะใช้ 32 × 3 = 96 ขั้น (96 clock cycles ถ้าขั้นละ 1 cycle)</p><p>(2) ครึ่งหนึ่งของ Multiplicand จะเป็น 0 เสมอ</p><p>(3) 0 ที่เติมทางขวาตอน shift left ทำให้บิตล่างของ Product ไม่เปลี่ยนหลังคำนวณเสร็จ จึงเกิดแนวคิดเลื่อน Product ไปทางขวาแทน (แบบที่ 2)</p>`),
    });
  }
});
register({
  id: 'mul2', sec: '3.6', fig: '3.12–3.13', name: 'Multiplication hardware (แบบที่ 2)',
  title: 'Multiplication Hardware Version 2',
  desc: 'Multiplicand และ ALU เหลือแค่ n บิต บวกเข้าครึ่งซ้ายของ Product แล้วเลื่อน Product ไปทางขวาแทนการเลื่อน Multiplicand ไปทางซ้าย',
  mount(stage) {
    mountSeq(stage, {
      defaults: { mc: 2, mp: 3 }, widths: [4, 8], examples: MUL_EX,
      inputs: [{ k: 'mc', label: 'Multiplicand (ตัวตั้ง)' }, { k: 'mp', label: 'Multiplier (ตัวคูณ)' }],
      circuit: 'mul2', dp: DP.mul2, fc: N => FC.mul(N, 2), tableTitle: 'ตัวอย่างการคูณด้วยอัลกอริทึมแบบที่ 2 (Fig 3.14)',
      cols: () => ['Iter', 'Step', 'Multiplier', 'Multiplicand', 'Product'],
      row: (s, p, N) => [s.iter ?? '', s.label, bitCell(s.regs.mplier, p?.regs.mplier, N), bitCell(s.regs.mcand, null, N), bitCell(s.regs.prod, p?.regs.prod, 2 * N, { split: true }) + (s.carry ? ' <span class="dim">c=1</span>' : '')],
      readout: (S, st) => { const s = S[st.idx]; return `<dl class="readout"><dt>Product ตอนนี้</dt><dd>${bin(s.regs.prod, 2 * st.N)} = ${s.regs.prod}</dd><dt>คำตอบที่ถูก</dt><dd>${st.inp.mc} × ${st.inp.mp} = ${st.inp.mc * st.inp.mp}</dd></dl>`; },
      info: mulInfo('ข้อสังเกต (Fig 3.15)', `<p>ครึ่งขวาของ Product ช่วงแรกยังไม่ได้ใช้ และบิตขวาของ Multiplier ที่ถูกเลื่อนออกไปแล้วก็ไม่ได้ใช้อีก เมื่อ Product เลื่อนเข้ามาเท่าไร Multiplier ก็ว่างลงเท่านั้น จึงรวมสองรีจิสเตอร์เป็นตัวเดียวได้ในแบบที่ 3</p><p class="note">ถ้าผลบวกครึ่งซ้ายมีตัวทด (c=1) ตัวทดนั้นจะถูกเลื่อนเข้าบิตบนสุดของ Product ตอน shift right</p>`),
    });
  }
});
register({
  id: 'mul3', sec: '3.6', fig: '3.16–3.18', name: 'Multiplication hardware (แบบที่ 3)',
  title: 'ฮาร์ดแวร์การคูณแบบที่ 3',
  desc: 'เก็บ Multiplier ไว้ในครึ่งขวาของ Product ตั้งแต่แรก ทดสอบที่ Product0 แทน เหลือแค่ 2 ขั้นตอนย่อยต่อรอบและไม่ต้องมีรีจิสเตอร์ Multiplier แยก',
  mount(stage) {
    mountSeq(stage, {
      defaults: { mc: 2, mp: 3 }, widths: [4, 8], examples: MUL_EX,
      inputs: [{ k: 'mc', label: 'Multiplicand (ตัวตั้ง)' }, { k: 'mp', label: 'Multiplier (ตัวคูณ)' }],
      circuit: 'mul3', dp: DP.mul3, fc: N => FC.mul(N, 3), tableTitle: 'Fig 3.18 ตัวอย่างการคูณแบบที่ 3',
      cols: () => ['Iter', 'Step', 'Multiplicand', 'Product'],
      row: (s, p, N) => [s.iter ?? '', s.label, bitCell(s.regs.mcand, null, N), bitCell(s.regs.prod, p?.regs.prod, 2 * N, { split: true }) + (s.carry ? ' <span class="dim">c=1</span>' : '')],
      readout: (S, st) => { const s = S[st.idx]; return `<dl class="readout"><dt>Product ตอนนี้</dt><dd>${bin(s.regs.prod, 2 * st.N)} = ${s.regs.prod}</dd><dt>คำตอบที่ถูก</dt><dd>${st.inp.mc} × ${st.inp.mp} = ${st.inp.mc * st.inp.mp}</dd></dl>`; },
      info: mulInfo('Signed multiplication', `<p>วิธีง่ายที่สุดในการคูณแบบมีเครื่องหมายคือ แปลงทั้ง multiplier และ multiplicand ให้เป็นบวก คูณกันตามปกติ แล้วค่อยปรับเครื่องหมายของคำตอบ (ถ้าเครื่องหมายต่างกัน คำตอบติดลบ)</p>`),
    });
  }
});
const DIV_EX = [{ label: '7 ÷ 2 (ตัวอย่างหนังสือ)', v: { dvd: 7, dvs: 2 }, N: 4 }, { label: '13 ÷ 3', v: { dvd: 13, dvs: 3 }, N: 4 }, { label: '74 ÷ 8', v: { dvd: 74, dvs: 8 }, N: 8 }];
register({
  id: 'div1', sec: '3.7', fig: '3.20–3.22', name: 'Division hardware',
  title: 'ฮาร์ดแวร์ที่ใช้ทำการหาร',
  desc: 'Dividend = Quotient × Divisor + Remainder (สมการ 3.17) ลบ Divisor จาก Remainder แล้วดูเครื่องหมาย ถ้าติดลบให้บวกคืน (restoring division) จากนั้นเลื่อน Divisor ไปทางขวา ทำ n + 1 รอบ',
  mount(stage) {
    mountSeq(stage, {
      defaults: { dvd: 7, dvs: 2 }, widths: [4, 8], examples: DIV_EX,
      inputs: [{ k: 'dvd', label: 'Dividend (ตัวตั้ง)' }, { k: 'dvs', label: 'Divisor (ตัวหาร)', min: 0 }],
      circuit: 'div1', dp: DP.div1, fc: FC.div1, tableTitle: 'Fig 3.22 ตัวอย่างการหาร',
      cols: () => ['Iter', 'Step', 'Quotient', 'Divisor', 'Remainder'],
      row: (s, p, N) => [s.iter ?? '', s.label, bitCell(s.regs.quot, p?.regs.quot, N), bitCell(s.regs.div, p?.regs.div, 2 * N, { split: true }), bitCell(s.regs.rem, p?.regs.rem, 2 * N, { split: true })],
      readout: (S, st) => { const d = st.inp.dvs; return `<dl class="readout"><dt>คำตอบที่ถูก</dt><dd>${d ? `${st.inp.dvd} ÷ ${d} = ${Math.floor(st.inp.dvd / d)} เศษ ${st.inp.dvd % d}` : 'หารด้วย 0 ไม่ได้'}</dd></dl>`; },
      info: () => `<div class="card"><h3>ตัวอย่างการหารด้วยมือ (Fig 3.19)</h3><div class="eq">1,001,010 ÷ 1,000 = 1,001 เศษ 10</div><p class="note">ฮาร์ดแวร์ทำแบบเดียวกัน แต่เนื่องจากไม่รู้ล่วงหน้าว่าตัวหารจะ "ลงได้" หรือไม่ จึงลบไปก่อน แล้วค่อยบวกคืนเมื่อผลติดลบ บิตบนสุดของ Remainder คือบิตเครื่องหมายที่ส่งไปให้ Control test</p></div>`,
    });
  }
});
register({
  id: 'div2', sec: '3.7', fig: '3.23', name: 'วงจรหารปรับปรุง',
  title: 'วงจรหารปรับปรุงจากรูป 3.20',
  desc: 'Divisor, ALU และ Quotient เหลือ n บิต มีแค่ Remainder ที่กว้าง 2n บิต และเลื่อนซ้าย Remainder แทนการเลื่อน Divisor ขวา Quotient ถูกเก็บรวมในครึ่งขวาของ Remainder',
  mount(stage) {
    mountSeq(stage, {
      defaults: { dvd: 7, dvs: 2 }, widths: [4, 8], examples: DIV_EX,
      inputs: [{ k: 'dvd', label: 'Dividend (ตัวตั้ง)' }, { k: 'dvs', label: 'Divisor (ตัวหาร)', min: 0 }],
      circuit: 'div2', dp: DP.div2, fc: FC.div2, tableTitle: 'ลำดับการทำงาน',
      cols: () => ['Iter', 'Step', 'Divisor', 'Remainder (ซ้าย | ขวา)'],
      row: (s, p, N) => [s.iter ?? '', s.label, bitCell(s.regs.div, null, N), bitCell(s.regs.rem, p?.regs.rem, 2 * N, { split: true }) + (s.carry ? ' <span class="dim">+1 บิตบน</span>' : '')],
      readout: (S, st) => { const d = st.inp.dvs; return `<dl class="readout"><dt>คำตอบที่ถูก</dt><dd>${d ? `${st.inp.dvd} ÷ ${d} = ${Math.floor(st.inp.dvd / d)} เศษ ${st.inp.dvd % d}` : 'หารด้วย 0 ไม่ได้'}</dd></dl>`; },
      info: () => `<div class="card"><h3>หมายเหตุ</h3><p>หนังสือแสดงเฉพาะฮาร์ดแวร์ของรูป 3.23 ลำดับขั้นตอนตรงนี้ใช้อัลกอริทึมมาตรฐานของวงจรนี้: เลื่อน Remainder ซ้ายก่อนหนึ่งครั้ง ทำ n รอบ แล้วจบด้วยการเลื่อนครึ่งซ้ายกลับไปทางขวา 1 บิต</p><p class="note">ครึ่งซ้ายระหว่างทางอาจกว้างเกิน n บิตได้ 1 บิต ฮาร์ดแวร์จริงเผื่อบิตนี้ไว้ ตารางจะบอกว่า "+1 บิตบน" เมื่อเกิดกรณีนี้</p></div>`,
    });
  }
});
