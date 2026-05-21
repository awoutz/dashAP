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
  weight: '3200',
  height: '50',
  note: '',
};

const emptyResult = { birth_date: '', sex: '', first_name: '', weight: '', height: '', show_result: false };

function toNumberOrNull(value) {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatDate(value, short = false) {
  if (!value) return '—';
  const d = new Date(`${value}T00:00:00`);
  return d.toLocaleDateString('fr-FR', short ? { day: '2-digit', month: '2-digit' } : undefined);
}

function dayDiffFromTerm(value) {
  if (!value) return 0;
  return Math.round((new Date(`${value}T00:00:00`) - new Date(`${TERM_DATE}T00:00:00`)) / 86400000);
}

function daysBetween(a, b) {
  if (!a || !b) return 9999;
  return Math.abs(Math.round((new Date(`${a}T00:00:00`) - new Date(`${b}T00:00:00`)) / 86400000));
}

function normalizeName(value) {
  return String(value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function scoreBet(bet, result) {
  if (!result.birth_date && !result.sex && !result.first_name && !result.weight && !result.height) return { total: null, details: [] };
  let total = 0;
  const details = [];
  if (result.birth_date) {
    const points = Math.max(0, 35 - daysBetween(bet.birth_date, result.birth_date) * 5);
    total += points; details.push(`Date ${points}`);
  }
  if (result.sex) {
    const points = bet.sex === result.sex ? 20 : 0;
    total += points; details.push(`Sexe ${points}`);
  }
  if (result.first_name) {
    const points = normalizeName(bet.first_name) === normalizeName(result.first_name) ? 25 : 0;
    total += points; details.push(`Prénom ${points}`);
  }
  const bw = toNumberOrNull(bet.weight), rw = toNumberOrNull(result.weight);
  if (bw !== null && rw !== null) {
    const points = Math.max(0, 15 - Math.floor(Math.abs(bw - rw) / 100));
    total += points; details.push(`Poids ${points}`);
  }
  const bh = toNumberOrNull(bet.height), rh = toNumberOrNull(result.height);
  if (bh !== null && rh !== null) {
    const points = Math.max(0, 5 - Math.abs(bh - rh));
    total += points; details.push(`Taille ${points}`);
  }
  return { total, details };
}

function initials(name) {
  return String(name || '?').trim().split(/\s+/).slice(0, 2).map((x) => x[0]?.toUpperCase()).join('') || '?';
}

function cleanBetPayload(bet) {
  return {
    player: bet.player.trim(), birth_date: bet.birth_date, sex: bet.sex,
    first_name: bet.first_name.trim() || null, weight: toNumberOrNull(bet.weight),
    height: toNumberOrNull(bet.height), note: bet.note.trim() || null,
  };
}

function cleanResultPayload(result) {
  return {
    p_birth_date: result.birth_date || null, p_sex: result.sex || null,
    p_first_name: result.first_name?.trim() || null, p_weight: toNumberOrNull(result.weight),
    p_height: toNumberOrNull(result.height), p_show_result: Boolean(result.show_result),
  };
}

function mean(values) {
  const nums = values.map(toNumberOrNull).filter((v) => v !== null);
  if (!nums.length) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function countBy(values) {
  const map = new Map();
  values.filter(Boolean).forEach((v) => map.set(v, (map.get(v) || 0) + 1));
  return [...map.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || String(a.label).localeCompare(String(b.label)));
}

function mode(values) {
  return countBy(values)[0]?.label || '—';
}

function dateRange(center, spread = 6) {
  const base = new Date(`${center}T00:00:00`);
  return Array.from({ length: spread * 2 + 1 }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() - spread + i);
    return d.toISOString().slice(0, 10);
  });
}

function badgeFor(bet) {
  const diff = dayDiffFromTerm(bet.birth_date);
  const w = toNumberOrNull(bet.weight);
  if (diff < -2) return 'Team impatience';
  if (diff > 2) return 'Bébé chill';
  if (w && w >= 4000) return 'Poids lourd';
  if (!bet.note) return 'Silent oracle';
  return 'Oracle du bureau';
}

function weightBucket(weight) {
  const w = toNumberOrNull(weight);
  if (w === null) return null;
  if (w < 2800) return '< 2,8 kg';
  if (w < 3200) return '2,8–3,2 kg';
  if (w < 3600) return '3,2–3,6 kg';
  if (w < 4000) return '3,6–4 kg';
  return '4 kg+';
}

function App() {
  const [bet, setBet] = React.useState(defaultBet);
  const [bets, setBets] = React.useState([]);
  const [result, setResult] = React.useState(emptyResult);
  const [message, setMessage] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [adminMode, setAdminMode] = React.useState(false);
  const [adminPinInput, setAdminPinInput] = React.useState('');
  const [adminPin, setAdminPin] = React.useState('');
  const [wizardStep, setWizardStep] = React.useState(0);
  const [selectedTicket, setSelectedTicket] = React.useState(null);
  const [participationOpen, setParticipationOpen] = React.useState(false);

  async function loadData() {
    setLoading(true);
    const [{ data: betsData, error: betsError }, { data: resultData, error: resultError }] = await Promise.all([
      supabase.from('bets').select('*').order('created_at', { ascending: false }),
      supabase.from('game_result').select('*').eq('id', 1).single(),
    ]);
    if (betsError || resultError) setMessage(`Erreur chargement : ${betsError?.message || resultError?.message}`);
    else { setBets(betsData || []); setResult({ ...emptyResult, ...(resultData || {}) }); }
    setLoading(false);
  }

  React.useEffect(() => { loadData(); }, []);

  const leaderboard = React.useMemo(() => bets.map((item) => ({ ...item, scoring: scoreBet(item, result) })).sort((a, b) => (b.scoring.total ?? -1) - (a.scoring.total ?? -1)), [bets, result]);

  const stats = React.useMemo(() => {
    const sex = mode(bets.map((b) => b.sex));
    const avgWeight = mean(bets.map((b) => b.weight));
    const avgHeight = mean(bets.map((b) => b.height));
    const commonDate = mode(bets.map((b) => b.birth_date));
    const names = bets.map((b) => b.first_name).filter(Boolean);
    const early = bets.filter((b) => dayDiffFromTerm(b.birth_date) < 0).length;
    const exactTerm = bets.filter((b) => dayDiffFromTerm(b.birth_date) === 0).length;
    const late = bets.filter((b) => dayDiffFromTerm(b.birth_date) > 0).length;
    return { sex, avgWeight, avgHeight, commonDate, topName: mode(names), participants: bets.length, early, exactTerm, late };
  }, [bets]);

  const timeline = React.useMemo(() => dateRange(TERM_DATE, 6).map((date) => ({ date, items: bets.filter((b) => b.birth_date === date) })), [bets]);
  const dataLab = React.useMemo(() => buildDataLab(bets, timeline), [bets, timeline]);
  const confidence = Math.min(96, 28 + bets.length * 8);
  const messages = bets.filter((b) => b.note).slice(0, 8);
  const sortedByDate = [...bets].sort((a, b) => a.birth_date.localeCompare(b.birth_date));
  const earliest = sortedByDate[0];
  const latest = sortedByDate[sortedByDate.length - 1];
  const heaviest = [...bets].sort((a, b) => (toNumberOrNull(b.weight) || 0) - (toNumberOrNull(a.weight) || 0))[0];
  const mostInspired = [...bets].filter((b) => b.note).sort((a, b) => b.note.length - a.note.length)[0];

  const wizard = [
    { title: 'Identité', sub: 'Qui pose son ticket ?', fields: ['player'] },
    { title: 'Date', sub: 'Le jour estimé.', fields: ['birth_date'] },
    { title: 'Profil', sub: 'Sexe et prénom.', fields: ['sex', 'first_name'] },
    { title: 'Mesures', sub: 'Poids et taille.', fields: ['weight', 'height'] },
    { title: 'Message', sub: 'Petit mot sympa ou punchline.', fields: ['note'] },
  ];

  function setField(key, value) { setBet((current) => ({ ...current, [key]: value })); }

  async function submitBet(event) {
    event.preventDefault();
    if (!bet.player.trim()) return setMessage('Il manque ton nom. Même les oracles ont une identité.');
    const { error } = await supabase.from('bets').insert(cleanBetPayload(bet));
    if (error) return setMessage(`Erreur enregistrement : ${error.message}`);
    setBet(defaultBet); setWizardStep(0); setParticipationOpen(false); setMessage('Ticket validé. Pari + message enregistrés.'); await loadData();
  }

  async function unlockAdmin(event) {
    event.preventDefault();
    const { data, error } = await supabase.rpc('check_admin_pin', { pin: adminPinInput });
    if (error || data !== true) return setMessage('PIN admin incorrect.');
    setAdminMode(true); setAdminPin(adminPinInput); setAdminPinInput(''); setMessage('Admin center activé.');
  }

  async function saveResult() {
    const { error } = await supabase.rpc('admin_save_result', { pin: adminPin, ...cleanResultPayload(result) });
    if (error) return setMessage(error.message);
    setMessage('Résultat final sauvegardé.'); await loadData();
  }

  async function removeBet(id) {
    if (!window.confirm('Supprimer ce ticket ?')) return;
    const { error } = await supabase.rpc('admin_delete_bet', { pin: adminPin, p_id: id });
    if (error) return setMessage(error.message);
    setSelectedTicket(null); setMessage('Ticket nettoyé.'); await loadData();
  }

  async function resetGame() {
    if (!window.confirm('Reset complet ?')) return;
    const { error } = await supabase.rpc('admin_reset_game', { pin: adminPin });
    if (error) return setMessage(error.message);
    setMessage('Arena reset.'); await loadData();
  }

  const current = wizard[wizardStep];

  return <div className="app-shell">
    <div className="aurora aurora-a" /><div className="aurora aurora-b" />
    <main className="app-grid">
      <section className="hero-panel zone-general">
        <div className="brand-pill">👶 Baby Bet Arena · POC over-achieved</div>
        <h1>Les paris du bébé de Marine</h1>
        <p className="hero-copy">Une expérience unique pour le bureau : on parie, on laisse un message, on participe au cadeau, puis on révèle le classement final.</p>
        <div className="hero-actions">
          <button className="cta-primary huge" onClick={() => setParticipationOpen(true)}>🎲 Participer maintenant</button>
          <a href={CAGNOTTE_URL} target="_blank" rel="noreferrer" className="cta-secondary">🎁 Aller à la cagnotte</a>
        </div>
      </section>

      <section className="consensus-strip">
        <div className="strip-title"><span>🧠</span><div><b>Consensus du bureau</b><small>Résumé exécutif des pronostics, sans rigueur scientifique.</small></div></div>
        <Metric label="Sexe" value={stats.sex} />
        <Metric label="Date" value={formatDate(stats.commonDate, true)} />
        <Metric label="Poids" value={stats.avgWeight ? `${stats.avgWeight}g` : '—'} />
        <Metric label="Taille" value={stats.avgHeight ? `${stats.avgHeight}cm` : '—'} />
        <Metric label="Prénom" value={stats.topName} />
        <div className="confidence-mini"><span style={{ width: `${confidence}%` }} /><b>{confidence}%</b></div>
      </section>

      <section className="info-panel">
        <div className="panel-title"><span>📌</span><div><h2>Mode d’emploi</h2><p>Trois gestes, zéro prise de tête.</p></div></div>
        <div className="info-cards">
          <InfoCard icon="🎲" title="1. Je pose mon pari" text="Date, sexe, prénom, poids, taille. Le ticket est public dans le wall." />
          <InfoCard icon="💌" title="2. Je laisse un mot" text="Le commentaire reste attaché au ticket. Il n’est pas séparé ni copié ailleurs." />
          <InfoCard icon="🎁" title="3. Je participe au cadeau" text="La cagnotte reste externe côté Le Pot Commun. L’app ne manipule pas de paiement." />
        </div>
      </section>

      <section className="participation-zone" id="participer">
        <div className="participation-copy">
          <div className="panel-title"><span>🚀</span><div><h2>Participation cockpit</h2><p>Le formulaire n’est plus planqué : on ouvre un écran dédié.</p></div></div>
          <p>Tu peux poser ton pari, écrire un message, puis filer à la cagnotte. Le tout est séparé du dashboard pour éviter l’effet “où je dois cliquer ?”.</p>
        </div>
        <button className="participation-launch" onClick={() => setParticipationOpen(true)}>
          <span>Ouvrir le cockpit</span>
          <b>Pari + message + cagnotte</b>
        </button>
      </section>

      <section className="timeline-panel">
        <div className="panel-title"><span>📅</span><div><h2>Timeline des dates</h2><p>Les clusters de prophéties, autour du terme.</p></div></div>
        <div className="timeline">{timeline.map((day) => <div key={day.date} className={day.date === TERM_DATE ? 'day term' : 'day'}><b>{formatDate(day.date, true)}</b><div className="dots">{day.items.slice(0, 5).map((b) => <span key={b.id} title={b.player}>{initials(b.player)}</span>)}</div><small>{day.items.length}</small></div>)}</div>
      </section>

      <section className="side-quests-panel">
        <div className="panel-title"><span>🏅</span><div><h2>Sous-paris automatiques</h2><p>Des mini-titres calculés depuis les tickets, sans nouveau champ en base.</p></div></div>
        <div className="quest-grid">
          <Quest title="Team impatience" value={`${stats.early} avant terme`} detail={earliest ? `${earliest.player} ouvre le bal au ${formatDate(earliest.birth_date, true)}` : 'Aucun ticket'} />
          <Quest title="Team chill" value={`${stats.late} après terme`} detail={latest ? `${latest.player} voit large au ${formatDate(latest.birth_date, true)}` : 'Aucun ticket'} />
          <Quest title="Poids lourd" value={heaviest ? `${heaviest.weight || '—'} g` : '—'} detail={heaviest ? `${heaviest.player} ne fait pas dans le léger` : 'Aucun ticket'} />
          <Quest title="Plume du bureau" value={mostInspired ? mostInspired.player : '—'} detail={mostInspired ? `“${mostInspired.note.slice(0, 56)}${mostInspired.note.length > 56 ? '…' : ''}”` : 'Aucun message'} />
        </div>
      </section>

      <section className="tickets-panel zone-details">
        <div className="panel-title"><span>🎟️</span><div><h2>Détail des participations</h2><p>{loading ? 'Chargement...' : `${bets.length} tickets dans l’arène.`}</p></div></div>
        <div className="tickets-wall">{bets.map((item) => <motion.button key={item.id} whileHover={{ y: -4 }} className="ticket" onClick={() => setSelectedTicket(item)}><div className="ticket-top"><span>{initials(item.player)}</span><b>{item.player}</b></div><div className="ticket-prediction">{formatDate(item.birth_date, true)} · {item.sex} · {item.first_name || 'Mystère'}</div><div className="ticket-meta"><span>{item.weight || '—'}g</span><span>{item.height || '—'}cm</span><span>{badgeFor(item)}</span></div></motion.button>)}</div>
      </section>

      <section className="message-wall-panel">
        <div className="panel-title"><span>💌</span><div><h2>Mur des messages</h2><p>Les mots sympas remontent ici automatiquement, mais restent attachés à leur ticket.</p></div></div>
        <div className="message-wall">{messages.length ? messages.map((m) => <article key={m.id} className="message-card"><b>{m.player}</b><p>“{m.note}”</p></article>) : <div className="empty-state">Aucun message pour l’instant. Le prochain ticket peut sauver l’ambiance.</div>}</div>
      </section>

      <DataLab bets={bets} data={dataLab} stats={stats} timeline={timeline} />

      <section className="automation-panel">
        <div className="panel-title"><span>⚙️</span><div><h2>Ce qui est automatique</h2><p>Pas de magie noire : tout est recalculé depuis les tickets Supabase.</p></div></div>
        <div className="automation-grid">
          <AutoRule title="Consensus" text="Sexe majoritaire, date favorite, poids et taille moyens sont recalculés à chaque chargement." />
          <AutoRule title="Sous-paris" text="Team impatience, bébé chill, poids lourd et plume du bureau sont des lectures dérivées des mêmes tickets." />
          <AutoRule title="Messages" text="Le message personnalisé reste dans la colonne note du pari. Le mur des messages ne fait que l’afficher autrement." />
          <AutoRule title="Data Lab" text="Les graphiques du bas sont des vues analytiques temporaires : aucune donnée supplémentaire n’est créée." />
        </div>
      </section>

      <section className="admin-panel">
        <div className="panel-title"><span>👑</span><div><h2>Final reveal</h2><p>Admin center + cérémonie finale.</p></div></div>
        {!adminMode && <form onSubmit={unlockAdmin} className="admin-login"><input type="password" value={adminPinInput} onChange={(e) => setAdminPinInput(e.target.value)} placeholder="PIN admin" /><button>Déverrouiller</button></form>}
        <div className="result-fields">
          <input type="date" value={result.birth_date || ''} disabled={!adminMode} onChange={(e) => setResult((r) => ({ ...r, birth_date: e.target.value }))} />
          <select value={result.sex || ''} disabled={!adminMode} onChange={(e) => setResult((r) => ({ ...r, sex: e.target.value }))}><option value="">Sexe</option><option>Fille</option><option>Garçon</option><option>Surprise totale</option></select>
          <input value={result.first_name || ''} disabled={!adminMode} onChange={(e) => setResult((r) => ({ ...r, first_name: e.target.value }))} placeholder="Prénom" />
          <input type="number" value={result.weight || ''} disabled={!adminMode} onChange={(e) => setResult((r) => ({ ...r, weight: e.target.value }))} placeholder="Poids" />
          <input type="number" value={result.height || ''} disabled={!adminMode} onChange={(e) => setResult((r) => ({ ...r, height: e.target.value }))} placeholder="Taille" />
        </div>
        {adminMode && <div className="admin-actions"><label><input type="checkbox" checked={Boolean(result.show_result)} onChange={(e) => setResult((r) => ({ ...r, show_result: e.target.checked }))} /> Publier le classement</label><button onClick={saveResult}>Sauver</button><button onClick={resetGame}>Reset</button></div>}
        {result.show_result ? <div className="podium">{leaderboard.slice(0,3).map((b,i)=><div key={b.id} className={`podium-card p${i+1}`}><span>{['🥇','🥈','🥉'][i]}</span><b>{b.player}</b><strong>{b.scoring.total} pts</strong><small>{b.scoring.details.join(' · ')}</small></div>)}</div> : <div className="locked">🔒 Classement masqué jusqu’au grand reveal.</div>}
      </section>
    </main>

    {message && <div className="toast">{message}</div>}

    <AnimatePresence>{participationOpen && <ParticipationModal bet={bet} setField={setField} current={current} wizard={wizard} wizardStep={wizardStep} setWizardStep={setWizardStep} submitBet={submitBet} onClose={() => setParticipationOpen(false)} />}</AnimatePresence>

    <AnimatePresence>{selectedTicket && <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedTicket(null)}><motion.div className="modal-card" initial={{ scale: .92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: .92, opacity: 0 }} onClick={(e) => e.stopPropagation()}><button className="modal-close" onClick={() => setSelectedTicket(null)}>×</button><div className="ticket-big-avatar">{initials(selectedTicket.player)}</div><h2>{selectedTicket.player}</h2><p>{selectedTicket.note || 'Aucun commentaire. La sobriété est un choix.'}</p><div className="modal-grid"><Metric label="Date" value={formatDate(selectedTicket.birth_date)} /><Metric label="Sexe" value={selectedTicket.sex} /><Metric label="Prénom" value={selectedTicket.first_name || 'Mystère'} /><Metric label="Poids" value={`${selectedTicket.weight || '—'} g`} /><Metric label="Taille" value={`${selectedTicket.height || '—'} cm`} /><Metric label="Badge" value={badgeFor(selectedTicket)} /></div>{adminMode && <button className="danger" onClick={() => removeBet(selectedTicket.id)}>Supprimer ce ticket</button>}</motion.div></motion.div>}</AnimatePresence>
  </div>;
}

function buildDataLab(bets, timeline) {
  const sexCounts = countBy(bets.map((b) => b.sex));
  const nameCounts = countBy(bets.map((b) => b.first_name).filter(Boolean)).slice(0, 8);
  const weightCounts = countBy(bets.map((b) => weightBucket(b.weight)).filter(Boolean));
  const total = Math.max(1, bets.length);
  const maxDate = Math.max(1, ...timeline.map((d) => d.items.length));
  const maxWeight = Math.max(1, ...weightCounts.map((d) => d.count));
  const maxName = Math.max(1, ...nameCounts.map((d) => d.count));
  const scatter = bets
    .map((b) => ({ id: b.id, player: b.player, weight: toNumberOrNull(b.weight), height: toNumberOrNull(b.height), note: b.note }))
    .filter((p) => p.weight !== null && p.height !== null);
  return { sexCounts, nameCounts, weightCounts, total, maxDate, maxWeight, maxName, scatter };
}

function DataLab({ bets, data, stats, timeline }) {
  const girl = data.sexCounts.find((x) => x.label === 'Fille')?.count || 0;
  const boy = data.sexCounts.find((x) => x.label === 'Garçon')?.count || 0;
  const other = Math.max(0, data.total - girl - boy);
  const girlPct = Math.round((girl / data.total) * 100);
  const boyPct = Math.round((boy / data.total) * 100);
  const otherPct = 100 - girlPct - boyPct;

  return <section className="data-lab-panel">
    <div className="panel-title data-lab-title"><span>📊</span><div><h2>Data Analyst Lab</h2><p>Chaque partie du pari a sa lecture data. C’est inutilement sérieux, donc indispensable.</p></div></div>
    <div className="data-lab-grid">
      <ChartCard title="Répartition sexe" subtitle="Donut custom, sans lib externe.">
        <div className="donut-wrap">
          <div className="donut" style={{ background: `conic-gradient(#fb7185 0 ${girlPct}%, #60a5fa ${girlPct}% ${girlPct + boyPct}%, #facc15 ${girlPct + boyPct}% 100%)` }}><b>{stats.sex}</b><span>majoritaire</span></div>
          <div className="legend"><Legend color="pink" label="Fille" value={`${girl} · ${girlPct}%`} /><Legend color="blue" label="Garçon" value={`${boy} · ${boyPct}%`} /><Legend color="gold" label="Surprise" value={`${other} · ${otherPct}%`} /></div>
        </div>
      </ChartCard>

      <ChartCard title="Distribution des dates" subtitle="Lecture calendrier autour du terme.">
        <div className="date-bars">{timeline.map((d) => <div key={d.date} className={d.date === TERM_DATE ? 'date-bar term' : 'date-bar'}><div className="bar-track"><span style={{ height: `${12 + (d.items.length / data.maxDate) * 88}%` }} /></div><b>{formatDate(d.date, true)}</b><small>{d.items.length}</small></div>)}</div>
      </ChartCard>

      <ChartCard title="Histogramme poids" subtitle="Les paris regroupés par tranche.">
        <div className="histo">{data.weightCounts.length ? data.weightCounts.map((b) => <div key={b.label} className="histo-row"><span>{b.label}</span><div><i style={{ width: `${(b.count / data.maxWeight) * 100}%` }} /></div><b>{b.count}</b></div>) : <EmptyMini />}</div>
      </ChartCard>

      <ChartCard title="Nuage des prénoms" subtitle="Pas une IA : juste les prénoms les plus tentés.">
        <div className="name-cloud">{data.nameCounts.length ? data.nameCounts.map((n, index) => <span key={n.label} style={{ '--rank': index, '--power': `${0.72 + (n.count / data.maxName) * 0.56}` }}>{n.label}<b>{n.count}</b></span>) : <EmptyMini />}</div>
      </ChartCard>

      <ChartCard title="Carte poids × taille" subtitle="Un scatterplot pour faire croire qu’on est en comité stratégique.">
        <Scatter points={data.scatter} />
      </ChartCard>

      <ChartCard title="Messages & engagement" subtitle="Les mots restent attachés aux tickets, ici on mesure juste l’activité.">
        <Engagement bets={bets} />
      </ChartCard>
    </div>
  </section>;
}

function Scatter({ points }) {
  const weights = points.map((p) => p.weight);
  const heights = points.map((p) => p.height);
  const minW = Math.min(2600, ...weights), maxW = Math.max(4300, ...weights);
  const minH = Math.min(45, ...heights), maxH = Math.max(55, ...heights);
  if (!points.length) return <EmptyMini />;
  return <svg className="scatter" viewBox="0 0 360 220" role="img" aria-label="Carte poids taille des paris">
    <line x1="34" y1="184" x2="336" y2="184" />
    <line x1="34" y1="20" x2="34" y2="184" />
    {[0, 1, 2, 3].map((i) => <line key={i} className="gridline" x1="34" x2="336" y1={42 + i * 42} y2={42 + i * 42} />)}
    {points.map((p, index) => {
      const x = 42 + ((p.weight - minW) / Math.max(1, maxW - minW)) * 286;
      const y = 176 - ((p.height - minH) / Math.max(1, maxH - minH)) * 142;
      return <g key={p.id}><circle cx={x} cy={y} r={p.note ? 8 : 6} className={index % 2 ? 'point alt' : 'point'}><title>{p.player} · {p.weight}g · {p.height}cm</title></circle><text x={x + 9} y={y + 4}>{initials(p.player)}</text></g>;
    })}
    <text className="axis-label" x="250" y="208">poids</text>
    <text className="axis-label" x="4" y="24">taille</text>
  </svg>;
}

function Engagement({ bets }) {
  const total = Math.max(1, bets.length);
  const withMessage = bets.filter((b) => b.note).length;
  const avgLength = Math.round(mean(bets.filter((b) => b.note).map((b) => b.note.length)) || 0);
  const withName = bets.filter((b) => b.first_name).length;
  return <div className="engagement-stack">
    <Progress label="Tickets avec message" value={withMessage} total={total} />
    <Progress label="Tickets avec prénom" value={withName} total={total} />
    <div className="engagement-kpi"><span>Longueur moyenne des messages</span><b>{avgLength} caractères</b></div>
  </div>;
}

function Progress({ label, value, total }) {
  const pct = Math.round((value / Math.max(1, total)) * 100);
  return <div className="progress-line"><div><span>{label}</span><b>{value}/{total}</b></div><i><em style={{ width: `${pct}%` }} /></i></div>;
}

function ParticipationModal({ bet, setField, current, wizard, wizardStep, setWizardStep, submitBet, onClose }) {
  return <motion.div className="participation-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    <motion.div className="participation-modal" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}>
      <button className="modal-close floating" onClick={onClose}>×</button>
      <aside className="participation-aside">
        <div className="brand-pill">🚀 Participation cockpit</div>
        <h2>Un seul écran pour tout faire.</h2>
        <p>Tu poses ton pari, tu laisses un message sympa, puis tu peux participer au cadeau sans chercher où cliquer.</p>
        <div className="gift-card"><span>🎁 Cagnotte officielle</span><b>Le pari est gratuit, le cadeau est optionnel.</b><a href={CAGNOTTE_URL} target="_blank" rel="noreferrer" className="cta-primary">Ouvrir Le Pot Commun</a></div>
      </aside>
      <section className="participation-form">
        <div className="panel-title"><span>🎲</span><div><h2>{current.title}</h2><p>{current.sub}</p></div></div>
        <div className="progress-steps">{wizard.map((s, i) => <button type="button" key={s.title} className={i === wizardStep ? 'active' : ''} onClick={() => setWizardStep(i)}>{i + 1}</button>)}</div>
        <form onSubmit={submitBet}>
          <AnimatePresence mode="wait">
            <motion.div key={wizardStep} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="wizard-card">
              {current.fields.includes('player') && <Field label="Ton nom"><input value={bet.player} onChange={(e) => setField('player', e.target.value)} placeholder="Ex : Gabriel" /></Field>}
              {current.fields.includes('birth_date') && <Field label="Date estimée"><input type="date" value={bet.birth_date} onChange={(e) => setField('birth_date', e.target.value)} /></Field>}
              {current.fields.includes('sex') && <Field label="Sexe"><div className="choice-row">{['Fille','Garçon','Surprise totale'].map((x) => <button type="button" key={x} className={bet.sex === x ? 'choice active' : 'choice'} onClick={() => setField('sex', x)}>{x}</button>)}</div></Field>}
              {current.fields.includes('first_name') && <Field label="Prénom"><input value={bet.first_name} onChange={(e) => setField('first_name', e.target.value)} placeholder="Norris, Chuck, Louise..." /></Field>}
              {current.fields.includes('weight') && <div className="split"><Field label="Poids"><input type="number" min="1000" max="6000" value={bet.weight} onChange={(e) => setField('weight', e.target.value)} /></Field><Field label="Taille"><input type="number" min="35" max="65" value={bet.height} onChange={(e) => setField('height', e.target.value)} /></Field></div>}
              {current.fields.includes('note') && <Field label="Message sympa"><textarea value={bet.note} onChange={(e) => setField('note', e.target.value)} placeholder="Petit mot pour Marine, ou punchline de pronostic." /></Field>}
            </motion.div>
          </AnimatePresence>
          <div className="wizard-actions"><button type="button" className="cta-secondary" disabled={wizardStep === 0} onClick={() => setWizardStep((s) => Math.max(0, s - 1))}>Retour</button>{wizardStep < wizard.length - 1 ? <button type="button" className="cta-primary" onClick={() => setWizardStep((s) => s + 1)}>Suite</button> : <button className="cta-primary">Valider mon ticket</button>}</div>
        </form>
      </section>
    </motion.div>
  </motion.div>;
}

function Field({ label, children }) { return <label className="field"><span>{label}</span>{children}</label>; }
function Metric({ label, value }) { return <div className="metric"><span>{label}</span><strong>{value}</strong></div>; }
function InfoCard({ icon, title, text }) { return <article className="info-card"><span>{icon}</span><b>{title}</b><p>{text}</p></article>; }
function Quest({ title, value, detail }) { return <article className="quest-card"><span>{title}</span><b>{value}</b><p>{detail}</p></article>; }
function ChartCard({ title, subtitle, children }) { return <article className="chart-card"><div className="chart-head"><b>{title}</b><span>{subtitle}</span></div>{children}</article>; }
function Legend({ color, label, value }) { return <div className={`legend-row ${color}`}><i /><span>{label}</span><b>{value}</b></div>; }
function AutoRule({ title, text }) { return <article className="auto-rule"><b>{title}</b><p>{text}</p></article>; }
function EmptyMini() { return <div className="empty-mini">Pas assez de données pour tracer ce graphique.</div>; }

createRoot(document.getElementById('root')).render(<App />);
