import { mkdirSync, appendFileSync, readFileSync } from "node:fs";
import path from "node:path";
import type { BrowserContext } from "playwright-core";
import { PreviewConversation, assertPreviewUrl, type UiTimeouts } from "./previewUi.js";
import { countStates, loadScenarioResults, shortHash, validateScenarioResult, writeJson } from "./results.js";
import type { ReferenceScores } from "./baseline.js";
import type { Attempt, ExecutionState, RunSummary, Scenario, ScenarioResult, TurnRecord } from "./types.js";

export interface RunOptions {
  runId: string;
  outDir: string;
  suite: string;
  agentConfigLabel: string;
  previewUrl: string;
  timeouts: UiTimeouts;
  retries: number;
  resume: boolean;
  scenarios: Scenario[];
  skip: Set<string>;
  references: ReferenceScores;
  environment: RunSummary["environment"];
  log?: (message: string) => void;
}

export async function runSuite(context: BrowserContext, options: RunOptions): Promise<RunSummary> {
  const log = options.log ?? console.log;
  const previewUrl = assertPreviewUrl(options.previewUrl);
  mkdirSync(options.outDir, { recursive: true });
  const event = (type: string, data: Record<string, unknown>) =>
    appendFileSync(path.join(options.outDir, "events.jsonl"), JSON.stringify({ at: new Date().toISOString(), type, ...data }) + "\n");

  const existing = new Map(loadScenarioResults(options.outDir).map((result) => [result.test_id, result]));
  const seenSessions = new Set(
    [...existing.values()].flatMap((result) => result.attempts.map((attempt) => attempt.session_id_hash).filter((h): h is string => h !== null)),
  );
  const runStart = new Date();
  const summaryEntries: RunSummary["results"] = [];
  const notes: string[] = [];

  for (const [index, scenario] of options.scenarios.entries()) {
    const label = `[${index + 1}/${options.scenarios.length}] ${scenario.id}`;
    const file = `${scenario.id}.json`;
    const previous = existing.get(scenario.id);
    if (options.resume && previous?.execution_state === "SUCCESS") {
      log(`${label} already SUCCESS in this run directory - reusing (resume)`);
      summaryEntries.push({ test_id: scenario.id, execution_state: "SUCCESS", duration_ms: previous.duration_ms, file });
      continue;
    }
    if (options.skip.has(scenario.id)) {
      const skipped = skippedResult(scenario, options);
      writeJson(path.join(options.outDir, file), skipped);
      summaryEntries.push({ test_id: scenario.id, execution_state: "SKIPPED", duration_ms: 0, file });
      log(`${label} SKIPPED (requested)`);
      continue;
    }

    const attempts: Attempt[] = previous?.attempts ? [...previous.attempts] : [];
    const scenarioStart = new Date();
    for (let n = 0; n <= options.retries; n += 1) {
      const attemptNo = attempts.length + 1;
      log(`${label} "${scenario.title}" - attempt ${attemptNo}`);
      const attempt = await runAttempt(context, previewUrl, scenario, attemptNo, options, seenSessions, log);
      attempts.push(attempt);
      event("attempt", { test_id: scenario.id, attempt: attemptNo, state: attempt.state, duration_ms: attempt.duration_ms, error: attempt.error });
      if (attempt.state === "SUCCESS") break;
      log(`${label} attempt ${attemptNo} ended ${attempt.state}: ${attempt.error ?? ""}`);
    }
    const last = attempts[attempts.length - 1]!;
    const result = buildResult(scenario, options, attempts, scenarioStart, last);
    const problems = validateScenarioResult(result, scenario.user_turns);
    if (problems.length > 0) {
      result.execution_state = "ERROR";
      result.error = problems.join("; ");
    }
    writeJson(path.join(options.outDir, file), result);
    summaryEntries.push({ test_id: scenario.id, execution_state: result.execution_state, duration_ms: result.duration_ms, file });
    log(`${label} ${result.execution_state} in ${(result.duration_ms / 1000).toFixed(1)} s`);
  }

  const finished = new Date();
  const summary: RunSummary = {
    schema_version: "1.0.0",
    run_id: options.runId,
    agent_config_label: options.agentConfigLabel,
    suite: options.suite,
    started_at: runStart.toISOString(),
    finished_at: finished.toISOString(),
    total_duration_ms: finished.getTime() - runStart.getTime(),
    environment: options.environment,
    agent_preview_url_hash: shortHash(options.previewUrl),
    planned: options.scenarios.map((s) => s.id),
    counts: countStates(summaryEntries.map((entry) => entry.execution_state)),
    results: summaryEntries,
    notes,
  };
  writeJson(path.join(options.outDir, "run.json"), summary);
  return summary;
}

async function runAttempt(
  context: BrowserContext,
  previewUrl: URL,
  scenario: Scenario,
  attemptNo: number,
  options: RunOptions,
  seenSessions: Set<string>,
  log: (message: string) => void,
): Promise<Attempt> {
  const started = Date.now();
  const startedAt = new Date(started).toISOString();
  const turns: TurnRecord[] = [];
  let conversation: PreviewConversation | null = null;
  let sessionHash: string | null = null;
  let error: string | null = null;
  let screenshot: string | null = null;
  try {
    conversation = await PreviewConversation.open(context, previewUrl, options.timeouts);
    sessionHash = shortHash(conversation.sessionId);
    if (seenSessions.has(sessionHash)) throw new Error("Session id was already used by another attempt; isolation cannot be guaranteed");
    seenSessions.add(sessionHash);
    for (const [i, message] of scenario.user_turns.entries()) {
      const record: TurnRecord = { turn: i + 1, user: message, agent: null, links: [], started_at: new Date().toISOString(), completed_at: null, duration_ms: null, warnings: [] };
      turns.push(record);
      const capture = await conversation.sendTurn(message);
      Object.assign(record, { agent: capture.agent, links: capture.links, started_at: capture.startedAt, completed_at: capture.completedAt, duration_ms: capture.durationMs, warnings: capture.warnings });
      log(`    turn ${i + 1}: ${capture.agent.length} chars in ${(capture.durationMs / 1000).toFixed(1)} s${capture.warnings.length ? " (warnings: " + capture.warnings.join("; ") + ")" : ""}`);
    }
  } catch (caught) {
    error = caught instanceof Error ? caught.message : String(caught);
    if (conversation) {
      const shot = path.join(options.outDir, "screenshots", `${scenario.id}.attempt${attemptNo}.png`);
      mkdirSync(path.dirname(shot), { recursive: true });
      await conversation.screenshot(shot).then(() => (screenshot = path.relative(options.outDir, shot)), () => undefined);
    }
  } finally {
    await conversation?.close();
  }
  const completed = turns.filter((t) => t.agent !== null).length;
  const state: ExecutionState = error === null ? "SUCCESS" : completed > 0 ? "INCOMPLETE" : "ERROR";
  return { attempt: attemptNo, state, started_at: startedAt, duration_ms: Date.now() - started, session_id_hash: sessionHash, turns, error, screenshot };
}

function evaluationStub(scenario: Scenario, options: RunOptions): ScenarioResult["evaluation"] {
  return {
    correctness: "PENDING_REVIEW",
    note: "Execution state is not a correctness score. Assess the transcript against expected_behaviour and critical_failures.",
    expected_behaviour: scenario.expected_behaviour,
    critical_failures: scenario.critical_failures,
    baseline_score: options.references.baseline.get(scenario.id) ?? null,
    manual_v1_score: options.references.manualV1.get(scenario.id) ?? null,
  };
}

function buildResult(scenario: Scenario, options: RunOptions, attempts: Attempt[], start: Date, last: Attempt): ScenarioResult {
  const finished = new Date();
  return {
    schema_version: "1.0.0",
    test_id: scenario.id,
    title: scenario.title,
    run_id: options.runId,
    agent_config_label: options.agentConfigLabel,
    execution_state: last.state,
    started_at: start.toISOString(),
    finished_at: finished.toISOString(),
    duration_ms: finished.getTime() - start.getTime(),
    isolation: { fresh_session_verified: last.state === "SUCCESS" && last.session_id_hash !== null, session_id_hash: last.session_id_hash },
    turns: last.turns,
    error: last.error,
    attempts,
    evaluation: evaluationStub(scenario, options),
  };
}

function skippedResult(scenario: Scenario, options: RunOptions): ScenarioResult {
  const now = new Date().toISOString();
  return {
    schema_version: "1.0.0",
    test_id: scenario.id,
    title: scenario.title,
    run_id: options.runId,
    agent_config_label: options.agentConfigLabel,
    execution_state: "SKIPPED",
    started_at: now,
    finished_at: now,
    duration_ms: 0,
    isolation: { fresh_session_verified: false, session_id_hash: null },
    turns: [],
    error: null,
    attempts: [],
    evaluation: evaluationStub(scenario, options),
  };
}

export function readInstalledVersion(pkg: string): string {
  try {
    return (JSON.parse(readFileSync(path.resolve("node_modules", pkg, "package.json"), "utf-8")) as { version: string }).version;
  } catch {
    return "unknown";
  }
}
