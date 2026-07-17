
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
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT c.id, c.file_id, f.path, c.content,
    1 - (c.embedding::halfvec(3072) <=> p_query::halfvec(3072)) AS similarity
  FROM public.code_chunks c
  JOIN public.code_files f ON f.id = c.file_id
  WHERE c.repo_id = p_repo_id
  ORDER BY c.embedding::halfvec(3072) <=> p_query::halfvec(3072)
  LIMIT p_limit;
$$;
