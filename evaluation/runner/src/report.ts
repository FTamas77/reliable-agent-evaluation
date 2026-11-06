import { readFileSync } from "node:fs";
import type { ReferenceScores } from "./baseline.js";
import type { Review, RunSummary, ScenarioResult } from "./types.js";

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)} s`;
const cell = (text: string) => text.replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " ");

export function executionTable(results: ScenarioResult[]): string {
  const rows = results.map((r) => {
    const warnings = [...new Set(r.turns.flatMap((t) => t.warnings))];
    return `| ${r.test_id} | ${r.title} | ${r.execution_state} | ${r.attempts.length} | ${r.turns.filter((t) => t.agent).length}/${r.turns.length} | ${seconds(r.duration_ms)} | ${cell(r.error ?? warnings.join("; ")) || "-"} |`;
  });
  return ["| Test | Title | Execution state | Attempts | Turns captured | Duration | Errors / warnings |", "|---|---|---|---|---|---|---|", ...rows].join("\n");
}

function scoreFor(result: ScenarioResult, review: Review | undefined): string {
  if (result.execution_state !== "SUCCESS") return "NOT_EXECUTED";
  return review ? review.score : "PENDING_REVIEW";
}

export function correctnessTable(results: ScenarioResult[], reviews: Map<string, Review>): string {
  const rows = results.map((r) => {
    const review = reviews.get(r.test_id);
    const kind = review ? (review.reviewer_kind === "HUMAN" ? "human" : "AI-assisted (provisional)") : "-";
    return `| ${r.test_id} | ${scoreFor(r, review)} | ${kind} | ${r.evaluation.baseline_score ?? "-"} | ${r.evaluation.manual_v1_score ?? "-"} | ${cell(review?.justification ?? "-")} |`;
  });
  return ["| Test | Automated-run correctness | Judged by | Baseline v0 (manual) | v1 (manual, if run) | Evidence-based justification |", "|---|---|---|---|---|---|", ...rows].join("\n");
}

export function correctnessCounts(results: ScenarioResult[], reviews: Map<string, Review>): Record<string, number> {
  const counts: Record<string, number> = { PASS: 0, PARTIAL: 0, FAIL: 0, UNCERTAIN: 0, PENDING_REVIEW: 0, NOT_EXECUTED: 0 };
  for (const r of results) {
    const key = scoreFor(r, reviews.get(r.test_id));
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

export function comparisonSection(results: ScenarioResult[], reviews: Map<string, Review>, refs: ReferenceScores): string {
  const judged = results.filter((r) => ["PASS", "PARTIAL", "FAIL"].includes(scoreFor(r, reviews.get(r.test_id))));
  if (judged.length === 0) return "No automated-run correctness judgments exist yet, so no baseline comparison is made.";
  const order = { FAIL: 0, PARTIAL: 1, PASS: 2 } as const;
  const lines = ["| Test | Baseline v0 | Automated v1 | Change |", "|---|---|---|---|"];
  let improved = 0;
  let regressed = 0;
  for (const r of judged) {
    const base = refs.baseline.get(r.test_id);
    const now = scoreFor(r, reviews.get(r.test_id)) as keyof typeof order;
    let change = "no baseline";
    if (base) {
      change = order[now] > order[base] ? "improved" : order[now] < order[base] ? "REGRESSION" : "unchanged";
      if (change === "improved") improved += 1;
      if (change === "REGRESSION") regressed += 1;
    }
    lines.push(`| ${r.test_id} | ${base ?? "-"} | ${now} | ${change} |`);
  }
  lines.push("", `Compared ${judged.length} judged case(s): ${improved} improved, ${regressed} regressed. Unjudged cases are excluded.`);
  return lines.join("\n");
}

export function runMetadata(summary: RunSummary): string {
  const c = summary.counts;
  return [
    `- Run id: \`${summary.run_id}\``,
    `- Agent configuration label: \`${summary.agent_config_label}\` (research label, not a pinned platform version)`,
    `- Started: ${summary.started_at}; finished: ${summary.finished_at}; total runtime: ${seconds(summary.total_duration_ms)}`,
    `- Planned: ${summary.planned.length}; SUCCESS: ${c.SUCCESS}; INCOMPLETE: ${c.INCOMPLETE}; ERROR: ${c.ERROR}; SKIPPED: ${c.SKIPPED}`,
    `- Environment: Node ${summary.environment.node}, playwright-core ${summary.environment.playwright_core}, ${summary.environment.browser}, browser locale pinned to \`${summary.environment.locale}\` (browser default \`${summary.environment.browser_default_language ?? "unknown"}\`)`,
  ].join("\n");
}

export function renderTemplate(templateFile: string, values: Record<string, string>): string {
  let text = readFileSync(templateFile, "utf-8");
  for (const [key, value] of Object.entries(values)) text = text.split(`{{${key}}}`).join(value);
  const missing = text.match(/\{\{[A-Z_]+\}\}/g);
  if (missing) throw new Error(`Unresolved template placeholders: ${[...new Set(missing)].join(", ")}`);
  return text;
}

export interface RunWithReviews {
  label: string;
  results: ScenarioResult[];
  reviews: Map<string, Review>;
}

/** Descriptive per-case consistency across repeated runs; not a reliability estimate. */
export function stabilityTable(runs: RunWithReviews[]): string {
  const ids = [...new Set(runs.flatMap((run) => run.results.map((r) => r.test_id)))].sort();
  const header = `| Test | ${runs.map((r) => r.label).join(" | ")} | Execution stable | Correctness stable |`;
  const rows = ids.map((id) => {
    const cells = runs.map((run) => {
      const result = run.results.find((r) => r.test_id === id);
      return result ? { state: result.execution_state, score: scoreFor(result, run.reviews.get(id)) } : { state: "MISSING", score: "MISSING" };
    });
    const execStable = new Set(cells.map((c) => c.state)).size === 1;
    const scoreStable = new Set(cells.map((c) => c.score)).size === 1;
    return `| ${id} | ${cells.map((c) => `${c.state} / ${c.score}`).join(" | ")} | ${execStable ? "yes" : "NO"} | ${scoreStable ? "yes" : "NO"} |`;
  });
  return [header, `|---|${runs.map(() => "---|").join("")}---|---|`, ...rows].join("\n");
}
