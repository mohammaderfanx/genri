DROP POLICY IF EXISTS "anyone reads jobs" ON public.eval_execution_jobs;
CREATE POLICY "read sample or own jobs" ON public.eval_execution_jobs FOR SELECT TO anon, authenticated
  USING (created_by IS NULL OR created_by = auth.uid());

DROP POLICY IF EXISTS "anyone reads judge evals" ON public.multi_agent_judge_evals;
CREATE POLICY "read sample or own judge evals" ON public.multi_agent_judge_evals FOR SELECT TO anon, authenticated
  USING (created_by IS NULL OR created_by = auth.uid());

DROP POLICY IF EXISTS "public model catalog" ON public.ai_models;
CREATE POLICY "public catalog models" ON public.ai_models FOR SELECT TO anon, authenticated
  USING (source = 'catalog');

DROP POLICY IF EXISTS "anyone reads embeddings" ON public.model_embeddings;
REVOKE SELECT ON public.model_embeddings FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.match_models(query_embedding extensions.vector(1536), match_count integer DEFAULT 20)
RETURNS TABLE (model_id text, similarity double precision)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT model_id, 1 - (capability_vector <=> query_embedding) AS similarity
  FROM public.model_embeddings
  ORDER BY capability_vector <=> query_embedding
  LIMIT LEAST(GREATEST(match_count, 1), 50)
$$;
GRANT EXECUTE ON FUNCTION public.match_models(extensions.vector, integer) TO anon, authenticated;