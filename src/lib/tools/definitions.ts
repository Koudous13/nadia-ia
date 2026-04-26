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
    description: "Calculer le chiffre d'affaires ENCAISSÉ sur une période. Par défaut, filtre par date de paiement (montant réellement reçu pendant la période). Optionnel : `by='order_date'` filtre par date de création de la commande (= encaissé jusqu'à présent sur les commandes créées dans la période).",
    parameters: {
      type: 'object',
      properties: {
        date_from: { type: 'string', description: "Date de début YYYY-MM-DD (optionnel)" },
        date_to: { type: 'string', description: "Date de fin YYYY-MM-DD (optionnel)" },
        user_id: { type: 'string', description: "ID du vendeur pour filtrer (optionnel)" },
        by: { type: 'string', enum: ['payment_date', 'order_date'], description: "Base du filtre date : 'payment_date' (par défaut) ou 'order_date'" },
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

  // ════════════════════ ANALYTICS — CA, perf, comparaisons ════════════════════
  {
    name: 'get_ca_by_day',
    description: "CA encaissé par jour sur une période. Retourne {jour, ca_encaisse, nb_paiements, nb_commandes}. À utiliser pour 'CA par jour', 'meilleur jour', 'pire jour', 'évolution du CA'.",
    parameters: { type: 'object', properties: {
      date_from: { type: 'string', description: "Date début YYYY-MM-DD (optionnel)" },
      date_to: { type: 'string', description: "Date fin YYYY-MM-DD (optionnel)" },
    }},
  },
  {
    name: 'get_ca_factured',
    description: "CA FACTURÉ (somme orders.total_price) — différent du CA encaissé. À utiliser pour 'CA hors annulation', 'CA des commandes clôturées', 'CA des commandes en cours'.",
    parameters: { type: 'object', properties: {
      date_from: { type: 'string' }, date_to: { type: 'string' },
      status: { type: 'string', description: "Filtre par statut exact (ex: 'Terminée')" },
      status_in: { type: 'array', items: { type: 'string' }, description: "Liste de statuts à inclure" },
      exclude_cancelled: { type: 'string', enum: ['true', 'false'], description: "Si 'true', exclut les commandes annulées" },
      user_id: { type: 'string', description: "Filtre par vendeur" },
    }},
  },
  {
    name: 'get_ca_summary',
    description: "Synthèse CA : facturé vs encaissé vs restant à encaisser sur une période. Réponse : {ca_facture, ca_encaisse, restant_a_encaisser, nb_commandes_facturees, nb_commandes_payees}.",
    parameters: { type: 'object', properties: {
      date_from: { type: 'string' }, date_to: { type: 'string' },
    }},
  },
  {
    name: 'get_ca_by_payment_type',
    description: "CA par moyen de paiement (cash, creditCard, transfer, paypal, stripe, zettle, fidelity). Si `type` fourni, retourne juste les chiffres pour ce type. Sinon retourne tous les types.",
    parameters: { type: 'object', properties: {
      date_from: { type: 'string' }, date_to: { type: 'string' },
      type: { type: 'string', description: "Filtre par type ('stripe', 'paypal', 'cash', 'creditCard', 'transfer', 'zettle')" },
    }},
  },
  {
    name: 'get_ca_by_prestation',
    description: "CA encaissé par prestation (top N). Pour 'CA par prestation', 'prestations les plus rentables'.",
    parameters: { type: 'object', properties: {
      date_from: { type: 'string' }, date_to: { type: 'string' },
      limit: { type: 'string', description: "Nombre de prestations (défaut 20, max 100)" },
    }},
  },
  {
    name: 'get_ca_by_category',
    description: "CA encaissé par catégorie (prestations_families). Pour 'CA par catégorie' ou 'famille de prestations'.",
    parameters: { type: 'object', properties: {
      date_from: { type: 'string' }, date_to: { type: 'string' },
      limit: { type: 'string' },
    }},
  },
  {
    name: 'compare_periods',
    description: "Compare deux périodes sur le CA encaissé. Retourne {periode_a, periode_b, delta, delta_pct}. Pour 'avril vs mars'.",
    parameters: { type: 'object', properties: {
      from_a: { type: 'string', description: "Période A : début YYYY-MM-DD" },
      to_a: { type: 'string', description: "Période A : fin YYYY-MM-DD" },
      from_b: { type: 'string', description: "Période B : début YYYY-MM-DD" },
      to_b: { type: 'string', description: "Période B : fin YYYY-MM-DD" },
    }, required: ['from_a', 'to_a', 'from_b', 'to_b'] },
  },
  {
    name: 'get_average_basket',
    description: "Panier moyen = CA facturé moyen par commande (hors annulées). Si by_user='true', retourne par vendeur.",
    parameters: { type: 'object', properties: {
      date_from: { type: 'string' }, date_to: { type: 'string' },
      by_user: { type: 'string', enum: ['true', 'false'] },
    }},
  },
  {
    name: 'get_average_payment',
    description: "Paiement moyen et moyen par commande (sur les paiements encaissés).",
    parameters: { type: 'object', properties: {
      date_from: { type: 'string' }, date_to: { type: 'string' },
    }},
  },
  {
    name: 'get_conversion_rate_by_user',
    description: "Taux de conversion par vendeur : devis acceptés / total devis créés. Réponse : {vendeur, nb_devis, nb_devis_acceptes, taux_conversion_pct}.",
    parameters: { type: 'object', properties: {
      date_from: { type: 'string' }, date_to: { type: 'string' },
    }},
  },
  {
    name: 'get_top_vendors_by_prestation',
    description: "Top vendeurs sur une prestation matchant un mot-clé (LIKE %keyword%). Pour 'agent qui vend le plus de titres de séjour', 'qui vend le plus aux entreprises'.",
    parameters: { type: 'object', properties: {
      prestation_keyword: { type: 'string', description: "Mot-clé pour matcher la prestation (ex: 'titre de séjour', 'entreprise')" },
      date_from: { type: 'string' }, date_to: { type: 'string' },
      limit: { type: 'string' },
    }, required: ['prestation_keyword'] },
  },
  {
    name: 'get_top_vendors_by_factured',
    description: "Top vendeurs par CA FACTURÉ (orders.total_price), distinct du CA encaissé. Pour 'agent avec le plus de CA facturé'.",
    parameters: { type: 'object', properties: {
      date_from: { type: 'string' }, date_to: { type: 'string' }, limit: { type: 'string' },
    }},
  },
  {
    name: 'get_top_users_by_payment_type',
    description: "Top vendeurs sur un moyen de paiement précis. Pour 'top agent sur paiements Stripe'.",
    parameters: { type: 'object', properties: {
      type: { type: 'string', description: "Type de paiement (stripe, paypal, cash, creditCard, transfer)" },
      date_from: { type: 'string' }, date_to: { type: 'string' }, limit: { type: 'string' },
    }, required: ['type'] },
  },
  {
    name: 'compare_users_periods',
    description: "Comparaison du CA encaissé par vendeur entre deux périodes. Pour 'agent en progression', 'agent en baisse'. Trier par (ca_a - ca_b) DESC pour progression, ASC pour baisse.",
    parameters: { type: 'object', properties: {
      from_a: { type: 'string' }, to_a: { type: 'string' },
      from_b: { type: 'string' }, to_b: { type: 'string' },
    }, required: ['from_a', 'to_a', 'from_b', 'to_b'] },
  },
  {
    name: 'get_user_daily_average',
    description: "CA moyen par jour actif pour chaque vendeur. Pour 'agent qui rapporte le plus par jour'.",
    parameters: { type: 'object', properties: {
      date_from: { type: 'string' }, date_to: { type: 'string' },
    }},
  },
  {
    name: 'get_volume_vs_delay_by_user',
    description: "Croisement nb_commandes × CA × délai moyen par vendeur. Pour 'agent rapide mais peu rentable', 'agent qui vend beaucoup mais génère du retard'.",
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_volume_vs_cancellations_by_user',
    description: "Croisement CA × taux d'annulation par vendeur. Pour 'fort CA mais taux d'annulation élevé'.",
    parameters: { type: 'object', properties: {} },
  },

  // ════════════════════ DÉLAIS / RETARDS ════════════════════
  {
    name: 'get_processing_time_by_user',
    description: "Délai moyen de traitement par vendeur (created_at → status_updated_at sur statuts='Terminée'). Pour 'agent le plus rapide', 'classement délais', 'agent avec délai < 5 jours'.",
    parameters: { type: 'object', properties: {
      max_days: { type: 'string', description: "Filtre HAVING delai_moyen_jours <= ce seuil" },
      min_days: { type: 'string', description: "Filtre HAVING delai_moyen_jours >= ce seuil" },
      limit: { type: 'string' },
      order: { type: 'string', enum: ['ASC', 'DESC'], description: "ASC = du plus rapide au plus lent (défaut)" },
    }},
  },
  {
    name: 'get_average_processing_time',
    description: "Délai moyen de traitement global (toutes commandes Terminée). Pour 'délai moyen de traitement'.",
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_overdue_orders',
    description: "Commandes en retard (>= threshold_days, hors statuts clos par défaut). Sans group_by → liste de commandes ; avec group_by='user' → par vendeur ; group_by='client' → par client.",
    parameters: { type: 'object', properties: {
      threshold_days: { type: 'string', description: "Seuil en jours (défaut 30)" },
      exclude_closed: { type: 'string', enum: ['true', 'false'], description: "Exclut Terminée/Annulée/Livrée/Expédié (défaut true)" },
      min_amount: { type: 'string', description: "Seulement les dossiers avec total_price >= ce montant" },
      group_by: { type: 'string', enum: ['user', 'client'] },
      limit: { type: 'string' },
    }},
  },
  {
    name: 'get_orders_blocked',
    description: "Commandes bloquées (statuts d'attente : 'Attente retour client', 'Attente réglement', 'Attente retour administration', 'Attente rendez-vous administratif', 'Attente validation hiérarchique'). Pour 'commandes bloquées', 'dossiers à fort CA bloqués'.",
    parameters: { type: 'object', properties: {
      min_amount: { type: 'string' }, group_by: { type: 'string', enum: ['user', 'client'] }, limit: { type: 'string' },
    }},
  },
  {
    name: 'get_orders_closed_on_date',
    description: "Liste des commandes clôturées (statuts='Terminée') un jour précis. Pour 'commandes clôturées le 15 avril'.",
    parameters: { type: 'object', properties: {
      date: { type: 'string', description: "Date YYYY-MM-DD" },
    }, required: ['date'] },
  },
  {
    name: 'get_orders_by_prestation',
    description: "Nombre de commandes par prestation, avec stats (terminées, annulées, CA). Pour 'commandes par prestation'.",
    parameters: { type: 'object', properties: {
      date_from: { type: 'string' }, date_to: { type: 'string' }, limit: { type: 'string' },
    }},
  },
  {
    name: 'get_ca_by_prestation_and_payment',
    description: "CA encaissé croisé prestation × moyen de paiement. Pour 'CA par prestation + paiement'.",
    parameters: { type: 'object', properties: {
      date_from: { type: 'string' }, date_to: { type: 'string' }, limit: { type: 'string' },
    }},
  },
  {
    name: 'count_orders',
    description: "OUTIL OBLIGATOIRE pour TOUTE question de comptage commandes : 'combien de commandes', 'commandes en retard', 'commandes non clôturées', 'commandes payées', 'devis', 'commandes annulées', etc. Retourne en UN SEUL APPEL : total, total_closed, total_open, total_overdue_30d, total_overdue_90d, total_terminees, total_annulees, total_attente_prise_en_charge, total_payees, total_non_payees, total_devis, total_factures + by_status[]. Filtres optionnels date_from/date_to/user_id. **NE JAMAIS sommer manuellement une liste pour répondre à 'combien de X' — utilise ce tool.**",
    parameters: { type: 'object', properties: {
      date_from: { type: 'string', description: "Date début YYYY-MM-DD (optionnel, sinon = depuis le début)" },
      date_to: { type: 'string', description: "Date fin YYYY-MM-DD (optionnel, sinon = aujourd'hui)" },
      user_id: { type: 'string', description: "ID vendeur pour filtrer (optionnel)" },
    }},
  },

  // ════════════════════ ANOMALIES & PAIEMENTS ════════════════════
  {
    name: 'get_partial_payments',
    description: "Commandes avec paiement partiel (0 < total_paye < total_facture). Pour 'paiements partiels', 'clients avec paiement partiel'.",
    parameters: { type: 'object', properties: { limit: { type: 'string' } } },
  },
  {
    name: 'get_outstanding_balance',
    description: "Montant total restant à encaisser (CA facturé hors annulé - CA déjà encaissé). Pour 'montant restant à encaisser'.",
    parameters: { type: 'object', properties: {
      date_from: { type: 'string' }, date_to: { type: 'string' }, user_id: { type: 'string' },
    }},
  },
  {
    name: 'get_clients_with_balance',
    description: "Liste des clients ayant un solde dû. Pour 'clients avec solde dû'.",
    parameters: { type: 'object', properties: { limit: { type: 'string' } } },
  },
  {
    name: 'get_payments_without_order',
    description: "Anomalies : paiements orphelins (order_id NULL ou order supprimé).",
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_orders_without_payment',
    description: "Commandes non payées (aucun paiement enregistré, hors annulées). Si exclude_quotes='true', exclut les devis (state=2).",
    parameters: { type: 'object', properties: {
      exclude_quotes: { type: 'string', enum: ['true', 'false'] },
      date_from: { type: 'string' }, date_to: { type: 'string' },
    }},
  },
  {
    name: 'get_orders_paid_not_treated',
    description: "ANOMALIE : commandes is_payed=1 mais statuts pas dans ('Terminée','Annulée','Livrée','Expédié'). Filtrable par type de paiement.",
    parameters: { type: 'object', properties: {
      payment_type: { type: 'string' },
      group_by: { type: 'string', enum: ['client'] },
    }},
  },
  {
    name: 'get_orders_completed_not_paid',
    description: "ANOMALIE : commandes statuts='Terminée' mais is_payed=0 et total_price > 0.",
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_inconsistent_amounts',
    description: "ANOMALIES de cohérence is_payed/total_paid/total_price : flag détaillé par anomalie.",
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_orders_without_user',
    description: "ANOMALIE : commandes sans vendeur assigné (user_id NULL/0).",
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_orders_without_prestation',
    description: "ANOMALIE : commandes sans prestation assignée.",
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_duplicate_clients',
    description: "Doublons clients par email ou téléphone (filtre les valeurs poubelle 'nc', emails @paperasse).",
    parameters: { type: 'object', properties: {
      by: { type: 'string', enum: ['email', 'phone'], description: "Critère (défaut email)" },
    }},
  },
  {
    name: 'get_duplicate_payments',
    description: "Doublons paiements potentiels (même order, même montant, même type, même jour).",
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_unpaid_quotes',
    description: "Devis non payés (state=1 ou 2, hors annulés, aucun paiement). Pour 'devis non payés', 'clients à fort potentiel non traités' (avec min_amount).",
    parameters: { type: 'object', properties: {
      min_amount: { type: 'string' }, limit: { type: 'string' },
    }},
  },
  {
    name: 'get_top_clients',
    description: "Top clients par CA encaissé (ou par nombre de commandes si by='orders'). Pour 'clients les plus rentables'.",
    parameters: { type: 'object', properties: {
      date_from: { type: 'string' }, date_to: { type: 'string' },
      by: { type: 'string', enum: ['ca', 'orders'] },
      limit: { type: 'string' },
    }},
  },
  {
    name: 'get_clients_with_multiple_orders',
    description: "Clients avec >= N commandes. Pour 'clients avec plusieurs commandes', 'clients récurrents'.",
    parameters: { type: 'object', properties: {
      min: { type: 'string', description: "Minimum de commandes (défaut 2)" },
      limit: { type: 'string' },
    }},
  },
  {
    name: 'get_inactive_clients',
    description: "Clients sans commande depuis N mois (défaut 6) mais ayant déjà acheté. Pour 'clients abandonnés', 'clients silencieux'.",
    parameters: { type: 'object', properties: {
      months: { type: 'string' }, limit: { type: 'string' },
    }},
  },
  {
    name: 'get_top_users_by_clients',
    description: "Vendeurs avec le plus de prospects (clients sans paiement) ou de clients tout court.",
    parameters: { type: 'object', properties: { limit: { type: 'string' } } },
  },
  {
    name: 'get_unconverted_quotes_by_user',
    description: "Vendeurs avec le plus de devis non convertis (devis sans paiement, hors annulés).",
    parameters: { type: 'object', properties: { limit: { type: 'string' } } },
  },
  {
    name: 'get_orders_needing_docs_by_user',
    description: "Vendeurs avec le plus de dossiers incomplets (orders.needs_docs=1, hors statuts clos).",
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_scheduled_reminders',
    description: "Liste des rappels/relances planifiés pour une date donnée (table scheduled_notifications). Pour 'clients à relancer aujourd'hui'.",
    parameters: { type: 'object', properties: {
      date: { type: 'string', description: "Date YYYY-MM-DD (défaut: aujourd'hui)" },
    }},
  },
  {
    name: 'get_monthly_summary',
    description: "Synthèse complète d'un mois : CA encaissé, CA facturé, top statuts, top vendeur, top prestation. Pour 'analyse complète du mois'.",
    parameters: { type: 'object', properties: {
      year: { type: 'string' }, month: { type: 'string', description: "1..12" },
    }},
  },
  {
    name: 'get_loss_analysis',
    description: "Synthèse 'où perd-on de l'argent ?' : annulations 12 mois, restant à encaisser, devis non convertis 6 mois.",
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_time_loss_analysis',
    description: "Synthèse 'où perd-on du temps ?' : dossiers bloqués, vendeurs les plus lents, dossiers de plus de 90 jours.",
    parameters: { type: 'object', properties: {} },
  },
];
