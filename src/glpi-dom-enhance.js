const TERM_LABEL = '25/06';
const DATE_LABELS = ['19/06','20/06','21/06','22/06','23/06','24/06','25/06','26/06','27/06','28/06','29/06','30/06','01/07'];

const normalize = (value) => String(value || '').trim();
const parseNumber = (value) => {
  const number = Number(String(value || '').replace(',', '.').replace(/[^0-9.]/g, ''));
  return Number.isFinite(number) ? number : null;
};

function countBy(values) {
  const map = new Map();
  values.filter(Boolean).forEach((value) => map.set(value, (map.get(value) || 0) + 1));
  return [...map.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
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
  return [...document.querySelectorAll('.ticket')].map((ticket) => {
    const player = normalize(ticket.querySelector('.ticket-top b')?.textContent);
    const prediction = normalize(ticket.querySelector('.ticket-prediction')?.textContent);
    const parts = prediction.split('·').map((part) => normalize(part));
    const facts = [...ticket.querySelectorAll('.ticket-facts span')].map((span) => normalize(span.textContent));
    return {
      node: ticket,
      player,
      date: parts[0] || '',
      sex: parts[1] || '',
      firstName: parts[2] || '',
      weightLabel: facts[0] || '',
      heightLabel: facts[1] || '',
      weight: parseNumber(facts[0]),
      height: parseNumber(facts[1]),
      note: messages.get(player) || '',
    };
  }).filter((ticket) => ticket.player);
}

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
    tags.innerHTML = `
      <span class="ticket-tag tag-date">📅 ${ticket.date || '—'}</span>
      <span class="ticket-tag tag-sex">${sexIcon} ${ticket.sex || '—'}</span>
      <span class="ticket-tag tag-name">✨ ${ticket.firstName || 'Prénom mystère'}</span>
      <span class="ticket-tag tag-weight">⚖️ ${ticket.weightLabel || '—'}</span>
      <span class="ticket-tag tag-height">📏 ${ticket.heightLabel || '—'}</span>
    `;
    const top = ticket.node.querySelector('.ticket-top');
    if (top) top.insertAdjacentElement('afterend', tags);
    ticket.node.classList.add('ticket-card-pretty');
  });
}

function injectTicketMessages(tickets) {
  tickets.forEach((ticket) => {
    ticket.node.querySelector('.ticket-note')?.remove();
    if (!ticket.note) return;
    const note = document.createElement('div');
    note.className = 'ticket-note';
    note.innerHTML = `<span>Message</span><p>${ticket.note}</p>`;
    const badges = ticket.node.querySelector('.ticket-badges');
    if (badges) ticket.node.insertBefore(note, badges);
    else ticket.node.appendChild(note);
  });
}

function bucketWeight(weight) {
  if (weight == null) return null;
  if (weight < 2.8) return '<2,8';
  if (weight < 3.2) return '2,8-3,2';
  if (weight < 3.6) return '3,2-3,6';
  if (weight < 4) return '3,6-4';
  return '4+';
}

function pct(count, total) {
  return Math.round((count / Math.max(1, total)) * 100);
}

function avg(values) {
  const nums = values.filter((value) => value != null && Number.isFinite(value));
  if (!nums.length) return null;
  return nums.reduce((sum, value) => sum + value, 0) / nums.length;
}

function topItem(items, fallback = '—') {
  return items[0]?.label || fallback;
}

function safeMax(values, fallback = 1) {
  return Math.max(fallback, ...values.filter((value) => Number.isFinite(value)));
}

function cssEscapeText(value) {
  return String(value || '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}

function ensureDataLabStyle() {
  if (document.getElementById('glpi-data-lab-redesign')) return;
  const style = document.createElement('style');
  style.id = 'glpi-data-lab-redesign';
  style.textContent = `
    .data-lab-panel{background:#fff!important;border:1px solid #d8e1ec!important;border-radius:10px!important;padding:0!important;box-shadow:0 2px 8px rgba(15,23,42,.06)!important;overflow:hidden!important}
    .data-lab-panel .panel-title{margin:0!important;padding:12px 14px!important;border-bottom:1px solid #d8e1ec!important;background:linear-gradient(180deg,#fff,#f7f9fc)!important}
    .data-lab-panel .panel-title>span{background:#e8f2ff!important;color:#24548d!important;border-radius:7px!important}
    .data-lab-panel .panel-title h2{color:#22364d!important;font-size:18px!important}
    .data-lab-panel .panel-title p{color:#607089!important;font-size:12px!important}
    .data-lab-grid{display:grid!important;grid-template-columns:1.15fr .9fr 1fr!important;gap:10px!important;padding:12px!important;background:#f2f5f9!important}
    .lab-card{background:#fff!important;border:1px solid #d8e1ec!important;border-radius:9px!important;padding:12px!important;min-width:0!important;box-shadow:0 1px 0 rgba(15,23,42,.03)!important}
    .lab-card.large{grid-column:span 2!important}
    .lab-card.full{grid-column:1/-1!important}
    .lab-head{display:flex!important;justify-content:space-between!important;gap:10px!important;align-items:flex-start!important;margin-bottom:10px!important}
    .lab-head b{display:block!important;color:#22364d!important;font-size:14px!important;font-weight:800!important;line-height:1.1!important}
    .lab-head span{display:block!important;color:#6b7a90!important;font-size:11px!important;margin-top:2px!important;line-height:1.2!important}
    .lab-pill{display:inline-flex!important;align-items:center!important;height:22px!important;padding:0 8px!important;border-radius:999px!important;background:#fff4df!important;border:1px solid #f4d4a4!important;color:#9a5a0d!important;font-size:10px!important;font-weight:800!important;white-space:nowrap!important}
    .lab-kpis{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:8px!important;margin-bottom:10px!important}
    .lab-kpi{background:#f8fafc!important;border:1px solid #dfe7f0!important;border-radius:8px!important;padding:9px!important;min-height:62px!important}
    .lab-kpi span{display:block!important;color:#69788d!important;font-size:10px!important;text-transform:uppercase!important;font-weight:800!important;letter-spacing:.04em!important}
    .lab-kpi b{display:block!important;margin-top:5px!important;color:#1d334f!important;font-size:18px!important;font-weight:900!important;line-height:1!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
    .lab-kpi small{display:block!important;margin-top:4px!important;color:#7b8798!important;font-size:10px!important;line-height:1.1!important}
    .team-bars{display:grid!important;gap:9px!important;margin-top:4px!important}
    .team-row{display:grid!important;grid-template-columns:82px 1fr 42px!important;gap:8px!important;align-items:center!important}
    .team-row span{font-size:12px!important;color:#334155!important;font-weight:800!important;white-space:nowrap!important}
    .team-track{height:16px!important;background:#edf2f7!important;border-radius:999px!important;overflow:hidden!important;border:1px solid #dce5ee!important}
    .team-fill{height:100%!important;border-radius:999px!important;background:linear-gradient(90deg,#8fb7e8,#24548d)!important}
    .team-fill.pink{background:linear-gradient(90deg,#ffd0df,#d6336c)!important}
    .team-fill.gold{background:linear-gradient(90deg,#ffe3aa,#d98a00)!important}
    .team-row b{font-size:12px!important;color:#22364d!important;text-align:right!important}
    .timeline-chart{height:166px!important;display:grid!important;grid-template-columns:repeat(13,minmax(0,1fr))!important;gap:5px!important;align-items:end!important;padding-top:6px!important}
    .date-slot{display:grid!important;grid-template-rows:1fr auto auto!important;gap:4px!important;text-align:center!important;min-width:0!important}
    .date-track{height:108px!important;background:#eef3f8!important;border:1px solid #dde6ef!important;border-radius:7px!important;display:flex!important;align-items:end!important;overflow:hidden!important;position:relative!important}
    .date-track i{display:block!important;width:100%!important;min-height:4px!important;background:linear-gradient(180deg,#f6b44b,#f08a24)!important;border-radius:7px 7px 0 0!important}
    .date-slot.term .date-track{background:#fff4df!important;border-color:#f0b15a!important;box-shadow:inset 0 0 0 1px #fff!important}
    .date-slot.term .date-track:after{content:'TERME'!important;position:absolute!important;top:4px!important;left:50%!important;transform:translateX(-50%)!important;font-size:7px!important;color:#9a5a0d!important;font-weight:900!important;letter-spacing:.04em!important}
    .date-slot b{font-size:9px!important;color:#475569!important;white-space:nowrap!important}
    .date-slot small{font-size:10px!important;color:#22364d!important;font-weight:900!important}
    .weight-bars{display:grid!important;gap:8px!important}
    .weight-row{display:grid!important;grid-template-columns:60px 1fr 28px!important;gap:8px!important;align-items:center!important}
    .weight-row span{font-size:11px!important;color:#475569!important;font-weight:800!important}
    .weight-row div{height:13px!important;border-radius:999px!important;background:#edf2f7!important;border:1px solid #dce5ee!important;overflow:hidden!important}
    .weight-row i{display:block!important;height:100%!important;background:linear-gradient(90deg,#9bd5b1,#2f7a45)!important;border-radius:999px!important}
    .weight-row b{text-align:right!important;color:#22364d!important;font-size:11px!important}
    .name-grid{display:flex!important;flex-wrap:wrap!important;gap:7px!important;align-content:flex-start!important;min-height:92px!important}
    .name-token{display:inline-flex!important;align-items:center!important;gap:6px!important;padding:6px 8px!important;border-radius:999px!important;background:#fff3e7!important;border:1px solid #f4d2a9!important;color:#9a4f0b!important;font-weight:900!important;font-size:calc(11px * var(--power))!important;line-height:1!important}
    .name-token b{display:grid!important;place-items:center!important;min-width:18px!important;height:18px!important;border-radius:999px!important;background:#fff!important;border:1px solid #f4d2a9!important;color:#7a3d07!important;font-size:10px!important}
    .scatter-clean{width:100%!important;height:168px!important;overflow:visible!important;background:#fbfcfe!important;border:1px solid #e3eaf2!important;border-radius:8px!important}
    .scatter-clean .axis{stroke:#9aa8b8!important;stroke-width:1.2!important}
    .scatter-clean .grid{stroke:#e1e8f0!important;stroke-width:1!important}
    .scatter-clean .point{fill:#24548d!important;stroke:#fff!important;stroke-width:2!important}
    .scatter-clean .point.alt{fill:#f08a24!important}
    .scatter-clean text{font-size:9px!important;fill:#475569!important;font-weight:800!important}
    .mini-insights{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:8px!important;margin-top:10px!important}
    .mini-insight{padding:8px!important;border-radius:8px!important;border:1px solid #dfe7f0!important;background:#fbfcfe!important}
    .mini-insight span{font-size:10px!important;color:#69788d!important;text-transform:uppercase!important;font-weight:800!important;letter-spacing:.04em!important}
    .mini-insight b{display:block!important;margin-top:4px!important;color:#22364d!important;font-size:13px!important;line-height:1.1!important}
    .empty-mini{display:grid!important;place-items:center!important;min-height:80px!important;border:1px dashed #cbd5e1!important;border-radius:8px!important;color:#64748b!important;font-size:12px!important;background:#fbfcfe!important}
    @media(max-width:1100px){.data-lab-grid{grid-template-columns:1fr!important}.lab-card.large,.lab-card.full{grid-column:auto!important}.lab-kpis,.mini-insights{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
    @media(max-width:680px){.data-lab-grid{padding:8px!important;gap:8px!important}.lab-card{padding:9px!important;border-radius:7px!important}.lab-kpis{grid-template-columns:1fr 1fr!important;gap:6px!important}.lab-kpi{padding:7px!important;min-height:54px!important}.lab-kpi b{font-size:15px!important}.timeline-chart{height:145px!important;gap:3px!important}.date-track{height:88px!important}.date-slot b{font-size:8px!important;writing-mode:vertical-rl!important;margin:auto!important}.team-row{grid-template-columns:70px 1fr 32px!important}.mini-insights{grid-template-columns:1fr!important}}
  `;
  document.head.appendChild(style);
}

function labCard(title, subtitle, body, extra = '') {
  return `<article class="lab-card ${extra}"><div class="lab-head"><div><b>${title}</b><span>${subtitle}</span></div></div>${body}</article>`;
}

function renderDataLab(tickets) {
  ensureDataLabStyle();
  document.querySelector('.data-lab-panel')?.remove();

  const total = tickets.length;
  const safeTotal = Math.max(1, total);
  const sex = countBy(tickets.map((ticket) => ticket.sex));
  const girl = sex.find((item) => item.label === 'Fille')?.count || 0;
  const boy = sex.find((item) => item.label === 'Garçon')?.count || 0;
  const surprise = Math.max(0, total - girl - boy);
  const dates = DATE_LABELS.map((date) => ({ date, count: tickets.filter((ticket) => ticket.date === date).length }));
  const maxDate = safeMax(dates.map((date) => date.count));
  const weights = countBy(tickets.map((ticket) => bucketWeight(ticket.weight)).filter(Boolean));
  const maxWeight = safeMax(weights.map((weight) => weight.count));
  const names = countBy(tickets.map((ticket) => ticket.firstName).filter((name) => name && name !== 'Prénom mystère')).slice(0, 10);
  const maxName = safeMax(names.map((name) => name.count));
  const points = tickets.filter((ticket) => ticket.weight != null && ticket.height != null);
  const avgWeight = avg(points.map((ticket) => ticket.weight));
  const avgHeight = avg(points.map((ticket) => ticket.height));
  const minW = Math.min(2.6, ...points.map((point) => point.weight));
  const maxW = Math.max(4.3, ...points.map((point) => point.weight));
  const minH = Math.min(45, ...points.map((point) => point.height));
  const maxH = Math.max(55, ...points.map((point) => point.height));
  const topDate = dates.slice().sort((a, b) => b.count - a.count)[0];
  const topSex = topItem(sex);
  const topName = topItem(names, 'Aucun favori');
  const noteCount = tickets.filter((ticket) => ticket.note).length;

  const kpis = `
    <div class="lab-kpis">
      <div class="lab-kpi"><span>Tickets</span><b>${total}</b><small>pronostics enregistrés</small></div>
      <div class="lab-kpi"><span>Sexe favori</span><b>${topSex}</b><small>${sex[0]?.count || 0}/${safeTotal} votes</small></div>
      <div class="lab-kpi"><span>Date favorite</span><b>${topDate?.count ? topDate.date : '—'}</b><small>${topDate?.count || 0} vote${(topDate?.count || 0) > 1 ? 's' : ''}</small></div>
      <div class="lab-kpi"><span>Messages</span><b>${noteCount}/${total}</b><small>tickets avec petit mot</small></div>
    </div>
  `;

  const teams = labCard('Répartition des équipes', 'Sexe pronostiqué par les collègues', `
    <div class="team-bars">
      <div class="team-row"><span>🎀 Fille</span><div class="team-track"><i class="team-fill pink" style="width:${pct(girl, safeTotal)}%"></i></div><b>${girl}</b></div>
      <div class="team-row"><span>🧢 Garçon</span><div class="team-track"><i class="team-fill" style="width:${pct(boy, safeTotal)}%"></i></div><b>${boy}</b></div>
      <div class="team-row"><span>🎁 Surprise</span><div class="team-track"><i class="team-fill gold" style="width:${pct(surprise, safeTotal)}%"></i></div><b>${surprise}</b></div>
    </div>
    <div class="mini-insights">
      <div class="mini-insight"><span>Favori</span><b>${topSex}</b></div>
      <div class="mini-insight"><span>Prénom</span><b>${cssEscapeText(topName)}</b></div>
      <div class="mini-insight"><span>Participation</span><b>${noteCount ? 'Messages OK' : 'À lancer'}</b></div>
    </div>
  `, 'large');

  const timeline = labCard('Timeline des dates', 'Volume de paris autour du terme officiel', `
    <div class="timeline-chart">
      ${dates.map((date) => `<div class="date-slot ${date.date === TERM_LABEL ? 'term' : ''}"><div class="date-track"><i style="height:${date.count ? 12 + date.count / maxDate * 88 : 0}%"></i></div><b>${date.date}</b><small>${date.count}</small></div>`).join('')}
    </div>
  `, 'large');

  const weightCard = labCard('Poids estimé', 'Distribution par tranches', `
    <div class="weight-bars">
      ${weights.length ? weights.map((weight) => `<div class="weight-row"><span>${weight.label}</span><div><i style="width:${weight.count / maxWeight * 100}%"></i></div><b>${weight.count}</b></div>`).join('') : '<div class="empty-mini">Pas assez de données.</div>'}
    </div>
    <div class="mini-insights">
      <div class="mini-insight"><span>Moyenne</span><b>${avgWeight ? avgWeight.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' kg' : '—'}</b></div>
      <div class="mini-insight"><span>Taille moy.</span><b>${avgHeight ? Math.round(avgHeight) + ' cm' : '—'}</b></div>
      <div class="mini-insight"><span>Échantillon</span><b>${points.length}/${total}</b></div>
    </div>
  `);

  const nameCard = labCard('Prénoms proposés', 'Nuage pondéré par fréquence', `
    <div class="name-grid">
      ${names.length ? names.map((name) => `<span class="name-token" style="--power:${0.9 + name.count / maxName * 0.35}">${cssEscapeText(name.label)}<b>${name.count}</b></span>`).join('') : '<div class="empty-mini">Pas encore de prénoms.</div>'}
    </div>
  `);

  const scatter = labCard('Morphologie du pari', 'Poids × taille, chaque point représente un ticket', points.length ? `
    <svg class="scatter-clean" viewBox="0 0 420 168" preserveAspectRatio="none">
      <line class="grid" x1="46" y1="36" x2="394" y2="36"></line>
      <line class="grid" x1="46" y1="76" x2="394" y2="76"></line>
      <line class="grid" x1="46" y1="116" x2="394" y2="116"></line>
      <line class="axis" x1="46" y1="140" x2="394" y2="140"></line>
      <line class="axis" x1="46" y1="18" x2="46" y2="140"></line>
      ${points.map((point, index) => {
        const x = 54 + ((point.weight - minW) / Math.max(0.1, maxW - minW)) * 326;
        const y = 132 - ((point.height - minH) / Math.max(1, maxH - minH)) * 104;
        return `<g><circle cx="${x}" cy="${y}" r="${point.note ? 7 : 5}" class="point ${index % 2 ? 'alt' : ''}"><title>${cssEscapeText(point.player)} · ${point.weightLabel} · ${point.heightLabel}</title></circle><text x="${x + 9}" y="${y + 4}">${cssEscapeText(point.player.slice(0, 2).toUpperCase())}</text></g>`;
      }).join('')}
      <text x="324" y="160">poids</text><text x="8" y="24">taille</text>
    </svg>
  ` : '<div class="empty-mini">Pas assez de données.</div>', 'full');

  const panel = document.createElement('section');
  panel.className = 'data-lab-panel';
  panel.innerHTML = `
    <div class="panel-title"><span>📊</span><div><h2>Data Lab</h2><p>Lecture rapide des pronostics : tendances, clusters et signaux faibles.</p></div></div>
    <div class="data-lab-grid">
      <article class="lab-card full">${kpis}</article>
      ${teams}${timeline}${weightCard}${nameCard}${scatter}
    </div>
  `;
  const admin = document.querySelector('.admin-panel');
  if (admin) admin.parentNode.insertBefore(panel, admin);
}

function enhance() {
  const tickets = readTickets();
  if (!tickets.length) return;
  renderTicketTags(tickets);
  injectTicketMessages(tickets);
  renderDataLab(tickets);
}

const timer = setInterval(() => {
  if (document.querySelector('.tickets-panel') && document.querySelector('.admin-panel')) {
    clearInterval(timer);
    enhance();
  }
}, 250);
setInterval(enhance, 20000);
