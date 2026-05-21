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

function daysBetween(a, b) {
  if (!a || !b) return 9999;
  const da = new Date(`${a}T00:00:00`);
  const db = new Date(`${b}T00:00:00`);
  return Math.abs(Math.round((da - db) / 86400000));
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
  const bw = toNumberOrNull(bet.weight), rw = toNumberOrNull(result.weight);
  if (bw !== null && rw !== null) {
    const points = Math.max(0, 15 - Math.floor(Math.abs(bw - rw) / 100));
    total += points;
    details.push(`Poids ${points}`);
  }
  const bh = toNumberOrNull(bet.height), rh = toNumberOrNull(result.height);
  if (bh !== null && rh !== null) {
    const points = Math.max(0, 5 - Math.abs(bh - rh));
    total += points;
    details.push(`Taille ${points}`);
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

function mode(values) {
  const counts = new Map();
  values.filter(Boolean).forEach((v) => counts.set(v, (counts.get(v) || 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
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
  const diff = Math.round((new Date(`${bet.birth_date}T00:00:00`) - new Date(`${TERM_DATE}T00:00:00`)) / 86400000);
  const w = toNumberOrNull(bet.weight);
  if (diff < -2) return 'Team impatience';
  if (diff > 2) return 'Bébé chill';
  if (w && w >= 4000) return 'Poids lourd';
  if (!bet.note) return 'Silent oracle';
  return 'Oracle du bureau';
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
    return { sex, avgWeight, avgHeight, commonDate, topName: mode(names), participants: bets.length };
  }, [bets]);

  const timeline = dateRange(TERM_DATE, 6).map((date) => ({ date, items: bets.filter((b) => b.birth_date === date) }));

  const wizard = [
    { title: 'Identité', sub: 'Qui ose poser son pari ?', fields: ['player'] },
    { title: 'Timing', sub: 'Le jour choisi par les astres.', fields: ['birth_date'] },
    { title: 'Profil bébé', sub: 'Fille, garçon, chaos maîtrisé.', fields: ['sex', 'first_name'] },
    { title: 'Mensurations', sub: 'On sort la balance de précision.', fields: ['weight', 'height'] },
    { title: 'Punchline', sub: 'La trace écrite de la mauvaise foi.', fields: ['note'] },
  ];

  function setField(key, value) { setBet((current) => ({ ...current, [key]: value })); }

  async function submitBet(event) {
    event.preventDefault();
    if (!bet.player.trim()) return setMessage('Il manque ton nom. Même les oracles ont une identité.');
    const { error } = await supabase.from('bets').insert(cleanBetPayload(bet));
    if (error) return setMessage(`Erreur enregistrement : ${error.message}`);
    setBet(defaultBet); setWizardStep(0); setMessage('Ticket validé. La prophétie est en base.'); await loadData();
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
      <section className="hero-panel">
        <div className="brand-pill">👶 Baby Bet Arena · POC over-achieved</div>
        <h1>Les paris du bébé de Marine</h1>
        <p className="hero-copy">Une mini arène de pronostics : tickets, consensus du bureau, timeline, cagnotte et cérémonie finale.</p>
        <div className="hero-actions">
          <a href={CAGNOTTE_URL} target="_blank" rel="noreferrer" className="cta-primary">🎁 Participer à la cagnotte</a>
          <button className="cta-secondary" onClick={() => document.getElementById('wizard')?.scrollIntoView({ behavior: 'smooth' })}>🎲 Poser un pari</button>
        </div>
        <div className="hero-metrics">
          <Metric label="Participants" value={stats.participants} />
          <Metric label="Terme" value="25/06" />
          <Metric label="Consensus" value={stats.sex} />
        </div>
      </section>

      <section className="command-panel">
        <div className="panel-title"><span>🧠</span><div><h2>Consensus engine</h2><p>Science douteuse, rendu premium.</p></div></div>
        <div className="consensus-card">
          <div className="prediction-line">{stats.sex} · {formatDate(stats.commonDate, true)} · {stats.avgWeight ? `${stats.avgWeight} g` : '—'} · {stats.topName}</div>
          <div className="confidence"><span style={{ width: `${Math.min(94, 25 + bets.length * 9)}%` }} /></div>
          <small>Indice de confiance : {Math.min(94, 25 + bets.length * 9)} %, basé sur absolument aucune rigueur médicale.</small>
        </div>
        <div className="stat-grid">
          <Metric label="Date favorite" value={formatDate(stats.commonDate, true)} />
          <Metric label="Poids moyen" value={stats.avgWeight ? `${stats.avgWeight}g` : '—'} />
          <Metric label="Taille moyenne" value={stats.avgHeight ? `${stats.avgHeight}cm` : '—'} />
          <Metric label="Top prénom" value={stats.topName} />
        </div>
      </section>

      <section id="wizard" className="wizard-panel">
        <div className="panel-title"><span>🎲</span><div><h2>{current.title}</h2><p>{current.sub}</p></div></div>
        <div className="progress-steps">{wizard.map((s, i) => <button key={s.title} className={i === wizardStep ? 'active' : ''} onClick={() => setWizardStep(i)}>{i + 1}</button>)}</div>
        <form onSubmit={submitBet}>
          <AnimatePresence mode="wait">
            <motion.div key={wizardStep} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="wizard-card">
              {current.fields.includes('player') && <Field label="Ton nom"><input value={bet.player} onChange={(e) => setField('player', e.target.value)} placeholder="Ex : Gabriel" /></Field>}
              {current.fields.includes('birth_date') && <Field label="Date estimée"><input type="date" value={bet.birth_date} onChange={(e) => setField('birth_date', e.target.value)} /></Field>}
              {current.fields.includes('sex') && <Field label="Sexe"><div className="choice-row">{['Fille','Garçon','Surprise totale'].map((x) => <button type="button" key={x} className={bet.sex === x ? 'choice active' : 'choice'} onClick={() => setField('sex', x)}>{x}</button>)}</div></Field>}
              {current.fields.includes('first_name') && <Field label="Prénom"><input value={bet.first_name} onChange={(e) => setField('first_name', e.target.value)} placeholder="Norris, Chuck, Louise..." /></Field>}
              {current.fields.includes('weight') && <div className="split"><Field label="Poids"><input type="number" min="1000" max="6000" value={bet.weight} onChange={(e) => setField('weight', e.target.value)} /></Field><Field label="Taille"><input type="number" min="35" max="65" value={bet.height} onChange={(e) => setField('height', e.target.value)} /></Field></div>}
              {current.fields.includes('note') && <Field label="Commentaire"><textarea value={bet.note} onChange={(e) => setField('note', e.target.value)} placeholder="Je le sens, c’est scientifique." /></Field>}
            </motion.div>
          </AnimatePresence>
          <div className="wizard-actions">
            <button type="button" className="cta-secondary" disabled={wizardStep === 0} onClick={() => setWizardStep((s) => Math.max(0, s - 1))}>Retour</button>
            {wizardStep < wizard.length - 1 ? <button type="button" className="cta-primary" onClick={() => setWizardStep((s) => s + 1)}>Suite</button> : <button className="cta-primary">Valider le ticket</button>}
          </div>
        </form>
      </section>

      <section className="timeline-panel">
        <div className="panel-title"><span>📅</span><div><h2>Timeline des dates</h2><p>Où le bureau concentre ses prophéties.</p></div></div>
        <div className="timeline">{timeline.map((day) => <div key={day.date} className={day.date === TERM_DATE ? 'day term' : 'day'}><b>{formatDate(day.date, true)}</b><div className="dots">{day.items.slice(0, 5).map((b) => <span key={b.id} title={b.player}>{initials(b.player)}</span>)}</div><small>{day.items.length}</small></div>)}</div>
      </section>

      <section className="tickets-panel">
        <div className="panel-title"><span>🎟️</span><div><h2>Wall of tickets</h2><p>{loading ? 'Chargement...' : `${bets.length} tickets dans l’arène.`}</p></div></div>
        <div className="tickets-wall">{bets.map((item) => <motion.button key={item.id} whileHover={{ y: -4 }} className="ticket" onClick={() => setSelectedTicket(item)}><div className="ticket-top"><span>{initials(item.player)}</span><b>{item.player}</b></div><div className="ticket-prediction">{formatDate(item.birth_date, true)} · {item.sex} · {item.first_name || 'Mystère'}</div><div className="ticket-meta"><span>{item.weight || '—'}g</span><span>{item.height || '—'}cm</span><span>{badgeFor(item)}</span></div></motion.button>)}</div>
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

    <AnimatePresence>{selectedTicket && <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedTicket(null)}><motion.div className="modal-card" initial={{ scale: .92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: .92, opacity: 0 }} onClick={(e) => e.stopPropagation()}><button className="modal-close" onClick={() => setSelectedTicket(null)}>×</button><div className="ticket-big-avatar">{initials(selectedTicket.player)}</div><h2>{selectedTicket.player}</h2><p>{selectedTicket.note || 'Aucun commentaire. La sobriété est un choix.'}</p><div className="modal-grid"><Metric label="Date" value={formatDate(selectedTicket.birth_date)} /><Metric label="Sexe" value={selectedTicket.sex} /><Metric label="Prénom" value={selectedTicket.first_name || 'Mystère'} /><Metric label="Poids" value={`${selectedTicket.weight || '—'} g`} /><Metric label="Taille" value={`${selectedTicket.height || '—'} cm`} /><Metric label="Badge" value={badgeFor(selectedTicket)} /></div>{adminMode && <button className="danger" onClick={() => removeBet(selectedTicket.id)}>Supprimer ce ticket</button>}</motion.div></motion.div>}</AnimatePresence>
  </div>;
}

function Field({ label, children }) { return <label className="field"><span>{label}</span>{children}</label>; }
function Metric({ label, value }) { return <div className="metric"><span>{label}</span><strong>{value}</strong></div>; }

createRoot(document.getElementById('root')).render(<App />);
