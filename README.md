# Reliable Agent Evaluation

A public, evidence-based case study of evaluating an AI agent against structured business rules. The case study is a **non-official BKK (Budapest transport) fare information assistant** built on Agentplace. It is **not affiliated with or endorsed by BKK or Agentplace**.

## Status at a glance (2026-11-06)

| Stage | Result | Judged by |
|---|---|---|
| Baseline v0, 20 two-turn cases (manual) | 17 PASS, 3 PARTIAL, 0 FAIL | human |
| Candidate v1 (knowledge-only change), T005 / T017 / T018 (manual) | PARTIAL → PASS each | human |
| Candidate v1, all 20 cases, automated, 3 runs | 60/60 executions complete, 60/60 PASS, identical per case | **AI-assisted, author-reviewed** |
| Candidate v1, 5 held-out cases, automated, 1 run | 2 PASS, 2 PARTIAL, 1 FAIL | **AI-assisted, author-reviewed** |

- **Agent:** [Budapest Fare Advisor — Unofficial Demo](https://sudk3zosa1zp.run.agentplace.io/), Luna model per the project record, **public Agentplace demo** (public URL provided at publication on 2026-11-06). No immutable platform version ID exists: `baseline-v0` and `candidate-v1` are research labels, and the v1 deployment is Builder-reported (not independently inspected).
- **Main reading:** the targeted fix worked and no regression was observed, but the held-out set exposed knowledge-coverage gaps and one materially wrong answer (H004). One sample per case is not a reliability rate, and nothing was verified against live BKK pages.
- **Try the public demo:** [Open the Budapest Fare Advisor](https://sudk3zosa1zp.run.agentplace.io/). It is a dated, unofficial demonstration, not a live BKK fare or ticketing service. The public link was provided after the recorded candidate-v1 evaluation; accessibility has not been independently verified here.
- **Start here:** [final evaluation](reports/final-evaluation-2026-11-06.md) (full analysis) and [submission summary](reports/submission-summary.md) (one page).

## Where things are

| What | Where |
|---|---|
| Independent rule model, 14 sources, dated fares | [rules.json](case_studies/bkk/knowledge/rules.json), [sources.csv](case_studies/bkk/sources.csv), [fares.snapshot.json](case_studies/bkk/fares.snapshot.json) |
| Test specifications (never edited after first execution) | [baseline-cases.json](tests/baseline-cases.json) (20), [heldout-cases.json](tests/heldout-cases.json) (5), [method](tests/README.md) |
| Agent inputs | [builder brief](agentplace/builder-brief.md), [knowledge v0](agentplace/knowledge-v0.md), [knowledge v1](agentplace/knowledge-v1.md), [baseline manifest](agentplace/baseline-manifest.json), [v1 deployment record](agentplace/v1-deployment-record.json), [v1 change plan](agentplace/v1-change-plan.md) |
| Baseline (manual) | [baseline report](reports/baseline-v0-2026-11-06.md), [run file](results/baseline-v0.run.json), `results/T0xx.baseline.json` |
| Targeted v1 retests (manual) | [T005](results/T005.v1.json), [T017](results/T017.v1.json), [T018](results/T018.v1.json) |
| Automated regression (3 runs) | [report](reports/v1-automated-regression.md), `results/automated/candidate-v1-regression-*` (each with `reviews.json`; run 1 also has `reviews.second-pass.json`) |
| Held-out evaluation | [results/automated/candidate-v1-heldout-20261106](results/automated/candidate-v1-heldout-20261106/) |
| Earlier proof-of-concept runs (kept for transparency) | `results/automated/candidate-v1-poc-T001` (browser locale hu-HU), `candidate-v1-poc2-T001-en` |
| Runner source and tests | [evaluation/runner](evaluation/runner/) |
| Background | [architecture](docs/architecture.md), [learning path](docs/learning-path.md), [rule modeling](docs/rule-modeling.md) |

## Method in brief

1. Register official sources and write conditional rules independently of the agent.
2. Write 20 two-turn scenarios with expected behaviour and critical failures **before** testing; reserve 5 more as held-out.
3. Run a baseline in fresh conversations; classify failures (T005 product taxonomy, T017/T018 missing knowledge).
4. Make a knowledge-only change (v1) and re-test; run all 20 again, now automated, plus two repetitions.
5. Run the held-out cases once on the frozen candidate; no agent change afterwards.
6. Keep execution state (SUCCESS/ERROR/INCOMPLETE/SKIPPED) separate from correctness (PASS/PARTIAL/FAIL/UNCERTAIN) and label every judgment human or AI-assisted.

## Automated runner (TypeScript + Playwright)

`evaluation/runner/` drives the **standalone Agentplace Preview**, plays both turns of each scenario in a fresh session, and stores verbatim replies and links. It never opens the Builder chat and never changes the agent. Correctness is not scored by the runner (`PENDING_REVIEW`); judgments live in separate `reviews.json` files.

### Quick start (Windows/PowerShell, Node 20+, Chrome or Edge)

```powershell
npm install                       # playwright-core, typescript, tsx (no browser download)
npm run browser                   # Chrome with a dedicated profile in .auth/ (git-ignored); sign in to Agentplace once, keep it open
# Dashboard: "Open draft preview" -> "Open in tab"; copy the URL (https://<id>-preview.run.agentplace.io/agent/<id>/preview)
$env:AGENTPLACE_PREVIEW_URL = "<that URL>"
npm run run:t001                  # one scenario
npm run run:all                   # all 20 baseline scenarios, sequential
npx tsx evaluation/runner/src/cli.ts run --suite heldout --allow-heldout --all --run-id <id>   # held-out suite (guarded)
npx tsx evaluation/runner/src/cli.ts run --all --resume <run-id>                                # continue an interrupted run
npx tsx evaluation/runner/src/cli.ts validate --run results/automated/<run-id>
npx tsx evaluation/runner/src/cli.ts report --run results/automated/<run-id>
npx tsx evaluation/runner/src/cli.ts stability --run results/automated/<a>,results/automated/<b>
npm test; npm run typecheck
python evaluation/validate_scenarios.py; python evaluation/validate_rules.py
```

Options: `--tests T001,T005`, `--skip T003`, `--timeout 120` (seconds per turn), `--retries 1`, `--locale en-US`, `--out DIR`, `--label candidate-v1`.

| Module | Responsibility |
|---|---|
| `scenarios.ts` | load and validate scenario JSON |
| `browser.ts` | start a normal browser; attach over CDP and reuse the signed-in session |
| `previewUi.ts` | all Preview DOM knowledge: new tab, send, wait, capture |
| `completion.ts` | pure completion logic (turn registered, composer idle, nothing busy, new text stable) |
| `runner.ts` | orchestration, retries (every attempt recorded), resume, isolation checks |
| `results.ts`, `baseline.ts`, `report.ts` | result files, validation, read-only reference scores, tables |

- **Isolation:** a new tab means a new Preview session; the runner requires a welcome-only history, an unseen session id (stored as a SHA-256 prefix) and an unchanged id between turns.
- **Completion:** no fixed sleeps; DOM state only.
- **Locale:** the Preview forwards the browser language to the agent (`hu-HU` produced Hungarian answers to English prompts), so the runner pins `en-US`.
- **Output:** `results/automated/<run-id>/` holds `T0xx.json` / `H0xx.json`, `run.json`, `events.jsonl`; failure screenshots go to a git-ignored folder. Manual results in `results/` are never modified.
- **Authentication:** the browser profile in `.auth/` is git-ignored; nothing credential-like is written to results.

## Limitations

- One to three samples per case; LLM output varies. No statistical reliability claim.
- Automated PASS/PARTIAL/FAIL were first assessed by an AI reviewer and then personally reviewed and confirmed by the project author on 2026-11-06. Original AI attribution is retained; borderline cases and limitations are documented.
- Fare and policy data are a 2026-11-05 snapshot (plus a Builder-reported 2026-11-06 cross-check); nothing was verified live.
- The Preview DOM may change and break selectors.
- The held-out cases are public: held out from tuning, not secret.

## Responsible use

An independent educational project. It cannot sell tickets, reserve journeys or guarantee fares or eligibility. Verify travel information against current official BKK sources. No confidential material, real customer data or unlicensed copies of website content belong in this repository.

## License

No open-source license has been selected yet. Repository visibility alone does not grant redistribution rights.
