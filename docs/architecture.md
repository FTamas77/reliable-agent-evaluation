# Architecture (v0)

```text
Official source URLs -> Source register & independent knowledge notes
                                 |
                                 v
                         Agentplace + Luna
                                 |
        Fresh conversations + frozen evaluation scenarios
                                 |
                                 v
                   Manual transcript capture
                                 |
                                 v
                    Evaluation summary (Python)
                                 |
                                 v
             Failure analysis -> improved agent -> re-test
```

## Boundaries

- **Agentplace** hosts the agent; no separate LLM backend is needed.
- **Knowledge** contains only source-backed original notes and business rules. Track source URLs and review dates.
- **Tests** define user turns, expected outcomes and critical failure conditions before the baseline.
- **Execution** is manual initially. Do not assume an undocumented Agentplace testing API exists.
- **Evaluation** is intentionally transparent: human-scored PASS/PARTIAL/FAIL plus failure categories and evidence links.

## Quality risks

- Stale fares or changed eligibility rules
- Missing user context, contradictory user claims, multi-turn memory
- False claims of actions (e.g., buying or booking tickets)
- Prompt injection and unauthorised rule changes
- Overfitting to the baseline test cases

## Guardrails

The public demo must clearly state it is unofficial, does not collect personal data and has no ability to book or purchase tickets.
