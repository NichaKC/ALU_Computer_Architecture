"use strict";
/* ---------- navigation ---------- */
(function () {
  const nav = $('#nav'), msel = $('#msel'), stage = $('#stage');
  let html = '', opts = '';
  for (const [sec, name] of Object.entries(SECTIONS)) {
    const items = CIRCUITS.filter(c => c.sec === sec);
    if (!items.length) continue;
    html += `<div class="navsec"><h2>${name}</h2>${items.map(c => `<a href="#${c.id}" data-id="${c.id}"><span class="fig">${c.fig}</span><span>${c.name}</span></a>`).join('')}</div>`;
    opts += `<optgroup label="${esc(name)}">${items.map(c => `<option value="${c.id}">Fig ${c.fig} · ${esc(c.name)}</option>`).join('')}</optgroup>`;
  }
  nav.innerHTML = html; msel.innerHTML = opts;
  msel.onchange = () => { location.hash = msel.value; };
  function show() {
    const id = location.hash.slice(1);
    const c = CIRCUITS.find(x => x.id === id) || CIRCUITS[0];
    if (CLEANUP) { CLEANUP(); CLEANUP = null; }
    $('#chip').textContent = `Figure ${c.fig}`;
    $('#title').textContent = c.title;
    $('#desc').textContent = c.desc;
    nav.querySelectorAll('a').forEach(a => a.toggleAttribute('aria-current', false));
    const cur = nav.querySelector(`a[data-id="${c.id}"]`); if (cur) cur.setAttribute('aria-current', 'page');
    msel.value = c.id;
    stage.onclick = stage.onchange = stage.onkeydown = null;
    c.mount(stage);
    // กล่องโค้ด Python ของวงจรนี้ (ดึงจาก /api/source)
    const py = document.createElement('div');
    stage.appendChild(py);
    mountPySource(py, c.id);
  }
  window.addEventListener('hashchange', show);
  show();
})();
