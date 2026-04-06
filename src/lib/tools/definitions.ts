import { ToolDefinition } from '@/types';

export const crmTools: ToolDefinition[] = [
  // ──── Clients ────
  {
    name: 'search_clients',
    description: "Rechercher des clients par nom, prénom, email ou téléphone.",
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: "Terme de recherche (nom, prénom, email, téléphone)" },
      },
      required: ['query'],
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
    description: "Classement des meilleurs vendeurs par CA encaissé sur une période.",
    parameters: {
      type: 'object',
      properties: {
        date_from: { type: 'string', description: "Date de début YYYY-MM-DD (optionnel)" },
        date_to: { type: 'string', description: "Date de fin YYYY-MM-DD (optionnel)" },
        limit: { type: 'string', description: "Nombre de vendeurs à retourner (défaut: 10)" },
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
];
