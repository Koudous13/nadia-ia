export interface NavRoute {
  label: string;
  path: string;
  id: string;
}

export const NAV_ROUTES: NavRoute[] = [
  { label: 'Assistant IA', path: '/', id: 'assistant' },
  { label: 'Ressources', path: '/ressources', id: 'ressources' },
  { label: "CA aujourd'hui", path: '/ca-aujourdhui', id: 'ca-jour' },
  { label: 'CA mois', path: '/ca-mois', id: 'ca-mois' },
  { label: 'Performance équipe', path: '/performance-equipe', id: 'perf' },
  { label: 'Paiements', path: '/paiements', id: 'paiements' },
  { label: 'Alertes', path: '/alertes', id: 'alertes' },
  { label: 'Marketing', path: '/marketing', id: 'marketing' },
  { label: 'Actions recommandées', path: '/actions-recommandees', id: 'actions' },
];

export function routeForLabel(label: string): string {
  return NAV_ROUTES.find((r) => r.label === label)?.path ?? '/';
}

export function labelForRoute(path: string): string {
  return NAV_ROUTES.find((r) => r.path === path)?.label ?? 'Assistant IA';
}
