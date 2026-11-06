import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { ExecutionState, Review, RunSummary, ScenarioResult, Score } from "./types.js";

export const EXECUTION_STATES: ExecutionState[] = ["SUCCESS", "ERROR", "INCOMPLETE", "SKIPPED"];
const SCORES = new Set(["PASS", "PARTIAL", "FAIL"]);

export function shortHash(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

export function writeJson(file: string, data: unknown): void {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

export function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, "utf-8").replace(/^\uFEFF/, "")) as T;
}

export function countStates(states: ExecutionState[]): Record<ExecutionState, number> {
  const counts = { SUCCESS: 0, ERROR: 0, INCOMPLETE: 0, SKIPPED: 0 };
  for (const state of states) counts[state] += 1;
  return counts;
}

/** A SUCCESS result must contain exactly the scenario's user turns, each with a non-empty agent reply. */
export function validateScenarioResult(result: ScenarioResult, expectedUserTurns: string[]): string[] {
  const problems: string[] = [];
  if (result.execution_state !== "SUCCESS") return problems;
  if (result.turns.length !== expectedUserTurns.length) {
    problems.push(`${result.test_id}: ${result.turns.length} turns captured, expected ${expectedUserTurns.length}`);
  }
  result.turns.forEach((turn, index) => {
    if (turn.user !== expectedUserTurns[index]) problems.push(`${result.test_id}: turn ${index + 1} user text differs from the scenario`);
    if (!turn.agent || turn.agent.trim() === "") problems.push(`${result.test_id}: turn ${index + 1} has an empty agent reply`);
  });
  if (!result.isolation.fresh_session_verified) problems.push(`${result.test_id}: fresh-session isolation not verified`);
  return problems;
}

export function loadScenarioResults(runDir: string): ScenarioResult[] {
  if (!existsSync(runDir)) return [];
  return readdirSync(runDir)
    .filter((name) => /^[A-Z]\d{3}\.json$/.test(name))
    .sort()
    .map((name) => readJson<ScenarioResult>(path.join(runDir, name)));
}

export function loadRunSummary(runDir: string): RunSummary {
  return readJson<RunSummary>(path.join(runDir, "run.json"));
}

export function parseReviews(json: unknown): Review[] {
  const list = (json as { reviews?: unknown }).reviews;
  if (!Array.isArray(list)) throw new Error('reviews file needs a "reviews" array');
  return list.map((raw: Partial<Review>) => {
    if (!raw.test_id || !raw.reviewer || !raw.justification || !raw.reviewed_on) throw new Error(`incomplete review entry: ${JSON.stringify(raw.test_id)}`);
    if (raw.score !== "UNCERTAIN" && !SCORES.has(String(raw.score))) throw new Error(`${raw.test_id}: invalid score ${String(raw.score)}`);
    if (raw.reviewer_kind !== "HUMAN" && raw.reviewer_kind !== "AI_ASSISTED") throw new Error(`${raw.test_id}: reviewer_kind must be HUMAN or AI_ASSISTED`);
    return raw as Review;
  });
}

export function scoreOrNull(value: unknown): Score | null {
  return typeof value === "string" && SCORES.has(value) ? (value as Score) : null;
}
