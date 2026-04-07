import { NextRequest } from 'next/server';
import { getLLMProvider, ConversationMessage } from '@/lib/llm';
import { crmTools } from '@/lib/tools/definitions';
import { executeToolCall } from '@/lib/crm/client';
import { NADIA_SYSTEM_PROMPT } from '@/lib/system-prompt';
import { MiddlewareResponse } from '@/types';

const MAX_TOOL_ROUNDS = 5;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, history = [] } = body as {
      message: string;
      history: { role: 'user' | 'assistant'; content: string }[];
    };

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
      return Response.json(result);
    }

    return Response.json({
      texte: "Désolée, j'ai eu besoin de trop d'étapes pour répondre. Peux-tu reformuler ta question ?",
      type_donnees: 'texte',
    } satisfies MiddlewareResponse);

  } catch (err) {
    console.error('[API Chat Error]', err);
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

  // Nettoyer les marqueurs du texte
  const cleanText = text
    .replace(/\[TABLE\]/g, '')
    .replace(/\[CHART:(bar|line|pie)\]/g, '')
    .trim();

  // On n'envoie les données brutes que si le LLM utilise un marqueur explicite
  // Sinon le LLM gère lui-même le formatage dans son texte
  if (text.includes('[TABLE]') && donnees) {
    return { texte: cleanText, type_donnees: 'tableau', donnees };
  }

  const chartMatch = text.match(/\[CHART:(bar|line|pie)\]/);
  if (chartMatch && donnees) {
    return { texte: cleanText, type_donnees: 'graphique', donnees };
  }

  return { texte: cleanText, type_donnees: 'texte' };
}
