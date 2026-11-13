BEGIN;

CREATE TABLE IF NOT EXISTS public.farm_submissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    submission jsonb NOT NULL CHECK (jsonb_typeof(submission) = 'object'),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS farm_submissions_status_created_at_idx
    ON public.farm_submissions (status, created_at DESC);

ALTER TABLE public.farm_submissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.farm_submissions FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.farm_submissions TO service_role;

DO $$
DECLARE
    relation_kind "char";
    policy_row record;
BEGIN
    SELECT c.relkind INTO relation_kind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'reservations';

    IF relation_kind IN ('r', 'p') THEN
        EXECUTE 'ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY';
        FOR policy_row IN
            SELECT policyname FROM pg_policies
            WHERE schemaname = 'public' AND tablename = 'reservations'
        LOOP
            EXECUTE format('DROP POLICY %I ON public.reservations', policy_row.policyname);
        END LOOP;
        EXECUTE 'REVOKE ALL ON TABLE public.reservations FROM PUBLIC, anon, authenticated';
        EXECUTE 'GRANT ALL ON TABLE public.reservations TO service_role';
    ELSE
        RAISE EXCEPTION 'Expected public.reservations to be a table or partitioned table';
    END IF;

    SELECT c.relkind INTO relation_kind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'farms_public';

    IF relation_kind IN ('r', 'p') THEN
        EXECUTE 'ALTER TABLE public.farms_public ENABLE ROW LEVEL SECURITY';
        FOR policy_row IN
            SELECT policyname FROM pg_policies
            WHERE schemaname = 'public' AND tablename = 'farms_public'
        LOOP
            EXECUTE format('DROP POLICY %I ON public.farms_public', policy_row.policyname);
        END LOOP;
        EXECUTE 'CREATE POLICY sagana_public_farm_read ON public.farms_public FOR SELECT TO anon, authenticated USING (true)';
        EXECUTE 'REVOKE ALL ON TABLE public.farms_public FROM PUBLIC, anon, authenticated';
        EXECUTE 'GRANT SELECT ON TABLE public.farms_public TO anon, authenticated';
        EXECUTE 'GRANT ALL ON TABLE public.farms_public TO service_role';
    ELSIF relation_kind = 'v' THEN
        EXECUTE 'REVOKE ALL ON TABLE public.farms_public FROM PUBLIC, anon, authenticated';
        EXECUTE 'GRANT SELECT ON TABLE public.farms_public TO anon, authenticated';
    ELSE
        RAISE EXCEPTION 'Expected public.farms_public to be a table, partitioned table, or view';
    END IF;
END
$$;

COMMIT;
