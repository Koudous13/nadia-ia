import { ToolDefinition } from '@/types';

export const crmTools: ToolDefinition[] = [
  // ──── Clients ────
  {
    name: 'search_clients',
    description: "Rechercher des clients par nom, prénom, email ou téléphone. Sans query, retourne les 50 clients les plus récents.",
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: "Terme de recherche (nom, prénom, email, téléphone). Optionnel — sans filtre, retourne les plus récents." },
      },
    },
  },
  {
    name: 'get_client',
    description: "Afficher les détails complets d'un client (infos personnelles, vendeur assigné).",
    parameters: {
      type: 'object',
      properties: {
        client_id: { type: 'string', description: "ID du client" },
      },
      required: ['client_id'],
    },
  },
  {
    name: 'get_client_orders',
    description: "Récupérer toutes les commandes d'un client avec le vendeur, produit et montants payés.",
    parameters: {
      type: 'object',
      properties: {
        client_id: { type: 'string', description: "ID du client" },
      },
      required: ['client_id'],
    },
  },
  {
    name: 'get_client_estimates',
    description: "Récupérer les devis d'un client.",
    parameters: {
      type: 'object',
      properties: {
        client_id: { type: 'string', description: "ID du client" },
      },
      required: ['client_id'],
    },
  },

  // ──── Commandes ────
  {
    name: 'search_orders',
    description: "Rechercher des commandes avec filtres optionnels (statut, date, vendeur). Retourne les commandes avec client, produit, vendeur et montant payé.",
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: "Terme de recherche (numéro, nom client, produit, statut)" },
        status: { type: 'string', description: "Filtrer par statut exact (ex: 'Terminée', 'Attente de prise en charge')" },
        date_from: { type: 'string', description: "Date de début YYYY-MM-DD" },
        date_to: { type: 'string', description: "Date de fin YYYY-MM-DD" },
        user_id: { type: 'string', description: "ID du vendeur pour filtrer ses commandes" },
      },
    },
  },
  {
    name: 'get_order',
    description: "Détails complets d'une commande : client, produit, catégorie, vendeur, créateur, paiements.",
    parameters: {
      type: 'object',
      properties: {
        order_id: { type: 'string', description: "ID de la commande" },
      },
      required: ['order_id'],
    },
  },
  {
    name: 'get_order_payments',
    description: "Liste des paiements d'une commande avec montant, type et qui a encaissé.",
    parameters: {
      type: 'object',
      properties: {
        order_id: { type: 'string', description: "ID de la commande" },
      },
      required: ['order_id'],
    },
  },
  {
    name: 'get_order_statuses',
    description: "Liste de tous les statuts de commandes avec le nombre de commandes par statut.",
    parameters: {
      type: 'object',
      properties: {},
    },
  },

  // ──── Produits ────
  {
    name: 'search_products',
    description: "Rechercher des produits/services avec leur prix et catégorie.",
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: "Terme de recherche" },
        family_id: { type: 'string', description: "ID de la catégorie (optionnel)" },
      },
    },
  },
  {
    name: 'get_product',
    description: "Détails d'un produit : prix, catégorie, conditions, documents requis.",
    parameters: {
      type: 'object',
      properties: {
        product_id: { type: 'string', description: "ID du produit" },
      },
      required: ['product_id'],
    },
  },
  {
    name: 'get_categories',
    description: "Lister les catégories de produits.",
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: "Recherche par nom (optionnel)" },
        parent_id: { type: 'string', description: "ID catégorie parente (optionnel)" },
      },
    },
  },

  // ──── Utilisateurs / Vendeurs ────
  {
    name: 'get_users',
    description: "Lister tous les vendeurs/assistants avec email, téléphone et poste.",
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_user',
    description: "Détails complets d'un vendeur : infos personnelles + statistiques (nombre de commandes, CA total).",
    parameters: {
      type: 'object',
      properties: {
        user_id: { type: 'string', description: "ID du vendeur" },
      },
      required: ['user_id'],
    },
  },

  // ──── Statistiques ────
  {
    name: 'get_ca',
    description: "Calculer le chiffre d'affaires (CA encaissé) sur une période, éventuellement par vendeur.",
    parameters: {
      type: 'object',
      properties: {
        date_from: { type: 'string', description: "Date de début YYYY-MM-DD (optionnel)" },
        date_to: { type: 'string', description: "Date de fin YYYY-MM-DD (optionnel)" },
        user_id: { type: 'string', description: "ID du vendeur pour filtrer (optionnel)" },
      },
    },
  },
  {
    name: 'get_top_vendors',
    description: "Classement des meilleurs vendeurs par CA encaissé sur une période. Par défaut, filtre sur la date des paiements (CA réellement encaissé dans la période).",
    parameters: {
      type: 'object',
      properties: {
        date_from: { type: 'string', description: "Date de début YYYY-MM-DD (optionnel)" },
        date_to: { type: 'string', description: "Date de fin YYYY-MM-DD (optionnel)" },
        limit: { type: 'string', description: "Nombre de vendeurs à retourner (défaut: 10)" },
        by: { type: 'string', enum: ['payment_date', 'order_date'], description: "Base du filtre date : 'payment_date' (par défaut, CA encaissé dans la période) ou 'order_date' (commandes créées dans la période)." },
      },
    },
  },
  {
    name: 'get_orders_by_status',
    description: "Nombre de commandes par statut, éventuellement sur une période donnée.",
    parameters: {
      type: 'object',
      properties: {
        date_from: { type: 'string', description: "Date de début YYYY-MM-DD (optionnel)" },
        date_to: { type: 'string', description: "Date de fin YYYY-MM-DD (optionnel)" },
      },
    },
  },

  // ──── Performance vendeurs (analytique avancé) ────
  {
    name: 'get_vendors_performance',
    description: "Rapport de performance complet par vendeur : nb commandes, nb terminées, nb payées, CA encaissé. Optionnel : période.",
    parameters: {
      type: 'object',
      properties: {
        date_from: { type: 'string', description: "Date de début YYYY-MM-DD (optionnel)" },
        date_to: { type: 'string', description: "Date de fin YYYY-MM-DD (optionnel)" },
      },
    },
  },
  {
    name: 'get_orders_by_vendor_status',
    description: "Comptage des commandes croisé vendeur × statut. Utile pour classer les vendeurs par un statut précis (ex: 'Terminée').",
    parameters: {
      type: 'object',
      properties: {
        date_from: { type: 'string', description: "Date de début YYYY-MM-DD (optionnel)" },
        date_to: { type: 'string', description: "Date de fin YYYY-MM-DD (optionnel)" },
        status: { type: 'string', description: "Si fourni, retourne juste le comptage pour ce statut (tri par count DESC)." },
      },
    },
  },
  {
    name: 'get_vendor_chat_stats',
    description: "Statistiques de réactivité des vendeurs dans les conversations internes (délai moyen entre 2 messages consécutifs d'auteurs différents).",
    parameters: {
      type: 'object',
      properties: {
        date_from: { type: 'string', description: "Date de début YYYY-MM-DD (optionnel)" },
        date_to: { type: 'string', description: "Date de fin YYYY-MM-DD (optionnel)" },
        min_responses: { type: 'string', description: "Seuil minimum de réponses pour apparaître dans le classement (défaut 5)." },
      },
    },
  },

  // ──── Escape hatch : SQL libre en lecture seule ────
  {
    name: 'list_tables',
    description: "Liste toutes les tables disponibles avec une estimation du nombre de lignes. À utiliser avant `run_sql` pour découvrir le schéma.",
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'describe_tables',
    description: "Décrit les colonnes (nom, type, nullable, clé) d'une ou plusieurs tables. À utiliser pour construire une requête `run_sql` valide.",
    parameters: {
      type: 'object',
      properties: {
        tables: { type: 'string', description: "Noms de tables séparés par des virgules (ex: 'orders,payments,users')." },
      },
      required: ['tables'],
    },
  },
  {
    name: 'run_sql',
    description: "Exécute une requête SQL SELECT arbitraire en lecture seule. Utiliser UNIQUEMENT si aucun autre outil ne convient. Règles : SELECT/WITH uniquement, pas de point-virgule, LIMIT forcé à 500, timeout 10 s, tables sensibles (auth/jobs/télémétrie) bloquées. Fournir du SQL MySQL valide.",
    parameters: {
      type: 'object',
      properties: {
        sql: { type: 'string', description: "Requête SQL SELECT (ou WITH). Doit être compilable MySQL 8. Pas de point-virgule final." },
      },
      required: ['sql'],
    },
  },
];
