import './guestbook-safe.js';

function injectTicketResponsiveFix(){
  if (document.getElementById('ticket-responsive-fix-style')) return;
  const style = document.createElement('style');
  style.id = 'ticket-responsive-fix-style';
  style.textContent = `
    .tickets-panel{overflow:visible!important;background:#fff!important}
    .tickets-panel:before{border-bottom:1px solid #dfe7ef!important;background:#f8fafc!important}
    .tickets-wall{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(min(100%,330px),1fr))!important;gap:12px!important;padding:12px!important;border:0!important;align-items:stretch!important;overflow:visible!important;background:#fff!important}
    .tickets-panel .ticket{position:relative!important;height:auto!important;min-height:238px!important;max-height:none!important;padding:12px!important;display:grid!important;grid-template-rows:auto auto auto auto!important;align-content:start!important;gap:10px!important;border:1px solid #d6e0eb!important;border-radius:9px!important;background:linear-gradient(180deg,#ffffff 0%,#fbfcfe 100%)!important;box-shadow:0 1px 0 rgba(15,23,42,.035)!important;overflow:visible!important;cursor:pointer!important;transition:border-color .12s ease,box-shadow .12s ease,transform .12s ease!important}
    .tickets-panel .ticket:hover{background:#fffdf6!important;border-color:#dfbf6a!important;box-shadow:0 6px 18px rgba(15,23,42,.06)!important;transform:translateY(-1px)!important}
    .tickets-panel .ticket:before{right:10px!important;top:10px!important;background:#eaf7ef!important;border:1px solid #b9e5c5!important;color:#087a2d!important;border-radius:4px!important;padding:4px 7px!important;font-size:10px!important;font-weight:900!important;line-height:1!important;z-index:2!important}
    .tickets-panel .ticket-top{display:grid!important;grid-template-columns:30px minmax(0,1fr) 44px!important;align-items:center!important;gap:9px!important;margin:0!important;min-width:0!important}
    .tickets-panel .ticket-top span{display:grid!important;place-items:center!important;width:30px!important;height:30px!important;border-radius:7px!important;background:#dbeaf8!important;color:#24548d!important;font-size:12px!important;font-weight:900!important;border:1px solid #c4d8ec!important;grid-column:1!important}
    .tickets-panel .ticket-top b{grid-column:2!important;min-width:0!important;padding:0!important;color:#164780!important;font-size:14px!important;font-weight:900!important;text-align:right!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
    .tickets-panel .ticket-prediction,.tickets-panel .ticket-facts{display:none!important}
    .ticket-tags-main{display:flex!important;align-items:flex-start!important;gap:6px!important;flex-wrap:wrap!important;margin:0!important;max-height:none!important;overflow:visible!important;min-width:0!important}
    .ticket-tag{display:inline-flex!important;align-items:center!important;justify-content:center!important;min-height:24px!important;padding:4px 8px!important;border-radius:999px!important;font-size:11px!important;line-height:1!important;font-weight:800!important;border:1px solid transparent!important;white-space:nowrap!important;max-width:100%!important;overflow:hidden!important;text-overflow:ellipsis!important}
    .tag-date{background:#e8f2ff!important;border-color:#c5dcfb!important;color:#24548d!important}.tag-sex{background:#f5edff!important;border-color:#dfcdfa!important;color:#6e44b8!important}.tag-name{background:#fff3e7!important;border-color:#f4d2a9!important;color:#b56416!important}.tag-weight{background:#edf9ef!important;border-color:#cbe6cf!important;color:#2f7a45!important}.tag-height{background:#eef3f8!important;border-color:#d7e0ea!important;color:#516174!important}
    .tickets-panel .ticket-note,.tickets-panel .ticket-note-empty{margin:0!important;padding:9px 10px!important;min-height:74px!important;height:auto!important;max-height:none!important;border-radius:0!important;background:#fbfcff!important;border:1px solid #d9e0ea!important;border-left:4px solid #8b70c9!important;overflow:hidden!important;align-self:stretch!important}
    .tickets-panel .ticket-note-empty{border-left-color:#cbd5e1!important;color:#94a3b8!important;border-style:dashed!important}
    .tickets-panel .ticket-note span,.tickets-panel .ticket-note-empty span{display:block!important;line-height:1!important;margin:0!important;font-size:10px!important;font-weight:900!important;letter-spacing:.06em!important;text-transform:uppercase!important;color:#667085!important}
    .tickets-panel .ticket-note p,.tickets-panel .ticket-note-empty p{margin:5px 0 0!important;font-size:12px!important;line-height:1.28!important;color:#25364a!important;display:-webkit-box!important;-webkit-line-clamp:3!important;-webkit-box-orient:vertical!important;overflow:hidden!important}
    .tickets-panel .ticket-note-empty p{color:#94a3b8!important}
    .tickets-panel .ticket:has(.ticket-note) .ticket-note-empty{display:none!important}
    .tickets-panel .ticket-badges{margin-top:0!important;padding-top:9px!important;border-top:1px solid #edf1f5!important;gap:6px!important;display:flex!important;flex-wrap:wrap!important;max-height:none!important;overflow:visible!important;align-self:end!important}
    .tickets-panel .ticket-badges span{min-height:23px!important;padding:4px 8px!important;border-radius:999px!important;border:1px solid #d9e1ea!important;background:#f8fafc!important;color:#536274!important;font-size:10px!important;font-weight:700!important;line-height:1!important;white-space:nowrap!important;max-width:100%!important;overflow:hidden!important;text-overflow:ellipsis!important}
    @media(max-width:1100px){.tickets-wall{grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))!important}}
    @media(max-width:680px){.tickets-wall{grid-template-columns:1fr!important;padding:8px!important;gap:8px!important}.tickets-panel .ticket{padding:10px!important;gap:8px!important;min-height:0!important}.tickets-panel .ticket-top{grid-template-columns:28px minmax(0,1fr) 42px!important}.tickets-panel .ticket-top span{width:28px!important;height:28px!important}.ticket-tag,.tickets-panel .ticket-badges span{font-size:10px!important;padding:4px 7px!important}.tickets-panel .ticket-note,.tickets-panel .ticket-note-empty{min-height:70px!important}}
  `;
  document.head.appendChild(style);
}
function normalizeTicketCards(){
  document.querySelectorAll('.tickets-panel .ticket').forEach((ticket)=>{
    const hasNote = ticket.querySelector('.ticket-note');
    const existing = ticket.querySelector('.ticket-note-empty');
    if (hasNote && existing) existing.remove();
    if (!hasNote && !existing) {
      const empty = document.createElement('div');
      empty.className = 'ticket-note-empty';
      empty.innerHTML = '<span>Message</span><p>—</p>';
      const badges = ticket.querySelector('.ticket-badges');
      if (badges) ticket.insertBefore(empty, badges);
      else ticket.appendChild(empty);
    }
  });
}
function bootTicketFix(){ injectTicketResponsiveFix(); normalizeTicketCards(); }
const ticketTimer = setInterval(bootTicketFix, 250);
setTimeout(()=>clearInterval(ticketTimer), 10000);
new MutationObserver(bootTicketFix).observe(document.getElementById('root') || document.body, { childList: true, subtree: true });
bootTicketFix();
