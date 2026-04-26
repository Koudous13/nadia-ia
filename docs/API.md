# Documentation API — Nadia AI

Architecture : Next.js 16 App Router (TypeScript). Le backend est exposé via `src/app/api/*/route.ts`. La DB CRM est accédée en **MySQL direct, lecture seule** (cf. justification dans `AUDIT-API-CRM.md`).

## Sommaire
1. [Endpoints HTTP internes](#1-endpoints-http-internes)
2. [Outils LLM exposés](#2-outils-llm-exposés)
3. [Schéma MySQL utilisé](#3-schéma-mysql-utilisé)
4. [Sécurité & garde-fous SQL](#4-sécurité--garde-fous-sql)

---

## 1. Endpoints HTTP internes

Tous protégés par middleware Supabase (auth requise) sauf `/login` et `/auth/*`.

### `POST /api/chat`

Cœur de l'agent : reçoit une question utilisateur + historique, orchestre LLM ↔ tools, renvoie texte + données structurées.

**Request body**
```json
{
  "message": "CA encaissé d'avril 2026 ?",
  "history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

**Response 200**
```json
{
  "texte": "Phrase d'introduction (sans marqueurs).",
  "type_donnees": "texte" | "tableau" | "graphique",
  "donnees": [{ "...": "..." }],
  "suggestions": ["Question reformulée 1", "..."]
}
```

- `donnees` n'est présent que si le LLM a inséré un marqueur `[TABLE]` ou `[CHART:bar|line|pie]` dans sa réponse.
- `suggestions` sont les reformulations détectées via `[SUGGESTION] xxx` dans la réponse LLM.
- `maxDuration: 30 s`. Au-delà, timeout réseau côté client (45 s).

**Response 4xx/5xx** : `{ error, details? }`. Logué dans `query_logs` si la table existe.

### `GET /api/kpi?page=<key>`

Retourne les KPI précalculés pour une page de la sidebar.

| `page` | KPI retournés |
|--------|---------------|
| `ca-aujourdhui` | CA encaissé jour, Top vendeur jour, Panier moyen |
| `ca-mois` | CA encaissé MTD, CA facturé MTD, Restant, vs mois précédent |
| `paiements` | Encaissé MTD, Restant, Stripe MTD, Cash MTD |
| `performance-equipe` | Top vendeur mois, Délai moyen traitement, Terminées MTD, Taux annulation |
| `alertes` | Commandes >30j, Dossiers bloqués, Paiements orphelins, Devis ≥500€ non payés |

**Response 200**
```json
{
  "page": "ca-mois",
  "kpis": [
    { "label": "CA encaissé MTD", "value": "16 124 €", "sub": "123 commandes payées", "tone": "good" }
  ]
}
```

`tone` ∈ `good | warn | neutral`. Cache HTTP 60 s (`stale-while-revalidate=120`).

### `GET /api/db-health`

Diagnostic MySQL : ping + nombre de tables + dernière commande créée. Utilisé pour vérifier la santé de la connexion CRM.

### `POST /auth/signout` / `POST /login` (server actions)

Authentification Supabase. Voir `src/app/login/actions.ts`.

---

## 2. Outils LLM exposés

51 outils définis dans `src/lib/tools/definitions.ts`, dispatchés par `src/lib/crm/client.ts`. Le LLM les invoque via function-calling.

### CRUD basique

| Outil | Description | Paramètres |
|-------|-------------|------------|
| `search_clients` | Recherche clients par nom/email/tel | `query?` |
| `get_client` | Détails d'un client | `client_id` |
| `get_client_orders` | Commandes d'un client | `client_id` |
| `get_client_estimates` | Devis d'un client | `client_id` |
| `search_orders` | Recherche commandes (filtres status/date/vendeur) | `query?, status?, date_from?, date_to?, user_id?` |
| `get_order` | Détails commande + paiements | `order_id` |
| `get_order_payments` | Paiements d'une commande | `order_id` |
| `get_order_statuses` | Répartition par statut | — |
| `search_products` | Recherche prestations | `query?, family_id?` |
| `get_product` | Détails prestation | `product_id` |
| `get_categories` | Liste catégories | `query?, parent_id?` |
| `get_users` | Liste vendeurs actifs | — |
| `get_user` | Détails vendeur + stats | `user_id` |

### CA & analytique financière

| Outil | Description | Notes |
|-------|-------------|-------|
| `get_ca` | CA encaissé sur période | `date_from?, date_to?, user_id?` |
| `get_ca_factured` | CA facturé (orders.total_price) | `status?, status_in?, exclude_cancelled?, user_id?` |
| `get_ca_summary` | Synthèse facturé/encaissé/restant | — |
| `get_ca_by_day` | CA jour par jour | Pour [CHART:line] |
| `get_ca_by_payment_type` | Répartition par moyen de paiement | `type?` filtre Stripe/PayPal/cash/etc. |
| `get_ca_by_prestation` | Top prestations par CA | `limit?` |
| `get_ca_by_category` | Top catégories par CA | `limit?` |
| `get_ca_by_prestation_and_payment` | Croisement prestation × paiement | — |
| `compare_periods` | Compare 2 périodes (CA, delta %) | `from_a, to_a, from_b, to_b` |
| `get_average_basket` | Panier moyen (global ou par vendeur) | `by_user='true'` pour classement vendeurs |
| `get_average_payment` | Paiement moyen + moyen par commande | — |

### Performance vendeurs

| Outil | Description |
|-------|-------------|
| `get_top_vendors` | Top vendeurs par CA encaissé. `by='order_date'` ou `'payment_date'` |
| `get_top_vendors_by_factured` | Top par CA facturé (≠ encaissé) |
| `get_top_vendors_by_prestation` | Top sur une prestation matchant un mot-clé |
| `get_top_users_by_payment_type` | Top sur un type de paiement précis |
| `get_top_users_by_clients` | Top par nb prospects/clients |
| `get_vendors_performance` | Rapport complet par vendeur (commandes, terminées, payées, CA) |
| `get_orders_by_vendor_status` | Cross vendeur × statut |
| `get_vendor_chat_stats` | Réactivité dans les conversations internes |
| `get_conversion_rate_by_user` | Taux conversion devis → commande |
| `get_user_daily_average` | CA moyen par jour actif par vendeur |
| `get_volume_vs_delay_by_user` | Croisement volume × délai |
| `get_volume_vs_cancellations_by_user` | Croisement volume × taux d'annulation |
| `compare_users_periods` | Compare CA vendeurs entre 2 périodes (progression / baisse) |

### Délais & retards

| Outil | Description |
|-------|-------------|
| `get_processing_time_by_user` | Délai moyen Terminée par vendeur. Filtres `max_days`, `min_days` |
| `get_average_processing_time` | Délai moyen global |
| `get_overdue_orders` | Commandes >= N jours non clôturées. `group_by='user'\|'client'` |
| `get_orders_blocked` | Commandes en attente externe. `group_by` idem |
| `get_orders_closed_on_date` | Clôturées un jour précis |
| `get_orders_by_prestation` | Comptage par prestation + stats |

### Anomalies & cohérence

| Outil | Description |
|-------|-------------|
| `get_partial_payments` | Commandes payées partiellement |
| `get_outstanding_balance` | Total restant à encaisser |
| `get_clients_with_balance` | Clients avec solde dû |
| `get_payments_without_order` | Paiements orphelins (order NULL/supprimé) |
| `get_orders_without_payment` | Commandes sans paiement (hors annulées) |
| `get_orders_paid_not_treated` | `is_payed=1` mais statut non clos |
| `get_orders_completed_not_paid` | Statut Terminée mais `is_payed=0` |
| `get_inconsistent_amounts` | `is_payed`/`total_paid`/`total_price` incohérents |
| `get_orders_without_user` | Commandes sans vendeur assigné |
| `get_orders_without_prestation` | Commandes sans prestation |
| `get_duplicate_clients` | Doublons par email ou téléphone |
| `get_duplicate_payments` | Paiements identiques même jour/order |

### Clients & relances

| Outil | Description |
|-------|-------------|
| `get_top_clients` | Clients les plus rentables. `by='ca'\|'orders'` |
| `get_clients_with_multiple_orders` | Clients récurrents (>= N commandes) |
| `get_inactive_clients` | Clients silencieux depuis N mois |
| `get_unpaid_quotes` | Devis non payés. Filtre `min_amount` |
| `get_unconverted_quotes_by_user` | Vendeurs avec le plus de devis non convertis |
| `get_orders_needing_docs_by_user` | Vendeurs avec dossiers `needs_docs=1` |
| `get_scheduled_reminders` | Rappels planifiés (table `scheduled_notifications`) |

### Synthèses

| Outil | Description |
|-------|-------------|
| `get_monthly_summary` | Synthèse complète d'un mois (CA, statuts, top vendeur, top prestation) |
| `get_loss_analysis` | Annulations 12 mois, restant, devis non convertis |
| `get_time_loss_analysis` | Dossiers bloqués, vendeurs lents, dossiers >90j |
| `get_orders_by_status` | Comptage commandes par statut sur période |

### Escape hatch SQL

| Outil | Description |
|-------|-------------|
| `list_tables` | Lister toutes les tables (hors auth/jobs/télémétrie) |
| `describe_tables` | Colonnes d'une ou plusieurs tables |
| `run_sql` | Exécuter un SELECT/WITH arbitraire (cf. garde-fous § 4) |

---

## 3. Schéma MySQL utilisé

Connexion via `mysql2/promise` (pool de 10 connexions, `dateStrings: true`, `decimalNumbers: true`). Variables d'env : `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.

### Tables principales

**`users`** — vendeurs / assistants. Filtre actifs : `deleted_at IS NULL AND hidden = 0 AND is_active = 1`. Rôles via `model_has_roles` + `roles` (Spatie/laravel-permission). Trois rôles : `Super-Admin`, `assistant`, `reseller`.

**`clients`** + **`people`** — clients liés aux personnes via `customer_id`. `customer_type = 'App\Models\Person'` filtre les particuliers. `clients.user_id` = vendeur assigné.

**`orders`** — commandes / devis.
- `state` : `1` ou `2` = devis ; `3` = commande facturée.
- `statuts` (string) : 18 valeurs distinctes. Sémantique :
  - **Clos** : `Terminée`, `Annulée`, `Livrée`, `Expédié`
  - **En cours** : `Attente de prise en charge` (= "en attente"), `En cours de traitement`, `Prise en charge`, `Prêt pour expédition`, `Envoyée électroniquement`
  - **Bloqué** (attente externe) : `Attente retour client (...)`, `Attente réglement (...)`, `Attente retour administration`, `Attente rendez-vous administratif`, `Attente validation hiérarchique`
- `total_price` est un JSON `{"amount": cents, "currency": "EUR"}`. Conversion : `CAST(total_price->>'$.amount' AS DECIMAL(20,2)) / 100`.
- `is_payed` (tinyint) — flag à recouper avec la somme des paiements (incohérences possibles, cf. `get_inconsistent_amounts`).
- `status_updated_at` — utilisé pour calculer le délai de traitement quand `statuts = 'Terminée'`.

**`payments`** — encaissements UNIQUEMENT (pas d'échec/attente/annulation au niveau paiement).
- `amount` : JSON identique aux orders.
- `type` : `cash`, `creditCard`, `transfer`, `paypal`, `stripe`, `zettle ` (espace !), `fidelity`, `sponsorship`. Toujours `TRIM(LOWER(...))` dans les comparaisons.

**`prestations`** + **`prestations_families`** — produits/services et leur catégorie. `prestation.price` est un JSON.

**`scheduled_notifications`** — rappels/relances planifiés (`send_at`, `sent_at`, `cancelled_at`). Le body de la notification est sérialisé PHP, on n'expose que les dates.

**`conversations`** + **`conversation_messages`** + **`conversation_user`** — conversations internes entre vendeurs. Utilisé par `get_vendor_chat_stats`.

### Tables présentes mais non utilisées (raison)

- `leads` : vide en pratique (1 ligne soft-deleted). On utilise les clients sans paiement comme proxy "prospect".
- `tasks` / `order_task` : référentiel de tâches par prestation, pas de notion d'assignation à un user.
- `order_status_reminders` : vide.
- `revisions` (787K lignes), `activity_log` (200K) : trop volumineuses sans index dédié pour exposer.

---

## 4. Sécurité & garde-fous SQL

### `safe-sql.ts` (utilisé par `run_sql`, `list_tables`, `describe_tables`)

- **SELECT ou WITH uniquement.** Tout autre verbe → rejeté avec message clair.
- Mots-clés bloqués (regex) : `INSERT, UPDATE, DELETE, DROP, CREATE, ALTER, TRUNCATE, GRANT, REVOKE, CALL, EXECUTE, RENAME, HANDLER, LOCK, UNLOCK, REPLACE INTO, LOAD DATA, INTO OUTFILE, INTO DUMPFILE`.
- Tables sensibles bloquées : `password_resets`, `credantials`, `sessions`, `api_keys`, `telescope_*`, `pulse_*`, `jobs`, `failed_jobs`, `webhook_calls`.
- Pas de point-virgule autorisé (anti-stacking).
- `LIMIT 500` ajouté automatiquement si absent.
- Hint MySQL `MAX_EXECUTION_TIME(10000)` injecté → kill côté serveur après 10 s.

### Auth utilisateurs (Supabase)

- Toutes les routes (sauf `/login`, `/auth/*`) protégées par middleware (`src/proxy.ts` → `src/lib/supabase/proxy.ts`).
- Si pas de session valide → redirect `/login?next=<path>`.
- Cookie session géré par `@supabase/ssr`.

### Logging des conversations

- Table Supabase `query_logs` (cf. `docs/supabase-query-logs.sql`).
- Best-effort : si la table n'existe pas, `/api/chat` continue à fonctionner sans logger.
- RLS : `INSERT` réservé à l'utilisateur authentifié, `SELECT` restreint à ses propres logs (à étendre côté admin si besoin).

### Variables d'environnement (`.env.local`)

| Variable | Rôle |
|----------|------|
| `LLM_PROVIDER` | `gemini` \| `openai` \| `claude` |
| `OPENAI_API_KEY` / `GEMINI_API_KEY` / `ANTHROPIC_API_KEY` | Clé du provider actif |
| `OPENAI_MODEL` / `GEMINI_MODEL` / `ANTHROPIC_MODEL` | Modèle (sinon défaut) |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | MySQL CRM lecture seule |
| `CRM_API_URL`, `CRM_USER_TOKEN` | API REST CRM (legacy, plus utilisée — voir `AUDIT-API-CRM.md`) |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Auth Supabase |
