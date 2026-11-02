"use strict";
/* ---------- IEEE 754 helpers ---------- */
const _dv = new DataView(new ArrayBuffer(4));
const f32 = u => { _dv.setUint32(0, u >>> 0); return _dv.getFloat32(0); };
const u32 = x => { _dv.setFloat32(0, x); return _dv.getUint32(0); };
const dec32 = x => { const u = u32(x); return { s: u >>> 31, e: (u >>> 23) & 255, f: u & 0x7FFFFF, u }; };
function fmtNum(x) {
  if (Number.isNaN(x)) return 'NaN';
  if (!Number.isFinite(x)) return x > 0 ? '+∞' : '−∞';
  if (x === 0) return Object.is(x, -0) ? '−0' : '0';
  const a = Math.abs(x);
  if (a < 1e-4 || a >= 1e8) return x.toExponential(8).replace('e', ' × 10^').replace('+', '');
  return String(Number(x.toPrecision(9)));
}
const hex32 = u => '0x' + (u >>> 0).toString(16).toUpperCase().padStart(8, '0');

/* ---------- Fig 3.24 / Table 3.7–3.8 : IEEE 754 explorer ---------- */
const FP_PRESETS = [
  ['−13.75', 0xC15C0000], ['−0', 0x80000000], ['0', 0x00000000], ['2⁻¹⁴⁹', 0x00000001], ['max subnormal', 0x007FFFFF],
  ['min normal', 0x00800000], ['max normal', 0x7F7FFFFF], ['+∞', 0x7F800000], ['−∞', 0xFF800000], ['NaN', 0x7F800001], ['1.0', 0x3F800000], ['0.1', 0x3DCCCCCD],
];
register({
  id: 'ieee', sec: '3.8', fig: '3.24 · T3.7', name: 'IEEE 754 single precision',
  title: 'รูปแบบการจัดแบ่งบิตใน 32-bit word สำหรับ floating point',
  desc: '(−1)ˢ × significand × 2^exponent: บิต 31 คือ sign, บิต 30–23 คือ exponent (8 บิต แบบ bias 127), บิต 22–0 คือ fraction (23 บิต) คลิกที่บิตเพื่อสลับค่า หรือพิมพ์ตัวเลขฐานสิบ',
  mount(stage) {
    const st = { u: 0xC15C0000 };
    mountCombo(stage, {
      wide: true, state: st, hint: 'คลิกที่ช่องบิตเพื่อสลับ 0/1',
      draw(st) {
        const u = st.u >>> 0, s = u >>> 31, e = (u >>> 23) & 255, f = u & 0x7FFFFF, x = f32(u);
        const g = new Sch(), cw = 24, x0 = 30, y0 = 50, ch = 46;
        const xAt = i => x0 + (31 - i) * cw + (i <= 30 ? 8 : 0) + (i <= 22 ? 8 : 0);
        for (let i = 31; i >= 0; i--) {
          const b = (u >>> i) & 1, cx = xAt(i), field = i === 31 ? 's' : i >= 23 ? 'e' : 'f';
          const col = field === 's' ? 'var(--warn)' : field === 'e' ? 'var(--ctrl)' : 'var(--bus)';
          g.add(`<g class="pin" data-act="fpbit" data-k="${i}" tabindex="0" role="button" aria-label="bit ${i} = ${b}"><rect x="${cx}" y="${y0}" width="${cw - 2}" height="${ch}" rx="3" style="fill:${b ? col : 'var(--panel)'};stroke:${col};stroke-width:1.6"/><text x="${cx + (cw - 2) / 2}" y="${y0 + 29}" text-anchor="middle" class="t-val" style="font-size:15px;fill:${b ? '#fff' : 'var(--ink)'}">${b}</text></g>`);
          g.t(cx + (cw - 2) / 2, y0 - 8, i, 't-sm', 'middle', 'style="font-size:10px"');
        }
        const brace = (i1, i2, label, sub, col) => {
          const a = xAt(i1), b = xAt(i2) + cw - 2, y = y0 + ch + 10;
          g.add(`<path d="M${a},${y} v6 H${b} v-6" style="fill:none;stroke:${col};stroke-width:1.8"/>`);
          g.t((a + b) / 2, y + 24, label, 't-disp', 'middle', `style="font-size:14px;fill:${col}"`);
          g.t((a + b) / 2, y + 40, sub, 't-sm', 'middle');
        };
        brace(31, 31, 's', '1 bit', 'var(--warn)'); brace(30, 23, 'exponent', '8 bits', 'var(--ctrl)'); brace(22, 0, 'fraction', '23 bits', 'var(--bus)');
        // decoded line
        let mode, eq;
        const fb = bin(f, 23).replace(/0+$/, '') || '0';
        if (e === 0 && f === 0) { mode = 0; eq = `${s ? '−' : '+'}0`; }
        else if (e === 0) { mode = 1; eq = `(−1)^${s} × 0.${fb}₂ × 2^−126`; }
        else if (e === 255) { mode = f ? 4 : 3; eq = f ? 'NaN (Not a Number)' : `${s ? '−' : '+'}∞`; }
        else { mode = 2; eq = `(−1)^${s} × 1.${fb}₂ × 2^(${e} − 127) = (−1)^${s} × 1.${fb}₂ × 2^${e - 127}`; }
        g.t(30, 190, 'ค่าที่แทน', 't-sm');
        g.t(30, 216, esc(eq), 't-val', 'start', 'style="font-size:14px"');
        g.t(30, 248, '= ' + fmtNum(x), 't-disp', 'start', 'style="font-size:24px"');
        g.t(30, 278, `${hex32(u)}   ·   exponent field = ${bin(e, 8)}₂ = ${e}   ·   ${['zero', 'subnormal', 'normalized', 'infinity', 'NaN'][mode]}`, 't-sm');
        return g.svg(850, 300);
      },
      panel(st) {
        const x = f32(st.u);
        return `<div class="ctl-group"><h3>พิมพ์ค่า</h3>
          <div class="field"><span>ฐานสิบ (ปัดเป็น float32)</span><input class="num" id="fp-dec" data-k="dec" type="text" inputmode="decimal" value="${Number.isFinite(x) ? x : (Number.isNaN(x) ? 'NaN' : (x > 0 ? 'Infinity' : '-Infinity'))}"></div>
          <div class="field"><span>เลขฐานสิบหก</span><input class="num" id="fp-hex" data-k="hex" type="text" value="${hex32(st.u)}"></div></div>
          <div class="ctl-group"><h3>ตัวอย่างจากตาราง 3.8</h3><div class="btns presets">${FP_PRESETS.map(([n, u], i) => `<button class="btn ${(st.u >>> 0) === u ? 'on' : ''}" data-act="fpp" data-v="${i}">${n}</button>`).join('')}</div></div>`;
      },
      readout(st) {
        const u = st.u >>> 0, s = u >>> 31, e = (u >>> 23) & 255, f = u & 0x7FFFFF;
        return `<dl class="readout"><dt>sign</dt><dd>${s}</dd><dt>exponent</dt><dd>${bin(e, 8)} = ${e}${e && e < 255 ? ` (−127 → ${e - 127})` : ''}</dd><dt>fraction</dt><dd style="font-size:12px">${bin(f, 23)}</dd><dt>hex</dt><dd>${hex32(u)}</dd></dl>`;
      },
      info(st) {
        const u = st.u >>> 0, e = (u >>> 23) & 255, f = u & 0x7FFFFF;
        const row = e === 0 ? 0 : e === 255 ? 2 : 1;
        return `<div class="card"><h3>Table 3.7 Floating-point representation (single precision)</h3>${ttTable(['Exponent (8 bits)', 'Significand = 0', 'Significand ≠ 0', 'Equation'], [
          ['0x00', '0, −0', 'subnormal numbers', '(−1)ˢ × (0.significand)₂ × 2⁻¹²⁶'], ['0x01 … 0xFE', 'normalized value', 'normalized value', '(−1)ˢ × (1.significand)₂ × 2^(Exponent−127)'], ['0xFF', '∞, −∞', 'NaN', '–']], row)}</div>
        <div class="card"><h3>ตัวอย่าง −13.75 จากหนังสือ</h3><div class="eq">−13.75 = (−1)¹ × 1101.11₂</div><div class="eq">= (−1)¹ × 1.10111₂ × 2³   (normalization)</div><div class="eq">= (−1)¹ × 1.10111₂ × 2^(130 − 127)</div><div class="eq">→ [1 | 1000 0010 | 101 1100 0000 0000 0000 0000] = 0xC15C0000</div>
        <p class="note">Double precision ใช้ 2 words: sign 1 บิต, exponent 11 บิต, fraction 52 บิต (Fig 3.25)</p></div>`;
      },
      act(a, k, v) {
        if (a === 'fpbit') { st.u = (st.u ^ (1 << Number(k))) >>> 0; return true; }
        if (a === 'fpp') { st.u = FP_PRESETS[Number(v)][1]; return true; }
      },
      change(el) {
        if (el.dataset.k === 'dec') { const t = el.value.trim(); const x = /^nan$/i.test(t) ? NaN : Number(t.replace(/,/g, '')); if (!Number.isNaN(x) || /^nan$/i.test(t)) st.u = u32(x); }
        if (el.dataset.k === 'hex') { const h = el.value.trim().replace(/^0x/i, ''); if (/^[0-9a-f]{1,8}$/i.test(h)) st.u = parseInt(h, 16) >>> 0; }
      },
    });
  }
});

/* ---------- Fig 3.26 / 3.27 : floating-point addition ---------- */
const sig28 = v => { const b = bin(v, 28); return `${b.slice(0, 2)}.${b.slice(2, 25)} ${b.slice(25)}`; };
function genFPAdd(inp) {
  const a = Math.fround(inp.a), b = Math.fround(inp.b), A = dec32(a), B = dec32(b), S = [];
  const truth = Math.fround(a + b);
  const base = { a, b, truth };
  if ([A.e, B.e].some(e => e === 0 || e === 255)) {
    S.push({ ...base, label: 'กรณีพิเศษ', explain: `มีอินพุตเป็นศูนย์, subnormal, ∞ หรือ NaN ซึ่งไม่ได้ผ่านขั้นตอนปกติในรูป 3.26 ผลลัพธ์ = ${fmtNum(truth)}`, node: 'start', edges: [], blocks: ['inA', 'inB'], special: true, res: truth });
    return S;
  }
  const sigA = 2 ** 23 + A.f, sigB = 2 ** 23 + B.f;
  S.push({ ...base, label: 'Start: แยก sign / exponent / significand', explain: `A = ${fmtNum(a)} → e = ${A.e} (${A.e - 127}), B = ${fmtNum(b)} → e = ${B.e} (${B.e - 127}) เติม 1 ที่ซ่อนอยู่หน้า significand และเผื่อ 3 บิต guard/round/sticky`, node: 'start', edges: [], blocks: ['inA', 'inB'], row: ['–', '–', '–'] });
  let big = A, small = B, X = sigA * 8, Y = sigB * 8, bigIsA = true;
  if (B.e > A.e || (B.e === A.e && sigB > sigA)) { big = B; small = A; X = sigB * 8; Y = sigA * 8; bigIsA = false; }
  const d = big.e - small.e;
  let sh, sticky;
  if (d >= 27) { sh = 0; sticky = 1; } else { sh = Math.floor(Y / 2 ** d); sticky = Y % 2 ** d ? 1 : 0; }
  sh = sh + (sticky && sh % 2 === 0 ? 1 : 0);
  const selW = bigIsA ? ['w_sigB', 'w_sigB1'] : ['w_sigA', 'w_sigA1'];
  S.push({ ...base, label: '1. Compare exponents, shift smaller right', explain: `Small ALU: ${big.e} − ${small.e} = ${d} จึงเลื่อน significand ของ ${bigIsA ? 'B' : 'A'} (ตัวที่ exponent เล็กกว่า) ไปทางขวา ${d} บิต${sticky ? ' (บิตที่หลุดออกไปรวมไว้ใน sticky bit)' : ''}`,
    node: 's1', edges: ['e_start'], blocks: ['smallALU', 'expDiff', 'ctrl', 'muxE', 'muxS1', 'shiftR'],
    wires: ['w_eA', 'w_eB', 'w_alu_diff', 'w_diff_ctl', bigIsA ? 'w_eA_mux' : 'w_eB_mux', ...selW, 'w_m1_sh', 'c_m1', 'c_sh'],
    notes: [[292, 196, `d = ${d}`], [476, 320, sig28(sh)]], row: [big.s, `${big.e}`, `${sig28(sh)} (shifted)`] });
  const same = A.s === B.s; let sum = same ? X + sh : X - sh; const sign = big.s;
  S.push({ ...base, label: `2. ${same ? 'Add' : 'Subtract'} the significands`, explain: same ? 'เครื่องหมายเหมือนกันจึงบวก significand' : 'เครื่องหมายต่างกันจึงเอาค่าที่ใหญ่กว่าลบด้วยค่าที่เล็กกว่า แล้วใช้เครื่องหมายของตัวใหญ่',
    node: 's2', edges: ['e_12'], blocks: ['muxS2', 'bigALU'], wires: [bigIsA ? 'w_sigA' : 'w_sigB', 'w_m2_alu', 'w_sh_alu', 'c_alu', 'c_m1'], notes: [[606, 432, `${same ? '+' : '−'}  ${sig28(sum)}`]], row: [sign, `${big.e}`, sig28(sum)] });
  if (sum === 0) {
    S.push({ ...base, label: 'Done: ผลรวม = 0', explain: 'ค่าหักล้างกันพอดี ผลลัพธ์คือ +0', node: 'done', edges: ['e_23'], blocks: ['out'], wires: ['w_rnd_out_e', 'w_rnd_out_s', 'w_sign'], res: 0, resU: 0, row: [0, '0', '0'] });
    return S;
  }
  let E = big.e, pass = 0, edge3 = 'e_23';
  for (;;) {
    let how;
    if (sum >= 2 ** 27) { const l = sum % 2; sum = Math.floor(sum / 2); if (l && sum % 2 === 0) sum += 1; E++; how = 'เลื่อนขวา 1 บิตและเพิ่ม exponent'; }
    else { let k = 0; while (sum < 2 ** 26) { sum *= 2; E--; k++; } how = k ? `เลื่อนซ้าย ${k} บิตและลด exponent ${k}` : 'อยู่ในรูป 1.xxx แล้ว ไม่ต้องเลื่อน'; }
    S.push({ ...base, label: '3. Normalize the sum', explain: how, node: 's3', edges: [edge3], blocks: ['muxN1', 'muxN2', 'incdec', 'shiftLR'], wires: pass ? ['w_inc_fb', 'w_rnd_fb', 'w_n1_inc', 'w_n2_sh', 'c_n', 'c_inc'] : ['w_mE_n1', 'w_alu_n2', 'w_n1_inc', 'w_n2_sh', 'c_n', 'c_inc'], notes: [[186, 556, `E = ${E} (${E - 127})`], [566, 522, sig28(sum)]], row: [sign, `${E}`, sig28(sum)] });
    if (E >= 255 || E <= 0) {
      S.push({ ...base, label: E >= 255 ? 'Overflow → Exception' : 'Underflow → Exception', explain: E >= 255 ? `exponent ต้องเป็น ${E - 127} แต่ exponent field แทนได้สูงสุดแค่ 127 จึงเกิด overflow (IEEE 754 ให้ผลเป็น ∞)` : `exponent ต้องเป็น ${E - 127} ซึ่งต่ำกว่าที่ normalized แทนได้ (underflow)`, node: 'exc', edges: ['e_3o', 'e_oe'], blocks: ['ctrl'], wires: [], res: truth, row: [sign, `${E}`, 'exception'] });
      return S;
    }
    const mant = Math.floor(sum / 8), low = sum % 8, up = low > 4 || (low === 4 && mant % 2 === 1);
    const nm = mant + (up ? 1 : 0);
    S.push({ ...base, label: '4. Round the significand', explain: `guard/round/sticky = ${bin(low, 3)} → ${up ? 'ปัดขึ้น' : 'ตัดทิ้ง'} (round to nearest even) เหลือ 24 บิต`, node: 's4', edges: ['e_3o', 'e_o4'], blocks: ['round', 'ctrl'], wires: ['w_inc_rnd', 'w_sh_rnd', 'c_rnd'], notes: [[466, 590, up ? 'round up' : 'truncate']], row: [sign, `${E}`, sig28(nm * 8)] });
    sum = nm * 8;
    if (nm >= 2 ** 24) { pass++; edge3 = 'e_nn'; S.push({ ...base, label: 'Still normalized? → No', explain: 'การปัดขึ้นทำให้ significand กลายเป็น 10.000… ต้องกลับไป normalize ใหม่', node: 'nn', edges: ['e_4n'], blocks: ['ctrl'], wires: [], row: [sign, `${E}`, sig28(sum)] }); continue; }
    const resU = sign * 2 ** 31 + E * 2 ** 23 + (nm - 2 ** 23);
    S.push({ ...base, label: 'Done', explain: `ผลลัพธ์ = ${fmtNum(f32(resU))}  (${hex32(resU)})`, node: 'done', edges: ['e_4n', 'e_nd'], blocks: ['out'], wires: ['w_rnd_out_e', 'w_rnd_out_s', 'w_sign'], res: f32(resU), resU, row: [sign, `${E}`, sig28(sum)] });
    return S;
  }
}

const FP_DP = {
  wires: {
    w_eA: [[150, 60], [150, 82], [178, 82], [178, 100]], w_eB: [[545, 60], [545, 88], [252, 88], [252, 100]],
    w_eA_mux: [[95, 60], [95, 232]], w_eB_mux: [[530, 60], [530, 74], [130, 74], [130, 232]],
    w_alu_diff: [[215, 146], [215, 170]], w_diff_ctl: [[215, 210], [215, 238]],
    w_sigA: [[300, 60], [300, 218], [490, 218], [490, 232]], w_sigA1: [[350, 218], [350, 232]],
    w_sigB: [[690, 60], [690, 224], [530, 224], [530, 232]], w_sigB1: [[530, 224], [390, 224], [390, 232]],
    w_m1_sh: [[370, 258], [370, 296]], w_sh_alu: [[420, 334], [420, 366]], w_m2_alu: [[510, 258], [510, 346], [560, 346], [560, 366]],
    w_alu_n2: [[450, 416], [450, 446]], w_mE_n1: [[110, 258], [110, 430], [220, 430], [220, 446]],
    w_n1_inc: [[240, 472], [240, 496]], w_n2_sh: [[470, 472], [470, 496]],
    w_inc_rnd: [[240, 538], [240, 586], [290, 586]], w_sh_rnd: [[480, 538], [480, 586], [460, 586]],
    w_inc_fb: [[300, 517], [318, 517], [318, 438], [260, 438], [260, 446]], w_rnd_fb: [[460, 574], [610, 574], [610, 438], [490, 438], [490, 446]],
    w_rnd_out_e: [[330, 606], [330, 616], [295, 616], [295, 630]], w_rnd_out_s: [[420, 606], [420, 630]], w_sign: [[62, 60], [62, 618], [225, 618], [225, 630]],
    c_m1: [[279, 256], [306, 256], [306, 245], [330, 245]], c_sh: [[275, 272], [296, 272], [296, 315], [320, 315]],
    c_alu: [[262, 285], [262, 391], [400, 391]], c_n: [[192, 283], [192, 459], [200, 459]], c_inc: [[172, 276], [172, 517], [180, 517]],
    c_rnd: [[156, 268], [156, 596], [290, 596]],
  },
  marks: [[350, 218], [530, 224]],
};
function fpDraw(step) {
  const g = new Sch(), aw = new Set(step.wires || []), ab = new Set(step.blocks || []);
  for (const [n, pts] of Object.entries(FP_DP.wires)) g.w(pts, aw.has(n) ? 1 : (n.startsWith('c_') ? 'ctl' : 0), { path: aw.has(n), arrow: true });
  FP_DP.marks.forEach(([x, y]) => g.d(x, y, 0));
  const A = dec32(step.a), B = dec32(step.b);
  const reg = (id, x, y, D, label) => {
    const act = ab.has(id) ? 'act' : '';
    g.add(`<rect class="blk ${act}" x="${x}" y="${y}" width="330" height="44" rx="3"/><line x1="${x + 50}" y1="${y}" x2="${x + 50}" y2="${y + 44}" style="stroke:var(--ink);stroke-width:1.4"/><line x1="${x + 140}" y1="${y}" x2="${x + 140}" y2="${y + 44}" style="stroke:var(--ink);stroke-width:1.4"/>`);
    g.t(x + 25, y + 14, 'Sign', 't-sm', 'middle', 'style="font-size:10px"'); g.t(x + 95, y + 14, 'Exponent', 't-sm', 'middle', 'style="font-size:10px"'); g.t(x + 235, y + 14, 'Significand', 't-sm', 'middle', 'style="font-size:10px"');
    if (D) { g.t(x + 25, y + 34, D.s, 't-val', 'middle'); g.t(x + 95, y + 34, bin(D.e, 8), 't-val', 'middle', 'style="font-size:11px"'); g.t(x + 235, y + 34, bin(D.f, 23), 't-val', 'middle', 'style="font-size:9.5px"'); }
    g.t(x - 8, y + 28, label, 't-disp', 'end', 'style="font-size:13px"');
  };
  reg('inA', 40, 16, A, 'A'); reg('inB', 450, 16, B, 'B');
  g.add(trapezoid(140, 100, 150, 46, ab.has('smallALU') ? 'act' : '', 'Small ALU'));
  g.add(gBOX(145, 170, 140, 40, '', ab.has('expDiff') ? 'act' : '')); g.t(215, 187, 'Exponent', 't-disp', 'middle', 'style="font-size:12px"'); g.t(215, 202, 'difference', 't-disp', 'middle', 'style="font-size:12px"');
  g.add(`<ellipse class="blk ${ab.has('ctrl') ? 'act' : ''}" cx="215" cy="262" rx="64" ry="24"/>`); g.t(215, 267, 'Control', 't-disp', 'middle', 'style="font-size:14px;fill:var(--ctrl)"');
  const hm = (id, x, y) => { g.add(`<rect class="g ${ab.has(id) ? 'act' : ''}" x="${x}" y="${y}" width="80" height="26" rx="13"/>`); g.t(x + 22, y + 18, '0', 't-sm', 'middle', 'style="fill:var(--ink)"'); g.t(x + 58, y + 18, '1', 't-sm', 'middle', 'style="fill:var(--ink)"'); };
  hm('muxE', 70, 232); hm('muxS1', 330, 232); hm('muxS2', 470, 232); hm('muxN1', 200, 446); hm('muxN2', 430, 446);
  g.add(gBOX(320, 296, 150, 38, 'Shift right', ab.has('shiftR') ? 'act' : '', 't-disp" style="font-size:13px'));
  g.add(trapezoid(380, 366, 220, 50, ab.has('bigALU') ? 'act' : '', 'Big ALU'));
  g.add(gBOX(180, 496, 120, 42, '', ab.has('incdec') ? 'act' : '')); g.t(240, 513, 'Increment or', 't-disp', 'middle', 'style="font-size:12px"'); g.t(240, 528, 'decrement', 't-disp', 'middle', 'style="font-size:12px"');
  g.add(gBOX(400, 496, 160, 42, 'Shift left or right', ab.has('shiftLR') ? 'act' : '', 't-disp" style="font-size:13px'));
  g.add(gBOX(290, 566, 170, 40, 'Rounding hardware', ab.has('round') ? 'act' : '', 't-disp" style="font-size:13px'));
  const R = step.resU != null ? dec32(f32(step.resU)) : null;
  reg('out', 200, 630, R, 'Result');
  (step.notes || []).forEach(([x, y, t]) => g.t(x, y, t, 't-val', 'start', 'style="fill:var(--ctrl);font-size:11.5px"'));
  return g.svg(880, 690);
}
const FP_FC = {
  w: 440, h: 590, nodes: [
    { id: 'start', type: 'term', x: 200, y: 22, w: 110, h: 30, lines: ['Start'] },
    { id: 's1', type: 'box', x: 200, y: 82, w: 320, h: 54, lines: ['1. Compare the exponents of the two numbers.', 'Shift the smaller number to the right until', 'its exponent would match the larger exponent'] },
    { id: 's2', type: 'box', x: 200, y: 148, w: 320, h: 30, lines: ['2. Add the significands'] },
    { id: 's3', type: 'box', x: 200, y: 214, w: 320, h: 54, lines: ['3. Normalize the sum, either shifting right and', 'incrementing the exponent or shifting left', 'and decrementing the exponent'] },
    { id: 'ou', type: 'dec', x: 200, y: 300, w: 170, h: 60, lines: ['Overflow or', 'underflow?'] },
    { id: 'exc', type: 'term', x: 375, y: 300, w: 100, h: 30, lines: ['Exception'] },
    { id: 's4', type: 'box', x: 200, y: 382, w: 320, h: 40, lines: ['4. Round the significand to the', 'appropriate number of bits'] },
    { id: 'nn', type: 'dec', x: 200, y: 466, w: 180, h: 60, lines: ['Still normalized?'] },
    { id: 'done', type: 'term', x: 200, y: 556, w: 110, h: 30, lines: ['Done'] }],
  edges: [
    { id: 'e_start', pts: [[200, 37], [200, 55]] }, { id: 'e_12', pts: [[200, 109], [200, 133]] }, { id: 'e_23', pts: [[200, 163], [200, 187]] },
    { id: 'e_3o', pts: [[200, 241], [200, 270]] }, { id: 'e_oe', pts: [[285, 300], [325, 300]], label: 'Yes', lx: 292, ly: 292 },
    { id: 'e_o4', pts: [[200, 330], [200, 362]], label: 'No', lx: 208, ly: 350 }, { id: 'e_4n', pts: [[200, 402], [200, 436]] },
    { id: 'e_nd', pts: [[200, 496], [200, 541]], label: 'Yes', lx: 208, ly: 522 },
    { id: 'e_nn', pts: [[110, 466], [24, 466], [24, 176], [200, 176]], label: 'No', lx: 70, ly: 458 }],
};

register({
  id: 'fpadd', sec: '3.8', fig: '3.26–3.27', name: 'Floating-point addition',
  title: 'การบวกเลข floating point',
  desc: 'บวกเลข single precision 4 ขั้น: (1) เทียบ exponent แล้วเลื่อนตัวเล็กไปทางขวา (2) บวก significand (3) normalize และตรวจ overflow/underflow (4) ปัดเศษ ถ้าปัดแล้วไม่อยู่ในรูป 1.xxx ให้กลับไป normalize ใหม่',
  mount(stage) {
    const st = { a: 0.5, b: -0.4375, idx: 0, playing: false };
    let steps = genFPAdd(st), timer = null;
    stage.innerHTML = `<div class="bench"><div class="canvas wide"><div class="canvas-scroll" data-r="dp"></div><div class="canvas-bar"><span data-r="si" class="stepinfo"></span><span>significand แสดงเป็น ii.ffff…f GRS (GRS = guard, round, sticky)</span></div></div><div class="panel" data-r="pn"></div></div>
      <div class="two"><div class="card" style="min-width:0"><h3>ลำดับการทำงาน</h3><div data-r="tbl"></div></div><div class="card" style="min-width:0"><h3>Fig 3.26 Flow chart</h3><div class="canvas-scroll" data-r="fc"></div></div></div>`;
    const R = k => stage.querySelector(`[data-r="${k}"]`);
    const stop = () => { st.playing = false; clearInterval(timer); timer = null; };
    CLEANUP = stop;
    const EX = [['0.5 + (−0.4375)', 0.5, -0.4375], ['1.5 + 2.25', 1.5, 2.25], ['1 + 2⁻²⁴', 1, 2 ** -24], ['16777215 + 1', 16777215, 1], ['3.4e38 + 3.4e38', 3.4e38, 3.4e38], ['0.1 + 0.2', 0.1, 0.2]];
    function render() {
      const s = steps[st.idx];
      R('dp').innerHTML = fpDraw(s);
      R('fc').innerHTML = fcDraw(FP_FC, s);
      R('si').textContent = `ขั้น ${st.idx} / ${steps.length - 1}`;
      R('tbl').innerHTML = `<div class="tbl-wrap"><table class="tt"><thead><tr><th>Step</th><th>Sign</th><th>Exp</th><th>Significand</th></tr></thead><tbody>${steps.map((x, i) => `<tr class="clickable ${i === st.idx ? 'cur' : ''} ${i > st.idx ? 'future' : ''}" data-act="goto" data-v="${i}"><td style="white-space:normal;min-width:180px">${x.label}</td><td>${x.row ? x.row[0] : ''}</td><td>${x.row ? x.row[1] : ''}</td><td>${x.row ? x.row[2] : ''}</td></tr>`).join('')}</tbody></table></div>`;
      const last = steps[steps.length - 1];
      R('pn').innerHTML = `<div class="ctl-group"><h3>อินพุต (ปัดเป็น float32)</h3>
        <div class="field"><span>A</span><input class="num" id="fa-a" data-k="a" type="text" inputmode="decimal" value="${st.a}"></div>
        <div class="field"><span>B</span><input class="num" id="fa-b" data-k="b" type="text" inputmode="decimal" value="${st.b}"></div>
        <div class="btns presets">${EX.map((e, i) => `<button class="btn" data-act="ex" data-v="${i}">${e[0]}</button>`).join('')}</div></div>
        <div class="ctl-group"><h3>สั่งงาน</h3><div class="seqctl"><button class="btn" data-act="first" aria-label="กลับไปเริ่ม">⏮</button><button class="btn" data-act="prev" aria-label="ย้อนหนึ่งขั้น">◀</button><button class="btn primary" data-act="next">ขั้นถัดไป ▶</button><button class="btn" data-act="play">${st.playing ? '⏸ หยุด' : '⏵ เล่นอัตโนมัติ'}</button></div></div>
        <div class="ctl-group"><h3>ขั้นตอนนี้</h3><p class="steptitle">${s.label}</p><p class="note">${s.explain}</p></div>
        <div class="ctl-group"><h3>ผลลัพธ์</h3><dl class="readout"><dt>A</dt><dd>${fmtNum(s.a)}</dd><dt>B</dt><dd>${fmtNum(s.b)}</dd><dt>จากวงจร</dt><dd>${last.res != null ? fmtNum(last.res) : '–'}</dd><dt>float32(A+B)</dt><dd>${fmtNum(s.truth)}</dd></dl></div>`;
    }
    function regen() { stop(); steps = genFPAdd(st); st.idx = 0; render(); }
    stage.onclick = e => {
      const el = e.target.closest('[data-act]'); if (!el) return;
      const a = el.dataset.act, v = Number(el.dataset.v);
      if (a === 'next') st.idx = Math.min(steps.length - 1, st.idx + 1);
      else if (a === 'prev') { stop(); st.idx = Math.max(0, st.idx - 1); }
      else if (a === 'first') { stop(); st.idx = 0; }
      else if (a === 'goto') { stop(); st.idx = v; }
      else if (a === 'ex') { st.a = EX[v][1]; st.b = EX[v][2]; regen(); return; }
      else if (a === 'play') {
        if (st.playing) stop(); else { if (st.idx >= steps.length - 1) st.idx = 0; st.playing = true; timer = setInterval(() => { if (st.idx >= steps.length - 1) { stop(); render(); return; } st.idx++; render(); }, 1100); }
      } else return;
      render();
    };
    stage.onkeydown = null;
    stage.onchange = e => { const el = e.target; if (!el.dataset.k) return; const x = Number(el.value.trim().replace(/,/g, '')); if (!Number.isNaN(x)) { st[el.dataset.k] = Math.fround(x); regen(); } };
    render();
  }
});
