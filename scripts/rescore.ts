// Re-évalue un fichier de résultats existant avec la logique courante de
// validate-training.ts (familles d'outils, markers de refus) et le dataset
// training-questions.json à jour.
//
// Usage : npx tsx scripts/rescore.ts data/training-runs/<file>.json

import { readFileSync } from 'fs';
import path from 'path';

const file = process.argv[2];
if (!file) { console.error('Usage: tsx scripts/rescore.ts <file.json>'); process.exit(1); }

const TOOL_FAMILIES: string[][] = [
  ['get_orders_by_status', 'search_orders', 'get_orders_by_vendor_status', 'count_orders'],
  ['get_overdue_orders', 'get_overdue_orders_by_user', 'count_orders'],
  ['get_top_vendors', 'get_vendors_performance', 'get_top_vendors_by_factured'],
  ['get_average_basket', 'get_average_basket_by_user'],
  ['get_processing_time_by_user', 'get_average_processing_time'],
  ['get_ca', 'get_ca_summary'],
  ['get_outstanding_balance', 'get_ca_summary'],
  ['get_orders_blocked', 'get_orders_by_vendor_status'],
];

const REFUS_MARKERS = [
  'pas de notion', 'pas disponible', 'non défini', 'non disponible',
  'impossible', 'pas exposé', 'pas exposée', 'proxy', 'pas distinguable',
  'aucune notion', "n'existe pas", "n'est pas", 'pas dans', 'pas distingu',
  'ne gère pas', 'ne permet pas', 'ne fournit pas', 'ne stocke pas',
  'ne contient que', 'ne contient pas', 'pas directement', 'pas de log',
  'pas suivi', 'pas trac', 'pas de suivi', 'pas de distinction',
  "n'a pas de suivi", "n'a pas de distinction",
];

function isInSameFamily(expected: string, called: string[]): boolean {
  const family = TOOL_FAMILIES.find((f) => f.includes(expected));
  if (!family) return false;
  return called.some((c) => family.includes(c));
}

type Outcome = {
  id: string; cat: string; q: string;
  intent?: string; expected_tool?: string | null;
  ok: boolean; flags: string[];
  texte?: string; type_donnees?: string; nb_donnees?: number;
  tool_calls?: { name: string; args: unknown }[];
};

// Charger le dataset à jour pour récupérer les intents/tools révisés
const dataset = JSON.parse(readFileSync(path.resolve('data/training-questions.json'), 'utf8'));
const datasetById = new Map<string, { intent: string; tool: string | null; expected_format?: string }>();
for (const q of dataset.questions) datasetById.set(q.id, { intent: q.intent, tool: q.tool, expected_format: q.expected_format });

function reFlag(o: Outcome): string[] {
  const flags: string[] = [];
  const ds = datasetById.get(o.id);
  // Source de vérité : le dataset actuel (pas l'outcome figé)
  const intent = ds?.intent ?? o.intent ?? '';
  const expectedTool = ds?.tool ?? o.expected_tool ?? null;
  const expectedFormat = ds?.expected_format ?? '';

  const texte = (o.texte ?? '').toLowerCase();
  const toolsCalled = (o.tool_calls ?? []).map((t) => t.name);

  if (intent === 'REFUS' || intent === 'PARTIAL_REFUS') {
    const looksLikeRefus = REFUS_MARKERS.some((m) => texte.includes(m));
    if (!looksLikeRefus) flags.push('refus-attendu-mais-affirmation');
    return flags;
  }

  if (!o.texte || o.texte.trim().length < 5) flags.push('texte-vide');

  if (expectedTool && !toolsCalled.includes(expectedTool)) {
    if (!isInSameFamily(expectedTool, toolsCalled)) {
      flags.push(`outil-attendu-${expectedTool}-non-appelé`);
    }
  }

  if (expectedFormat?.includes('TABLE') && o.type_donnees !== 'tableau') flags.push('expected-table-missing');
  if (expectedFormat?.includes('CHART') && o.type_donnees !== 'graphique') flags.push('expected-chart-missing');

  if (expectedFormat?.includes('TABLE') && (!o.nb_donnees || o.nb_donnees === 0)) {
    if (!texte.includes('aucun')) flags.push('table-vide-sans-mention-aucun');
  }

  // Conserver les flags non-recalculables (exception, http-error, max-rounds)
  for (const f of o.flags) {
    if (['exception','http-error','max-rounds-exceeded'].includes(f)) flags.push(f);
  }

  return flags;
}

const data = JSON.parse(readFileSync(path.resolve(file), 'utf8'));
const outcomes: Outcome[] = data.outcomes;

let pass = 0, fail = 0;
const byCat: Record<string, { pass: number; fail: number }> = {};
const flagCounts: Record<string, number> = {};
const failsList: { id: string; flags: string[] }[] = [];

for (const o of outcomes) {
  const reFlags = reFlag(o);
  const ok = reFlags.length === 0;
  if (ok) pass++; else { fail++; failsList.push({ id: o.id, flags: reFlags }); }
  byCat[o.cat] = byCat[o.cat] || { pass: 0, fail: 0 };
  if (ok) byCat[o.cat].pass++; else byCat[o.cat].fail++;
  for (const f of reFlags) flagCounts[f] = (flagCounts[f] || 0) + 1;
}

console.log(`File: ${file}`);
console.log(`Original: ${data.pass}/${data.total} pass, ${data.fail} fail`);
console.log(`Re-score: ${pass}/${outcomes.length} pass, ${fail} fail`);
console.log('Par catégorie :', byCat);
if (Object.keys(flagCounts).length) console.log('Flags restants :', flagCounts);
if (failsList.length) {
  console.log('\nFails (id → flags) :');
  failsList.forEach((f) => console.log(`  ${f.id} : ${f.flags.join(', ')}`));
}
