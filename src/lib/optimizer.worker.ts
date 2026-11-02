import { compactPrompt } from "./optimizer-core";
self.onmessage = (event: MessageEvent<{ id: number; text: string }>) => {
  try { self.postMessage({ id: event.data.id, result: compactPrompt(event.data.text) }); }
  catch { self.postMessage({ id: event.data.id, error: "Could not process this prompt." }); }
};