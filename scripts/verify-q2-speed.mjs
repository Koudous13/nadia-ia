import mysql from 'mysql2/promise';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const [k, ...rest] = l.split('=');
      return [k.trim(), rest.join('=').trim()];
    })
);

const pool = mysql.createPool({
  host: env.DB_HOST,
  port: Number(env.DB_PORT ?? 3306),
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  dateStrings: true,
  decimalNumbers: true,
});

const q = async (sql, params = []) => (await pool.query(sql, params))[0];

// Voir si les user_id de messages sont dans `users` ou `clients`
console.log('─── Distinct user_id dans conversation_messages ───');
const senders = await q(`
  SELECT
    cm.user_id,
    COUNT(*) AS nb_msgs,
    MAX(u.name) AS staff_name,
    MAX(CONCAT(p.first_name, ' ', p.last_name)) AS client_name
  FROM conversation_messages cm
  LEFT JOIN users u ON cm.user_id = u.id AND u.deleted_at IS NULL
  LEFT JOIN clients c ON c.id = cm.user_id
  LEFT JOIN people p ON c.customer_id = p.id
  WHERE cm.deleted_at IS NULL
  GROUP BY cm.user_id
  ORDER BY nb_msgs DESC
  LIMIT 15
`);
console.table(senders);

// → user_id semble être l'id dans `users` (staff). On regarde d'où viennent les clients.
// Hypothèse: dans une conversation liée à un client, le staff et le client discutent.
// Mais on ne voit pas d'id client dans conversation_messages → peut-être que les msgs client
// sont aussi stockés avec un user_id qui pointe vers leur compte utilisateur (tous les clients
// ont-ils un `users` aussi ?).

// Voir si une conversation a un lien avec un client
console.log('\n─── Colonnes conversations (autres relations ?) ───');
const cols = await q(
  `SELECT column_name FROM information_schema.columns
   WHERE table_schema=? AND table_name='conversations'`,
  [env.DB_NAME]
);
console.log(cols.map((c) => c.COLUMN_NAME));

// Participants d'une conversation — combien de user par conv ?
console.log('\n─── Nb participants moyen par conversation ───');
const participants = await q(`
  SELECT COUNT(DISTINCT user_id) AS n, COUNT(*) AS convs
  FROM (
    SELECT conversation_id, user_id FROM conversation_user
    GROUP BY conversation_id, user_id
  ) t
  GROUP BY conversation_id
`);
// agrégation par n
const byN = {};
for (const r of participants) byN[r.n] = (byN[r.n] || 0) + 1;
console.log('Nb conversations avec N participants (user_id dans conversation_user):', byN);

// Voir 1 conversation complète avec les noms
console.log('\n─── Exemple conversation 2117 ("EDF") ───');
const msgs = await q(`
  SELECT cm.id, cm.user_id, u.name AS staff, cm.content, cm.created_at
  FROM conversation_messages cm
  LEFT JOIN users u ON cm.user_id = u.id
  WHERE cm.conversation_id = 2117
  ORDER BY cm.created_at
  LIMIT 20
`);
console.table(msgs);

// Délai de réponse entre 2 messages consécutifs de user_id différent
console.log('\n─── Délai moyen de réponse staff (entre 2 messages consécutifs de user_ids différents) ───');
const reply = await q(`
  WITH ranked AS (
    SELECT cm.conversation_id, cm.user_id AS author_id, cm.created_at AS msg_at,
           LAG(cm.user_id)    OVER (PARTITION BY cm.conversation_id ORDER BY cm.created_at) AS prev_user_id,
           LAG(cm.created_at) OVER (PARTITION BY cm.conversation_id ORDER BY cm.created_at) AS prev_at
    FROM conversation_messages cm
    WHERE cm.deleted_at IS NULL
  )
  SELECT u.name AS staff,
         COUNT(*) AS nb_reponses,
         ROUND(AVG(TIMESTAMPDIFF(MINUTE, prev_at, msg_at)), 1) AS delai_moyen_min,
         ROUND(AVG(CASE WHEN TIMESTAMPDIFF(MINUTE, prev_at, msg_at) < 60*24
                        THEN TIMESTAMPDIFF(MINUTE, prev_at, msg_at) END), 1) AS delai_moyen_min_sous24h
  FROM ranked r
  JOIN users u ON r.author_id = u.id
  WHERE prev_user_id IS NOT NULL
    AND prev_user_id <> r.author_id
    AND TIMESTAMPDIFF(MINUTE, prev_at, msg_at) >= 0
  GROUP BY u.id, u.name
  HAVING nb_reponses >= 20
  ORDER BY delai_moyen_min_sous24h ASC
  LIMIT 15
`);
console.table(reply);

await pool.end();
