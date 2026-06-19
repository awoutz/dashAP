import './guestbook-ticket.css';

const SUPABASE_URL = 'https://btxmplbdeovyxytxdkzx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_3x3PgMOTCmGx8HySJ-zDmw_kfdbfFpg';

const initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?';

async function loadMessages() {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/guestbook_messages?select=id,player,note,sort_order,created_at&order=sort_order.asc,created_at.asc`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!response.ok) throw new Error(`Supabase ${response.status}`);
  return response.json();
}

function openModal(item) {
  document.querySelector('[data-guestbook-modal]')?.remove();
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.dataset.guestbookModal = 'true';
  const modal = document.createElement('div');
  modal.className = 'modal-card';
  modal.innerHTML = '<button class="modal-close" type="button">×</button><div class="ticket-big-avatar"></div><h2></h2><div class="guestbook-tags-main"><span class="guestbook-tag">💌 Message de la cagnotte</span></div><p style="white-space:pre-line"></p>';
  modal.querySelector('.ticket-big-avatar').textContent = initials(item.player);
  modal.querySelector('h2').textContent = item.player;
  modal.querySelector('p').textContent = item.note;
  modal.querySelector('.modal-close').addEventListener('click', () => backdrop.remove());
  modal.addEventListener('click', (event) => event.stopPropagation());
  backdrop.addEventListener('click', () => backdrop.remove());
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
}

function createTicket(item) {
  const ticket = document.createElement('button');
  ticket.type = 'button';
  ticket.className = 'guestbook-ticket';
  ticket.dataset.guestbookTicket = String(item.id);
  ticket.innerHTML = '<div class="ticket-top"><span></span><b></b></div><div class="guestbook-tags-main"><span class="guestbook-tag">💌 Message de la cagnotte</span></div><div class="ticket-note"><span>Message</span><p></p></div>';
  ticket.querySelector('.ticket-top span').textContent = initials(item.player);
  ticket.querySelector('.ticket-top b').textContent = item.player;
  ticket.querySelector('.ticket-note p').textContent = item.note;
  ticket.addEventListener('click', () => openModal(item));
  return ticket;
}

function updateCounters(total) {
  const subtitle = document.querySelector('.tickets-panel .panel-title p');
  if (subtitle) subtitle.textContent = `${total} tickets enregistrés.`;
  document.querySelectorAll('.metric').forEach((metric) => {
    if (metric.querySelector('span')?.textContent?.trim() === 'Tickets') {
      const value = metric.querySelector('strong');
      if (value) value.textContent = String(total);
    }
  });
}

function render(items) {
  const wall = document.querySelector('.tickets-wall');
  if (!wall) return false;
  if (wall.dataset.guestbookV2Loaded === 'true') return true;
  wall.querySelectorAll('[data-guestbook-ticket]').forEach((node) => node.remove());
  items.forEach((item) => wall.appendChild(createTicket(item)));
  wall.dataset.guestbookV2Loaded = 'true';
  updateCounters(wall.querySelectorAll('.ticket').length + items.length);
  return true;
}

async function init() {
  try {
    const items = await loadMessages();
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      const ready = document.querySelectorAll('.tickets-wall .ticket').length > 0;
      if ((ready || attempts >= 50) && render(items)) window.clearInterval(timer);
      if (attempts >= 100) window.clearInterval(timer);
    }, 100);
  } catch (error) {
    console.error('Chargement des messages cagnotte impossible', error);
  }
}

init();
