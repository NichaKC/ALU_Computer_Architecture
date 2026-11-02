"use strict";
/* ---------- schematic engine ---------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const vc = v => v === 1 || v === true ? 'hi' : v === 0 || v === false ? 'lo' : v == null ? 'neutral' : v;
const P = pts => pts.map(p => p[0] + ',' + p[1]).join(' ');
const bin = (n, w) => { n = Number(n); let s = ''; for (let i = w - 1; i >= 0; i--) s += Math.floor(n / 2 ** i) % 2; return s; };
const toSigned = (n, w) => n >= 2 ** (w - 1) ? n - 2 ** w : n;
const fromSigned = (n, w) => ((n % 2 ** w) + 2 ** w) % 2 ** w;

function arrowHead(pts, cls, size = 7) {
  const [x2, y2] = pts[pts.length - 1], [x1, y1] = pts[pts.length - 2];
  const a = Math.atan2(y2 - y1, x2 - x1), s = size;
  const p1 = [x2 - s * Math.cos(a) + s * 0.55 * Math.sin(a), y2 - s * Math.sin(a) - s * 0.55 * Math.cos(a)];
  const p2 = [x2 - s * Math.cos(a) - s * 0.55 * Math.sin(a), y2 - s * Math.sin(a) + s * 0.55 * Math.cos(a)];
  return `<polygon class="${cls}" points="${x2},${y2} ${p1[0].toFixed(1)},${p1[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}"/>`;
}

class Sch {
  constructor() { this.L = { glow: [], wire: [], dot: [], flow: [], part: [], top: [] }; }
  w(pts, v, o = {}) {
    const p = P(pts);
    if (o.path) { this.L.glow.push(`<polyline class="glow" points="${p}"/>`); this.L.flow.push(`<polyline class="flow" points="${p}"/>`); }
    this.L.wire.push(`<polyline class="w ${vc(v)}" points="${p}"/>`);
    if (o.arrow) this.L.part.push(arrowHead(pts, 'ah ' + vc(v)));
    return this;
  }
  d(x, y, v) { this.L.dot.push(`<circle class="dot ${vc(v)}" cx="${x}" cy="${y}" r="4.2"/>`); return this; }
  add(s) { this.L.part.push(s); return this; }
  top(s) { this.L.top.push(s); return this; }
  t(x, y, s, cls = 't-sm', anchor = 'start', extra = '') { this.L.top.push(`<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}" ${extra}>${s}</text>`); return this; }
  svg(w, h) { return `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="circuit diagram">${Object.values(this.L).map(a => a.join('')).join('')}</svg>`; }
}

/* gates — all point right; (x,y) is top-left */
const orInd = (Y, y, h, w) => { const s = Math.min(1, Math.max(0, (Y - y) / h)); return 0.6 * w * s * (1 - s); };
function gAND(x, y, w, h, cls = '') { return `<path class="g ${cls}" d="M${x},${y} H${x + w - h / 2} A${h / 2},${h / 2} 0 0 1 ${x + w - h / 2},${y + h} H${x} Z"/>`; }
function gOR(x, y, w, h, cls = '') { return `<path class="g ${cls}" d="M${x},${y} Q${x + 0.3 * w},${y + h / 2} ${x},${y + h} Q${x + 0.6 * w},${y + h} ${x + w},${y + h / 2} Q${x + 0.6 * w},${y} ${x},${y} Z"/>`; }
function gXOR(x, y, w, h, cls = '') { return gOR(x, y, w, h, cls) + `<path class="g ${cls}" style="fill:none" d="M${x - 9},${y} Q${x - 9 + 0.3 * w},${y + h / 2} ${x - 9},${y + h}"/>`; }
function bubble(x, y, r = 5) { return `<circle class="bubble" cx="${x + r}" cy="${y}" r="${r}"/>`; }
function gNOT(x, yc, w = 42, h = 26, cls = '') { return `<path class="g ${cls}" d="M${x},${yc - h / 2} L${x + w - 10},${yc} L${x},${yc + h / 2} Z"/>` + bubble(x + w - 10, yc, 5); }
function gMUX(x, y, w, h, labels, ys, cls = '') {
  let s = `<rect class="g ${cls}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${w / 2}" ry="${w / 2}"/>`;
  labels.forEach((l, i) => s += `<text x="${x + 8}" y="${ys[i] + 5}" class="t-sm" style="fill:var(--ink)">${l}</text>`);
  return s;
}
function gBOX(x, y, w, h, label, cls = '', lcls = 't-lbl') {
  return `<rect class="blk ${cls}" x="${x}" y="${y}" width="${w}" height="${h}" rx="3"/>` + (label ? `<text x="${x + w / 2}" y="${y + h / 2 + 5}" text-anchor="middle" class="${lcls}">${label}</text>` : '');
}
/* pin: input/output terminal with value; key => clickable */
function pin(x, y, o) {
  const w = o.w || 34, h = o.h || 24, v = o.val, txt = o.text != null ? o.text : String(v);
  const cls = `pin ${o.key ? '' : 'ro'} ${o.ctl ? 'ctl' : ''} ${v === 1 ? 'v1' : ''}`;
  let lab = '';
  if (o.name) {
    const nc = o.ctl ? 't-ctrl' : 't-lbl';
    if (o.side === 'right') lab = `<text x="${x + w / 2 + 7}" y="${y + 5}" class="${nc}">${o.name}</text>`;
    else if (o.side === 'top') lab = `<text x="${x}" y="${y - h / 2 - 7}" text-anchor="middle" class="${nc}">${o.name}</text>`;
    else if (o.side === 'bottom') lab = `<text x="${x}" y="${y + h / 2 + 17}" text-anchor="middle" class="${nc}">${o.name}</text>`;
    else lab = `<text x="${x - w / 2 - 7}" y="${y + 5}" text-anchor="end" class="${nc}">${o.name}</text>`;
  }
  const attrs = o.key ? `data-act="tog" data-k="${o.key}" tabindex="0" role="button" aria-label="${esc(o.aria || o.name || o.key)} = ${esc(txt)}"` : '';
  return `<g class="${cls}" ${attrs}><rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="5"/><text x="${x}" y="${y + 5}" text-anchor="middle" class="t-val pv">${txt}</text>${lab}</g>`;
}

/* ---------- app shell ---------- */
const CIRCUITS = [];
const SECTIONS = {
  '3.4': '3.4 Constructing ALU',
  '3.5': '3.5 Set on less than',
  '3.6': '3.6 Multiplication',
  '3.7': '3.7 Division',
  '3.8': '3.8 Floating Point',
};
function register(c) { CIRCUITS.push(c); }

/* generic combinational bench */
function mountCombo(stage, cfg) {
  const st = cfg.state;
  stage.innerHTML = `
    <div class="bench">
      <div class="canvas ${cfg.wide ? 'wide' : ''}"><div class="canvas-scroll" data-r="cv"></div>
        <div class="canvas-bar"><span>${cfg.hint || 'คลิกกล่องค่าบนวงจรเพื่อสลับ 0/1 ได้เลย'}</span><span data-r="cvnote"></span></div></div>
      <div class="panel" data-r="pn"></div>
    </div>
    <div data-r="extra"></div>
    <div class="info" data-r="inf"></div>`;
  const R = k => stage.querySelector(`[data-r="${k}"]`);
  function controlsHTML() {
    let h = '';
    if (cfg.controls) {
      h += `<div class="ctl-group"><h3>อินพุต</h3>`;
      for (const c of cfg.controls) {
        if (c.hidden && c.hidden(st)) continue;
        h += `<div class="ctl-row"><span class="lbl ${c.ctl ? 'ctrl' : ''}">${c.label}</span>`;
        if ((c.bits || 1) === 1) h += `<button class="bit ${st[c.k] ? 'on' : ''}" data-act="tog" data-k="${c.k}" aria-pressed="${!!st[c.k]}">${st[c.k]}</button>`;
        else {
          h += `<span class="seg" role="group" aria-label="${esc(c.label)}">`;
          for (let v = 0; v < 2 ** c.bits; v++) h += `<button class="${st[c.k] === v ? 'on' : ''}" data-act="set" data-k="${c.k}" data-v="${v}" title="${c.names ? c.names[v] : ''}">${c.fmt ? c.fmt(v) : bin(v, c.bits)}</button>`;
          h += `</span>`;
        }
        h += `</div>`;
      }
      h += `<div class="btns"><button class="btn" data-act="rand">สุ่มค่า</button><button class="btn" data-act="zero">รีเซ็ตเป็น 0</button></div></div>`;
    }
    if (cfg.panel) h += cfg.panel(st);
    if (cfg.readout) h += `<div class="ctl-group"><h3>เอาต์พุต</h3>${cfg.readout(st)}</div>`;
    return h;
  }
  function render() {
    R('cv').innerHTML = cfg.draw(st);
    R('pn').innerHTML = controlsHTML();
    R('inf').innerHTML = cfg.info ? cfg.info(st) : '';
    R('extra').innerHTML = cfg.extra ? cfg.extra(st) : '';
    R('cvnote').textContent = cfg.note ? cfg.note(st) : '';
  }
  function handle(el) {
    const a = el.dataset.act, k = el.dataset.k, v = el.dataset.v;
    if (cfg.act && cfg.act(a, k, v, el) === true) { render(); return; }
    if (a === 'tog') {
      const c = (cfg.controls || []).find(c => c.k === k); const bits = c ? (c.bits || 1) : 1;
      st[k] = (st[k] + 1) % (2 ** bits);
    } else if (a === 'set') st[k] = Number(v);
    else if (a === 'rand') for (const c of cfg.controls) st[c.k] = Math.floor(Math.random() * 2 ** (c.bits || 1));
    else if (a === 'zero') for (const c of cfg.controls) st[c.k] = 0;
    else return;
    render();
  }
  stage.onclick = e => { const el = e.target.closest('[data-act]'); if (el && stage.contains(el)) handle(el); };
  stage.onkeydown = e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('g[data-act]')) { e.preventDefault(); handle(e.target); } };
  stage.onchange = e => { if (cfg.change) { cfg.change(e.target); render(); } };
  render();
  return { render };
}

function ttTable(head, rows, curIdx) {
  return `<div class="tbl-wrap"><table class="tt"><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r, i) => `<tr class="${i === curIdx ? 'cur' : ''}">${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
const flag = (b, yes = 'ใช่', no = 'ไม่') => `<span class="flag ${b ? 'y' : 'n'}">${b ? yes : no}</span>`;
