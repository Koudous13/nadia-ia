export const NAV_PROMPTS: Record<string, string> = {
  Ressources: 'Montre-moi les ressources disponibles (documents, guides, liens utiles).',
  'Assistant IA': 'Que peux-tu faire pour moi aujourd\u2019hui ?',
  "CA aujourd'hui": "Quel est le chiffre d'affaires d'aujourd'hui ?",
  'CA mois': "Quel est le chiffre d'affaires de ce mois ?",
  'Performance équipe': "Montre-moi la performance de l'équipe.",
  Paiements: 'Affiche le résumé des paiements.',
  Alertes: 'Y a-t-il des alertes ou commandes en retard ?',
  Marketing: 'Montre-moi les statistiques marketing.',
  'Actions recommandées': 'Quelles actions me recommandes-tu de faire aujourd\u2019hui ?',
};

export function promptFor(label: string): string {
  return NAV_PROMPTS[label] ?? label;
}
