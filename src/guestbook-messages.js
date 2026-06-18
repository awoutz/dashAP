const SUPABASE_URL = 'https://btxmplbdeovyxytxdkzx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_3x3PgMOTCmGx8HySJ-zDmw_kfdbfFpg';

let guestMessages = [];
let loading = false;

async function loadGuestMessages() {
  if (loading || guestMessages.length) return;
  loading = true;
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/guestbook_messages?select=id,player,note,sort_order,created_at&order=sort_order.asc`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    guestMessages = await response.json();
    renderGuestMessages();
  } catch (error) {
    console.error('Impossible de charger les messages de la cagnotte', error);
  } finally {
    loading = false;
  }
}

function renderGuestMessages() {
  const panel = document.querySelector('.message-wall-panel');
  const wall = panel?.querySelector('.message-wall');
  if (!panel || !wall || !guestMessages.length) return;

  const subtitle = panel.querySelector('.panel-title p');
  if (subtitle) subtitle.textContent = 'Les messages des paris et de la cagnotte sont réunis ici.';

  wall.querySelectorAll('[data-guestbook-message]').forEach((node) => node.remove());
  const empty = wall.querySelector('.empty-state');
  if (empty) empty.remove();

  guestMessages.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'message-card';
    card.dataset.guestbookMessage = String(item.id);

    const author = document.createElement('b');
    author.textContent = item.player;

    const message = document.createElement('p');
    message.textContent = `“${item.note}”`;
    message.style.whiteSpace = 'pre-line';

    card.append(author, message);
    wall.appendChild(card);
  });
}

const observer = new MutationObserver(() => {
  if (document.querySelector('.message-wall-panel')) {
    loadGuestMessages();
    renderGuestMessages();
  }
});

observer.observe(document.documentElement, { childList: true, subtree: true });
loadGuestMessages();
