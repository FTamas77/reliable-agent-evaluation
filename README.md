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
