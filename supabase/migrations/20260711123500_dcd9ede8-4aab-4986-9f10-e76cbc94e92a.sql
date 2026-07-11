
CREATE TABLE public.github_connections (
  user_id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  github_id bigint NOT NULL,
  login text NOT NULL,
  avatar_url text,
  scopes text,
  access_token text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX github_connections_github_id_idx ON public.github_connections(github_id);

GRANT SELECT, DELETE ON public.github_connections TO authenticated;
GRANT ALL ON public.github_connections TO service_role;

ALTER TABLE public.github_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own github connection"
  ON public.github_connections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own github connection"
  ON public.github_connections FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER github_connections_set_updated_at
  BEFORE UPDATE ON public.github_connections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
