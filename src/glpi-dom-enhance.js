const TERM_DATE = '2026-06-25';
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
function initials(name) {
  const parts = normalize(name).replace(/[._-]+/g, ' ').split(/\s+/).filter(Boolean);
  return parts.length ? (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase() : '•';
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
    return { node, player, date: parts[0] || '', sex: parts[1] || '', firstName: parts[2] || '', weightLabel: facts[0] || '', heightLabel: facts[1] || '', weight: parseWeightKg(facts[0]), height: parseNumber(facts[1]), note: messages.get(player) || '' };
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
    const sexIcon = ticket.sex === 'Fille' ? '🎀' : ticket.sex === 'Garçon' ? '🧢' : '🎁';
    const tags = document.createElement('div');
    tags.className = 'ticket-tags ticket-tags-main';
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
    .data-lab-panel.c2 .panel-title{margin:0!important;padding:12px 14px!important;border-bottom:1px solid #d8e1ec!important;background:linear-gradient(180deg,#fff,#f7f9fc)!important}.data-lab-panel.c2 .panel-title>span{background:#e8f2ff!important;color:#24548d!important;border-radius:7px!important}.data-lab-panel.c2 .panel-title h2{color:#22364d!important;font-size:18px!important}.data-lab-panel.c2 .panel-title p{color:#66788f!important;font-size:12px!important}
    .c2-grid{display:grid!important;grid-template-columns:1fr!important;gap:10px!important;padding:12px!important;background:#f2f5f9!important}.c2-card{background:#fff!important;border:1px solid #d8e1ec!important;border-radius:9px!important;padding:12px!important;min-width:0!important}.c2-head{margin-bottom:10px!important}.c2-head b{display:block!important;color:#22364d!important;font-size:14px!important;font-weight:900!important;line-height:1.1!important}.c2-head span{display:block!important;color:#6b7a90!important;font-size:11px!important;margin-top:2px!important;line-height:1.25!important}
    .c2-mirror-card{padding:0!important}.c2-mirror-head{display:grid!important;grid-template-columns:1fr 1fr!important;border-bottom:1px solid #d8e1ec!important;background:linear-gradient(180deg,#fff,#f7f9fc)!important}.c2-mirror-head>div{padding:12px!important}.c2-mirror-head>div+div{border-left:1px solid #d8e1ec!important}.c2-mirror-grid{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important}.c2-mirror-row{display:contents!important}.c2-cell{height:188px!important;min-height:188px!important;border-bottom:1px solid #e0e7ef!important;padding:10px 12px!important;background:#fff!important;overflow:hidden!important}.c2-cell:nth-child(4n+3),.c2-cell:nth-child(4n+4){background:#fbfcfe!important}.c2-cell:nth-child(even){border-left:1px solid #e0e7ef!important}.c2-cell-title{display:flex!important;justify-content:space-between!important;align-items:flex-start!important;gap:8px!important;margin-bottom:4px!important}.c2-cell-title b{font-size:13px!important;color:#22364d!important}.c2-cell-title span{font-size:10px!important;color:#66788f!important}.c2-cell svg{width:100%!important;height:142px!important;display:block!important}.c2-note{font-size:11px!important;color:#66788f!important;line-height:1.35!important;padding:10px 12px!important;background:#fbfcfe!important}
    .c2-canvas-wrap{position:relative!important;border:1px solid #d8e1ec!important;border-radius:9px!important;background:radial-gradient(circle at 50% 45%,#fff,#f2f6fb)!important;height:620px!important;overflow:hidden!important;touch-action:none!important}.c2-canvas-wrap canvas{width:100%!important;height:620px!important;display:block!important;cursor:grab!important}.c2-canvas-wrap.dragging canvas{cursor:grabbing!important}.c2-toolbar{position:absolute!important;z-index:3!important;top:9px!important;left:9px!important;display:flex!important;gap:6px!important}.c2-toolbar button{border:1px solid #cbd8e6!important;background:#fff!important;color:#24548d!important;border-radius:7px!important;padding:5px 8px!important;font-size:11px!important;font-weight:900!important;cursor:pointer!important}.c2-tooltip{position:absolute!important;left:9px!important;right:9px!important;bottom:9px!important;border:1px solid rgba(203,216,230,.92)!important;background:rgba(255,255,255,.94)!important;backdrop-filter:blur(8px)!important;border-radius:8px!important;padding:9px!important;font-size:12px!important;color:#66788f!important}.c2-tooltip b{color:#22364d!important}
    .c2-legend{display:grid!important;grid-template-columns:repeat(6,minmax(0,1fr))!important;gap:7px!important;margin-top:9px!important}.c2-leg{border:1px solid #d8e1ec!important;border-radius:8px!important;background:#fff!important;padding:8px!important}.c2-leg h3{display:flex!important;align-items:center!important;gap:7px!important;margin:0!important;font-size:11px!important;color:#22364d!important}.c2-leg-dot{width:10px!important;height:10px!important;border-radius:999px!important;display:inline-block!important}.c2-leg p{margin:5px 0 0!important;color:#66788f!important;font-size:10px!important;line-height:1.2!important}.c2-leg b{margin-left:auto!important;color:#24548d!important}
    @media(max-width:1100px){.c2-mirror-head,.c2-mirror-grid{grid-template-columns:1fr!important}.c2-cell:nth-child(even),.c2-mirror-head>div+div{border-left:0!important}.c2-legend{grid-template-columns:1fr 1fr!important}.c2-canvas-wrap,.c2-canvas-wrap canvas{height:520px!important}}
    @media(max-width:680px){.c2-grid{padding:8px!important;gap:8px!important}.c2-card{padding:9px!important}.c2-cell{height:168px!important;min-height:168px!important}.c2-cell svg{height:122px!important}.c2-canvas-wrap,.c2-canvas-wrap canvas{height:430px!important}.c2-legend{grid-template-columns:1fr!important}}
  `;
  document.head.appendChild(style);
}
function card(title, subtitle, body) {
  return `<article class="c2-card"><div class="c2-head"><b>${title}</b><span>${subtitle}</span></div>${body}</article>`;
}

function valueConfig(type, tickets) {
  if (type === 'date') return { title: 'Date', note: 'Écart au terme', values: tickets.map((ticket) => dayDiff(ticket.date)).filter(Number.isFinite), min: -12, max: 14, color: COLORS.orange, unit: 'j', digits: 0 };
  if (type === 'weight') return { title: 'Poids', note: 'Axe en kg', values: tickets.map((ticket) => ticket.weight).filter(Number.isFinite), min: 2.3, max: 4.6, color: COLORS.green, unit: 'kg', digits: 1 };
  return { title: 'Taille', note: 'Axe en cm', values: tickets.map((ticket) => ticket.height).filter(Number.isFinite), min: 44, max: 56, color: COLORS.blue, unit: 'cm', digits: 0 };
}
function valueLabel(config, value) {
  if (config.unit === 'j') return `J${Math.round(value) > 0 ? '+' : ''}${Math.round(value)}`;
  return `${value.toLocaleString('fr-FR', { maximumFractionDigits: config.digits })}${config.unit}`;
}
function densitySvg(config) {
  const values = config.values;
  if (!values.length) return '<div class="empty-mini">Pas assez de valeurs.</div>';
  const min = Math.min(config.min, Math.min(...values));
  const max = Math.max(config.max, Math.max(...values));
  const bins = Array.from({ length: 22 }, () => 0);
  values.forEach((value) => {
    const index = Math.max(0, Math.min(21, Math.floor(((value - min) / Math.max(1, max - min)) * 22)));
    bins[index] += 1;
  });
  const maxBin = Math.max(1, ...bins);
  const x0 = 54, y = 72, width = 640;
  let top = '', bottom = '';
  bins.forEach((count, index) => {
    const x = x0 + index * width / 21;
    const h = 6 + (count / maxBin) * 48;
    top += `${index ? 'L' : 'M'}${x},${y - h}`;
    bottom = `L${x},${y + h}` + bottom;
  });
  let dots = '';
  values.slice(0, 90).forEach((value, index) => {
    const x = x0 + ((value - min) / Math.max(1, max - min)) * width;
    const yy = y + ((index % 5) - 2) * 7;
    dots += `<circle cx="${x}" cy="${yy}" r="3.1" fill="${config.color}" fill-opacity=".72"/>`;
  });
  let ticks = '';
  for (let index = 0; index <= 4; index += 1) {
    const value = min + (max - min) * index / 4;
    const x = x0 + index * width / 4;
    ticks += `<line x1="${x}" y1="126" x2="${x}" y2="132" stroke="#9eb1c7"/><text x="${x}" y="148" text-anchor="middle" fill="#66788f" font-size="10">${valueLabel(config, value)}</text>`;
  }
  const termLine = config.unit === 'j' && min <= 0 && max >= 0 ? `<line x1="${x0 + ((0 - min) / (max - min)) * width}" y1="24" x2="${x0 + ((0 - min) / (max - min)) * width}" y2="126" stroke="${COLORS.orange}" stroke-width="2" stroke-dasharray="5 4"/><text x="${x0 + ((0 - min) / (max - min)) * width + 6}" y="38" fill="${COLORS.orange}" font-size="10" font-weight="900">TERME</text>` : '';
  return `<svg viewBox="0 0 740 160"><path d="${top} ${bottom} Z" fill="${config.color}" fill-opacity=".24" stroke="${config.color}" stroke-width="2"/>${dots}${termLine}<line x1="${x0}" y1="126" x2="${x0 + width}" y2="126" stroke="#9eb1c7"/>${ticks}</svg>`;
}
function boxplotSvg(config) {
  const values = config.values;
  if (!values.length) return '<div class="empty-mini">Pas assez de valeurs.</div>';
  const min = config.min, max = config.max;
  const x0 = 54, x1 = 694, y = 72;
  const map = (value) => x0 + ((value - min) / (max - min)) * (x1 - x0);
  const q1 = percentile(values, .25), med = percentile(values, .5), q3 = percentile(values, .75), mn = Math.min(...values), mx = Math.max(...values);
  let ticks = '';
  for (let index = 0; index <= 4; index += 1) {
    const value = min + (max - min) * index / 4;
    const x = x0 + index * (x1 - x0) / 4;
    ticks += `<line x1="${x}" y1="126" x2="${x}" y2="132" stroke="#9eb1c7"/><text x="${x}" y="148" text-anchor="middle" fill="#66788f" font-size="10">${valueLabel(config, value)}</text>`;
  }
  return `<svg viewBox="0 0 740 160"><line x1="${x0}" y1="126" x2="${x1}" y2="126" stroke="#dbe4ee"/><line x1="${map(mn)}" y1="${y}" x2="${map(mx)}" y2="${y}" stroke="#9eb1c7" stroke-width="2"/><rect x="${map(q1)}" y="${y - 18}" width="${Math.max(2, map(q3) - map(q1))}" height="36" rx="8" fill="${config.color}" fill-opacity=".18" stroke="${config.color}" stroke-width="2"/><line x1="${map(med)}" y1="${y - 28}" x2="${map(med)}" y2="${y + 28}" stroke="${config.color}" stroke-width="3"/><circle cx="${map(mn)}" cy="${y}" r="5" fill="${config.color}"/><circle cx="${map(mx)}" cy="${y}" r="5" fill="${config.color}"/><text x="${map(med) + 8}" y="${y - 34}" fill="${config.color}" font-size="10" font-weight="900">médiane ${valueLabel(config, med)}</text>${ticks}</svg>`;
}
function mirrorViz(tickets) {
  const rows = ['date', 'weight', 'height'].map((type) => valueConfig(type, tickets));
  return `<article class="c2-card c2-mirror-card"><div class="c2-mirror-head"><div><b>Distributions date / poids / taille</b><span>Chaque point représente un pari individuel.</span></div><div><b>Boxplots expliqués</b><span>Rectangle = 50%, trait = médiane, points = min/max.</span></div></div><div class="c2-mirror-grid">${rows.map((row) => `<div class="c2-mirror-row"><div class="c2-cell"><div class="c2-cell-title"><b>${row.title}</b><span>${row.note}</span></div>${densitySvg(row)}</div><div class="c2-cell"><div class="c2-cell-title"><b>${row.title}</b><span>${row.note}</span></div>${boxplotSvg(row)}</div></div>`).join('')}</div><div class="c2-note">Les trois lignes sont alignées deux à deux : Date face à Date, Poids face à Poids, Taille face à Taille.</div></article>`;
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
  const sd = { offset: Math.sqrt(avg(offsets.map((v) => (v - mean.offset) ** 2)) || 1) || 1, weight: Math.sqrt(avg(weights.map((v) => (v - mean.weight) ** 2)) || 1) || 1, height: Math.sqrt(avg(heights.map((v) => (v - mean.height) ** 2)) || 1) || 1 };
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
  const tooltip = panel.querySelector('.c2-tooltip');
  if (!wrap || !canvas || canvas.dataset.ready === '1') return;
  canvas.dataset.ready = '1';
  const ctx = canvas.getContext('2d');
  const stats = pcaStats(tickets);
  let rotX = .55, rotY = .72, zoom = 1.35, auto = true, drag = false, lastX = 0, lastY = 0, projected = [], hover = null;
  function resize() { const rect = canvas.getBoundingClientRect(); canvas.width = rect.width * devicePixelRatio; canvas.height = rect.height * devicePixelRatio; ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0); }
  function project(point) { const cy = Math.cos(rotY), sy = Math.sin(rotY), cx = Math.cos(rotX), sx = Math.sin(rotX); let x = point.x * cy - point.z * sy, z = point.x * sy + point.z * cy, y = point.y * cx - z * sx; z = point.y * sx + z * cx; const scale = Math.min(canvas.clientWidth, canvas.clientHeight) * .24 * zoom, perspective = 1 / (2.15 + z * .22); return { x: canvas.clientWidth / 2 + x * scale * perspective, y: canvas.clientHeight / 2 - y * scale * perspective, z, ticket: point.ticket, s: perspective }; }
  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); }
  function updateHover(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left, y = clientY - rect.top;
    let best = null, bestDist = 20;
    projected.forEach((point) => { const dist = Math.hypot(point.x - x, point.y - y); if (dist < bestDist) { best = point; bestDist = dist; } });
    hover = best;
    if (tooltip && hover) tooltip.innerHTML = `<b>${esc(hover.ticket.player)}</b> · ${esc(hover.ticket.date)} · ${esc(hover.ticket.sex)} · ${esc(hover.ticket.firstName)} · ${esc(hover.ticket.weightLabel)} · ${esc(hover.ticket.heightLabel)}<br>${esc(hover.ticket.cluster)}${hover.ticket.note ? ` · ${esc(hover.ticket.note)}` : ''}`;
    else if (tooltip) tooltip.innerHTML = '<b>Lecture</b> · Initiales visibles. Survole un point pour afficher le ticket complet.';
  }
  function draw() {
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    const origin = project({ x: 0, y: 0, z: 0, ticket: null });
    [{ p: { x: 3.4, y: 0, z: 0, ticket: null }, label: 'PC1 timing/poids', c: COLORS.orange }, { p: { x: 0, y: 3.2, z: 0, ticket: null }, label: 'PC2 morphologie', c: COLORS.blue }, { p: { x: 0, y: 0, z: 3.2, ticket: null }, label: 'PC3 dispersion', c: COLORS.green }].forEach((axis) => { const end = project(axis.p); ctx.strokeStyle = axis.c; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(origin.x, origin.y); ctx.lineTo(end.x, end.y); ctx.stroke(); ctx.fillStyle = axis.c; ctx.font = '900 12px system-ui'; ctx.fillText(axis.label, end.x + 7, end.y); });
    const centers = {};
    projected = tickets.map((ticket) => getPcaPoint(ticket, stats)).map(project).sort((a, b) => a.z - b.z);
    projected.forEach((point) => {
      const color = CLUSTERS[point.ticket.cluster]?.color || COLORS.blue;
      if (!centers[point.ticket.cluster]) centers[point.ticket.cluster] = { x: 0, y: 0, n: 0, color };
      centers[point.ticket.cluster].x += point.x; centers[point.ticket.cluster].y += point.y; centers[point.ticket.cluster].n += 1;
      const isHover = hover?.ticket?.player === point.ticket.player;
      const radius = (point.ticket.note ? 10 : 9) * point.s + (isHover ? 5 : 0);
      ctx.globalAlpha = .18; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(point.x, point.y, radius + 8, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1; ctx.fillStyle = color; ctx.strokeStyle = isHover ? '#172b44' : '#fff'; ctx.lineWidth = isHover ? 3.5 : 2.2; ctx.beginPath(); ctx.arc(point.x, point.y, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = '900 9px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(initials(point.ticket.player), point.x, point.y + .5); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    });
    Object.entries(centers).forEach(([name, center]) => { const x = center.x / center.n, y = center.y / center.n, text = `${name} · ${center.n}`; ctx.font = '900 12px system-ui'; const tw = ctx.measureText(text).width; ctx.fillStyle = 'rgba(255,255,255,.94)'; ctx.strokeStyle = '#cbd8e6'; roundRect(x - tw / 2 - 8, y - 38, tw + 16, 23, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = center.color; ctx.fillText(text, x - tw / 2, y - 22); });
    if (auto && !drag) rotY += .004;
    requestAnimationFrame(draw);
  }
  resize(); window.addEventListener('resize', resize);
  wrap.addEventListener('pointerdown', (event) => { drag = true; wrap.classList.add('dragging'); lastX = event.clientX; lastY = event.clientY; wrap.setPointerCapture(event.pointerId); updateHover(event.clientX, event.clientY); });
  wrap.addEventListener('pointermove', (event) => { if (drag) { rotY += (event.clientX - lastX) * .008; rotX += (event.clientY - lastY) * .008; rotX = Math.max(-1.25, Math.min(1.25, rotX)); lastX = event.clientX; lastY = event.clientY; } updateHover(event.clientX, event.clientY); });
  wrap.addEventListener('pointerleave', () => { hover = null; if (tooltip) tooltip.innerHTML = '<b>Lecture</b> · Initiales visibles. Survole un point pour afficher le ticket complet.'; });
  wrap.addEventListener('pointerup', () => { drag = false; wrap.classList.remove('dragging'); });
  panel.querySelector('[data-c2-auto]')?.addEventListener('click', (event) => { auto = !auto; event.currentTarget.textContent = auto ? 'Auto' : 'Manuel'; });
  panel.querySelector('[data-c2-zoom-in]')?.addEventListener('click', () => { zoom = Math.min(2.1, zoom + .12); });
  panel.querySelector('[data-c2-zoom-out]')?.addEventListener('click', () => { zoom = Math.max(.8, zoom - .12); });
  panel.querySelector('[data-c2-reset]')?.addEventListener('click', () => { rotX = .55; rotY = .72; zoom = 1.35; });
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
  panel.innerHTML = `<div class="panel-title"><span>📊</span><div><h2>Data Lab</h2><p>Grille miroir distributions / boxplots, puis ACP 3D agrandie.</p></div></div><div class="c2-grid">${mirrorViz(enriched)}${card('ACP 3D manipulable', 'Initiales visibles. Survole un point pour afficher le nom complet.', `<div class="c2-canvas-wrap"><div class="c2-toolbar"><button data-c2-auto>Auto</button><button data-c2-zoom-in>Zoom +</button><button data-c2-zoom-out>Zoom -</button><button data-c2-reset>Reset</button></div><canvas id="c2-pca3d"></canvas><div class="c2-tooltip"><b>Lecture</b> · Initiales visibles. Survole un point pour afficher le ticket complet.</div></div><div class="c2-legend">${renderLegend(enriched)}</div>`)}</div>`;
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