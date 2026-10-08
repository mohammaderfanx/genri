CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

CREATE TYPE public.org_plan AS ENUM ('free','pro','enterprise');
CREATE TYPE public.org_role AS ENUM ('owner','admin','evaluator','viewer');
CREATE TYPE public.job_status AS ENUM ('queued','running','completed','failed');

-- Organizations
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  plan_tier public.org_plan NOT NULL DEFAULT 'free',
  stripe_customer_id text,
  monthly_budget_usd numeric NOT NULL DEFAULT 500,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  email text,
  role public.org_role NOT NULL DEFAULT 'viewer',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.organization_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.org_role NOT NULL DEFAULT 'viewer',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, email)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_invites TO authenticated;
GRANT ALL ON public.organization_invites TO service_role;
ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_org_member(_org uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE org_id = _org AND user_id = _user)
$$;
CREATE OR REPLACE FUNCTION public.can_manage_org(_org uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE org_id = _org AND user_id = _user AND role IN ('owner','admin'))
$$;

CREATE POLICY "members read org" ON public.organizations FOR SELECT TO authenticated USING (public.is_org_member(id, auth.uid()) OR created_by = auth.uid());
CREATE POLICY "create own org" ON public.organizations FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "managers update org" ON public.organizations FOR UPDATE TO authenticated USING (public.can_manage_org(id, auth.uid())) WITH CHECK (public.can_manage_org(id, auth.uid()));

CREATE POLICY "members read members" ON public.organization_members FOR SELECT TO authenticated USING (public.is_org_member(org_id, auth.uid()));
CREATE POLICY "managers change members" ON public.organization_members FOR UPDATE TO authenticated USING (public.can_manage_org(org_id, auth.uid()) AND role <> 'owner') WITH CHECK (public.can_manage_org(org_id, auth.uid()) AND role <> 'owner');
CREATE POLICY "managers remove members" ON public.organization_members FOR DELETE TO authenticated USING (public.can_manage_org(org_id, auth.uid()) AND role <> 'owner');

CREATE POLICY "managers read invites" ON public.organization_invites FOR SELECT TO authenticated USING (public.can_manage_org(org_id, auth.uid()));
CREATE POLICY "managers create invites" ON public.organization_invites FOR INSERT TO authenticated WITH CHECK (public.can_manage_org(org_id, auth.uid()) AND role <> 'owner');
CREATE POLICY "managers delete invites" ON public.organization_invites FOR DELETE TO authenticated USING (public.can_manage_org(org_id, auth.uid()));

-- creator becomes owner
CREATE OR REPLACE FUNCTION public.handle_new_org() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.organization_members (org_id, user_id, email, role)
  VALUES (NEW.id, NEW.created_by, (auth.jwt() ->> 'email'), 'owner');
  RETURN NEW;
END $$;
CREATE TRIGGER on_org_created AFTER INSERT ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.handle_new_org();

-- accept pending invites for the signed-in user's email
CREATE OR REPLACE FUNCTION public.accept_my_invites() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _email text := lower(auth.jwt() ->> 'email'); _n integer;
BEGIN
  IF auth.uid() IS NULL OR _email IS NULL THEN RETURN 0; END IF;
  INSERT INTO public.organization_members (org_id, user_id, email, role)
  SELECT org_id, auth.uid(), _email, role FROM public.organization_invites WHERE lower(email) = _email
  ON CONFLICT (org_id, user_id) DO NOTHING;
  GET DIAGNOSTICS _n = ROW_COUNT;
  DELETE FROM public.organization_invites WHERE lower(email) = _email;
  RETURN _n;
END $$;
REVOKE EXECUTE ON FUNCTION public.accept_my_invites() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.accept_my_invites() TO authenticated;

-- API keys
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  key_hash text NOT NULL UNIQUE,
  key_prefix text NOT NULL,
  name text NOT NULL,
  rate_limit_rpm integer NOT NULL DEFAULT 60,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read keys" ON public.api_keys FOR SELECT TO authenticated USING (public.is_org_member(org_id, auth.uid()));
CREATE POLICY "managers create keys" ON public.api_keys FOR INSERT TO authenticated WITH CHECK (public.can_manage_org(org_id, auth.uid()));
CREATE POLICY "managers update keys" ON public.api_keys FOR UPDATE TO authenticated USING (public.can_manage_org(org_id, auth.uid()));
CREATE POLICY "managers delete keys" ON public.api_keys FOR DELETE TO authenticated USING (public.can_manage_org(org_id, auth.uid()));

CREATE TABLE public.api_request_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid REFERENCES public.api_keys(id) ON DELETE SET NULL,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  model text,
  status integer NOT NULL,
  latency_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX api_request_logs_key_time ON public.api_request_logs (api_key_id, created_at DESC);
CREATE INDEX api_request_logs_org_time ON public.api_request_logs (org_id, created_at DESC);
GRANT SELECT ON public.api_request_logs TO authenticated;
GRANT ALL ON public.api_request_logs TO service_role;
ALTER TABLE public.api_request_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read request logs" ON public.api_request_logs FOR SELECT TO authenticated USING (public.is_org_member(org_id, auth.uid()));

-- Audit log
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_id uuid,
  actor_email text,
  action text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_org_time ON public.audit_logs (org_id, created_at DESC);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read audit" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_org_member(org_id, auth.uid()));
CREATE POLICY "members write own audit" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (public.is_org_member(org_id, auth.uid()) AND actor_id = auth.uid());

-- Benchmark execution jobs (public leaderboard of runs)
CREATE TABLE public.eval_execution_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id text NOT NULL,
  benchmark_suite_id uuid NOT NULL DEFAULT gen_random_uuid(),
  suite_name text NOT NULL DEFAULT 'Latency Probe',
  status public.job_status NOT NULL DEFAULT 'queued',
  concurrency integer NOT NULL DEFAULT 1,
  total_prompts integer NOT NULL DEFAULT 0,
  completed_prompts integer NOT NULL DEFAULT 0,
  raw_telemetry jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.eval_execution_jobs TO anon;
GRANT SELECT, INSERT, UPDATE ON public.eval_execution_jobs TO authenticated;
GRANT ALL ON public.eval_execution_jobs TO service_role;
ALTER TABLE public.eval_execution_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads jobs" ON public.eval_execution_jobs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "users create own jobs" ON public.eval_execution_jobs FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "users update own jobs" ON public.eval_execution_jobs FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

-- Multi-agent judge evaluations
CREATE TABLE public.multi_agent_judge_evals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_text text NOT NULL,
  candidate_model_id text NOT NULL,
  candidate_output text NOT NULL,
  judge_committee jsonb NOT NULL DEFAULT '[]'::jsonb,
  individual_scores jsonb NOT NULL DEFAULT '[]'::jsonb,
  consensus_score numeric,
  bias_mitigation_meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.multi_agent_judge_evals TO anon;
GRANT SELECT, INSERT ON public.multi_agent_judge_evals TO authenticated;
GRANT ALL ON public.multi_agent_judge_evals TO service_role;
ALTER TABLE public.multi_agent_judge_evals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads judge evals" ON public.multi_agent_judge_evals FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "users create own judge evals" ON public.multi_agent_judge_evals FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

-- Embeddings
CREATE TABLE public.model_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id text NOT NULL UNIQUE,
  content text NOT NULL,
  capability_vector extensions.vector(1536) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX model_embeddings_hnsw ON public.model_embeddings USING hnsw (capability_vector extensions.vector_cosine_ops);
GRANT SELECT ON public.model_embeddings TO anon, authenticated;
GRANT ALL ON public.model_embeddings TO service_role;
ALTER TABLE public.model_embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads embeddings" ON public.model_embeddings FOR SELECT TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.match_models(query_embedding extensions.vector(1536), match_count integer DEFAULT 20)
RETURNS TABLE (model_id text, similarity double precision)
LANGUAGE sql STABLE SET search_path = public, extensions AS $$
  SELECT model_id, 1 - (capability_vector <=> query_embedding) AS similarity
  FROM public.model_embeddings
  ORDER BY capability_vector <=> query_embedding
  LIMIT match_count
$$;
GRANT EXECUTE ON FUNCTION public.match_models(extensions.vector, integer) TO anon, authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.eval_execution_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;

-- Seed: 56 historical benchmark jobs
INSERT INTO public.eval_execution_jobs (model_id, suite_name, status, concurrency, total_prompts, completed_prompts, raw_telemetry, started_at, completed_at, created_at)
SELECT
  (ARRAY['claude-3-5-sonnet','gpt-4o','deepseek-r1','llama-3-3-70b','gemini-1-5-pro','qwen-2-5-max','o1','mistral-large-2'])[1 + (g % 8)],
  (ARRAY['Latency Probe','SWE-bench Lite','GAIA','ToolBench','MMLU-Pro'])[1 + (g % 5)],
  (CASE WHEN g <= 4 THEN 'queued' WHEN g <= 9 THEN 'running' WHEN g % 13 = 0 THEN 'failed' ELSE 'completed' END)::public.job_status,
  (ARRAY[1,2,4,8,16])[1 + (g % 5)],
  (ARRAY[50,100,200,500])[1 + (g % 4)],
  CASE WHEN g <= 4 THEN 0
       WHEN g <= 9 THEN ((ARRAY[50,100,200,500])[1 + (g % 4)] * (0.2 + (g % 5) * 0.15))::int
       WHEN g % 13 = 0 THEN ((ARRAY[50,100,200,500])[1 + (g % 4)] * 0.4)::int
       ELSE (ARRAY[50,100,200,500])[1 + (g % 4)] END,
  CASE WHEN g <= 4 THEN '{}'::jsonb ELSE jsonb_build_object(
    'p50_ttft_ms', 120 + (g * 37) % 900,
    'p99_ttft_ms', 400 + (g * 91) % 3200,
    'median_tps', 30 + (g * 23) % 290,
    'token_variance', round(((g * 7) % 40 / 100.0)::numeric, 2)) END,
  CASE WHEN g <= 4 THEN NULL ELSE now() - (g || ' hours')::interval END,
  CASE WHEN g <= 9 THEN NULL ELSE now() - (g || ' hours')::interval + interval '22 minutes' END,
  now() - (g || ' hours')::interval - interval '5 minutes'
FROM generate_series(1, 56) AS g;

-- Seed: sample judge committee evaluations
INSERT INTO public.multi_agent_judge_evals (prompt_text, candidate_model_id, candidate_output, judge_committee, individual_scores, consensus_score, bias_mitigation_meta) VALUES
('Refactor a Python function that fetches 50 URLs sequentially into an async version with bounded concurrency.',
 'llama-3-3-70b',
 E'```python\nimport asyncio, aiohttp\n\nasync def fetch_all(urls, limit=10):\n    sem = asyncio.Semaphore(limit)\n    async with aiohttp.ClientSession() as s:\n        async def one(u):\n            async with sem, s.get(u) as r:\n                return await r.text()\n        return await asyncio.gather(*(one(u) for u in urls))\n```\nUses a semaphore to cap concurrency at 10 and reuses one session.',
 '["gpt-4o","claude-3-5-sonnet","deepseek-r1"]'::jsonb,
 '[{"judge":"gpt-4o","score":8,"reasoning":["Correctly uses asyncio.Semaphore to bound concurrency.","Single shared ClientSession avoids connection churn.","No timeout or error handling: one failing URL raises and cancels gather."],"verdict":"Solid and idiomatic; missing resilience."},
   {"judge":"claude-3-5-sonnet","score":7,"reasoning":["Concurrency bound is correct.","gather without return_exceptions=True makes a single failure fatal.","No raise_for_status, so HTTP errors are silently returned as text."],"verdict":"Good core pattern, production gaps."},
   {"judge":"deepseek-r1","score":8,"reasoning":["Time complexity drops from sum of latencies to roughly max(latency)*ceil(n/limit).","Semaphore placement inside the session context is correct.","Would add aiohttp.ClientTimeout for robustness."],"verdict":"Correct and efficient."}]'::jsonb,
 7.7, '{"position_swap_verified":true,"length_penalty_applied":false}'::jsonb),
('Explain the CAP theorem to a junior engineer in under 120 words.',
 'gpt-4o',
 'In a distributed system you can only fully guarantee two of three properties during a network partition: Consistency (every read sees the latest write), Availability (every request gets a response), and Partition tolerance (the system keeps working when nodes cannot talk). Since partitions will happen, the real choice is between consistency and availability while one is ongoing. Banks lean consistent; social feeds lean available.',
 '["gpt-4o","claude-3-5-sonnet","deepseek-r1"]'::jsonb,
 '[{"judge":"gpt-4o","score":9,"reasoning":["Accurate definitions of C, A and P.","Correctly reframes the choice as C vs A during partitions.","Concrete examples aid intuition."],"verdict":"Clear and correct."},
   {"judge":"claude-3-5-sonnet","score":9,"reasoning":["Within the word limit.","Avoids the common \"pick any two\" misconception.","Tone suits a junior audience."],"verdict":"Excellent explanation."},
   {"judge":"deepseek-r1","score":8,"reasoning":["Technically sound.","Could mention that without partitions both C and A are achievable (PACELC).","Examples slightly oversimplified."],"verdict":"Strong, minor nuance missing."}]'::jsonb,
 8.7, '{"position_swap_verified":true,"length_penalty_applied":true}'::jsonb),
('Prove that the square root of 2 is irrational.',
 'deepseek-r1',
 'Assume sqrt(2) = p/q in lowest terms. Then p^2 = 2q^2, so p^2 is even and therefore p is even; write p = 2k. Substituting gives 4k^2 = 2q^2, so q^2 = 2k^2 and q is even too. Both p and q even contradicts lowest terms, so sqrt(2) is irrational.',
 '["gpt-4o","claude-3-5-sonnet","deepseek-r1"]'::jsonb,
 '[{"judge":"gpt-4o","score":10,"reasoning":["Classic proof by contradiction, every step valid.","Justifies p even from p^2 even.","Concise."],"verdict":"Complete proof."},
   {"judge":"claude-3-5-sonnet","score":9,"reasoning":["Correct structure.","Step \"p^2 even implies p even\" stated without justification (contrapositive).","Otherwise rigorous."],"verdict":"Correct, one implicit lemma."},
   {"judge":"deepseek-r1","score":10,"reasoning":["Self-evaluation flagged; weight reduced in consensus.","Logic is airtight.","Lowest-terms assumption used correctly."],"verdict":"Correct."}]'::jsonb,
 9.6, '{"position_swap_verified":true,"length_penalty_applied":false}'::jsonb);