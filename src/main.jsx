import React from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import { motion } from 'framer-motion';
import './styles.css';

const SUPABASE_URL = 'https://btxmplbdeovyxytxdkzx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_3x3PgMOTCmGx8HySJ-zDmw_kfdbfFpg';

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

function runSelfTests() {
  const perfectBet = { birth_date: '2026-06-25', sex: 'Fille', first_name: 'Éléonore', weight: 3200, height: 50 };
  const perfectResult = { birth_date: '2026-06-25', sex: 'Fille', first_name: 'Eleonore', weight: 3200, height: 50 };
  console.assert(scoreBet(perfectBet, perfectResult).total === 100, 'Score parfait attendu : 100');
  console.assert(scoreBet({ ...perfectBet, birth_date: '2026-06-27' }, { ...emptyResult, birth_date: '2026-06-25' }).total === 25, 'Date à 2 jours attendue : 25');
  console.assert(scoreBet(perfectBet, emptyResult).total === null, 'Résultat vide attendu : null');
}

if (typeof window !== 'undefined' && !window.__BABY_BET_SELF_TESTS_DONE__) {
  window.__BABY_BET_SELF_TESTS_DONE__ = true;
  runSelfTests();
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
    p_birth_date: result.birth_date || null,
    p_sex: result.sex || null,
    p_first_name: result.first_name?.trim() || null,
    p_weight: toNumberOrNull(result.weight),
    p_height: toNumberOrNull(result.height),
    p_show_result: Boolean(result.show_result),
  };
}

function resultFacts(result) {
  return [
    { label: 'Date', value: formatDate(result.birth_date), icon: '📅' },
    { label: 'Sexe', value: result.sex || '—', icon: '👶' },
    { label: 'Poids', value: result.weight ? `${result.weight} g` : '—', icon: '⚖️' },
    { label: 'Taille', value: result.height ? `${result.height} cm` : '—', icon: '📏' },
  ];
}

function betFacts(item) {
  return [
    { label: 'Date', value: formatDate(item.birth_date), icon: '📅' },
    { label: 'Sexe', value: item.sex || '—', icon: '👶' },
    { label: 'Prénom', value: item.first_name || 'Mystère', icon: '✨' },
    { label: 'Poids', value: item.weight ? `${item.weight} g` : '—', icon: '⚖️' },
    { label: 'Taille', value: item.height ? `${item.height} cm` : '—', icon: '📏' },
  ];
}

function initials(name) {
  const parts = String(name || '?').trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?';
}

function medal(index) {
  return ['🥇', '🥈', '🥉'][index] || `${index + 1}`;
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
  const [adminPin, setAdminPin] = React.useState('');

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

  const leaderboard = React.useMemo(() => {
    return bets
      .map((item) => ({ ...item, scoring: scoreBet(item, result) }))
      .sort((a, b) => (b.scoring.total ?? -1) - (a.scoring.total ?? -1));
  }, [bets, result]);

  const podium = leaderboard.slice(0, 3);
  const restOfLeaderboard = leaderboard.slice(3);
  const officialFacts = resultFacts(result);
  const latestBet = bets[0];

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

  async function unlockAdmin(event) {
    event.preventDefault();
    if (!supabase) return;
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
    const payload = cleanResultPayload(result);
    const { error } = await supabase.rpc('admin_save_result', { pin: adminPin, ...payload });
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage('Résultat final enregistré.');
    await loadData();
  }

  async function removeBet(id) {
    if (!window.confirm('Supprimer ce pari ?')) return;
    const { error } = await supabase.rpc('admin_delete_bet', { pin: adminPin, p_id: id });
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage('Pari supprimé.');
    await loadData();
  }

  async function resetGame() {
    if (!window.confirm('Tout remettre à zéro ?')) return;
    const { error } = await supabase.rpc('admin_reset_game', { pin: adminPin });
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage('Jeu remis à zéro.');
    await loadData();
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

        {!hasConfig && <div className="alert">Config Supabase manquante.</div>}
        {message && <div className="alert">{message}</div>}

        <div className="layout">
          <section className="card form-card">
            <div className="card-head">
              <div>
                <div className="mini-kicker light-kicker">🎲 Nouveau pari</div>
                <h2>Je pose mon pari</h2>
                <p>Simple, rapide, et probablement de mauvaise foi.</p>
              </div>
              <span className="big-corner-icon">✨</span>
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
            <section className="card bets-card">
              <div className="bets-card-head">
                <div>
                  <div className="mini-kicker light-kicker">🎟️ Salle des pronostics</div>
                  <h2>Le tableau des paris</h2>
                  <p>{loading ? 'Chargement des tickets...' : `${bets.length} ticket${bets.length > 1 ? 's' : ''} validé${bets.length > 1 ? 's' : ''}.`}</p>
                </div>
                <button className="secondary export-btn" type="button" onClick={exportData}>⬇️ Export</button>
              </div>

              <div className="bets-score-strip">
                <div>
                  <span>Participants</span>
                  <strong>{bets.length}</strong>
                </div>
                <div>
                  <span>Dernier pari</span>
                  <strong>{latestBet ? latestBet.player : '—'}</strong>
                </div>
                <div>
                  <span>Terme</span>
                  <strong>25/06</strong>
                </div>
              </div>

              <div className="bets-list ticket-list">
                {!loading && bets.length === 0 && <div className="empty">Aucun pari pour l’instant. Le premier collègue aura l’air très confiant, donc forcément suspect.</div>}
                {bets.map((item, index) => (
                  <motion.article key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bet-ticket">
                    <div className="ticket-main">
                      <div className="ticket-avatar">{initials(item.player)}</div>
                      <div className="ticket-title">
                        <span>Ticket #{bets.length - index}</span>
                        <strong>{item.player}</strong>
                        <p>{item.note ? `“${item.note}”` : 'Aucun commentaire. Méfiance.'}</p>
                      </div>
                      {adminMode && <button className="ghost ticket-remove" type="button" onClick={() => removeBet(item.id)}>retirer</button>}
                    </div>
                    <div className="ticket-grid">
                      {betFacts(item).map((fact) => (
                        <div className="ticket-chip" key={fact.label}>
                          <span>{fact.icon}</span>
                          <div>
                            <small>{fact.label}</small>
                            <b>{fact.value}</b>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.article>
                ))}
              </div>
            </section>

            <section className="admin-card result-card">
              <div className="card-head responsive-head result-head">
                <div>
                  <div className="mini-kicker">👑 Verdict officiel</div>
                  <h2>Résultat final</h2>
                  <p>On verrouille les vrais chiffres, puis le podium sort tout seul.</p>
                </div>
                {!adminMode && (
                  <form onSubmit={unlockAdmin} className="pin-form">
                    <input value={adminPinInput} onChange={(event) => setAdminPinInput(event.target.value)} placeholder="PIN admin" type="password" />
                    <button type="submit">OK</button>
                  </form>
                )}
              </div>

              <div className="result-official-card">
                <div>
                  <span className="result-label">Prénom officiel</span>
                  <strong>{result.first_name || 'Mystère total'}</strong>
                </div>
                <div className="result-facts">
                  {officialFacts.map((fact) => (
                    <div className="fact-pill" key={fact.label}>
                      <span>{fact.icon}</span>
                      <div>
                        <small>{fact.label}</small>
                        <b>{fact.value}</b>
                      </div>
                    </div>
                  ))}
                </div>
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

              {result.show_result ? (
                <div className="results-showcase">
                  {leaderboard.length === 0 && <p className="muted-result">Pas encore de participants.</p>}

                  {podium.length > 0 && (
                    <div className="podium-grid">
                      {podium.map((item, index) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`podium-card podium-${index + 1}`}
                        >
                          <div className="medal">{medal(index)}</div>
                          <div className="podium-name">{item.player}</div>
                          <div className="podium-score">{item.scoring.total ?? '—'} pts</div>
                          <div className="detail-pills">
                            {item.scoring.details.slice(0, 3).map((detail) => <span key={detail}>{detail}</span>)}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {restOfLeaderboard.length > 0 && (
                    <div className="leaderboard compact-leaderboard">
                      {restOfLeaderboard.map((item, index) => (
                        <div key={item.id} className="rank-row">
                          <div className="rank">{index + 4}</div>
                          <div className="rank-main">
                            <strong>{item.player}</strong>
                            <span>{item.scoring.details.join(' · ') || 'Résultat incomplet'}</span>
                          </div>
                          <strong className="points">{item.scoring.total ?? '—'} pts</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="locked-result">
                  <span>🔒</span>
                  <p>Le classement reste caché tant que l’admin n’a pas publié le résultat.</p>
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
