CREATE TABLE public.health_feed_entries (
 id text PRIMARY KEY,
 kind text NOT NULL CHECK (kind IN ('news', 'research')),
 title text NOT NULL,
 summary text NOT NULL DEFAULT '',
 source text NOT NULL,
 source_url text NOT NULL,
 published_at timestamptz,
 authors text NOT NULL DEFAULT '',
 doi text,
 fetched_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.health_feed_entries TO anon, authenticated;
GRANT ALL ON public.health_feed_entries TO service_role;
ALTER TABLE public.health_feed_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public health source entries" ON public.health_feed_entries FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX health_feed_publication_idx ON public.health_feed_entries (published_at DESC);
CREATE TABLE public.health_feed_status (
 source text PRIMARY KEY,
 last_attempt_at timestamptz NOT NULL DEFAULT now(),
 last_success_at timestamptz,
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ok', 'unavailable')),
 entry_count integer NOT NULL DEFAULT 0
);
GRANT SELECT ON public.health_feed_status TO anon, authenticated;
GRANT ALL ON public.health_feed_status TO service_role;
ALTER TABLE public.health_feed_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public source refresh status" ON public.health_feed_status FOR SELECT TO anon, authenticated USING (true);