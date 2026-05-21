import React from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import './styles.css';

const SUPABASE_URL = 'https://btxmplbdeovyxytxdkzx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_3x3PgMOTCmGx8HySJ-zDmw_kfdbfFpg';
const CAGNOTTE_URL = 'https://www.lepotcommun.fr/cagnotte/festive/naissance-marine-gv3n7vse';
const TERM_DATE = '2026-06-25';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const defaultBet = {
  player: '',
  birth_date: TERM_DATE,
  sex: 'Fille',
  first_name: '',
  weight: '3.2',
  height: '50',
  note: '',
};

const emptyResult = {
  birth_date: '',
  sex: '',
  first_name: '',
  weight: '',
  height: '',
  show_result: false,
};

const steps = [
  { title: 'Ton nom', subtitle: 'On crée ton ticket.' },
  { title: 'Date et sexe', subtitle: 'Ton premier pronostic.' },
  { title: 'Prénom', subtitle: 'Le pari le plus risqué.' },
  { title: 'Poids et taille', subtitle: 'Le poids se saisit en kg.' },
  { title: 'Message', subtitle: 'Un petit mot pour Marine.' },
  { title: 'Récapitulatif', subtitle: 'Dernière vérification avant sauvegarde.' },
];

function parseNumber(value) {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(String(value).replace(',', '.'));
  return Number.isFinite(number) ? number : null;
}

function toWeightGrams(value) {
  const number = parseNumber(value);
  if (number === null) return null;
  return number <= 20 ? Math.round(number * 1000) : Math.round(number);
}

function gramsToKgInput(value) {
  const grams = toWeightGrams(value);
  if (grams === null) return '';
  return String(Math.round(grams / 100) / 10);
}

function formatWeight(value) {
  const grams = toWeightGrams(value);
  if (grams === null) return '—';
  return `${(grams / 1000).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg`;
}

function formatDate(value, short = false) {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('fr-FR', short ? { day: '2-digit', month: '2-digit' } : undefined);
}

function normalizeName(value) {
  return String(value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function daysBetween(a, b) {
  if (!a || !b) return 9999;
  return Math.abs(Math.round((new Date(`${a}T00:00:00`) - new Date(`${b}T00:00:00`)) / 86400000));
}

function countBy(values) {
  const counts = new Map();
  values.filter(Boolean).forEach((raw) => {
    const value = String(raw).trim();
    if (!value) return;
    counts.set(value, (counts.get(value) || 0) + 1);
  });
  return [...counts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function consensus(values, formatter = (value) => value) {
  const counts = countBy(values);
  const total = counts.reduce((sum, item) => sum + item.count, 0);

  if (!counts.length) return { label: '—', detail: 'Aucun pari' };

  const topCount = counts[0].count;
  const tied = counts.filter((item) => item.count === topCount);

  if (counts.length > 1 && topCount === 1) {
    return { label: 'Aucun favori', detail: `${counts.length} propositions différentes` };
  }

  if (tied.length > 1) {
    return { label: 'Ex æquo', detail: tied.map((item) => formatter(item.label)).join(' · ') };
  }

  const percent = Math.round((topCount / total) * 100);
  return { label: formatter(counts[0].label), detail: `${topCount}/${total} · ${percent}%` };
}

function average(values) {
  const nums = values.map(toWeightGrams).filter((value) => value !== null);
  if (!nums.length) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function scoreBet(bet, result) {
  if (!result.birth_date && !result.sex && !result.first_name && !result.weight && !result.height) {
    return { total: null, details: [] };
  }

  let total = 0;
  const details = [];

  if (result.birth_date) {
    const points = Math.max(0, 35 - daysBetween(bet.birth_date, result.birth_date) * 5);
    total += points;
    details.push(`Date ${points}`);
  }

  if (result.sex) {
    const points = bet.sex === result.sex ? 20 : 0;
    total += points;
    details.push(`Sexe ${points}`);
  }

  if (result.first_name) {
    const points = normalizeName(bet.first_name) === normalizeName(result.first_name) ? 25 : 0;
    total += points;
    details.push(`Prénom ${points}`);
  }

  const betWeight = toWeightGrams(bet.weight);
  const resultWeight = toWeightGrams(result.weight);
  if (betWeight !== null && resultWeight !== null) {
    const points = Math.max(0, 15 - Math.floor(Math.abs(betWeight - resultWeight) / 100));
    total += points;
    details.push(`Poids ${points}`);
  }

  const betHeight = parseNumber(bet.height);
  const resultHeight = parseNumber(result.height);
  if (betHeight !== null && resultHeight !== null) {
    const points = Math.max(0, 5 - Math.abs(betHeight - resultHeight));
    total += points;
    details.push(`Taille ${points}`);
  }

  return { total, details };
}

function initials(name) {
  return String(name || '?').trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?';
}

function badgesFor(bet) {
  const badges = [];
  const diff = Math.round((new Date(`${bet.birth_date}T00:00:00`) - new Date(`${TERM_DATE}T00:00:00`)) / 86400000);
  const weight = toWeightGrams(bet.weight);

  if (diff < -2) badges.push({ icon: '⚡', label: 'Team impatience' });
  else if (diff > 2) badges.push({ icon: '🛋️', label: 'Bébé chill' });
  else if (diff === 0) badges.push({ icon: '🎯', label: 'Pile au terme' });
  else badges.push({ icon: '📅', label: 'Timing prudent' });

  if (weight && weight >= 4000) badges.push({ icon: '🏋️', label: 'Poids lourd' });
  else if (weight && weight < 2800) badges.push({ icon: '🪶', label: 'Format mini' });
  else badges.push({ icon: '⚖️', label: 'Poids classique' });

  if (bet.first_name) badges.push({ icon: '✨', label: 'Prénom tenté' });
  badges.push(bet.note ? { icon: '💌', label: 'Message laissé' } : { icon: '🤫', label: 'Mystérieux' });
  return badges;
}

function App() {
  const [bet, setBet] = React.useState(defaultBet);
  const [bets, setBets] = React.useState([]);
  const [result, setResult] = React.useState(emptyResult);
  const [message, setMessage] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [participationOpen, setParticipationOpen] = React.useState(false);
  const [step, setStep] = React.useState(0);
  const [adminMode, setAdminMode] = React.useState(false);
  const [adminPinInput, setAdminPinInput] = React.useState('');
  const [adminPin, setAdminPin] = React.useState('');
  const [selectedTicket, setSelectedTicket] = React.useState(null);

  async function loadData() {
    setLoading(true);
    const [{ data: betsData, error: betsError }, { data: resultData, error: resultError }] = await Promise.all([
      supabase.from('bets').select('*').order('created_at', { ascending: false }),
      supabase.from('game_result').select('*').eq('id', 1).single(),
    ]);

    if (betsError || resultError) {
      setMessage(`Erreur chargement : ${betsError?.message || resultError?.message}`);
    } else {
      setBets(betsData || []);
      setResult({ ...emptyResult, ...(resultData || {}) });
    }
    setLoading(false);
  }

  React.useEffect(() => { loadData(); }, []);

  const consensusData = React.useMemo(() => {
    const weightAvg = average(bets.map((item) => item.weight));
    return {
      sex: consensus(bets.map((item) => item.sex)),
      date: consensus(bets.map((item) => item.birth_date), (value) => formatDate(value, true)),
      firstName: consensus(bets.map((item) => item.first_name).filter(Boolean)),
      weight: weightAvg ? formatWeight(weightAvg) : '—',
    };
  }, [bets]);

  const leaderboard = React.useMemo(() => {
    return bets.map((item) => ({ ...item, scoring: scoreBet(item, result) })).sort((a, b) => (b.scoring.total ?? -1) - (a.scoring.total ?? -1));
  }, [bets, result]);

  const messages = bets.filter((item) => item.note).slice(0, 8);

  function updateBet(key, value) {
    setBet((current) => ({ ...current, [key]: value }));
  }

  function goNext() {
    if (step === 0 && !bet.player.trim()) {
      setMessage('Il manque ton nom pour continuer.');
      return;
    }
    setStep((current) => Math.min(steps.length - 1, current + 1));
  }

  function goPrevious() {
    setStep((current) => Math.max(0, current - 1));
  }

  async function submitBet(event) {
    event.preventDefault();
    if (!bet.player.trim()) {
      setStep(0);
      setMessage('Il manque ton nom pour valider le ticket.');
      return;
    }

    const payload = {
      player: bet.player.trim(),
      birth_date: bet.birth_date,
      sex: bet.sex,
      first_name: bet.first_name.trim() || null,
      weight: toWeightGrams(bet.weight),
      height: parseNumber(bet.height),
      note: bet.note.trim() || null,
    };

    const { error } = await supabase.from('bets').insert(payload);
    if (error) {
      setMessage(`Erreur enregistrement : ${error.message}`);
      return;
    }

    setBet(defaultBet);
    setStep(0);
    setParticipationOpen(false);
    setMessage('Ticket validé. Ton pari et ton message sont enregistrés.');
    await loadData();
  }

  async function unlockAdmin(event) {
    event.preventDefault();
    const { data, error } = await supabase.rpc('check_admin_pin', { pin: adminPinInput });
    if (error || data !== true) {
      setMessage('PIN admin incorrect.');
      return;
    }
    setAdminMode(true);
    setAdminPin(adminPinInput);
    setAdminPinInput('');
    setMessage('Mode admin activé.');
  }

  async function saveResult() {
    const { error } = await supabase.rpc('admin_save_result', {
      pin: adminPin,
      p_birth_date: result.birth_date || null,
      p_sex: result.sex || null,
      p_first_name: result.first_name?.trim() || null,
      p_weight: toWeightGrams(result.weight),
      p_height: parseNumber(result.height),
      p_show_result: Boolean(result.show_result),
    });
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage('Résultat final sauvegardé.');
    await loadData();
  }

  async function removeBet(id) {
    if (!window.confirm('Supprimer ce ticket ?')) return;
    const { error } = await supabase.rpc('admin_delete_bet', { pin: adminPin, p_id: id });
    if (error) {
      setMessage(error.message);
      return;
    }
    setSelectedTicket(null);
    setMessage('Ticket supprimé.');
    await loadData();
  }

  return <div className="app-shell">
    <div className="aurora aurora-a" /><div className="aurora aurora-b" />
    <main className="app-grid">
      <section className="hero-panel">
        <div className="brand-pill">👶 Baby Bet Arena</div>
        <h1>Les paris du bébé de Marine</h1>
        <p className="hero-copy">Fais ton pronostic, laisse un petit message, participe au cadeau si tu veux, puis découvre le classement final le jour J.</p>
        <div className="hero-actions">
          <button className="cta-primary huge" onClick={() => setParticipationOpen(true)}>🎲 Participer maintenant</button>
          <a href={CAGNOTTE_URL} target="_blank" rel="noreferrer" className="cta-secondary">🎁 Participer à la cagnotte</a>
        </div>
      </section>

      <section className="consensus-strip">
        <div className="strip-title"><span>🧠</span><div><b>Consensus du bureau</b><small>Résumé des tickets enregistrés.</small></div></div>
        <Metric label="Sexe" value={consensusData.sex.label} detail={consensusData.sex.detail} />
        <Metric label="Date" value={consensusData.date.label} detail={consensusData.date.detail} />
        <Metric label="Poids moyen" value={consensusData.weight} />
        <Metric label="Prénom" value={consensusData.firstName.label} detail={consensusData.firstName.detail} />
        <Metric label="Tickets" value={bets.length} />
      </section>

      <section className="info-panel">
        <Title icon="📌" title="Comment participer" sub="Un pari, un message, et une cagnotte pour le cadeau." />
        <div className="info-cards">
          <InfoCard icon="🎲" title="1. Je pose mon pari" text="Date, sexe, prénom, poids et taille : ton ticket est ajouté au jeu." />
          <InfoCard icon="💌" title="2. Je laisse un mot" text="Ton message reste attaché à ton pari et pourra être relu avec ton ticket." />
          <InfoCard icon="🎁" title="3. Je participe au cadeau" text="La cagnotte est disponible pour ceux qui souhaitent participer." />
        </div>
      </section>

      <section className="participation-zone">
        <div className="participation-copy"><Title icon="🚀" title="Déposer mon pari" sub="Tout se fait en quelques étapes." /><p>Ouvre l’espace de participation, remplis ton ticket, ajoute ton message, puis valide ton pari.</p></div>
        <button className="participation-launch" onClick={() => setParticipationOpen(true)}><span>Participer</span><b>Créer mon ticket</b></button>
      </section>

      <section className="tickets-panel">
        <Title icon="🎟️" title="Les tickets de participation" sub={loading ? 'Chargement...' : `${bets.length} ticket${bets.length > 1 ? 's' : ''} enregistré${bets.length > 1 ? 's' : ''}.`} />
        <div className="tickets-wall">
          {bets.map((item) => <motion.button key={item.id} whileHover={{ y: -4 }} className="ticket" onClick={() => setSelectedTicket(item)}>
            <div className="ticket-top"><span>{initials(item.player)}</span><b>{item.player}</b></div>
            <div className="ticket-prediction">{formatDate(item.birth_date, true)} · {item.sex} · {item.first_name || 'Prénom mystère'}</div>
            <div className="ticket-meta ticket-facts"><span>{formatWeight(item.weight)}</span><span>{item.height || '—'} cm</span></div>
            <div className="ticket-meta ticket-badges">{badgesFor(item).map((badge) => <span key={`${item.id}-${badge.label}`}>{badge.icon} {badge.label}</span>)}</div>
          </motion.button>)}
        </div>
      </section>

      <section className="message-wall-panel">
        <Title icon="💌" title="Mur des messages" sub="Les messages des tickets sont regroupés ici." />
        <div className="message-wall">{messages.length ? messages.map((item) => <article key={item.id} className="message-card"><b>{item.player}</b><p>“{item.note}”</p></article>) : <div className="empty-state">Aucun message pour l’instant.</div>}</div>
      </section>

      <section className="admin-panel">
        <Title icon="👑" title="Résultat final" sub="À remplir après la naissance pour révéler le classement." />
        {!adminMode && <form onSubmit={unlockAdmin} className="admin-login"><input type="password" value={adminPinInput} onChange={(event) => setAdminPinInput(event.target.value)} placeholder="PIN admin" /><button>Déverrouiller</button></form>}
        <div className="result-fields">
          <input type="date" value={result.birth_date || ''} disabled={!adminMode} onChange={(event) => setResult((current) => ({ ...current, birth_date: event.target.value }))} />
          <select value={result.sex || ''} disabled={!adminMode} onChange={(event) => setResult((current) => ({ ...current, sex: event.target.value }))}><option value="">Sexe</option><option>Fille</option><option>Garçon</option><option>Surprise totale</option></select>
          <input value={result.first_name || ''} disabled={!adminMode} onChange={(event) => setResult((current) => ({ ...current, first_name: event.target.value }))} placeholder="Prénom" />
          <input type="number" min="1" max="6" step="0.1" value={gramsToKgInput(result.weight)} disabled={!adminMode} onChange={(event) => setResult((current) => ({ ...current, weight: event.target.value }))} placeholder="Poids kg" />
          <input type="number" value={result.height || ''} disabled={!adminMode} onChange={(event) => setResult((current) => ({ ...current, height: event.target.value }))} placeholder="Taille cm" />
        </div>
        {adminMode && <div className="admin-actions"><label><input type="checkbox" checked={Boolean(result.show_result)} onChange={(event) => setResult((current) => ({ ...current, show_result: event.target.checked }))} /> Publier le classement</label><button onClick={saveResult}>Sauver</button></div>}
        {result.show_result ? <div className="podium">{leaderboard.slice(0, 3).map((item, index) => <div key={item.id} className={`podium-card p${index + 1}`}><span>{['🥇', '🥈', '🥉'][index]}</span><b>{item.player}</b><strong>{item.scoring.total} pts</strong><small>{item.scoring.details.join(' · ')}</small></div>)}</div> : <div className="locked">🔒 Le classement sera affiché après la naissance.</div>}
      </section>
    </main>

    {message && <div className="toast">{message}</div>}

    <AnimatePresence>{participationOpen && <BetModal bet={bet} step={step} setStep={setStep} updateBet={updateBet} goNext={goNext} goPrevious={goPrevious} submitBet={submitBet} close={() => setParticipationOpen(false)} />}</AnimatePresence>

    <AnimatePresence>{selectedTicket && <TicketModal ticket={selectedTicket} adminMode={adminMode} removeBet={removeBet} close={() => setSelectedTicket(null)} />}</AnimatePresence>
  </div>;
}

function BetModal({ bet, step, setStep, updateBet, goNext, goPrevious, submitBet, close }) {
  return <motion.div className="participation-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    <motion.div className="participation-modal" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}>
      <button className="modal-close floating" onClick={close}>×</button>
      <aside className="participation-aside">
        <div className="brand-pill">🎲 Participation</div>
        <h2>Crée ton ticket.</h2>
        <p>Remplis ton pari, ajoute ton message, puis participe à la cagnotte si tu le souhaites.</p>
        <div className="gift-card"><span>🎁 Cagnotte officielle</span><b>Le pari est gratuit, la participation au cadeau est optionnelle.</b><a href={CAGNOTTE_URL} target="_blank" rel="noreferrer" className="cta-primary">Ouvrir Le Pot Commun</a></div>
      </aside>
      <section className="participation-form">
        <Title icon="🎲" title={steps[step].title} sub={steps[step].subtitle} />
        <div className="progress-steps">{steps.map((item, index) => <button type="button" key={item.title} className={index === step ? 'active' : ''} onClick={() => setStep(index)}>{index + 1}</button>)}</div>
        <form onSubmit={submitBet}>
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="wizard-card">
              {step === 0 && <Field label="Ton nom"><input value={bet.player} onChange={(event) => updateBet('player', event.target.value)} placeholder="Ex : Gabriel" /></Field>}
              {step === 1 && <><Field label="Date estimée"><input type="date" value={bet.birth_date} onChange={(event) => updateBet('birth_date', event.target.value)} /></Field><Field label="Sexe"><div className="choice-row">{['Fille', 'Garçon', 'Surprise totale'].map((value) => <button type="button" key={value} className={bet.sex === value ? 'choice active' : 'choice'} onClick={() => updateBet('sex', value)}>{value}</button>)}</div></Field></>}
              {step === 2 && <Field label="Prénom parié"><input value={bet.first_name} onChange={(event) => updateBet('first_name', event.target.value)} placeholder="Louise, Noé, Norris..." /></Field>}
              {step === 3 && <div className="split"><Field label="Poids en kg"><input type="number" min="1" max="6" step="0.1" value={bet.weight} onChange={(event) => updateBet('weight', event.target.value)} placeholder="3.2" /></Field><Field label="Taille en cm"><input type="number" min="35" max="65" value={bet.height} onChange={(event) => updateBet('height', event.target.value)} /></Field></div>}
              {step === 4 && <Field label="Message sympa"><textarea value={bet.note} onChange={(event) => updateBet('note', event.target.value)} placeholder="Petit mot pour Marine." /></Field>}
              {step === 5 && <div className="recap-card"><span>Récapitulatif</span><h3>{bet.player || 'Nom manquant'}</h3><p>{formatDate(bet.birth_date)} · {bet.sex} · {bet.first_name || 'Prénom mystère'}</p><p>{formatWeight(bet.weight)} · {bet.height || '—'} cm</p>{bet.note && <em>“{bet.note}”</em>}</div>}
            </motion.div>
          </AnimatePresence>
          <div className="wizard-actions">
            <button type="button" className="cta-secondary" disabled={step === 0} onClick={goPrevious}>Précédent</button>
            {step < steps.length - 1 ? <button type="button" className="cta-primary" onClick={goNext}>Suite</button> : <button type="submit" className="cta-primary">Sauvegarder le pari</button>}
          </div>
        </form>
      </section>
    </motion.div>
  </motion.div>;
}

function TicketModal({ ticket, adminMode, removeBet, close }) {
  return <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close}>
    <motion.div className="modal-card" initial={{ scale: .92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: .92, opacity: 0 }} onClick={(event) => event.stopPropagation()}>
      <button className="modal-close" onClick={close}>×</button>
      <div className="ticket-big-avatar">{initials(ticket.player)}</div>
      <h2>{ticket.player}</h2>
      <p>{ticket.note || 'Aucun message pour ce ticket.'}</p>
      <div className="ticket-meta ticket-badges modal-badges">{badgesFor(ticket).map((badge) => <span key={`${ticket.id}-modal-${badge.label}`}>{badge.icon} {badge.label}</span>)}</div>
      <div className="modal-grid"><Metric label="Date" value={formatDate(ticket.birth_date)} /><Metric label="Sexe" value={ticket.sex} /><Metric label="Prénom" value={ticket.first_name || 'Prénom mystère'} /><Metric label="Poids" value={formatWeight(ticket.weight)} /><Metric label="Taille" value={`${ticket.height || '—'} cm`} /><Metric label="Message" value={ticket.note ? 'Oui' : 'Non'} /></div>
      {adminMode && <button className="danger" onClick={() => removeBet(ticket.id)}>Supprimer ce ticket</button>}
    </motion.div>
  </motion.div>;
}

function Title({ icon, title, sub }) {
  return <div className="panel-title"><span>{icon}</span><div><h2>{title}</h2><p>{sub}</p></div></div>;
}

function Field({ label, children }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

function Metric({ label, value, detail }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</div>;
}

function InfoCard({ icon, title, text }) {
  return <article className="info-card"><span>{icon}</span><b>{title}</b><p>{text}</p></article>;
}

createRoot(document.getElementById('root')).render(<App />);
