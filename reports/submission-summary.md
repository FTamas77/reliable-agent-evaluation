# Submission summary — Reliable evaluation of an Agentplace fare-advisor agent

**Public agent URL:** [Budapest Fare Advisor — Unofficial Demo](https://sudk3zosa1zp.run.agentplace.io/) · **Repository:** https://github.com/FTamas77/reliable-agent-evaluation

## Problem and agent

Fare rules for Budapest public transport are conditional (which pass, which airport bus, which time window, which student ID). A chat agent can sound right while applying a rule wrongly. I built an **independent, unofficial** "Budapest Fare Advisor" on Agentplace (Luna model per the project record; no affiliation with BKK or Agentplace) and treated the real work as *evaluating it reliably*, not just building it.

## Evaluation approach

- A rule model (22 conditional rules, 14 dated sources) written separately from the agent's knowledge, used only as the grader's oracle.
- 20 two-turn conversations written before any run (turn 2 reveals a missing fact or challenges the first answer), plus 5 held-out conversations kept unexecuted until the candidate was frozen.
- Execution state (did the run complete) is kept separate from correctness (PASS / PARTIAL / FAIL), and every judgment is labelled human or AI-assisted.

## Results

| Stage | Result | Judge |
|---|---|---|
| Baseline v0, 20 cases | 17 PASS, 3 PARTIAL, 0 FAIL | human |
| Knowledge-only v1, 3 targeted cases | T005, T017, T018: PARTIAL → PASS | human |
| v1 automated regression, 20 cases × 3 runs | 60/60 executed, 60/60 PASS, identical per case | AI-assisted, author-reviewed |
| v1 held-out, 5 cases, one run | 2 PASS, 2 PARTIAL, **1 FAIL** | AI-assisted, author-reviewed |

The targeted fix worked and no regression was observed. The held-out set is the more informative result: it exposed knowledge-coverage gaps (under-14 student entitlement, paper-ticket refund fee) and one materially wrong answer, where the agent asserted that ordinary single tickets have no time limit (H004) instead of asking day vs night. These failures are reported as measured; the agent was not changed afterwards. A future v2 would add the missing rules and be compared on both sets.

## Engineering contribution

A TypeScript + Playwright runner drives the real Agentplace Preview: one fresh session per scenario, exact message text, response-completion detection from DOM state (no fixed sleeps), verbatim transcripts and links, retries recorded, resume, result validation, report generation, and a held-out guard. Authentication reuses a locally signed-in Chrome profile that is never committed. It also surfaced a real confound: the browser locale is forwarded to the agent, and a `hu-HU` browser produced Hungarian answers to English prompts, so the runner pins `en-US`.

## Key limitations

No immutable Agentplace version ID (labels are research labels; the v1 deployment is Builder-reported and uninspected). One to three samples per case, LLM output varies. Automated judgments were initially made by an AI assistant and subsequently personally reviewed and confirmed by the project author. Original reviewer attribution is preserved; some held-out calls remain borderline. Facts come from a 2026-11-05 snapshot and were not verified against live BKK pages. The held-out cases are public, so they are held out from tuning, not secret.

## Evidence

- Technical report: [reports/final-evaluation-2026-11-06.md](final-evaluation-2026-11-06.md)
- Held-out run and reviews: [results/automated/candidate-v1-heldout-20261106/](../results/automated/candidate-v1-heldout-20261106/)
- Regression runs: [results/automated/](../results/automated/) (`candidate-v1-regression-*`)
- Baseline report: [reports/baseline-v0-2026-11-06.md](baseline-v0-2026-11-06.md)
- Runner and README quick start: [evaluation/runner/](../evaluation/runner/), [README.md](../README.md)

_The public agent URL was provided after evaluation (2026-11-06). The public demo was not independently retested after publication. Submission to Agentplace remains a separate manual step._
