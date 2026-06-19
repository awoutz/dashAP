const SUPABASE_URL = 'https://btxmplbdeovyxytxdkzx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_3x3PgMOTCmGx8HySJ-zDmw_kfdbfFpg';

function initials(name) {
  return String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?';
}

async function loadGuestbook() {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/guestbook_messages?select=id,player,note,sort_order,created_at&order=sort_order.asc,created_at.asc`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });

  if (!response.ok) throw new Error(`Supabase ${response.status}`);
  return response.json();
}

function openMessageModal(item) {
  document.querySelector('[data-guestbook-modal]')?.remove();

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.dataset.guestbookModal = 'true';

  const modal = document.createElement('div');
  modal.className = 'modal-card';
  modal.innerHTML = `
    <button class="modal-close" type="button">×</button>
    <div class="ticket-big-avatar"></div>
    <h2></h2>
    <p style="white-space:pre-line"></p>
    <div class="ticket-meta ticket-badges modal-badges"><span>💌 Message de la cagnotte</span></div>
  `;

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
  ticket.className = 'ticket';
  ticket.dataset.guestbookTicket = String(item.id);
  ticket.innerHTML = `
    <div class="ticket-top"><span></span><b></b></div>
    <div class="ticket-prediction">💌 Message de la cagnotte</div>
    <div class="ticket-meta ticket-facts"><span></span></div>
    <div class="ticket-meta ticket-badges"><span>💌 Message uniquement</span></div>
  `;

  ticket.querySelector('.ticket-top span').textContent = initials(item.player);
  ticket.querySelector('.ticket-top b').textContent = item.player;
  ticket.querySelector('.ticket-facts span').textContent = item.note;
  ticket.addEventListener('click', () => openMessageModal(item));
  return ticket;
}

function createMessage(item) {
  const card = document.createElement('article');
  card.className = 'message-card';
  card.dataset.guestbookMessage = String(item.id);

  const name = document.createElement('b');
  name.textContent = item.player;

  const note = document.createElement('p');
  note.style.whiteSpace = 'pre-line';
  note.textContent = `“${item.note}”`;

  card.append(name, note);
  return card;
}

function updateCounters(total) {
  const title = document.querySelector('.tickets-panel .panel-title p');
  if (title) title.textContent = `${total} tickets enregistrés.`;

  document.querySelectorAll('.metric').forEach((metric) => {
    if (metric.querySelector('span')?.textContent?.trim() === 'Tickets') {
      const value = metric.querySelector('strong');
      if (value) value.textContent = String(total);
    }
  });

  const messageTitle = document.querySelector('.message-wall-panel .panel-title p');
  if (messageTitle) messageTitle.textContent = 'Les messages des paris et de la cagnotte sont réunis ici.';
}

function renderGuestbook(items) {
  const ticketsWall = document.querySelector('.tickets-wall');
  const messageWall = document.querySelector('.message-wall');
  if (!ticketsWall || !messageWall) return false;
  if (ticketsWall.dataset.guestbookLoaded === 'true') return true;

  messageWall.querySelector('.empty-state')?.remove();
  items.forEach((item) => {
    ticketsWall.appendChild(createTicket(item));
    messageWall.appendChild(createMessage(item));
  });

  ticketsWall.dataset.guestbookLoaded = 'true';
  const originalCount = ticketsWall.querySelectorAll('.ticket:not([data-guestbook-ticket])').length;
  updateCounters(originalCount + items.length);
  return true;
}

async function initGuestbook() {
  try {
    const items = await loadGuestbook();
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      const existingTickets = document.querySelectorAll('.tickets-wall .ticket').length;
      if ((existingTickets > 0 || attempts >= 50) && renderGuestbook(items)) {
        window.clearInterval(timer);
      }
      if (attempts >= 100) window.clearInterval(timer);
    }, 100);
  } catch (error) {
    console.error('Chargement des messages cagnotte impossible', error);
  }
}

initGuestbook();
