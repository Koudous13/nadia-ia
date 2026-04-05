import { ToolDefinition } from '@/types';

// Outils que l'IA peut appeler — mappés sur l'API CRM Paperasse
export const crmTools: ToolDefinition[] = [
  {
    name: 'search_clients',
    description: "Rechercher des clients par nom, email ou téléphone.",
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: "Terme de recherche (nom, email, téléphone)" },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_client',
    description: "Afficher les détails d'un client spécifique par son ID.",
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
    description: "Récupérer toutes les commandes d'un client.",
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
    description: "Récupérer tous les devis d'un client.",
    parameters: {
      type: 'object',
      properties: {
        client_id: { type: 'string', description: "ID du client" },
      },
      required: ['client_id'],
    },
  },
  {
    name: 'get_all_clients',
    description: "Lister tous les clients du CRM.",
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'search_orders',
    description: "Rechercher des commandes par numéro, client ou statut.",
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: "Terme de recherche" },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_order',
    description: "Afficher les détails d'une commande par ID ou numéro.",
    parameters: {
      type: 'object',
      properties: {
        order_id: { type: 'string', description: "ID ou numéro de la commande" },
      },
      required: ['order_id'],
    },
  },
  {
    name: 'get_order_payments',
    description: "Voir les paiements d'une commande (montant, remise, payé, restant).",
    parameters: {
      type: 'object',
      properties: {
        order_id: { type: 'string', description: "ID ou numéro de la commande" },
      },
      required: ['order_id'],
    },
  },
  {
    name: 'get_order_messages',
    description: "Lire les messages/échanges d'une commande.",
    parameters: {
      type: 'object',
      properties: {
        order_id: { type: 'string', description: "ID ou numéro de la commande" },
        page: { type: 'string', description: "Numéro de page (optionnel)" },
      },
      required: ['order_id'],
    },
  },
  {
    name: 'get_order_statuses',
    description: "Récupérer la liste de tous les statuts de commandes possibles.",
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'search_products',
    description: "Rechercher des produits/services disponibles.",
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: "Terme de recherche" },
        family_id: { type: 'string', description: "ID famille/catégorie (optionnel)" },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_product',
    description: "Afficher les détails d'un produit par son ID.",
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
        query: { type: 'string', description: "Recherche (optionnel)" },
        parent_id: { type: 'string', description: "ID catégorie parente (optionnel)" },
      },
    },
  },
  {
    name: 'get_users',
    description: "Lister les utilisateurs/assistants/vendeurs du système.",
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_appointments',
    description: "Voir les rendez-vous d'un client.",
    parameters: {
      type: 'object',
      properties: {
        client_id: { type: 'string', description: "ID du client" },
        date: { type: 'string', description: "Date au format YYYY-MM-DD (optionnel)" },
      },
      required: ['client_id'],
    },
  },
  {
    name: 'get_availability',
    description: "Voir les créneaux disponibles d'un utilisateur/assistant.",
    parameters: {
      type: 'object',
      properties: {
        user_id: { type: 'string', description: "ID de l'utilisateur/assistant" },
        date: { type: 'string', description: "Date au format YYYY-MM-DD (optionnel)" },
      },
      required: ['user_id'],
    },
  },
  {
    name: 'global_search',
    description: "Recherche globale dans le CRM (clients, commandes, produits).",
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: "Terme de recherche" },
        type: { type: 'string', description: "Type de recherche", enum: ['clients', 'orders', 'products'] },
      },
      required: ['query', 'type'],
    },
  },
];
