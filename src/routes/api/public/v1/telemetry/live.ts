import { createFileRoute } from "@tanstack/react-router";
import { hosts, regions, cell } from "@/lib/telemetry";
import { authenticateApiKey, cors } from "@/lib/api-auth.server";

export const Route = createFileRoute("/api/public/v1/telemetry/live")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: cors }),
      GET: async ({ request }) => {
        const auth = await authenticateApiKey(request, "GET /v1/telemetry/live");
        if ("error" in auth) return auth.error;
        await auth.log(200);
        const enc = new TextEncoder();
        let timer: ReturnType<typeof setInterval> | undefined;
        const stream = new ReadableStream({
          start(controller) {
            let n = 0;
            const send = () => {
              const events = hosts.flatMap((h) => regions.map((r) => {
                const c = cell(h, r);
                return { provider_host: h, region: r, ttft_ms: Math.round(c.ttft * (0.9 + Math.random() * 0.2)), tps: Math.round(c.tps * (0.9 + Math.random() * 0.2)), status: c.status, timestamp: new Date().toISOString() };
              }));
              controller.enqueue(enc.encode(`event: telemetry\ndata: ${JSON.stringify(events)}\n\n`));
              if (++n >= 30) { clearInterval(timer); controller.close(); }
            };
            send();
            timer = setInterval(send, 2000);
            request.signal.addEventListener("abort", () => { clearInterval(timer); try { controller.close(); } catch { /* closed */ } });
          },
          cancel() { clearInterval(timer); },
        });
        return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive", ...cors } });
      },
    },
  },
});
