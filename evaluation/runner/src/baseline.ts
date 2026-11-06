import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { readJson, scoreOrNull } from "./results.js";
import type { Score } from "./types.js";

export interface ReferenceScores {
  baseline: Map<string, Score>;
  manualV1: Map<string, Score>;
}

/** Reads the existing manual measurements without modifying them. */
export function loadReferenceScores(resultsDir: string): ReferenceScores {
  const baseline = new Map<string, Score>();
  const manualV1 = new Map<string, Score>();
  const runFile = path.join(resultsDir, "baseline-v0.run.json");
  if (existsSync(runFile)) {
    for (const entry of readJson<{ results: { test_id: string; status: string }[] }>(runFile).results) {
      const score = scoreOrNull(entry.status);
      if (score) baseline.set(entry.test_id, score);
    }
  }
  if (existsSync(resultsDir)) {
    for (const name of readdirSync(resultsDir).filter((file) => /^T\d{3}\.v1\.json$/.test(file))) {
      const score = scoreOrNull(readJson<{ overall_score?: string }>(path.join(resultsDir, name)).overall_score);
      if (score) manualV1.set(name.slice(0, 4), score);
    }
  }
  return { baseline, manualV1 };
}
