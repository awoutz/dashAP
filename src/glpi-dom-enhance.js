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
      weight: parseNumber(facts[0]),
      height: parseNumber(facts[1]),
      note: messages.get(player) || '',
    };
  }).filter((ticket) => ticket.player);
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

function chartCard(title, subtitle, body) {
  return `<article class="chart-card"><div class="chart-head"><b>${title}</b><span>${subtitle}</span></div>${body}</article>`;
}

function renderDataLab(tickets) {
  document.querySelector('.data-lab-panel')?.remove();
  const total = Math.max(1, tickets.length);
  const sex = countBy(tickets.map((ticket) => ticket.sex));
  const girl = sex.find((item) => item.label === 'Fille')?.count || 0;
  const boy = sex.find((item) => item.label === 'Garçon')?.count || 0;
  const surprise = Math.max(0, tickets.length - girl - boy);
  const girlPct = Math.round((girl / total) * 100);
  const boyPct = Math.round((boy / total) * 100);
  const dates = DATE_LABELS.map((date) => ({ date, count: tickets.filter((ticket) => ticket.date === date).length }));
  const maxDate = Math.max(1, ...dates.map((date) => date.count));
  const weights = countBy(tickets.map((ticket) => bucketWeight(ticket.weight)).filter(Boolean));
  const maxWeight = Math.max(1, ...weights.map((weight) => weight.count));
  const names = countBy(tickets.map((ticket) => ticket.firstName).filter((name) => name && name !== 'Prénom mystère')).slice(0, 10);
  const maxName = Math.max(1, ...names.map((name) => name.count));
  const points = tickets.filter((ticket) => ticket.weight != null && ticket.height != null);
  const minW = Math.min(2.6, ...points.map((point) => point.weight));
  const maxW = Math.max(4.3, ...points.map((point) => point.weight));
  const minH = Math.min(45, ...points.map((point) => point.height));
  const maxH = Math.max(55, ...points.map((point) => point.height));

  const donut = chartCard('Répartition sexe', 'Lecture synthétique', `<div class="donut-wrap"><div class="donut" style="background:conic-gradient(#fb7185 0 ${girlPct}%, #60a5fa ${girlPct}% ${girlPct + boyPct}%, #facc15 ${girlPct + boyPct}% 100%)"><b>${sex[0]?.label || '—'}</b><span>majoritaire</span></div><div class="legend"><div class="legend-row pink"><i></i><span>Fille</span><b>${girl}</b></div><div class="legend-row blue"><i></i><span>Garçon</span><b>${boy}</b></div><div class="legend-row gold"><i></i><span>Surprise</span><b>${surprise}</b></div></div></div>`);
  const dateBars = chartCard('Heatmap dates', 'Jours les plus joués', `<div class="date-bars">${dates.map((date) => `<div class="date-bar ${date.date === TERM_LABEL ? 'term' : ''}"><div class="bar-track"><span style="height:${10 + date.count / maxDate * 90}%"></span></div><b>${date.date}</b><small>${date.count}</small></div>`).join('')}</div>`);
  const histo = chartCard('Histogramme poids', 'Tranches en kg', `<div class="histo">${weights.length ? weights.map((weight) => `<div class="histo-row"><span>${weight.label}</span><div><i style="width:${weight.count / maxWeight * 100}%"></i></div><b>${weight.count}</b></div>`).join('') : '<div class="empty-mini">Pas assez de données.</div>'}</div>`);
  const cloud = chartCard('Nuage prénoms', 'Fréquence', `<div class="name-cloud">${names.length ? names.map((name) => `<span style="--power:${0.75 + name.count / maxName * .55}">${name.label}<b>${name.count}</b></span>`).join('') : '<div class="empty-mini">Pas encore de prénoms.</div>'}</div>`);
  const scatter = chartCard('Poids × taille', 'Scatterplot', points.length ? `<svg class="scatter" viewBox="0 0 360 155"><line x1="34" y1="128" x2="336" y2="128"></line><line x1="34" y1="18" x2="34" y2="128"></line><line class="gridline" x1="34" x2="336" y1="54" y2="54"></line><line class="gridline" x1="34" x2="336" y1="91" y2="91"></line>${points.map((point, index) => { const x = 42 + ((point.weight - minW) / Math.max(1, maxW - minW)) * 286; const y = 122 - ((point.height - minH) / Math.max(1, maxH - minH)) * 100; return `<g><circle cx="${x}" cy="${y}" r="${point.note ? 7 : 5}" class="point ${index % 2 ? 'alt' : ''}"><title>${point.player}</title></circle><text x="${x + 8}" y="${y + 4}">${point.player.slice(0, 2).toUpperCase()}</text></g>`; }).join('')}<text class="axis-label" x="260" y="150">poids</text><text class="axis-label" x="4" y="24">taille</text></svg>` : '<div class="empty-mini">Pas assez de données.</div>');

  const panel = document.createElement('section');
  panel.className = 'data-lab-panel';
  panel.innerHTML = `<div class="panel-title"><span>📊</span><div><h2>Data Lab</h2><p>Mode analyste GLPI : lecture visuelle des pronostics.</p></div></div><div class="data-lab-grid">${donut}${dateBars}${histo}${cloud}${scatter}</div>`;
  const admin = document.querySelector('.admin-panel');
  if (admin) admin.parentNode.insertBefore(panel, admin);
}

function enhance() {
  const tickets = readTickets();
  if (!tickets.length) return;
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
