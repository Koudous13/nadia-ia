// Validate les 120 questions en bypassant l'auth : on importe directement le LLM + executeToolCall.
// C'est exactement le même flux que /api/chat, sans HTTP/auth.
//
// Usage : npx tsx scripts/validate-training.ts [--cat ca] [--id ca-01] [--limit 10] [--cats ca,paiements]

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';

const envFile = readFileSync(path.resolve('.env.local'), 'utf-8');
for (const line of envFile.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const args = Object.fromEntries(
  process.argv.slice(2).reduce<string[][]>((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] ?? '']);
    return acc;
  }, []),
);

async function main() {
const { getLLMProvider } = await import('../src/lib/llm');
const { executeToolCall } = await import('../src/lib/crm/client');
const { crmTools } = await import('../src/lib/tools/definitions');
const { NADIA_SYSTEM_PROMPT } = await import('../src/lib/system-prompt');

const dataset = JSON.parse(readFileSync(path.resolve('data/training-questions.json'), 'utf8'));

type Question = {
  id: string; cat: string; q: string; intent: string;
  tool: string | null; args?: Record<string, unknown>;
  expected_format?: string; expected_response?: string; note?: string;
};

let questions: Question[] = dataset.questions as Question[];
if (args.cat) questions = questions.filter((q) => q.cat === args.cat);
if (args.cats) {
  const set = new Set(String(args.cats).split(','));
  questions = questions.filter((q) => set.has(q.cat));
}
if (args.id) questions = questions.filter((q) => q.id === args.id);
if (args.limit) questions = questions.slice(0, Number(args.limit));

console.log(`▸ ${questions.length} questions sélectionnées`);
console.log(`▸ Provider : ${process.env.LLM_PROVIDER || 'gemini'}\n`);

const llm = getLLMProvider();
const MAX_ROUNDS = 8;

type Outcome = {
  id: string; cat: string; q: string; intent: string; expected_tool: string | null;
  ok: boolean; flags: string[]; reason?: string;
  texte?: string; type_donnees?: string; nb_donnees?: number;
  tool_calls: { name: string; args: unknown }[];
  duration_ms: number;
};

// Familles d'outils interchangeables : si l'IA appelle un outil de la même famille
// que celui attendu, on considère que c'est OK.
const TOOL_FAMILIES: string[][] = [
  ['get_orders_by_status', 'search_orders', 'get_orders_by_vendor_status'],
  ['get_top_vendors', 'get_vendors_performance', 'get_top_vendors_by_factured'],
  ['get_overdue_orders', 'get_overdue_orders_by_user'],
  ['get_average_basket', 'get_average_basket_by_user'],
  ['get_processing_time_by_user', 'get_average_processing_time'],
];

function isInSameFamily(expected: string, called: string[]): boolean {
  const family = TOOL_FAMILIES.find((f) => f.includes(expected));
  if (!family) return false;
  return called.some((c) => family.includes(c));
}

function flagOutcome(qu: Question, body: { texte: string; type_donnees: string; donnees?: unknown[] },
                    toolCalls: { name: string; args: unknown }[]): string[] {
  const flags: string[] = [];
  const texte = (body.texte ?? '').toLowerCase();

  // Refus attendu — markers étendus avec les vraies tournures observées
  if (qu.intent === 'REFUS' || qu.intent === 'PARTIAL_REFUS') {
    const refusMarkers = [
      'pas de notion', 'pas disponible', 'non défini', 'non disponible',
      'impossible', 'pas exposé', 'pas exposée', 'proxy', 'pas distinguable',
      'aucune notion', "n'existe pas", "n'est pas", 'pas dans', 'pas distingu',
      'ne gère pas', 'ne permet pas', 'ne fournit pas', 'ne stocke pas',
      'ne contient que', 'ne contient pas', 'pas directement', 'pas de log',
      'pas suivi', 'pas trac',
    ];
    const looksLikeRefus = refusMarkers.some((m) => texte.includes(m));
    if (!looksLikeRefus) flags.push('refus-attendu-mais-affirmation');
    return flags;
  }

  // Texte vide
  if (!body.texte || body.texte.trim().length < 5) flags.push('texte-vide');

  // Outil attendu non appelé — sauf si appel équivalent dans la même famille
  if (qu.tool && !toolCalls.some((t) => t.name === qu.tool)) {
    if (!isInSameFamily(qu.tool, toolCalls.map((t) => t.name))) {
      flags.push(`outil-attendu-${qu.tool}-non-appelé`);
    }
  }

  // Format attendu
  if (qu.expected_format?.includes('TABLE') && body.type_donnees !== 'tableau') {
    flags.push('expected-table-missing');
  }
  if (qu.expected_format?.includes('CHART') && body.type_donnees !== 'graphique') {
    flags.push('expected-chart-missing');
  }

  // Duplication texte/tableau — heuristique plus fine :
  // détecte tirets/puces avec données ET les sections markdown ###
  if (body.donnees && body.donnees.length > 0 && body.texte) {
    const lines = body.texte.split('\n');
    const dataBullets = lines.filter((l) => {
      const t = l.trim();
      // Tiret ou puce + chiffre/montant
      if (/^[-*•]\s.*[\d€]/.test(t)) return true;
      // Bloc "### titre" suivi (trop suspect)
      return false;
    }).length;
    const hasH3 = /^###\s/m.test(body.texte);
    if (dataBullets >= 2 || hasH3) flags.push('texte-duplique-tableau');
  }

  // Tableau attendu mais données vides sans mention "aucun"
  if (qu.expected_format?.includes('TABLE') && (!body.donnees || body.donnees.length === 0)) {
    if (!texte.includes('aucun')) flags.push('table-vide-sans-mention-aucun');
  }

  return flags;
}

async function llmChatWithRetry(
  messages: Parameters<typeof llm.chat>[0],
  tries = 4,
): Promise<Awaited<ReturnType<typeof llm.chat>>> {
  let lastErr: Error | null = null;
  for (let i = 0; i < tries; i++) {
    try {
      return await llm.chat(messages, crmTools);
    } catch (e) {
      const err = e as Error;
      lastErr = err;
      // Extract retry hint from Gemini errors like "Please retry in 22.04s"
      const retryMatch = err.message.match(/retry in ([\d.]+)s/i);
      const is429 = /429|quota|rate/i.test(err.message);
      if (!is429 || i === tries - 1) throw err;
      const backoffMs = retryMatch ? Math.min(60_000, Math.ceil(parseFloat(retryMatch[1]) * 1000) + 1000)
                                   : 5000 * Math.pow(2, i);
      console.log(`    ⏳ rate limit, retry dans ${(backoffMs/1000).toFixed(1)}s…`);
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }
  throw lastErr;
}

async function runOne(qu: Question): Promise<Outcome> {
  const t0 = Date.now();
  const messages = [
    { role: 'system' as const, content: NADIA_SYSTEM_PROMPT },
    { role: 'user' as const, content: qu.q },
  ];
  const toolCalls: { name: string; args: unknown }[] = [];

  try {
    let round = 0;
    while (round < MAX_ROUNDS) {
      round++;
      const response = await llmChatWithRetry(messages as Parameters<typeof llm.chat>[0]);

      if (response.finishReason === 'tool_calls' && response.toolCalls?.length) {
        messages.push({ role: 'assistant' as const, content: '', toolCalls: response.toolCalls } as never);
        for (const tc of response.toolCalls) {
          toolCalls.push({ name: tc.name, args: tc.arguments });
          try {
            const result = await executeToolCall(tc.name, tc.arguments);
            messages.push({
              role: 'tool' as const, content: JSON.stringify(result),
              toolCallId: tc.id, toolName: tc.name,
            } as never);
          } catch (err) {
            messages.push({
              role: 'tool' as const, content: JSON.stringify({ error: (err as Error).message }),
              toolCallId: tc.id, toolName: tc.name,
            } as never);
          }
        }
        continue;
      }
      const text = response.text ?? '';
      const cleanText = text.replace(/\[TABLE\]/g, '').replace(/\[CHART:(bar|line|pie)\]/g, '').trim();
      let type_donnees: 'tableau' | 'graphique' | 'texte' = 'texte';
      let donnees: unknown[] | undefined;
      const lastTool = messages.filter((m) => (m as { role?: string }).role === 'tool')
        .map((m) => { try { return JSON.parse((m as { content: string }).content); } catch { return null; } })
        .reverse().find((r) => Array.isArray(r) || (r?.data && Array.isArray(r.data)));
      if (lastTool) donnees = Array.isArray(lastTool) ? lastTool : lastTool.data;
      if (text.includes('[TABLE]') && donnees) type_donnees = 'tableau';
      else if (/\[CHART:(bar|line|pie)\]/.test(text) && donnees) type_donnees = 'graphique';

      const body = { texte: cleanText, type_donnees, donnees };
      const flags = flagOutcome(qu, body, toolCalls);
      return {
        id: qu.id, cat: qu.cat, q: qu.q, intent: qu.intent, expected_tool: qu.tool,
        ok: flags.length === 0, flags,
        texte: cleanText.slice(0, 500), type_donnees, nb_donnees: donnees?.length,
        tool_calls: toolCalls, duration_ms: Date.now() - t0,
      };
    }
    return {
      id: qu.id, cat: qu.cat, q: qu.q, intent: qu.intent, expected_tool: qu.tool,
      ok: false, flags: ['max-rounds-exceeded'],
      tool_calls: toolCalls, duration_ms: Date.now() - t0,
    };
  } catch (e) {
    return {
      id: qu.id, cat: qu.cat, q: qu.q, intent: qu.intent, expected_tool: qu.tool,
      ok: false, flags: ['exception'], reason: (e as Error).message,
      tool_calls: toolCalls, duration_ms: Date.now() - t0,
    };
  }
}

const outcomes: Outcome[] = [];
let pass = 0, fail = 0;
const startAll = Date.now();

const throttleMs = Number(args.throttle) || 2000;
for (let i = 0; i < questions.length; i++) {
  const qu = questions[i];
  const o = await runOne(qu);
  outcomes.push(o);
  if (o.ok) pass++; else fail++;
  const status = o.ok ? '✓' : '⚠';
  const flagStr = o.flags.length ? ` (${o.flags.join(',')})` : '';
  const tools = o.tool_calls.map((t) => t.name).join(',') || '–';
  console.log(`${status} ${o.id.padEnd(8)} [${o.cat.padEnd(15)}] ${o.duration_ms.toString().padStart(5)}ms tools=${tools.padEnd(50)}${flagStr}`);
  if (i < questions.length - 1 && throttleMs > 0) {
    await new Promise((r) => setTimeout(r, throttleMs));
  }
}

const totalMs = Date.now() - startAll;
const byCat: Record<string, { pass: number; fail: number }> = {};
const byFlag: Record<string, number> = {};
for (const o of outcomes) {
  byCat[o.cat] = byCat[o.cat] || { pass: 0, fail: 0 };
  if (o.ok) byCat[o.cat].pass++; else byCat[o.cat].fail++;
  for (const f of o.flags) byFlag[f] = (byFlag[f] || 0) + 1;
}

console.log(`\n=== ${pass} pass / ${fail} fail / ${questions.length} total — ${(totalMs/1000).toFixed(1)}s ===`);
console.log('Par catégorie :', byCat);
if (Object.keys(byFlag).length) console.log('Flags  :', byFlag);

mkdirSync(path.resolve('data/training-runs'), { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const outFile = `data/training-runs/${stamp}.json`;
writeFileSync(path.resolve(outFile), JSON.stringify({
  ran_at: new Date().toISOString(),
  llm_provider: process.env.LLM_PROVIDER || 'gemini',
  llm_model: process.env.GEMINI_MODEL || process.env.OPENAI_MODEL || process.env.ANTHROPIC_MODEL,
  total: questions.length, pass, fail, by_category: byCat, by_flag: byFlag,
  outcomes,
}, null, 2));
console.log(`→ Détails : ${outFile}`);
process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
