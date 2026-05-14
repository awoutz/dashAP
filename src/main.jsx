import React from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import { motion } from 'framer-motion';
import './styles.css';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN || '';

const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const defaultBet = {
  player: '',
  birth_date: '2026-06-25',
  sex: 'Fille',
  first_name: '',
  weight: '3200',
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

function daysBetween(a, b) {
  if (!a || !b) return 9999;
  const da = new Date(`${a}T00:00:00`);
  const db = new Date(`${b}T00:00:00`);
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return 9999;
  return Math.abs(Math.round((da - db) / (1000 * 60 * 60 * 24)));
}

function normalizeName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function toNumberOrNull(value) {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function scoreBet(bet, result) {
  if (!result.birth_date && !result.sex && !result.first_name && !result.weight && !result.height) {
    return { total: null, details: [] };
  }

  const details = [];
  let total = 0;

  if (result.birth_date) {
    const diff = daysBetween(bet.birth_date, result.birth_date);
    const points = Math.max(0, 35 - diff * 5);
    total += points;
    details.push(`Date : ${points} pts`);
  }

  if (result.sex) {
    const points = bet.sex === result.sex ? 20 : 0;
    total += points;
    details.push(`Sexe : ${points} pts`);
  }

  if (result.first_name) {
    const points = normalizeName(bet.first_name) === normalizeName(result.first_name) ? 25 : 0;
    total += points;
    details.push(`Prénom : ${points} pts`);
  }

  const betWeight = toNumberOrNull(bet.weight);
  const resultWeight = toNumberOrNull(result.weight);
  if (resultWeight !== null && betWeight !== null) {
    const diff = Math.abs(betWeight - resultWeight);
    const points = Math.max(0, 15 - Math.floor(diff / 100));
    total += points;
    details.push(`Poids : ${points} pts`);
  }

  const betHeight = toNumberOrNull(bet.height);
  const resultHeight = toNumberOrNull(result.height);
  if (resultHeight !== null && betHeight !== null) {
    const diff = Math.abs(betHeight - resultHeight);
    const points = Math.max(0, 5 - diff);
    total += points;
    details.push(`Taille : ${points} pts`);
  }

  return { total, details };
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(`${value}T00:00:00`).toLocaleDateString('fr-FR');
}

function cleanBetPayload(bet) {
  return {
    player: bet.player.trim(),
    birth_date: bet.birth_date,
    sex: bet.sex,
    first_name: bet.first_name.trim() || null,
    weight: toNumberOrNull(bet.weight),
    height: toNumberOrNull(bet.height),
    note: bet.note.trim() || null,
  };
}

function cleanResultPayload(result) {
  return {
    birth_date: result.birth_date || null,
    sex: result.sex || null,
    first_name: result.first_name?.trim() || null,
    weight: toNumberOrNull(result.weight),
    height: toNumberOrNull(result.height),
    show_result: Boolean(result.show_result),
  };
}

async function adminRequest(action, payload = {}) {
  const response = await fetch('/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, pin: ADMIN_PIN, ...payload }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Action admin impossible');
  return data;
}

function Icon({ children }) {
  return <span aria-hidden="true" className="icon">{children}</span>;
}

function Field({ label, icon, children }) {
  return (
    <label className="field">
      <span className="field-label">{icon}{label}</span>
      {children}
    </label>
  );
}

function App() {
  const [bet, setBet] = React.useState(defaultBet);
  const [bets, setBets] = React.useState([]);
  const [result, setResult] = React.useState(emptyResult);
  const [loading, setLoading] = React.useState(true);
  const [message, setMessage] = React.useState('');
  const [adminMode, setAdminMode] = React.useState(false);
  const [adminPinInput, setAdminPinInput] = React.useState('');

  const hasConfig = Boolean(supabase);

  async function loadData() {
    if (!supabase) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage('');

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

  React.useEffect(() => {
    loadData();
  }, []);

  React.useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel('baby-bet-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bets' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_result' }, loadData)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const leaderboard = React.useMemo(() => {
    return bets
      .map((item) => ({ ...item, scoring: scoreBet(item, result) }))
      .sort((a, b) => (b.scoring.total ?? -1) - (a.scoring.total ?? -1));
  }, [bets, result]);

  function updateBet(key, value) {
    setBet((current) => ({ ...current, [key]: value }));
  }

  function updateResult(key, value) {
    setResult((current) => ({ ...current, [key]: value }));
  }

  async function submitBet(event) {
    event.preventDefault();
    if (!supabase || !bet.player.trim()) return;

    setMessage('');
    const { error } = await supabase.from('bets').insert(cleanBetPayload(bet));
    if (error) {
      setMessage(`Erreur enregistrement : ${error.message}`);
      return;
    }

    setBet(defaultBet);
    setMessage('Pari enregistré. La mauvaise foi est désormais officielle.');
    await loadData();
  }

  function unlockAdmin(event) {
    event.preventDefault();
    if (!ADMIN_PIN) {
      setMessage('VITE_ADMIN_PIN n’est pas configuré côté Vercel.');
      return;
    }
    if (adminPinInput === ADMIN_PIN) {
      setAdminMode(true);
      setAdminPinInput('');
      setMessage('Mode admin activé.');
    } else {
      setMessage('PIN incorrect.');
    }
  }

  async function saveResult() {
    try {
      await adminRequest('save_result', { result: cleanResultPayload(result) });
      setMessage('Résultat final enregistré.');
      await loadData();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function removeBet(id) {
    if (!window.confirm('Supprimer ce pari ?')) return;
    try {
      await adminRequest('delete_bet', { id });
      setMessage('Pari supprimé.');
      await loadData();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function resetGame() {
    if (!window.confirm('Tout remettre à zéro ?')) return;
    try {
      await adminRequest('reset_game');
      setMessage('Jeu remis à zéro.');
      await loadData();
    } catch (error) {
      setMessage(error.message);
    }
  }

  function exportData() {
    const payload = JSON.stringify({ bets, result }, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'baby-bet-marine.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="page">
      <main className="shell">
        <motion.header initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="hero">
          <div>
            <div className="pill"><Icon>👶</Icon> Baby Bet AP-HM edition</div>
            <h1>Les paris du bébé de Marine</h1>
            <p>Date, sexe, prénom, poids, taille : chacun tente sa chance. Le jour J, on renseigne le résultat et le classement se calcule tout seul.</p>
          </div>
          <div className="term-card">
            <span>Terme estimé</span>
            <strong><Icon>📅</Icon> 25 juin 2026</strong>
          </div>
        </motion.header>

        {!hasConfig && (
          <div className="alert">Config Supabase manquante : ajoute VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans Vercel.</div>
        )}
        {message && <div className="alert">{message}</div>}

        <div className="layout">
          <section className="card">
            <div className="card-head">
              <div>
                <h2>Je pose mon pari</h2>
                <p>Simple, rapide, et probablement de mauvaise foi.</p>
              </div>
              <span>✨</span>
            </div>

            <form onSubmit={submitBet} className="form">
              <Field label="Ton nom" icon={<Icon>👤</Icon>}>
                <input value={bet.player} onChange={(event) => updateBet('player', event.target.value)} placeholder="Ex : Gabriel" required />
              </Field>

              <div className="two-cols">
                <Field label="Date de naissance" icon={<Icon>📅</Icon>}>
                  <input type="date" value={bet.birth_date} onChange={(event) => updateBet('birth_date', event.target.value)} />
                </Field>
                <Field label="Sexe" icon={<Icon>👶</Icon>}>
                  <select value={bet.sex} onChange={(event) => updateBet('sex', event.target.value)}>
                    <option>Fille</option>
                    <option>Garçon</option>
                    <option>Surprise totale</option>
                  </select>
                </Field>
              </div>

              <Field label="Prénom parié" icon={<Icon>✨</Icon>}>
                <input value={bet.first_name} onChange={(event) => updateBet('first_name', event.target.value)} placeholder="Ex : Louise, Noé, Beyoncé..." />
              </Field>

              <div className="two-cols">
                <Field label="Poids en grammes" icon={<Icon>⚖️</Icon>}>
                  <input type="number" min="1000" max="6000" value={bet.weight} onChange={(event) => updateBet('weight', event.target.value)} />
                </Field>
                <Field label="Taille en cm" icon={<Icon>📏</Icon>}>
                  <input type="number" min="35" max="65" value={bet.height} onChange={(event) => updateBet('height', event.target.value)} />
                </Field>
              </div>

              <Field label="Petit commentaire facultatif" icon={<Icon>💬</Icon>}>
                <textarea value={bet.note} onChange={(event) => updateBet('note', event.target.value)} placeholder="Ex : je sens une naissance pendant la pause café." />
              </Field>

              <button className="primary" type="submit" disabled={!hasConfig}>Valider mon pari</button>
            </form>
          </section>

          <div className="side">
            <section className="card">
              <div className="card-head responsive-head">
                <div>
                  <h2><Icon>🏆</Icon> Paris enregistrés</h2>
                  <p>{loading ? 'Chargement...' : `${bets.length} pari${bets.length > 1 ? 's' : ''} dans la cagnotte de gloire.`}</p>
                </div>
                <button className="secondary" type="button" onClick={exportData}>⬇️ Export</button>
              </div>

              <div className="bets-list">
                {!loading && bets.length === 0 && <div className="empty">Aucun pari pour l’instant. Le premier collègue aura l’air très confiant, donc forcément suspect.</div>}
                {bets.map((item) => (
                  <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bet-row">
                    <div>
                      <strong>{item.player}</strong>
                      <p>{formatDate(item.birth_date)} · {item.sex} · {item.first_name || 'Prénom mystère'} · {item.weight || '—'} g · {item.height || '—'} cm</p>
                      {item.note && <em>“{item.note}”</em>}
                    </div>
                    {adminMode && <button className="ghost" type="button" onClick={() => removeBet(item.id)}>retirer</button>}
                  </motion.div>
                ))}
              </div>
            </section>

            <section className="admin-card">
              <div className="card-head responsive-head">
                <div>
                  <h2>Résultat final</h2>
                  <p>À remplir après la naissance. Là, les mythos tombent.</p>
                </div>
                {!adminMode && (
                  <form onSubmit={unlockAdmin} className="pin-form">
                    <input value={adminPinInput} onChange={(event) => setAdminPinInput(event.target.value)} placeholder="PIN admin" />
                    <button type="submit">OK</button>
                  </form>
                )}
              </div>

              <div className="result-grid">
                <input type="date" value={result.birth_date || ''} onChange={(event) => updateResult('birth_date', event.target.value)} disabled={!adminMode} />
                <select value={result.sex || ''} onChange={(event) => updateResult('sex', event.target.value)} disabled={!adminMode}>
                  <option value="">Sexe</option>
                  <option>Fille</option>
                  <option>Garçon</option>
                  <option>Surprise totale</option>
                </select>
                <input value={result.first_name || ''} onChange={(event) => updateResult('first_name', event.target.value)} placeholder="Prénom" disabled={!adminMode} />
                <input type="number" value={result.weight || ''} onChange={(event) => updateResult('weight', event.target.value)} placeholder="Poids g" disabled={!adminMode} />
                <input type="number" value={result.height || ''} onChange={(event) => updateResult('height', event.target.value)} placeholder="Taille cm" disabled={!adminMode} />
              </div>

              {adminMode && (
                <div className="admin-actions">
                  <label className="toggle"><input type="checkbox" checked={Boolean(result.show_result)} onChange={(event) => updateResult('show_result', event.target.checked)} /> Afficher le classement</label>
                  <button type="button" onClick={saveResult}>Enregistrer résultat</button>
                  <button type="button" onClick={resetGame}>Reset</button>
                </div>
              )}

              {result.show_result && (
                <div className="leaderboard">
                  {leaderboard.length === 0 && <p>Pas encore de participants.</p>}
                  {leaderboard.map((item, index) => (
                    <div key={item.id} className="rank-row">
                      <div className="rank">{index + 1}</div>
                      <div className="rank-main">
                        <strong>{item.player}</strong>
                        <span>{item.scoring.details.join(' · ') || 'Résultat incomplet'}</span>
                      </div>
                      <strong className="points">{item.scoring.total ?? '—'} pts</strong>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
