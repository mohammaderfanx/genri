<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Demo data (models, telemetry, agentic evals) lives in src/lib as deterministic seeded modules; live fluctuations run client-side in useEffect so SSR and hydration match.
- Public REST API lives under src/routes/api/public/v1 and authenticates with hashed org API keys (api-auth.server.ts); per-key rpm limits are counted from api_request_logs.
- AI calls go through src/lib/ai/gateway.server.ts (streamed Responses API); the judge/candidate model allow-list is src/lib/ai/catalog.ts.
- Phase 4 public labs use deterministic demo modules and explicitly distinguish imported reports, local processing and simulated telemetry from live execution; unavailable infrastructure must never be silently simulated as live.
- Prompt tokenization and exact-line deduplication run in a client worker to avoid blocking interaction or loading tokenizer assets during SSR.
- Fine-tune analytics uses an unnested route so the existing analytics content page does not swallow its child.
- The downloadable local CLI validates captured outputs and regression budgets outside the hosted runtime; keep its runnable core alongside the entry point and do not imply unpublished registry packages exist.
- Phase 5 datasets and topology are deterministic client-safe data; local templates and sample scans must never be described as autonomous execution or contamination evidence.
- Phase 5 report persistence uses authenticated server functions and owner-only policies; regenerate sample reports server-side rather than trusting client-supplied metrics.
- The Phase 5 topology uses a responsive Canvas renderer with token-derived colors; node selection must also work through the registry for keyboard access.
