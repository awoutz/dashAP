function normalizeGuestbookTickets() {
  document.querySelectorAll('.ticket[data-guestbook-ticket]').forEach((ticket) => {
    if (ticket.dataset.guestbookStyled === 'true') return;

    const note = ticket.querySelector('.ticket-facts span')?.textContent?.trim() || '';
    const prediction = ticket.querySelector('.ticket-prediction');
    const facts = ticket.querySelector('.ticket-facts');
    const badges = ticket.querySelector('.ticket-badges');

    prediction?.remove();
    facts?.remove();
    badges?.remove();

    const tags = document.createElement('div');
    tags.className = 'ticket-tags-main';

    const cagnotteTag = document.createElement('span');
    cagnotteTag.className = 'ticket-tag tag-weight';
    cagnotteTag.textContent = '💌 Message de la cagnotte';
    tags.appendChild(cagnotteTag);

    const messageBox = document.createElement('div');
    messageBox.className = 'ticket-note';

    const label = document.createElement('span');
    label.textContent = 'Message';

    const message = document.createElement('p');
    message.textContent = note;
    message.style.whiteSpace = 'pre-line';

    messageBox.append(label, message);
    ticket.append(tags, messageBox);
    ticket.dataset.guestbookStyled = 'true';
  });
}

const guestbookStyleTimer = window.setInterval(normalizeGuestbookTickets, 150);
window.setTimeout(() => window.clearInterval(guestbookStyleTimer), 15000);

new MutationObserver(normalizeGuestbookTickets).observe(
  document.getElementById('root') || document.body,
  { childList: true, subtree: true },
);

normalizeGuestbookTickets();
