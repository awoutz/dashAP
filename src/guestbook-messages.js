const SUPABASE_URL = 'https://btxmplbdeovyxytxdkzx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_3x3PgMOTCmGx8HySJ-zDmw_kfdbfFpg';

let guestMessages = [];
let loading = false;
let scheduled = false;

function injectGuestbookStyles() {
  if (document.getElementById('guestbook-front-style')) return;
  const style = document.createElement('style');
  style.id = 'guestbook-front-style';
  style.textContent = `
    .tickets-panel .ticket-first-name-highlight{
      display:flex!important;align-items:center!important;gap:7px!important;
      min-width:0!important;margin:0!important;padding:7px 9px!important;
      border:1px solid #f1d5ad!important;border-radius:7px!important;
      background:#fff7ed!important;color:#a65312!important;
      font-size:11px!important;font-weight:800!important;line-height:1.15!important;
    }
    .tickets-panel .ticket-first-name-highlight strong{
      min-width:0!important;overflow:hidden!important;text-overflow:ellipsis!important;
      white-space:nowrap!important;color:#8f430d!important;font-size:12px!important;
    }
    .tickets-panel .ticket-tags-main .tag-name{display:none!important}
    .guest-message-card{
      position:relative!important;display:flex!important;flex-direction:column!important;
      min-width:0!important;min-height:238px!important;padding:14px!important;gap:12px!important;
      border:1px solid #d9d4e8!important;border-left:5px solid #8b70c9!important;
      border-radius:9px!important;background:linear-gradient(180deg,#fff 0%,#fbf9ff 100%)!important;
      box-shadow:0 1px 0 rgba(15,23,42,.035)!important;overflow:hidden!important;
    }
    .guest-message-card:before{
      content:'CAGNOTTE'!important;position:absolute!important;right:10px!important;top:10px!important;
      padding:4px 7px!important;border:1px solid #ded1f5!important;border-radius:4px!important;
      background:#f4efff!important;color:#6d4ca8!important;font-size:9px!important;
      font-weight:900!important;letter-spacing:.05em!important;line-height:1!important;
    }
    .guest-message-head{display:grid!important;grid-template-columns:32px minmax(0,1fr) 74px!important;align-items:center!important;gap:9px!important;min-width:0!important}
    .guest-message-avatar{display:grid!important;place-items:center!important;width:32px!important;height:32px!important;border-radius:8px!important;background:#ebe3fb!important;border:1px solid #d8c8f1!important;color:#6945a1!important;font-size:11px!important;font-weight:900!important}
    .guest-message-name{min-width:0!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;color:#553683!important;font-size:14px!important;font-weight:900!important}
    .guest-message-body{flex:1 1 auto!important;margin:0!important;padding:11px 12px!important;border:1px solid #e1dbea!important;border-left:4px solid #8b70c9!important;background:#fff!important;color:#27364a!important;font-size:12px!important;line-height:1.42!important;white-space:pre-line!important;overflow-wrap:anywhere!important}
    .guest-message-foot{margin-top:auto!important;padding-top:9px!important;border-top:1px solid #ebe6f2!important;color:#7b6c91!important;font-size:10px!important;font-weight:800!important;text-transform:uppercase!important;letter-spacing:.05em!important}
    @media(max-width:680px){
      .guest-message-card{min-height:0!important;padding:11px!important;gap:9px!important}
      .guest-message-head{grid-template-columns:30px minmax(0,1fr) 68px!important}
      .guest-message-avatar{width:30px!important;height:30px!important}
      .guest-message-body{padding:9px 10px!important;font-size:12px!important}
    }
  `;
  document.head.appendChild(style);
}

function initials(name) {
  return String(name || '?').trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?';
}

function restorePredictedNames() {
  document.querySelectorAll('.tickets-panel .ticket').forEach((ticket) => {
    const prediction = ticket.querySelector('.ticket-prediction')?.textContent || '';
    const firstName = prediction.split('·').map((part) => part.trim())[2] || 'Prénom mystère';
    let highlight = ticket.querySelector('.ticket-first-name-highlight');
    if (!highlight) {
      highlight = document.createElement('div');
      highlight.className = 'ticket-first-name-highlight';
      const icon = document.createElement('span');
      icon.textContent = '✨';
      const label = document.createElement('span');
      label.textContent = 'Prénom parié :';
      const value = document.createElement('strong');
      highlight.append(icon, label, value);
      const tags = ticket.querySelector('.ticket-tags-main');
      const top = ticket.querySelector('.ticket-top');
      if (tags) ticket.insertBefore(highlight, tags);
      else if (top) top.insertAdjacentElement('afterend', highlight);
      else ticket.prepend(highlight);
    }
    const value = highlight.querySelector('strong');
    if (value) value.textContent = firstName;
  });
}

function createGuestCard(item) {
  const card = document.createElement('article');
  card.className = 'guest-message-card';
  card.dataset.guestbookMessage = String(item.id);

  const head = document.createElement('div');
  head.className = 'guest-message-head';

  const avatar = document.createElement('span');
  avatar.className = 'guest-message-avatar';
  avatar.textContent = initials(item.player);

  const name = document.createElement('strong');
  name.className = 'guest-message-name';
  name.textContent = item.player;

  const body = document.createElement('p');
  body.className = 'guest-message-body';
  body.textContent = item.note;

  const foot = document.createElement('div');
  foot.className = 'guest-message-foot';
  foot.textContent = 'Message laissé dans la cagnotte';

  head.append(avatar, name);
  card.append(head, body, foot);
  return card;
}

function renderGuestMessages() {
  const panel = document.querySelector('.tickets-panel');
  const wall = panel?.querySelector('.tickets-wall');
  if (!panel || !wall || !guestMessages.length) return;

  const existingIds = [...wall.querySelectorAll('.guest-message-card')].map((node) => node.dataset.guestbookMessage);
  const wantedIds = guestMessages.map((item) => String(item.id));
  if (!(existingIds.length === wantedIds.length && existingIds.every((id, index) => id === wantedIds[index]))) {
    wall.querySelectorAll('.guest-message-card').forEach((node) => node.remove());
    guestMessages.forEach((item) => wall.appendChild(createGuestCard(item)));
  }

  const betCount = wall.querySelectorAll('.ticket').length;
  const subtitle = panel.querySelector('.panel-title p');
  if (subtitle) subtitle.textContent = `${betCount} paris · ${guestMessages.length} messages de cagnotte, affichés à la fin.`;
}

function refreshFront() {
  injectGuestbookStyles();
  restorePredictedNames();
  renderGuestMessages();
}

function scheduleRefresh() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    refreshFront();
  });
}

async function loadGuestMessages() {
  if (loading || guestMessages.length) return;
  loading = true;
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/guestbook_messages?select=id,player,note,sort_order&order=sort_order.asc`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    guestMessages = await response.json();
    refreshFront();
  } catch (error) {
    console.error('Impossible de charger les messages de la cagnotte', error);
  } finally {
    loading = false;
  }
}

injectGuestbookStyles();
const observer = new MutationObserver(scheduleRefresh);
observer.observe(document.getElementById('root') || document.documentElement, { childList: true, subtree: true });
const timer = setInterval(refreshFront, 350);
setTimeout(() => clearInterval(timer), 12000);
loadGuestMessages();
