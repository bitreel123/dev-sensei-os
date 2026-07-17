
CREATE EXTENSION IF NOT EXISTS vector;

-- ============ code_repos ============
CREATE TABLE public.code_repos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  default_branch TEXT NOT NULL DEFAULT 'main',
  last_scanned_sha TEXT,
  last_scanned_at TIMESTAMPTZ,
  file_count INT NOT NULL DEFAULT 0,
  symbol_count INT NOT NULL DEFAULT 0,
  edge_count INT NOT NULL DEFAULT 0,
  webhook_id BIGINT,
  webhook_secret TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, full_name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.code_repos TO authenticated;
GRANT ALL ON public.code_repos TO service_role;
ALTER TABLE public.code_repos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own code_repos" ON public.code_repos FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ code_files ============
CREATE TABLE public.code_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  repo_id UUID NOT NULL REFERENCES public.code_repos(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  language TEXT,
  size INT,
  sha TEXT,
  summary TEXT,
  embedding vector(3072),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (repo_id, path)
);
CREATE INDEX code_files_repo_idx ON public.code_files(repo_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.code_files TO authenticated;
GRANT ALL ON public.code_files TO service_role;
ALTER TABLE public.code_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own code_files" ON public.code_files FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ code_symbols ============
CREATE TABLE public.code_symbols (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  repo_id UUID NOT NULL REFERENCES public.code_repos(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES public.code_files(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL, -- function|class|component|route|export|table_ref|package
  start_line INT,
  end_line INT,
  signature TEXT,
  docstring TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX code_symbols_repo_idx ON public.code_symbols(repo_id);
CREATE INDEX code_symbols_file_idx ON public.code_symbols(file_id);
CREATE INDEX code_symbols_name_idx ON public.code_symbols(repo_id, name);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.code_symbols TO authenticated;
GRANT ALL ON public.code_symbols TO service_role;
ALTER TABLE public.code_symbols ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own code_symbols" ON public.code_symbols FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ code_edges ============
CREATE TABLE public.code_edges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  repo_id UUID NOT NULL REFERENCES public.code_repos(id) ON DELETE CASCADE,
  src_file_id UUID REFERENCES public.code_files(id) ON DELETE CASCADE,
  src_symbol TEXT,
  dst_file_id UUID REFERENCES public.code_files(id) ON DELETE CASCADE,
  dst_symbol TEXT,
  dst_external TEXT, -- e.g. package name or table name
  kind TEXT NOT NULL, -- imports|calls|renders|reads_table|writes_table|defines_route|depends_on_package
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX code_edges_repo_idx ON public.code_edges(repo_id);
CREATE INDEX code_edges_src_idx ON public.code_edges(src_file_id);
CREATE INDEX code_edges_dst_idx ON public.code_edges(dst_file_id);
CREATE INDEX code_edges_kind_idx ON public.code_edges(repo_id, kind);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.code_edges TO authenticated;
GRANT ALL ON public.code_edges TO service_role;
ALTER TABLE public.code_edges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own code_edges" ON public.code_edges FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ code_chunks ============
CREATE TABLE public.code_chunks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  repo_id UUID NOT NULL REFERENCES public.code_repos(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES public.code_files(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(3072),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX code_chunks_repo_idx ON public.code_chunks(repo_id);
CREATE INDEX code_chunks_file_idx ON public.code_chunks(file_id);
CREATE INDEX code_chunks_embedding_idx
  ON public.code_chunks USING hnsw ((embedding::halfvec(3072)) halfvec_cosine_ops);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.code_chunks TO authenticated;
GRANT ALL ON public.code_chunks TO service_role;
ALTER TABLE public.code_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own code_chunks" ON public.code_chunks FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ code_scans (progress tracking) ============
CREATE TABLE public.code_scans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  repo_id UUID NOT NULL REFERENCES public.code_repos(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending|running|done|error
  phase TEXT,
  files_total INT NOT NULL DEFAULT 0,
  files_done INT NOT NULL DEFAULT 0,
  error TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);
CREATE INDEX code_scans_repo_idx ON public.code_scans(repo_id, started_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.code_scans TO authenticated;
GRANT ALL ON public.code_scans TO service_role;
ALTER TABLE public.code_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own code_scans" ON public.code_scans FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ code_snapshots ============
CREATE TABLE public.code_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  repo_id UUID NOT NULL REFERENCES public.code_repos(id) ON DELETE CASCADE,
  sha TEXT NOT NULL,
  file_count INT NOT NULL DEFAULT 0,
  symbol_count INT NOT NULL DEFAULT 0,
  edge_count INT NOT NULL DEFAULT 0,
  taken_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX code_snapshots_repo_idx ON public.code_snapshots(repo_id, taken_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.code_snapshots TO authenticated;
GRANT ALL ON public.code_snapshots TO service_role;
ALTER TABLE public.code_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own code_snapshots" ON public.code_snapshots FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ updated_at triggers ============
CREATE OR REPLACE FUNCTION public.code_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_code_repos_updated BEFORE UPDATE ON public.code_repos
  FOR EACH ROW EXECUTE FUNCTION public.code_touch_updated_at();
CREATE TRIGGER trg_code_files_updated BEFORE UPDATE ON public.code_files
  FOR EACH ROW EXECUTE FUNCTION public.code_touch_updated_at();

-- ============ similarity search RPC ============
CREATE OR REPLACE FUNCTION public.match_code_chunks(
  p_repo_id UUID,
  p_query vector(3072),
  p_limit INT DEFAULT 12
)
RETURNS TABLE (
  chunk_id UUID,
  file_id UUID,
  path TEXT,
  content TEXT,
  similarity FLOAT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.file_id, f.path, c.content,
    1 - (c.embedding::halfvec(3072) <=> p_query::halfvec(3072)) AS similarity
  FROM public.code_chunks c
  JOIN public.code_files f ON f.id = c.file_id
  WHERE c.repo_id = p_repo_id
    AND c.user_id = auth.uid()
  ORDER BY c.embedding::halfvec(3072) <=> p_query::halfvec(3072)
  LIMIT p_limit;
$$;
REVOKE ALL ON FUNCTION public.match_code_chunks(UUID, vector, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.match_code_chunks(UUID, vector, INT) TO authenticated;
