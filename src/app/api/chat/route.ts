import { NextRequest } from 'next/server';
import { getLLMProvider, ConversationMessage } from '@/lib/llm';
import { crmTools } from '@/lib/tools/definitions';
import { executeToolCall } from '@/lib/crm/client';
import { NADIA_SYSTEM_PROMPT } from '@/lib/system-prompt';
import { logQuery } from '@/lib/supabase/query-log';
import { MiddlewareResponse } from '@/types';

export const maxDuration = 30;

const MAX_TOOL_ROUNDS = 8;

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  let questionForLog = '';
  const toolsCalledForLog: string[] = [];
  const toolArgsForLog: unknown[] = [];
  let roundsForLog = 0;

  try {
    const body = await request.json();
    const { message, history = [] } = body as {
      message: string;
      history: { role: 'user' | 'assistant'; content: string }[];
    };
    questionForLog = message ?? '';

    if (!message) {
      return Response.json({ error: 'Message requis' }, { status: 400 });
    }

    const llm = getLLMProvider();

    // Construire la conversation complète
    const messages: ConversationMessage[] = [
      { role: 'system', content: NADIA_SYSTEM_PROMPT },
      ...history.map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
      { role: 'user', content: message },
    ];

    // Boucle d'orchestration : IA → tool call → résultat → IA (repeat)
    let round = 0;
    while (round < MAX_TOOL_ROUNDS) {
      round++;
      roundsForLog = round;
      const response = await llm.chat(messages, crmTools);

      if (response.finishReason === 'tool_calls' && response.toolCalls?.length) {
        // L'IA veut appeler des outils
        messages.push({
          role: 'assistant',
          content: '',
          toolCalls: response.toolCalls,
        });

        // Exécuter chaque outil
        for (const toolCall of response.toolCalls) {
          toolsCalledForLog.push(toolCall.name);
          toolArgsForLog.push(toolCall.arguments);
          try {
            const result = await executeToolCall(toolCall.name, toolCall.arguments);
            messages.push({
              role: 'tool',
              content: JSON.stringify(result),
              toolCallId: toolCall.id,
              toolName: toolCall.name,
            });
          } catch (err) {
            messages.push({
              role: 'tool',
              content: JSON.stringify({ error: (err as Error).message }),
              toolCallId: toolCall.id,
              toolName: toolCall.name,
            });
          }
        }

        // Continuer la boucle pour que l'IA traite les résultats
        continue;
      }

      // L'IA a fini — analyser la réponse pour détecter tableaux/graphiques
      const text = response.text ?? '';
      const result = buildResponse(text, messages);

      // Log best-effort (n'attend pas, ne casse pas le retour)
      void logQuery({
        question: questionForLog,
        answer_preview: result.texte,
        tools_called: toolsCalledForLog,
        tool_args: toolArgsForLog,
        rounds: roundsForLog,
        duration_ms: Date.now() - startedAt,
        has_error: false,
        llm_provider: process.env.LLM_PROVIDER ?? 'gemini',
      });

      return Response.json(result);
    }

    void logQuery({
      question: questionForLog,
      answer_preview: null,
      tools_called: toolsCalledForLog,
      tool_args: toolArgsForLog,
      rounds: roundsForLog,
      duration_ms: Date.now() - startedAt,
      has_error: true,
      error_message: 'max-tool-rounds-exceeded',
      llm_provider: process.env.LLM_PROVIDER ?? 'gemini',
    });

    return Response.json({
      texte: "Désolée, j'ai eu besoin de trop d'étapes pour répondre. Peux-tu reformuler ta question ?",
      type_donnees: 'texte',
    } satisfies MiddlewareResponse);

  } catch (err) {
    console.error('[API Chat Error]', err);
    void logQuery({
      question: questionForLog,
      answer_preview: null,
      tools_called: toolsCalledForLog,
      tool_args: toolArgsForLog,
      rounds: roundsForLog,
      duration_ms: Date.now() - startedAt,
      has_error: true,
      error_message: (err as Error).message,
      llm_provider: process.env.LLM_PROVIDER ?? 'gemini',
    });
    return Response.json(
      { error: 'Erreur interne', details: (err as Error).message },
      { status: 500 }
    );
  }
}

function buildResponse(text: string, messages: ConversationMessage[]): MiddlewareResponse {
  // Chercher les données brutes des derniers appels d'outils
  const toolResults = messages
    .filter(m => m.role === 'tool')
    .map(m => {
      try { return JSON.parse(m.content); } catch { return null; }
    })
    .filter(Boolean);

  // Extraire les données tabulaires (le dernier résultat qui est un tableau)
  const lastArrayResult = [...toolResults].reverse().find(r => Array.isArray(r) || (r?.data && Array.isArray(r.data)));
  const donnees = lastArrayResult
    ? (Array.isArray(lastArrayResult) ? lastArrayResult : lastArrayResult.data)
    : undefined;

  // Extraire les suggestions de reformulation [SUGGESTION] xxx
  const suggestions: string[] = [];
  const suggestionRegex = /^\s*\[SUGGESTION\]\s*(.+)$/gm;
  let m;
  while ((m = suggestionRegex.exec(text)) !== null) {
    const s = m[1].trim();
    if (s.length > 0 && s.length <= 200) suggestions.push(s);
  }

  // Nettoyer les marqueurs du texte
  const cleanText = text
    .replace(/\[TABLE\]/g, '')
    .replace(/\[CHART:(bar|line|pie)\]/g, '')
    .replace(/^\s*\[SUGGESTION\][^\n]*\n?/gm, '')
    .trim();

  const base: MiddlewareResponse = { texte: cleanText, type_donnees: 'texte' };
  if (suggestions.length > 0) base.suggestions = suggestions.slice(0, 3);

  if (text.includes('[TABLE]') && donnees) {
    return { ...base, type_donnees: 'tableau', donnees };
  }
  const chartMatch = text.match(/\[CHART:(bar|line|pie)\]/);
  if (chartMatch && donnees) {
    return { ...base, type_donnees: 'graphique', donnees };
  }
  return base;
}
