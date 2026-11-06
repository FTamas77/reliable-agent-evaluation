# Reliable Agent Evaluation

A public, evidence-based case study of evaluating an AI agent against structured business rules. Initial case study: a **non-official BKK fare information assistant**, built on Agentplace.

## Goal

Build an agent, test at least 20 realistic multi-turn conversations, identify failure modes, improve the agent, and compare **baseline** and **improved** versions using the same test set. Add a small held-out set to check whether improvements generalise.

## What this repository contains

- `case_studies/bkk/`: source register and independently written knowledge notes (to be collected and checked)
- `tests/`: structured test scenario templates and expected behaviours
- `results/`: templates for captured test runs (no invented scores)
- `evaluation/`: a small dependency-free Python script to summarise manually scored runs
- `docs/`: architecture and step-by-step learning plan

## Workflow

1. **Collect evidence:** register official sources, the date checked and their applicability.
2. **Create an Agentplace agent:** configure instructions and source-backed knowledge; publish a clearly labelled demo.
3. **Freeze tests:** define 20+ realistic conversations and observable pass/fail criteria *before* testing.
4. **Baseline:** run each conversation from a fresh state and record actual outputs.
5. **Improve:** classify failures and make targeted changes to instructions or knowledge.
6. **Re-test:** rerun the same tests and evaluate a few withheld scenarios.
7. **Report:** publish methods, limitations, results and the public agent link.

See [architecture](docs/architecture.md) and the [learning plan](docs/learning-path.md).

## Quick start

```bash
python evaluation/summarize.py results/run.example.json
```

This demonstrates the result file format using illustrative example statuses, **not measured results**. Replace them only after actual tests.

## Responsible use

This is an independent educational evaluation project. It is **not affiliated with or endorsed by BKK or Agentplace**. It cannot sell tickets, reserve journeys, or guarantee fares or eligibility. Verify all travel-related information against current official sources. No workplace confidential materials, real customer data, or unlicensed copies of website content belong in this repository.

## License

No open-source license has been selected yet. Repository visibility alone does not grant redistribution rights. A license can be added before inviting contributors.

## Evidence-based knowledge model

As of 2026-11-05, the first BKK case study includes **22 conditional rules**, **14 reviewed official source links**, **9 dated fare values**, and **16 unexecuted stress-test sketches**. These artefacts are for experiment design; they do **not** represent tested agent quality.

- [Rule model](case_studies/bkk/knowledge/rules.json) and [how to read it](case_studies/bkk/knowledge/README.md)
- [Source register](case_studies/bkk/sources.csv) and [dated fare snapshot](case_studies/bkk/fares.snapshot.json)
- [How to model business rules](docs/rule-modeling.md)
- [Challenging scenario sketches](tests/scenario-ideas.md)

Run the structural model checker:

```bash
python evaluation/validate_rules.py
```

The checker does not check factual accuracy. BKK policies and prices can change.

## Build the first Agentplace agent (baseline v0)

- [Builder brief](agentplace/builder-brief.md): paste this into the Agentplace AI Builder.
- [Independent source-based knowledge v0](agentplace/knowledge-v0.md): add this to the agent as a dated knowledge file, **not** as a test oracle.
- [Guided setup](agentplace/setup-guide.md): manual workflow, Luna model, preview, versioning and public publishing.
- [Baseline manifest template](agentplace/baseline-manifest.example.json): record what was really built, without inventing results.

**Current status:** An Agentplace Preview demo was built with the Luna model and the dated v0 knowledge file. It remains unpublished, and a platform-pinned immutable version ID has not been established. See the [baseline manifest](agentplace/baseline-manifest.json).

## Baseline evaluation — 2026-11-06

- [20 baseline test conversations](tests/baseline-cases.json) with rule references, expected behaviour and critical failure criteria.
- [5 held-out conversations](tests/heldout-cases.json) reserved for a post-improvement generalisation check.
- [How to run and score tests](tests/README.md); [structural test validator](evaluation/validate_scenarios.py).

**Observed baseline:** 20 manually evaluated, two-turn Agentplace Preview conversations; **17 PASS, 3 PARTIAL, 0 FAIL (85% strict-pass share)**. This is one manual run per case, not a statistically established reliability rate. The version is not platform-pinned. The five held-out tests remain unexecuted.

- [Baseline report](reports/baseline-v0-2026-11-06.md): per-test results, evidence limits, root-cause hypotheses and a controlled v1 plan.
- [Machine-readable baseline run](results/baseline-v0.run.json) and [individual test results](results/).
- [Source-backed test specifications](tests/baseline-cases.json), [held-out scenarios](tests/heldout-cases.json) and [test method](tests/README.md).
