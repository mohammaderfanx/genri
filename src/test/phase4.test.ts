import { describe, expect, it } from "vitest";
import { compactPrompt } from "@/lib/optimizer-core";
import { optimizationTemplates, sandboxReplays, comparisonSchema, regressionStatus } from "@/lib/phase4";

describe("Phase 4 rules", () => {
  it("seeds ten prompt templates", () => expect(optimizationTemplates).toHaveLength(10));
  it("seeds five interactive sandbox replays", () => expect(sandboxReplays).toHaveLength(5));
  it("keeps every distinct instruction and numeric limit", () => {
    const result = compactPrompt("Never expose keys.\nBudget $0.50.\nNever expose keys.\nTTFT < 150ms.");
    expect(result.optimized).toBe("Never expose keys.\nBudget $0.50.\nTTFT < 150ms.");
    expect(result.after).toBeLessThan(result.before);
  });
  it("enforces the $0.50 cost gate", () => expect(regressionStatus(50, 0, 0.51, 0.5, 120, 150)).toBe("failed"));
  it("fails a latency regression over the configured 150ms threshold", () => expect(regressionStatus(50, 0, 0.2, 0.5, 151, 150)).toBe("failed"));
  it("fails any inaccurate test", () => expect(regressionStatus(49, 1, 0.2, 0.5, 120, 150)).toBe("failed"));
  it("accepts reports only with accuracy between zero and 100", () => expect(comparisonSchema.safeParse({ name: "legal", model: "llama", metrics: { domainAccuracy: 101, generalAccuracy: 80, ttft: 100, tps: 40 } }).success).toBe(false));
});