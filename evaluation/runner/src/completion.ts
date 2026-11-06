export interface UiSnapshot {
  railTurns: number;
  pending: boolean | null;
  busy: boolean;
  responseText: string;
}

export interface CompletionExpectation {
  railTurnsAfterSend: number;
  previousResponseText: string | null;
  stableMs: number;
}

export type Progress = "awaiting-send-ack" | "generating" | "settling" | "complete";

/**
 * Decides when an agent response is finished, from DOM-derived state only:
 * the user turn was registered, the composer is no longer pending, no region is busy,
 * and the visible response is new, non-empty and unchanged for `stableMs`.
 */
export class CompletionTracker {
  private stableSince: number | null = null;
  private lastText: string | null = null;

  constructor(private readonly expectation: CompletionExpectation) {}

  observe(snapshot: UiSnapshot, nowMs: number): Progress {
    if (snapshot.railTurns < this.expectation.railTurnsAfterSend) return "awaiting-send-ack";
    const text = snapshot.responseText.trim();
    const isNew = text !== "" && text !== (this.expectation.previousResponseText ?? "").trim();
    if (snapshot.pending !== false || snapshot.busy || !isNew) {
      this.reset();
      return "generating";
    }
    if (text !== this.lastText) {
      this.lastText = text;
      this.stableSince = nowMs;
      return "settling";
    }
    return nowMs - (this.stableSince ?? nowMs) >= this.expectation.stableMs ? "complete" : "settling";
  }

  private reset(): void {
    this.stableSince = null;
    this.lastText = null;
  }
}

export function textWarnings(text: string): string[] {
  const warnings: string[] = [];
  if (text.trim().length < 40) warnings.push("response shorter than 40 characters");
  if (!/[.!?)”"…:]\s*$/.test(text.trim()) && !/https?:\/\/\S+\s*$/.test(text.trim())) {
    warnings.push("response does not end with terminal punctuation (possible truncation)");
  }
  return warnings;
}
