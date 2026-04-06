# Audit API CRM Paperasse — Rapport de bugs

**Date :** 06 avril 2026
**Environnement :** https://dev.paperasse.co/api
**Contexte :** Ces bugs ont ete identifies lors de l'integration de l'API CRM avec **Nadia AI**, notre assistant IA qui exploite ces endpoints pour repondre aux utilisateurs (calcul de CA, stats vendeurs, suivi commandes, etc.).

---

## BUGS CRITIQUES

### Bug 1 — `GET /customers/index` renvoie une erreur 500

**Endpoint :** `GET /customers/index`
**Comportement actuel :** Internal Server Error (500) systematique.
**Comportement attendu :** Liste paginee de tous les clients.

**Impact sur Nadia AI :** L'agent IA ne peut pas lister l'ensemble des clients. Quand un utilisateur demande "combien de clients on a ?" ou "liste tous les clients", Nadia echoue. On a du desactiver cet outil et utiliser `search_clients` comme contournement, mais ca ne couvre pas le cas d'un listing complet.

---

### Bug 2 — Champ `user` absent sur les commandes

**Endpoints concernes :**
- `GET /search/orders`
- `GET /orders/{id}/show`
- `GET /customers/orders/{client_id}`

**Comportement actuel :** L'objet commande ne contient pas le champ `user`.
**Comportement attendu (documentation) :** Chaque commande devrait contenir `user: { id: integer, name: string }` representant le vendeur/assistant assigne.

**Impact sur Nadia AI :** C'est le bug le plus bloquant. Sans la liaison commande-vendeur, Nadia ne peut pas :
- Calculer le CA par vendeur ("Quel est le meilleur vendeur ce mois-ci ?")
- Lister les commandes d'un vendeur specifique
- Faire des statistiques de performance par vendeur
- Repondre a toute question impliquant la relation vendeur-commande

Ces fonctionnalites sont parmi les plus demandees par les utilisateurs.

---

### Bug 3 — Champ `created_at` absent sur les commandes

**Endpoints concernes :** Les memes 3 endpoints que le bug 2.
**Comportement actuel :** Aucun champ de date de creation sur les commandes.
**Comportement attendu :** `created_at: string<date-time>` sur chaque commande.

**Impact sur Nadia AI :** Sans date de creation, Nadia est forcee de deviner la date a partir du numero de commande (ex: "BC2603" = mars 2026). Cette methode est fragile et imprecise :
- Impossible de filtrer par plage de dates exacte
- Impossible de trier par date de creation
- Les calculs de CA mensuel/hebdomadaire/journalier sont approximatifs
- Les questions comme "commandes de cette semaine" ou "CA du 1er au 15 mars" ne peuvent pas etre traitees correctement

---

## BUGS DE SECURITE

### Bug 4 — Token invalide ou absent renvoie une erreur 500 au lieu de 401

**Reproduction :**
- `GET /users?key=INVALID_TOKEN` → 500
- `GET /users` (sans key) → 500

**Comportement attendu :** `401 Unauthorized` avec un message JSON propre : `{ "error": "Invalid or missing API key" }`

**Impact sur Nadia AI :** Quand le token expire ou est invalide, Nadia recoit une erreur 500 generique au lieu d'un 401 clair. L'agent ne peut pas distinguer "token invalide" de "erreur serveur" et ne peut donc pas informer correctement l'utilisateur qu'il doit se reconnecter.

---

### Bug 5 — Stack traces exposees en production

**Reproduction :** Toute requete provoquant une erreur (404, 500) renvoie le stack trace complet :
```json
{
  "message": "No query results for model [App\\Models\\Client] 999999",
  "exception": "Symfony\\Component\\HttpKernel\\Exception\\NotFoundHttpException",
  "file": "/var/www/dev/releases/295/vendor/laravel/framework/src/...",
  "line": 487,
  "trace": [...]
}
```

**Informations exposees :**
- Chemin serveur : `/var/www/dev/releases/295/`
- Noms de classes et modeles internes : `App\Models\Client`, `App\Models\Order`
- Version des packages et structure du projet
- Fichier et ligne de chaque appel dans la pile

**Correction :** Mettre `APP_DEBUG=false` dans le `.env` du serveur. En production, les erreurs doivent retourner uniquement `{ "message": "Not found" }` sans details techniques.

**Impact sur Nadia AI :** L'agent IA recoit des reponses d'erreur tres volumineuses (stack traces de 100+ lignes) qui consomment inutilement les tokens du LLM et polluent le contexte de conversation.

---

### Bug 6 — Message d'erreur d'authentification incoherent

**Reproduction :** `GET /users` sans aucune authentification.
**Reponse :** `{ "message": "X-Api-Key header missing" }`

**Probleme :** Le message dit que le header `X-Api-Key` est manquant, mais l'API accepte aussi l'authentification via le query parameter `?key=`. Le message d'erreur devrait reflechir les deux methodes acceptees, ou au minimum ne pas induire en erreur.

**Impact sur Nadia AI :** Mineur, mais source de confusion lors du debugging.

---

## BUGS DE DONNEES

### Bug 7 — Champ `category` absent sur les produits

**Endpoint :** `GET /products/{id}`
**Comportement actuel :** Le champ `category` (documente dans `ProductResource`) n'est pas retourne.
**Champs retournes :** `id, name, price, payment_link, sales_arguments, required_documents, conditions, related_products, created_at, updated_at`

**Impact sur Nadia AI :** Nadia ne peut pas regrouper ou filtrer les produits par categorie. Les questions comme "quels produits dans la categorie sejour ?" necessitent un contournement via l'endpoint `/categories` puis des recherches manuelles.

---

### Bug 8 — Faute de frappe `created__at` (double underscore)

**Endpoint :** Tous les endpoints retournant un `CustomerResource`
**Comportement actuel :** Le champ est nomme `created__at` (deux underscores).
**Comportement attendu :** `created_at` (un seul underscore), comme tous les autres champs de date de l'API.

```json
{
  "customer": {
    "id": 5214,
    "first_name": "Imeloul",
    "created__at": "2026-03-20T16:47:21.000000Z",  // <-- double underscore
    "updated_at": "2026-03-20T17:08:29.000000Z"     // <-- simple underscore (correct)
  }
}
```

**Impact sur Nadia AI :** Si l'agent essaie d'acceder a `customer.created_at`, il obtient `undefined`. Il doit connaitre cette anomalie pour utiliser `created__at`, ce qui est fragile et sera casse le jour ou le bug sera corrige.

---

### Bug 9 — Incoherence `is_payed=1` avec `total_paid=0`

**Reproduction :** Plusieurs commandes ont `is_payed: 1` alors que `total_paid: 0` et `order_price: 0`.
**Exemples :** `BC260310110`, `BC260310109`, `BC260209992`, `BC251209620`

**Impact sur Nadia AI :** L'agent ne sait pas quel champ utiliser pour determiner si une commande est payee. `is_payed` dit oui, `total_paid` dit non. Les calculs de CA encaisse deviennent incoherents selon le champ utilise.

---

## BUGS DE NOMMAGE

### Bug 10 — Endpoint `/orders/statues` au lieu de `/orders/statuses`

**Endpoint actuel :** `GET /orders/statues` (fonctionne)
**Endpoint correct :** `GET /orders/statuses` (renvoie 405 Method Not Allowed)

"Statues" signifie des statues (sculptures). "Statuses" est le pluriel correct de "status".

**Impact sur Nadia AI :** Mineur mais source de confusion. Si l'endpoint est corrige un jour sans redirection, notre integration cassera.

---

## BUGS DE COMPORTEMENT

### Bug 11 — Recherche vide renvoie 0 resultats

**Reproduction :** `GET /search/clients?s=` (query vide)
**Comportement actuel :** `{ "data": [], "meta": { "total": null } }`
**Comportement attendu :** Retourner tous les resultats (comme un listing) ou une erreur 422 indiquant que le parametre `s` est requis.

**Impact sur Nadia AI :** Quand l'utilisateur demande "liste des clients" sans critere, Nadia appelle `search_clients("")` et obtient 0 resultats. L'agent est alors oblige de deviner un terme de recherche generique ("a", "e", etc.) ce qui est un contournement fragile et incomplet.

---

## RESUME

| # | Severite | Bug | Impact Nadia AI |
|---|----------|-----|-----------------|
| 1 | CRITIQUE | `GET /customers/index` → 500 | Listing clients impossible |
| 2 | CRITIQUE | Champ `user` absent sur commandes | Stats vendeurs impossibles |
| 3 | CRITIQUE | Champ `created_at` absent sur commandes | Filtrage par date impossible |
| 4 | SECURITE | Token invalide → 500 au lieu de 401 | Detection reconnexion impossible |
| 5 | SECURITE | Stack traces exposees | Fuite d'infos serveur + surcout tokens LLM |
| 6 | SECURITE | Message erreur auth incoherent | Confusion debugging |
| 7 | MOYEN | Champ `category` absent sur produits | Regroupement produits impossible |
| 8 | MOYEN | `created__at` double underscore | Parsing fragile |
| 9 | MOYEN | `is_payed=1` avec `total_paid=0` | Calculs CA incoherents |
| 10 | MINEUR | Endpoint `/orders/statues` (typo) | Risque de casse future |
| 11 | MINEUR | Recherche vide → 0 resultats | Contournement fragile |

**Total : 3 critiques, 3 securite, 3 moyens, 2 mineurs**
