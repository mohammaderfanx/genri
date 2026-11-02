import { encode } from "gpt-tokenizer";
import { diffLines } from "diff";

/** Lossless at the distinct-line level. No claim of semantic quality is made. */
export function compactPrompt(original: string) {
  const seen = new Set<string>();
  const optimized = original.split(/\r?\n/).map((line) => line.trim()).filter((line) => {
    if (!line) return false;
    if (seen.has(line)) return false;
    seen.add(line); return true;
  }).join("\n");
  const before = encode(original).length;
  const after = encode(optimized).length;
  return { optimized, before, after, reduction: before ? (before - after) / before * 100 : 0, diff: diffLines(original, optimized).map((p) => ({ value: p.value, added: !!p.added, removed: !!p.removed })) };
}