import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { DEFAULT_CDP_PORT, DEFAULT_PROFILE_DIR, connectToBrowser, launchBrowserForLogin } from "./browser.js";
import { loadReferenceScores } from "./baseline.js";
import { comparisonSection, correctnessCounts, correctnessTable, executionTable, renderTemplate, runMetadata } from "./report.js";
import { loadRunSummary, loadScenarioResults, parseReviews, readJson, validateScenarioResult } from "./results.js";
import { readInstalledVersion, runSuite } from "./runner.js";
import { loadScenarios, selectScenarios } from "./scenarios.js";
import type { Review } from "./types.js";

const START_URL = "https://agentplace.io/admin/dashboard";
const SUITES: Record<string, string> = { baseline: "tests/baseline-cases.json", heldout: "tests/heldout-cases.json" };
const RUNS_DIR = path.join("results", "automated");

const OPTIONS = {
  port: { type: "string", default: String(DEFAULT_CDP_PORT) },
  profile: { type: "string", default: DEFAULT_PROFILE_DIR },
  headless: { type: "boolean", default: false },
  tests: { type: "string" },
  all: { type: "boolean", default: false },
  skip: { type: "string", default: "" },
  suite: { type: "string", default: "baseline" },
  "allow-heldout": { type: "boolean", default: false },
  "agent-url": { type: "string" },
  label: { type: "string", default: "candidate-v1" },
  timeout: { type: "string", default: "120" },
  locale: { type: "string", default: "en-US" },
  "stable-ms": { type: "string", default: "2000" },
  retries: { type: "string", default: "1" },
  out: { type: "string" },
  "run-id": { type: "string" },
  resume: { type: "string" },
  run: { type: "string" },
  reviews: { type: "string" },
  template: { type: "string", default: "reports/v1-automated-regression.template.md" },
  help: { type: "boolean", default: false },
} as const;

const USAGE = `Usage: tsx evaluation/runner/src/cli.ts <command> [options]
  browser [--headless]                  start the dedicated, logged-in browser (sign in to Agentplace once)
  run --tests T001,T002 | --all         execute scenarios (needs --agent-url or AGENTPLACE_PREVIEW_URL)
      [--timeout 120] [--retries 1] [--out DIR] [--resume RUN_ID_OR_DIR] [--skip T003] [--label candidate-v1]
  validate --run DIR                    re-check every SUCCESS result against the scenario file
  report --run DIR [--reviews FILE] [--out FILE]   render the Markdown report`;

type Values = ReturnType<typeof parseArgs<{ options: typeof OPTIONS }>>["values"];

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);
  const { values } = parseArgs({ args: rest, options: OPTIONS });
  if (!command || values.help) return void console.log(USAGE);
  const port = Number(values.port);
  switch (command) {
    case "browser": {
      const exe = launchBrowserForLogin({ profileDir: path.resolve(values.profile), port, startUrl: START_URL, headless: values.headless });
      console.log(`Started ${exe} (debug port ${port}). Sign in to Agentplace in that window and leave it open.`);
      return;
    }
    case "run":
      return runCommand(values, port);
    case "validate":
      return validateCommand(values);
    case "report":
      return reportCommand(values);
    default:
      throw new Error(`Unknown command: ${command}\n${USAGE}`);
  }
}

function timestampId(): string {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "").replace("T", "-");
}

async function runCommand(values: Values, port: number): Promise<void> {
  const previewUrl = values["agent-url"] ?? process.env["AGENTPLACE_PREVIEW_URL"];
  if (!previewUrl) throw new Error("Preview URL missing: pass --agent-url or set AGENTPLACE_PREVIEW_URL (standalone Preview, https://<id>-preview.run.agentplace.io/agent/<id>/preview).");
  const suiteFile = SUITES[values.suite];
  if (!suiteFile) throw new Error(`Unknown suite ${values.suite}`);
  if (values.suite === "heldout" && !values["allow-heldout"]) {
    throw new Error("The held-out suite is reserved for the final evaluation stage. Pass --allow-heldout only when that stage is reached.");
  }
  if (!values.all && !values.tests) throw new Error("Choose scenarios with --tests T001,T002 or --all");
  const all = loadScenarios(suiteFile);
  const scenarios = selectScenarios(all, values.all ? "all" : values.tests!.split(",").map((id) => id.trim()).filter(Boolean));
  const skip = new Set(values.skip.split(",").map((id) => id.trim().toUpperCase()).filter(Boolean));

  let outDir: string;
  let runId: string;
  if (values.resume) {
    outDir = existsSync(values.resume) ? values.resume : path.join(RUNS_DIR, values.resume);
    if (!existsSync(path.join(outDir, "run.json")) && loadScenarioResults(outDir).length === 0) throw new Error(`Nothing to resume in ${outDir}`);
    runId = path.basename(path.resolve(outDir));
  } else {
    runId = values["run-id"] ?? `${values.label}-${timestampId()}`;
    outDir = values.out ?? path.join(RUNS_DIR, runId);
    if (existsSync(outDir) && loadScenarioResults(outDir).length > 0) throw new Error(`${outDir} already contains results; use --resume or another --out/--run-id (existing evidence is never overwritten).`);
  }

  const { browser, context } = await connectToBrowser(`http://127.0.0.1:${port}`);
  try {
    const probe = await context.newPage();
    const navigatorLanguage = await probe.evaluate(() => navigator.language).catch(() => null);
    await probe.close();
    console.log(`Run ${runId}: ${scenarios.length} scenario(s), output ${outDir}`);
    const summary = await runSuite(context, {
      runId,
      outDir,
      suite: values.suite,
      agentConfigLabel: values.label,
      previewUrl,
      timeouts: { loadMs: 60_000, turnMs: Number(values.timeout) * 1000, stableMs: Number(values["stable-ms"]), pollMs: 250, locale: values.locale },
      retries: Number(values.retries),
      resume: Boolean(values.resume),
      scenarios,
      skip,
      references: loadReferenceScores("results"),
      environment: { node: process.version, playwright_core: readInstalledVersion("playwright-core"), browser: `Chromium ${browser.version()} (attached over CDP)`, locale: values.locale, browser_default_language: navigatorLanguage },
    });
    console.log(`Done in ${(summary.total_duration_ms / 1000).toFixed(0)} s: ${JSON.stringify(summary.counts)}`);
    if (summary.counts.ERROR + summary.counts.INCOMPLETE > 0) process.exitCode = 2;
  } finally {
    await browser.close();
  }
}

function validateCommand(values: Values): void {
  if (!values.run) throw new Error("--run DIR required");
  const summary = loadRunSummary(values.run);
  const scenarios = new Map(loadScenarios(SUITES[summary.suite] ?? SUITES["baseline"]!).map((s) => [s.id, s]));
  const results = loadScenarioResults(values.run);
  const problems = results.flatMap((r) => validateScenarioResult(r, scenarios.get(r.test_id)?.user_turns ?? []));
  const sessions = results.filter((r) => r.execution_state === "SUCCESS").map((r) => r.isolation.session_id_hash);
  if (new Set(sessions).size !== sessions.length) problems.push("two scenarios share one session id");
  if (problems.length > 0) throw new Error(`Validation failed:\n- ${problems.join("\n- ")}`);
  console.log(`OK: ${sessions.length} SUCCESS result(s) valid, all sessions distinct.`);
}

function reportCommand(values: Values): void {
  if (!values.run) throw new Error("--run DIR required");
  const summary = loadRunSummary(values.run);
  const results = loadScenarioResults(values.run);
  const reviewsFile = values.reviews ?? path.join(values.run, "reviews.json");
  const reviews = new Map<string, Review>(existsSync(reviewsFile) ? parseReviews(readJson(reviewsFile)).map((r) => [r.test_id, r]) : []);
  const counts = correctnessCounts(results, reviews);
  const text = renderTemplate(values.template, {
    RUN_METADATA: runMetadata(summary),
    EXECUTION_TABLE: executionTable(results),
    CORRECTNESS_COUNTS: Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join(", "),
    CORRECTNESS_TABLE: correctnessTable(results, reviews),
    COMPARISON: comparisonSection(results, reviews, loadReferenceScores("results")),
  });
  const out = values.out ?? "reports/v1-automated-regression.md";
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, text, "utf-8");
  console.log(`Report written to ${out}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
