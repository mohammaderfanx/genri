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
