// Logging des conversations chat dans Supabase (table query_logs).
// Si la table n'existe pas ou que le client est non-authentifié, on swallow silencieusement
// pour ne pas casser le pipeline chat.

import { createClient } from './server';

export type QueryLogEntry = {
  question: string;
  answer_preview: string | null;
  tools_called: string[];
  tool_args: unknown[];
  rounds: number;
  duration_ms: number;
  has_error: boolean;
  error_message?: string | null;
  llm_provider: string | null;
};

export async function logQuery(entry: QueryLogEntry): Promise<void> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      user_id: user?.id ?? null,
      user_email: user?.email ?? null,
      question: entry.question.slice(0, 2000),
      answer_preview: entry.answer_preview?.slice(0, 1000) ?? null,
      tools_called: entry.tools_called,
      tool_args: entry.tool_args,
      rounds: entry.rounds,
      duration_ms: entry.duration_ms,
      has_error: entry.has_error,
      error_message: entry.error_message?.slice(0, 1000) ?? null,
      llm_provider: entry.llm_provider,
    };
    const { error } = await supabase.from('query_logs').insert(payload);
    if (error && !/relation .* does not exist|table .* does not exist|404|Not Found/i.test(error.message)) {
      console.error('[query-log] insert failed:', error.message);
    }
  } catch (e) {
    // Best-effort logging only — never break the chat pipeline
    console.error('[query-log] silent error:', (e as Error).message);
  }
}
