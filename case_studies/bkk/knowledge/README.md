# Source-backed BKK knowledge model

This directory contains **22 independently written, source-backed rules** in [rules.json](rules.json). They are not an executable fare engine and must not be treated as a substitute for official BKK advice.

## Model format

Every rule specifies:

- **id**: stable identifier used by evaluation scenarios
- **topic**: semantic grouping
- **when**: applicability conditions that must be established from the conversation
- **expected**: testable correct response behaviour
- **exceptions**: known counterexamples or limitations
- **ask_if_missing**: clarifying questions for incomplete requests
- **source_ids**: traceability to official pages in [../sources.csv](../sources.csv)
- **reviewed_on / status**: evidence collection date and quality status

The [fare snapshot](../fares.snapshot.json) isolates price values from policy logic to prevent accidental mixing of stale prices with valid rules.

## Why the distinction matters

A rule can be correct **only when its prerequisites hold**. For example, a 100E add-on ticket is cheaper than the full fare, but is not available with every type of Budapest pass. The test must supply or elicit the exact pass type.

A useful multi-turn test withholds one key condition, waits for the assistant to ask, then reveals the exception. Record whether it changes the recommendation correctly.

## What is not yet done

> **Status update (2026-11-06):** the bullets below describe the state when this note was written. An unpublished Agentplace Preview agent was built and evaluated afterwards; see the [final evaluation](../../../reports/final-evaluation-2026-11-06.md).

- No Agentplace agent has been created.
- These are reviewed source-backed draft rules, not expert-certified legal/fare advice.
- No evaluation conversations have been executed.
- The model has not been checked against every detail in the full BKK tariff regulations.

For any real journey, consult the current official BKK information. Before publishing the final agent, check the official sources again for changes.
