const TERM_DATE = '2026-06-25';
const TERM_LABEL = '25/06';
const COLORS = { blue: '#24548d', blue2: '#2f6fa9', orange: '#f08a24', pink: '#d6336c', green: '#2f7a45', purple: '#7c5cc4', gold: '#d98a00' };

const normalize = (value) => String(value || '').trim();
const esc = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

function parseNumber(value) {
  const number = Number(String(value || '').replace(',', '.').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(number) ? number : null;
}
function parseWeightKg(value) {
  const number = parseNumber(value);
  if (number === null) return null;
  return number > 20 ? number / 1000 : number;
}
function dateFromLabel(label) {
  const clean = normalize(label);
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return new Date(`${clean}T00:00:00`);
  const match = clean.match(/^(\d{1,2})\/(\d{1,2})$/);
  return match ? new Date(2026, Number(match[2]) - 1, Number(match[1])) : null;
}
function dayDiff(label) {
  const date = dateFromLabel(label);
  return date ? Math.round((date - new Date(`${TERM_DATE}T00:00:00`)) / 86400000) : 0;
}
function countBy(values) {
  const map = new Map();
  values.filter(Boolean).forEach((raw) => {
    const value = normalize(raw);
    if (value) map.set(value, (map.get(value) || 0) + 1);
  });
  return [...map.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}
function avg(values) {
  const nums = values.filter((value) => value != null && Number.isFinite(value));
  return nums.length ? nums.reduce((sum, value) => sum + value, 0) / nums.length : null;
}
function percentile(values, p) {
  const nums = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!nums.length) return null;
  const i = (nums.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return nums[lo] + (nums[hi] - nums[lo]) * (i - lo);
}
function formatNumber(value, digits = 1) {
  return value.toLocaleString('fr-FR', { maximumFractionDigits: digits });
}
function readMessages() {
  const messages = new Map();
  document.querySelectorAll('.message-card').forEach((card) => {
    const player = normalize(card.querySelector('b')?.textContent);
    const note = normalize(card.querySelector('p')?.textContent).replace(/^“|”$/g, '');
    if (player && note) messages.set(player, note);
  });
  return messages;
}
function readTickets() {
  const messages = readMessages();
  return [...document.querySelectorAll('.ticket')].map((node) => {
    const player = normalize(node.querySelector('.ticket-top b')?.textContent);
    const prediction = normalize(node.querySelector('.ticket-prediction')?.textContent);
    const parts = prediction.split('·').map((part) => normalize(part));
    const facts = [...node.querySelectorAll('.ticket-facts span')].map((span) => normalize(span.textContent));
    return {
      node,
      player,
      date: parts[0] || '',
      sex: parts[1] || '',
      firstName: parts[2] || '',
      weightLabel: facts[0] || '',
      heightLabel: facts[1] || '',
      weight: parseWeightKg(facts[0]),
      height: parseNumber(facts[1]),
      note: messages.get(player) || '',
    };
  }).filter((ticket) => ticket.player);
}
function clusterOf(ticket) {
  const diff = dayDiff(ticket.date);
  if (diff <= -4) return 'Les pressés';
  if (diff >= 4) return 'Les chill';
  if (ticket.weight != null && ticket.weight >= 3.75) return 'Les costauds';
  if (ticket.weight != null && ticket.weight <= 2.9) return 'Les mini format';
  if (Math.abs(diff) <= 1) return 'Les croyants du terme';
  return 'Les prudents';
}
const CLUSTERS = {
  'Les pressés': { color: COLORS.orange, desc: 'paris très avant terme' },
  'Les chill': { color: COLORS.purple, desc: 'paris après terme' },
  'Les costauds': { color: COLORS.green, desc: 'poids élevés' },
  'Les mini format': { color: COLORS.pink, desc: 'poids bas' },
  'Les croyants du terme': { color: COLORS.blue2, desc: 'autour du 25/06' },
  'Les prudents': { color: COLORS.gold, desc: 'proches du centre' },
};

function renderTicketTags(tickets) {
  tickets.forEach((ticket) => {
    const oldPrediction = ticket.node.querySelector('.ticket-prediction');
    const oldFacts = ticket.node.querySelector('.ticket-facts');
    if (!oldPrediction) return;
    oldPrediction.style.display = 'none';
    if (oldFacts) oldFacts.style.display = 'none';
    ticket.node.querySelector('.ticket-tags-main')?.remove();
    const tags = document.createElement('div');
    tags.className = 'ticket-tags ticket-tags-main';
    const sexIcon = ticket.sex === 'Fille' ? '🎀' : ticket.sex === 'Garçon' ? '🧢' : '🎁';
    tags.innerHTML = `<span class="ticket-tag tag-date">📅 ${esc(ticket.date || '—')}</span><span class="ticket-tag tag-sex">${sexIcon} ${esc(ticket.sex || '—')}</span><span class="ticket-tag tag-name">✨ ${esc(ticket.firstName || 'Prénom mystère')}</span><span class="ticket-tag tag-weight">⚖️ ${esc(ticket.weightLabel || '—')}</span><span class="ticket-tag tag-height">📏 ${esc(ticket.heightLabel || '—')}</span>`;
    ticket.node.querySelector('.ticket-top')?.insertAdjacentElement('afterend', tags);
  });
}
function injectTicketMessages(tickets) {
  tickets.forEach((ticket) => {
    ticket.node.querySelector('.ticket-note')?.remove();
    if (!ticket.note) return;
    const note = document.createElement('div');
    note.className = 'ticket-note';
    note.innerHTML = `<span>Message</span><p>${esc(ticket.note)}</p>`;
    const badges = ticket.node.querySelector('.ticket-badges');
    if (badges) ticket.node.insertBefore(note, badges);
    else ticket.node.appendChild(note);
  });
}

function ensureStyle() {
  if (document.getElementById('glpi-c2-data-lab-style')) return;
  const style = document.createElement('style');
  style.id = 'glpi-c2-data-lab-style';
  style.textContent = `
    .message-wall-panel{display:none!important}
    .data-lab-panel.c2{background:#fff!important;border:1px solid #d8e1ec!important;border-radius:10px!important;padding:0!important;box-shadow:0 2px 8px rgba(15,23,42,.06)!important;overflow:hidden!important}
    .data-lab-panel.c2 .panel-title{margin:0!important;padding:12px 14px!important;border-bottom:1px solid #d8e1ec!important;background:linear-gradient(180deg,#fff,#f7f9fc)!important}
    .data-lab-panel.c2 .panel-title>span{background:#e8f2ff!important;color:#24548d!important;border-radius:7px!important}
    .data-lab-panel.c2 .panel-title h2{color:#22364d!important;font-size:18px!important}.data-lab-panel.c2 .panel-title p{color:#66788f!important;font-size:12px!important}
    .c2-grid{display:grid!important;grid-template-columns:1.12fr .88fr!important;gap:10px!important;padding:12px!important;background:#f2f5f9!important}
    .c2-card{background:#fff!important;border:1px solid #d8e1ec!important;border-radius:9px!important;padding:12px!important;min-width:0!important}.c2-card.full{grid-column:1/-1!important}
    .c2-head{display:flex!important;justify-content:space-between!important;gap:10px!important;align-items:flex-start!important;margin-bottom:10px!important}.c2-head b{display:block!important;color:#22364d!important;font-size:14px!important;font-weight:900!important;line-height:1.1!important}.c2-head span{display:block!important;color:#6b7a90!important;font-size:11px!important;margin-top:2px!important;line-height:1.25!important}
    .c2-stack{display:grid!important;gap:12px!important}.c2-density-row{display:grid!important;grid-template-columns:74px 1fr!important;gap:10px!important;align-items:center!important;border:1px solid #d8e1ec!important;border-radius:8px!important;background:#fbfcfe!important;padding:8px!important}.c2-density-label b{display:block!important;font-size:13px!important;color:#22364d!important}.c2-density-label span{display:block!important;margin-top:3px!important;font-size:10px!important;color:#66788f!important}.c2-density-row svg{width:100%!important;height:auto!important;display:block!important}
    .c2-canvas-wrap{position:relative!important;border:1px solid #d8e1ec!important;border-radius:9px!important;background:radial-gradient(circle at 50% 45%,#fff,#f2f6fb)!important;height:460px!important;overflow:hidden!important;touch-action:none!important}.c2-canvas-wrap canvas{width:100%!important;height:460px!important;display:block!important;cursor:grab!important}.c2-canvas-wrap.dragging canvas{cursor:grabbing!important}.c2-toolbar{position:absolute!important;z-index:3!important;top:9px!important;left:9px!important;display:flex!important;gap:6px!important}.c2-toolbar button{border:1px solid #cbd8e6!important;background:#fff!important;color:#24548d!important;border-radius:7px!important;padding:5px 8px!important;font-size:11px!important;font-weight:900!important;cursor:pointer!important}.c2-tooltip{position:absolute!important;left:9px!important;right:9px!important;bottom:9px!important;border:1px solid rgba(203,216,230,.92)!important;background:rgba(255,255,255,.92)!important;backdrop-filter:blur(8px)!important;border-radius:8px!important;padding:8px!important;font-size:11px!important;color:#66788f!important}.c2-tooltip b{color:#22364d!important}
    .c2-legend{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:7px!important;margin-top:9px!important}.c2-leg{border:1px solid #d8e1ec!important;border-radius:8px!important;background:#fff!important;padding:8px!important}.c2-leg h3{display:flex!important;align-items:center!important;gap:7px!important;margin:0!important;font-size:11px!important;color:#22364d!important}.c2-leg-dot{width:10px!important;height:10px!important;border-radius:999px!important;display:inline-block!important}.c2-leg p{margin:5px 0 0!important;color:#66788f!important;font-size:10px!important;line-height:1.2!important}.c2-leg b{margin-left:auto!important;color:#24548d!important}
    .c2-boxplot svg{width:100%!important;height:auto!important;display:block!important}.c2-note{font-size:11px!important;color:#66788f!important;line-height:1.35!important;margin-top:8px!important}.empty-mini{display:grid!important;place-items:center!important;min-height:80px!important;border:1px dashed #cbd5e1!important;border-radius:8px!important;color:#64748b!important;font-size:12px!important;background:#fbfcfe!important}
    @media(max-width:1100px){.c2-grid{grid-template-columns:1fr!important}.c2-card.full{grid-column:auto!important}.c2-legend{grid-template-columns:1fr 1fr!important}.c2-density-row{grid-template-columns:1fr!important}}
    @media(max-width:680px){.c2-grid{padding:8px!important;gap:8px!important}.c2-card{padding:9px!important}.c2-canvas-wrap,.c2-canvas-wrap canvas{height:360px!important}.c2-legend{grid-template-columns:1fr!important}}
  `;
  document.head.appendChild(style);
}
function card(title, subtitle, body, extra = '') {
  return `<article class="c2-card ${extra}"><div class="c2-head"><div><b>${title}</b><span>${subtitle}</span></div></div>${body}</article>`;
}

function densitySvg(tickets, type) {
  const isDate = type === 'date';
  const isWeight = type === 'weight';
  const values = tickets.map((ticket) => isDate ? dayDiff(ticket.date) : isWeight ? ticket.weight : ticket.height).filter(Number.isFinite);
  if (!values.length) return '<div class="empty-mini">Pas encore assez de valeurs.</div>';
  let min = isDate ? Math.min(-12, Math.min(...values)) : isWeight ? 2.3 : 44;
  let max = isDate ? Math.max(14, Math.max(...values)) : isWeight ? 4.6 : 56;
  const color = isDate ? COLORS.orange : isWeight ? COLORS.green : COLORS.blue;
  const unit = isDate ? 'j' : isWeight ? 'kg' : 'cm';
  const bins = Array.from({ length: 22 }, () => 0);
  values.forEach((value) => {
    const index = Math.max(0, Math.min(21, Math.floor(((value - min) / Math.max(1, max - min)) * 22)));
    bins[index] += 1;
  });
  const maxBin = Math.max(1, ...bins);
  const x0 = 44;
  const y = 118;
  const width = 650;
  let top = '';
  let bottom = '';
  bins.forEach((count, index) => {
    const x = x0 + index * width / 21;
    const height = 6 + (count / maxBin) * 62;
    top += `${index ? 'L' : 'M'}${x},${y - height}`;
    bottom = `L${x},${y + height}` + bottom;
  });
  const maxDots = 90;
  let dots = '';
  values.slice(0, maxDots).forEach((value, index) => {
    const x = x0 + ((value - min) / Math.max(1, max - min)) * width;
    const yy = y + ((index % 7) - 3) * 9;
    dots += `<circle cx="${x}" cy="${yy}" r="3.2" fill="${color}" fill-opacity=".55"/>`;
  });
  let ticks = '';
  for (let index = 0; index <= 4; index += 1) {
    const value = min + (max - min) * index / 4;
    const x = x0 + index * width / 4;
    let label = isDate ? `J${Math.round(value) > 0 ? '+' : ''}${Math.round(value)}` : `${value.toLocaleString('fr-FR', { maximumFractionDigits: isWeight ? 1 : 0 })}${unit}`;
    ticks += `<line x1="${x}" y1="202" x2="${x}" y2="208" stroke="#9eb1c7"/><text x="${x}" y="225" text-anchor="middle" fill="#66788f" font-size="10">${label}</text>`;
  }
  const termLine = isDate && min <= 0 && max >= 0 ? `<line x1="${x0 + ((0 - min) / (max - min)) * width}" y1="42" x2="${x0 + ((0 - min) / (max - min)) * width}" y2="202" stroke="${COLORS.orange}" stroke-width="2" stroke-dasharray="5 4"/><text x="${x0 + ((0 - min) / (max - min)) * width + 6}" y="56" fill="${COLORS.orange}" font-size="10" font-weight="900">TERME</text>` : '';
  return `<svg viewBox="0 0 740 238"><path d="${top} ${bottom} Z" fill="${color}" fill-opacity=".24" stroke="${color}" stroke-width="2"/>${dots}${termLine}<line x1="${x0}" y1="202" x2="${x0 + width}" y2="202" stroke="#9eb1c7"/>${ticks}</svg>`;
}
function stackedDistributions(tickets) {
  const items = [
    { type: 'date', title: 'Date', note: 'Écart au terme' },
    { type: 'weight', title: 'Poids', note: 'Axe en kg' },
    { type: 'height', title: 'Taille', note: 'Axe en cm' },
  ];
  return `<div class="c2-stack">${items.map((item) => `<div class="c2-density-row"><div class="c2-density-label"><b>${item.title}</b><span>${item.note}</span></div><div>${densitySvg(tickets, item.type)}</div></div>`).join('')}</div><div class="c2-note">Chaque point représente un pari individuel. La bande montre la zone de concentration.</div>`;
}
function boxplotSvg(tickets) {
  const sets = [
    { label: 'Date', values: tickets.map((ticket) => dayDiff(ticket.date)), min: -12, max: 14, color: COLORS.orange, unit: 'j', digits: 0 },
    { label: 'Poids', values: tickets.map((ticket) => ticket.weight).filter(Number.isFinite), min: 2.3, max: 4.6, color: COLORS.green, unit: 'kg', digits: 1 },
    { label: 'Taille', values: tickets.map((ticket) => ticket.height).filter(Number.isFinite), min: 44, max: 56, color: COLORS.blue, unit: 'cm', digits: 0 },
  ];
  let svg = '<svg viewBox="0 0 560 430">';
  sets.forEach((set, index) => {
    if (!set.values.length) return;
    const y = 75 + index * 116;
    const x0 = 92;
    const x1 = 510;
    const map = (value) => x0 + ((value - set.min) / (set.max - set.min)) * (x1 - x0);
    const q1 = percentile(set.values, .25);
    const med = percentile(set.values, .5);
    const q3 = percentile(set.values, .75);
    const mn = Math.min(...set.values);
    const mx = Math.max(...set.values);
    const formatter = (value) => value.toLocaleString('fr-FR', { maximumFractionDigits: set.digits });
    svg += `<text x="18" y="${y - 34}" fill="#24364a" font-size="13" font-weight="900">${set.label}</text><line x1="${x0}" y1="${y + 36}" x2="${x1}" y2="${y + 36}" stroke="#dbe4ee"/><text x="${x0}" y="${y + 58}" fill="#66788f" font-size="10" text-anchor="middle">${formatter(set.min)}${set.unit}</text><text x="${x1}" y="${y + 58}" fill="#66788f" font-size="10" text-anchor="middle">${formatter(set.max)}${set.unit}</text><line x1="${map(mn)}" y1="${y}" x2="${map(mx)}" y2="${y}" stroke="#9eb1c7" stroke-width="2"/><rect x="${map(q1)}" y="${y - 18}" width="${Math.max(2, map(q3) - map(q1))}" height="36" rx="8" fill="${set.color}" fill-opacity=".18" stroke="${set.color}" stroke-width="2"/><line x1="${map(med)}" y1="${y - 24}" x2="${map(med)}" y2="${y + 24}" stroke="${set.color}" stroke-width="3"/><circle cx="${map(mn)}" cy="${y}" r="5" fill="${set.color}"/><circle cx="${map(mx)}" cy="${y}" r="5" fill="${set.color}"/><text x="${map(med) + 8}" y="${y - 28}" fill="${set.color}" font-size="10" font-weight="900">médiane ${formatter(med)}${set.unit}</text>`;
  });
  return `${svg}</svg><div class="c2-note">Le rectangle = 50% des paris. Le trait = médiane. Les points = minimum / maximum.</div>`;
}
function renderLegend(tickets) {
  const clusters = countBy(tickets.map((ticket) => ticket.cluster));
  return Object.entries(CLUSTERS).map(([name, meta]) => {
    const count = clusters.find((item) => item.label === name)?.count || 0;
    return `<div class="c2-leg"><h3><span class="c2-leg-dot" style="background:${meta.color}"></span>${name}<b>${count}</b></h3><p>${meta.desc}</p></div>`;
  }).join('');
}
function pcaStats(tickets) {
  const offsets = tickets.map((ticket) => dayDiff(ticket.date));
  const weights = tickets.map((ticket) => ticket.weight).filter(Number.isFinite);
  const heights = tickets.map((ticket) => ticket.height).filter(Number.isFinite);
  const mean = { offset: avg(offsets) || 0, weight: avg(weights) || 3.2, height: avg(heights) || 50 };
  const sd = {
    offset: Math.sqrt(avg(offsets.map((value) => (value - mean.offset) ** 2)) || 1) || 1,
    weight: Math.sqrt(avg(weights.map((value) => (value - mean.weight) ** 2)) || 1) || 1,
    height: Math.sqrt(avg(heights.map((value) => (value - mean.height) ** 2)) || 1) || 1,
  };
  return { mean, sd };
}
function getPcaPoint(ticket, stats) {
  const z0 = (dayDiff(ticket.date) - stats.mean.offset) / stats.sd.offset;
  const z1 = ((ticket.weight ?? stats.mean.weight) - stats.mean.weight) / stats.sd.weight;
  const z2 = ((ticket.height ?? stats.mean.height) - stats.mean.height) / stats.sd.height;
  return { x: z0 * .64 + z1 * .44 + z2 * .28, y: -z0 * .25 + z1 * .55 - z2 * .72, z: z0 * .42 - z1 * .2 + z2 * .56, ticket };
}
function initPca3d(panel, tickets) {
  const wrap = panel.querySelector('.c2-canvas-wrap');
  const canvas = panel.querySelector('#c2-pca3d');
  if (!wrap || !canvas || canvas.dataset.ready === '1') return;
  canvas.dataset.ready = '1';
  const ctx = canvas.getContext('2d');
  const stats = pcaStats(tickets);
  let rotX = .55, rotY = .72, zoom = 1, auto = true, drag = false, lastX = 0, lastY = 0;
  function resize() { const rect = canvas.getBoundingClientRect(); canvas.width = rect.width * devicePixelRatio; canvas.height = rect.height * devicePixelRatio; ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0); }
  function project(point) { const cy = Math.cos(rotY), sy = Math.sin(rotY), cx = Math.cos(rotX), sx = Math.sin(rotX); let x = point.x * cy - point.z * sy, z = point.x * sy + point.z * cy, y = point.y * cx - z * sx; z = point.y * sx + z * cx; const scale = Math.min(canvas.clientWidth, canvas.clientHeight) * .19 * zoom, perspective = 1 / (2.2 + z * .25); return { x: canvas.clientWidth / 2 + x * scale * perspective, y: canvas.clientHeight / 2 - y * scale * perspective, z, ticket: point.ticket, s: perspective }; }
  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); }
  function draw() {
    const w = canvas.clientWidth, h = canvas.clientHeight; ctx.clearRect(0, 0, w, h);
    const origin = project({ x: 0, y: 0, z: 0, ticket: null });
    [{ p: { x: 3.4, y: 0, z: 0, ticket: null }, label: 'PC1 timing/poids', c: COLORS.orange }, { p: { x: 0, y: 3.2, z: 0, ticket: null }, label: 'PC2 morphologie', c: COLORS.blue }, { p: { x: 0, y: 0, z: 3.2, ticket: null }, label: 'PC3 dispersion', c: COLORS.green }].forEach((axis) => { const end = project(axis.p); ctx.strokeStyle = axis.c; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(origin.x, origin.y); ctx.lineTo(end.x, end.y); ctx.stroke(); ctx.fillStyle = axis.c; ctx.font = '800 11px system-ui'; ctx.fillText(axis.label, end.x + 6, end.y); });
    const centers = {};
    tickets.map((ticket) => getPcaPoint(ticket, stats)).map(project).sort((a, b) => a.z - b.z).forEach((point) => { const color = CLUSTERS[point.ticket.cluster]?.color || COLORS.blue; if (!centers[point.ticket.cluster]) centers[point.ticket.cluster] = { x: 0, y: 0, n: 0, color }; centers[point.ticket.cluster].x += point.x; centers[point.ticket.cluster].y += point.y; centers[point.ticket.cluster].n += 1; ctx.globalAlpha = .14; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(point.x, point.y, (point.ticket.note ? 16 : 12) * point.s, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; ctx.fillStyle = color; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(point.x, point.y, (point.ticket.note ? 7 : 5) * point.s, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); });
    Object.entries(centers).forEach(([name, center]) => { const x = center.x / center.n, y = center.y / center.n, text = `${name} · ${center.n}`; ctx.font = '900 12px system-ui'; const tw = ctx.measureText(text).width; ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.strokeStyle = '#cbd8e6'; roundRect(x - tw / 2 - 8, y - 36, tw + 16, 22, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = center.color; ctx.fillText(text, x - tw / 2, y - 21); });
    if (auto && !drag) rotY += .004;
    requestAnimationFrame(draw);
  }
  resize(); window.addEventListener('resize', resize);
  wrap.addEventListener('pointerdown', (event) => { drag = true; wrap.classList.add('dragging'); lastX = event.clientX; lastY = event.clientY; wrap.setPointerCapture(event.pointerId); });
  wrap.addEventListener('pointermove', (event) => { if (!drag) return; rotY += (event.clientX - lastX) * .008; rotX += (event.clientY - lastY) * .008; rotX = Math.max(-1.25, Math.min(1.25, rotX)); lastX = event.clientX; lastY = event.clientY; });
  wrap.addEventListener('pointerup', () => { drag = false; wrap.classList.remove('dragging'); });
  panel.querySelector('[data-c2-auto]')?.addEventListener('click', (event) => { auto = !auto; event.currentTarget.textContent = auto ? 'Auto' : 'Manuel'; });
  panel.querySelector('[data-c2-zoom-in]')?.addEventListener('click', () => { zoom = Math.min(1.8, zoom + .12); });
  panel.querySelector('[data-c2-zoom-out]')?.addEventListener('click', () => { zoom = Math.max(.65, zoom - .12); });
  panel.querySelector('[data-c2-reset]')?.addEventListener('click', () => { rotX = .55; rotY = .72; zoom = 1; });
  draw();
}
let lastSignature = '';
function renderDataLab(tickets) {
  ensureStyle();
  if (!tickets.length) return;
  const enriched = tickets.map((ticket) => ({ ...ticket, cluster: clusterOf(ticket) }));
  const signature = JSON.stringify(enriched.map((ticket) => [ticket.player, ticket.date, ticket.sex, ticket.firstName, ticket.weight, ticket.height, ticket.note]));
  if (signature === lastSignature && document.querySelector('.data-lab-panel.c2')) return;
  lastSignature = signature;
  document.querySelector('.data-lab-panel')?.remove();
  const panel = document.createElement('section');
  panel.className = 'data-lab-panel c2';
  panel.innerHTML = `<div class="panel-title"><span>📊</span><div><h2>Data Lab</h2><p>ACP 3D et distributions empilées des paris.</p></div></div><div class="c2-grid">${card('Distributions date / poids / taille', 'Même logique visuelle pour les trois dimensions principales.', stackedDistributions(enriched), 'full')}${card('ACP 3D manipulable', 'Drag souris/doigt pour tourner. Couleur = cluster, taille = message laissé.', `<div class="c2-canvas-wrap"><div class="c2-toolbar"><button data-c2-auto>Auto</button><button data-c2-zoom-in>Zoom +</button><button data-c2-zoom-out>Zoom -</button><button data-c2-reset>Reset</button></div><canvas id="c2-pca3d"></canvas><div class="c2-tooltip"><b>Lecture</b> · PC1 = tendance date/poids, PC2 = contraste morphologique, PC3 = dispersion résiduelle.</div></div><div class="c2-legend">${renderLegend(enriched)}</div>`, 'full')}${card('Boxplots expliqués', 'Rectangle = 50% des paris, trait = médiane, points = min/max.', `<div class="c2-boxplot">${boxplotSvg(enriched)}</div>`, 'full')}</div>`;
  const admin = document.querySelector('.admin-panel');
  if (admin) admin.insertAdjacentElement('beforebegin', panel);
  else document.querySelector('.app-grid')?.appendChild(panel);
  initPca3d(panel, enriched);
}
function enhance() {
  const tickets = readTickets();
  if (!tickets.length) return;
  renderTicketTags(tickets);
  injectTicketMessages(tickets);
  renderDataLab(tickets);
}
let scheduled = false;
function scheduleEnhance() { if (scheduled) return; scheduled = true; requestAnimationFrame(() => { scheduled = false; enhance(); }); }
const boot = setInterval(() => { if (document.querySelector('.ticket')) { clearInterval(boot); enhance(); } }, 250);
setTimeout(() => clearInterval(boot), 10000);
new MutationObserver(scheduleEnhance).observe(document.getElementById('root') || document.body, { childList: true, subtree: true });