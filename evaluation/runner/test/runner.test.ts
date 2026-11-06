import assert from "node:assert/strict";
import { test } from "node:test";
import { CompletionTracker, textWarnings, type UiSnapshot } from "../src/completion.js";
import { assertPreviewUrl } from "../src/previewUi.js";
import { parseScenarios, selectScenarios } from "../src/scenarios.js";
import { countStates, parseReviews, validateScenarioResult } from "../src/results.js";
import { comparisonSection, correctnessCounts, stabilityTable } from "../src/report.js";
import type { Review, ScenarioResult } from "../src/types.js";

const scenarioJson = {
  scenarios: [
    { id: "T001", title: "a", category: "c", rule_ids: [], source_ids: [], user_turns: ["one", "two"], expected_behaviour: ["x"], critical_failures: ["y"] },
    { id: "T002", title: "b", category: "c", rule_ids: [], source_ids: [], user_turns: ["three", "four"], expected_behaviour: [], critical_failures: [] },
  ],
};

test("parseScenarios keeps exact user turns and rejects bad input", () => {
  const scenarios = parseScenarios(scenarioJson);
  assert.deepEqual(scenarios[0]?.user_turns, ["one", "two"]);
  assert.throws(() => parseScenarios({ scenarios: [{ ...scenarioJson.scenarios[0], user_turns: ["only one"] }] }), /two user turns/);
  assert.throws(() => parseScenarios({ scenarios: [scenarioJson.scenarios[0], scenarioJson.scenarios[0]] }), /duplicate/);
});

test("selectScenarios resolves ids case-insensitively and rejects unknown ids", () => {
  const scenarios = parseScenarios(scenarioJson);
  assert.deepEqual(selectScenarios(scenarios, ["t002"]).map((s) => s.id), ["T002"]);
  assert.equal(selectScenarios(scenarios, "all").length, 2);
  assert.throws(() => selectScenarios(scenarios, ["T999"]), /Unknown test id/);
});

const snap = (over: Partial<UiSnapshot>): UiSnapshot => ({ railTurns: 3, pending: false, busy: false, responseText: "new answer", ...over });

test("CompletionTracker needs ack, idle UI, new text and a stable window", () => {
  const tracker = new CompletionTracker({ railTurnsAfterSend: 3, previousResponseText: "old answer", stableMs: 1000 });
  assert.equal(tracker.observe(snap({ railTurns: 2 }), 0), "awaiting-send-ack");
  assert.equal(tracker.observe(snap({ responseText: "old answer" }), 100), "generating");
  assert.equal(tracker.observe(snap({ pending: true }), 200), "generating");
  assert.equal(tracker.observe(snap({ busy: true }), 300), "generating");
  assert.equal(tracker.observe(snap({}), 400), "settling");
  assert.equal(tracker.observe(snap({}), 1000), "settling");
  assert.equal(tracker.observe(snap({ responseText: "new answer, longer" }), 1200), "settling");
  assert.equal(tracker.observe(snap({ responseText: "new answer, longer" }), 2300), "complete");
});

test("textWarnings flags short or unterminated text", () => {
  assert.ok(textWarnings("Too short").length > 0);
  assert.deepEqual(textWarnings("This is a complete answer that ends properly and is long enough to pass."), []);
  assert.ok(textWarnings("This answer is long enough but stops in the middle of a sente").some((w) => /truncation/.test(w)));
});

test("assertPreviewUrl accepts the standalone preview and refuses the Builder", () => {
  const url = assertPreviewUrl("https://abc-preview.run.agentplace.io/agent/abc/preview?agent_session_id=1#2");
  assert.equal(url.search, "");
  assert.throws(() => assertPreviewUrl("https://agentplace.io/admin/dashboard/abc/preview?role=builder"), /Builder/);
  assert.throws(() => assertPreviewUrl("http://abc-preview.run.agentplace.io/agent/abc/preview"), /Refusing/);
});

function makeResult(over: Partial<ScenarioResult> = {}): ScenarioResult {
  const turn = (n: number, user: string) => ({ turn: n, user, agent: "reply", links: [], started_at: "", completed_at: "", duration_ms: 1, warnings: [] });
  return {
    schema_version: "1.0.0", test_id: "T001", title: "t", run_id: "r", agent_config_label: "l", execution_state: "SUCCESS",
    started_at: "", finished_at: "", duration_ms: 1, isolation: { fresh_session_verified: true, session_id_hash: "h" },
    turns: [turn(1, "one"), turn(2, "two")], error: null, attempts: [],
    evaluation: { correctness: "PENDING_REVIEW", note: "", expected_behaviour: [], critical_failures: [], baseline_score: "PASS", manual_v1_score: null },
    ...over,
  };
}

test("validateScenarioResult accepts a complete result and flags deviations", () => {
  assert.deepEqual(validateScenarioResult(makeResult(), ["one", "two"]), []);
  assert.ok(validateScenarioResult(makeResult(), ["one", "changed"]).some((p) => /differs/.test(p)));
  assert.ok(validateScenarioResult(makeResult({ turns: [makeResult().turns[0]!] }), ["one", "two"]).length > 0);
  assert.ok(validateScenarioResult(makeResult({ isolation: { fresh_session_verified: false, session_id_hash: null } }), ["one", "two"]).length > 0);
  assert.deepEqual(validateScenarioResult(makeResult({ execution_state: "ERROR" }), ["one", "two"]), []);
});

test("countStates counts every execution state", () => {
  assert.deepEqual(countStates(["SUCCESS", "SUCCESS", "ERROR"]), { SUCCESS: 2, ERROR: 1, INCOMPLETE: 0, SKIPPED: 0 });
});

test("parseReviews validates scores and reviewer kind", () => {
  const ok = { test_id: "T001", score: "PASS", reviewer: "x", reviewer_kind: "AI_ASSISTED", reviewed_on: "2026-11-06", justification: "evidence" };
  assert.equal(parseReviews({ reviews: [ok] }).length, 1);
  assert.throws(() => parseReviews({ reviews: [{ ...ok, score: "GOOD" }] }), /invalid score/);
  assert.throws(() => parseReviews({ reviews: [{ ...ok, reviewer_kind: "BOT" }] }), /reviewer_kind/);
});

test("report keeps unreviewed results PENDING_REVIEW and compares only judged cases", () => {
  const results = [makeResult({ test_id: "T001" }), makeResult({ test_id: "T002" })];
  const review: Review = { test_id: "T001", score: "PARTIAL", reviewer: "x", reviewer_kind: "HUMAN", reviewed_on: "d", justification: "j" };
  const reviews = new Map([["T001", review]]);
  assert.deepEqual(correctnessCounts(results, reviews), { PASS: 0, PARTIAL: 1, FAIL: 0, UNCERTAIN: 0, PENDING_REVIEW: 1, NOT_EXECUTED: 0 });
  const comparison = comparisonSection(results, reviews, { baseline: new Map([["T001", "PASS"]]), manualV1: new Map() });
  assert.match(comparison, /REGRESSION/);
  assert.doesNotMatch(comparison, /T002/);
});

test("stabilityTable flags cases whose state or score differs between runs", () => {
  const rev = (score: Review["score"]): Review => ({ test_id: "T001", score, reviewer: "x", reviewer_kind: "AI_ASSISTED", reviewed_on: "d", justification: "j" });
  const runs = [
    { label: "a", results: [makeResult()], reviews: new Map([["T001", rev("PASS")]]) },
    { label: "b", results: [makeResult()], reviews: new Map([["T001", rev("PARTIAL")]]) },
  ];
  const table = stabilityTable(runs);
  assert.match(table, /\| T001 \| SUCCESS \/ PASS \| SUCCESS \/ PARTIAL \| yes \| NO \|/);
});