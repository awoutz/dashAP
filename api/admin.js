import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminPin = process.env.ADMIN_PIN;

const supabase = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey)
  : null;

function json(response, status = 200) {
  return new Response(JSON.stringify(response), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function validResultPayload(result) {
  if (!result || typeof result !== 'object') return false;
  const allowedSexes = ['', null, 'Fille', 'Garçon', 'Surprise totale'];
  if (!allowedSexes.includes(result.sex)) return false;
  if (result.weight !== null && result.weight !== undefined && (Number(result.weight) < 1000 || Number(result.weight) > 6000)) return false;
  if (result.height !== null && result.height !== undefined && (Number(result.height) < 35 || Number(result.height) > 65)) return false;
  return true;
}

export default async function handler(req) {
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);
  if (!supabase) return json({ error: 'Variables serveur Supabase manquantes' }, 500);
  if (!adminPin) return json({ error: 'ADMIN_PIN manquant côté Vercel' }, 500);

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'JSON invalide' }, 400);
  }

  if (body.pin !== adminPin) return json({ error: 'PIN admin incorrect' }, 401);

  const action = body.action;

  if (action === 'check_pin') {
    return json({ ok: true });
  }

  if (action === 'save_result') {
    if (!validResultPayload(body.result)) return json({ error: 'Résultat invalide' }, 400);
    const { error } = await supabase
      .from('game_result')
      .update(body.result)
      .eq('id', 1);

    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  if (action === 'delete_bet') {
    if (!body.id) return json({ error: 'ID manquant' }, 400);
    const { error } = await supabase
      .from('bets')
      .delete()
      .eq('id', body.id);

    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  if (action === 'reset_game') {
    const deleteResult = await supabase.from('bets').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (deleteResult.error) return json({ error: deleteResult.error.message }, 500);

    const updateResult = await supabase
      .from('game_result')
      .update({ birth_date: null, sex: null, first_name: null, weight: null, height: null, show_result: false })
      .eq('id', 1);

    if (updateResult.error) return json({ error: updateResult.error.message }, 500);
    return json({ ok: true });
  }

  return json({ error: 'Action inconnue' }, 400);
}
