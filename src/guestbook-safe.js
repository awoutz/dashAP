const SUPABASE_URL = 'https://btxmplbdeovyxytxdkzx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_3x3PgMOTCmGx8HySJ-zDmw_kfdbfFpg';

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

async function startGuestbook() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/guestbook_messages?select=id,player,note,sort_order,created_at&order=sort_order.asc`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const items = await response.json();
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      const panel = document.querySelector('.message-wall-panel');
      const wall = panel?.querySelector('.message-wall');
      const ticketsReady = document.querySelectorAll('.tickets-wall .ticket').length > 0;
      if (!ticketsReady || !wall) {
        if (attempts >= 120) window.clearInterval(timer);
        return;
      }
      const subtitle = panel.querySelector('.panel-title p');
      if (subtitle) subtitle.textContent = 'Les messages des paris et de la cagnotte sont réunis ici.';
      wall.querySelector('.empty-state')?.remove();
      for (const item of items) {
        if (wall.querySelector(`[data-guestbook-message="${item.id}"]`)) continue;
        const card = document.createElement('article');
        card.className = 'message-card';
        card.dataset.guestbookMessage = String(item.id);
        const heading = document.createElement('div');
        const author = document.createElement('b');
        author.textContent = item.player;
        heading.appendChild(author);
        const date = formatDate(item.created_at);
        if (date) {
          const dateLabel = document.createElement('small');
          dateLabel.textContent = ` · ${date}`;
          heading.appendChild(dateLabel);
        }
        const message = document.createElement('p');
        message.textContent = `“${item.note}”`;
        message.style.whiteSpace = 'pre-line';
        card.append(heading, message);
        wall.appendChild(card);
      }
      window.clearInterval(timer);
    }, 250);
  } catch (error) {
    console.error('Impossible de charger les messages de la cagnotte', error);
  }
}

startGuestbook();
