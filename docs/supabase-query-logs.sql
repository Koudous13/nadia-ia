-- Migration Supabase : table query_logs pour audit des conversations Nadia
-- À exécuter dans le SQL Editor de Supabase (project dashboard).
--
-- La table est best-effort : si elle n'existe pas, le pipeline /api/chat continue
-- de fonctionner sans logger (cf. src/lib/supabase/query-log.ts).

CREATE TABLE IF NOT EXISTS public.query_logs (
  id              bigserial PRIMARY KEY,
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email      text,
  question        text NOT NULL,
  answer_preview  text,
  tools_called    text[] NOT NULL DEFAULT '{}',
  tool_args       jsonb NOT NULL DEFAULT '[]'::jsonb,
  rounds          int NOT NULL DEFAULT 0,
  duration_ms     int NOT NULL DEFAULT 0,
  has_error       boolean NOT NULL DEFAULT false,
  error_message   text,
  llm_provider    text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS query_logs_created_at_idx ON public.query_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS query_logs_user_id_idx     ON public.query_logs (user_id);
CREATE INDEX IF NOT EXISTS query_logs_has_error_idx   ON public.query_logs (has_error) WHERE has_error;

-- RLS : seuls les utilisateurs authentifiés peuvent insérer leurs propres logs.
-- Lecture restreinte aux admins (à ajuster selon le système de rôles utilisé).
ALTER TABLE public.query_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth users can insert own logs" ON public.query_logs;
CREATE POLICY "auth users can insert own logs" ON public.query_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "users read own logs" ON public.query_logs;
CREATE POLICY "users read own logs" ON public.query_logs
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
