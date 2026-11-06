# Evaluating an agent without teaching it the exam

There are two separate test sets:

- [baseline-cases.json](baseline-cases.json): **20** prewritten multi-turn conversations to execute before and after changes.
- [heldout-cases.json](heldout-cases.json): **5** additional multi-turn conversations to execute **only after** improvements as a lightweight generalisation check.

Both are **drafts**, not yet frozen. All expected behaviours were independently written from the dated [rule model](../case_studies/bkk/knowledge/rules.json); they do **not** constitute measured performance or a replacement for the latest official BKK rules.

## Vocabulary

- **Test case**: an exact input situation, plus expected observable behaviour.
- **Test oracle**: the independently specified conditions by which the assistant's response is judged. Unlike exact-string matching, several different wordings may be correct.
- **Baseline**: the first observed performance of the fixed agent version on frozen test cases.
- **Regression**: checking whether the same cases improve (or worsen) after an agent change.
- **Held-out case**: a previously unused case that tests generalisation rather than memorisation.
- **PASS / PARTIAL / FAIL**: a human judgement tied to explicit criteria and transcript evidence.

## Important separation

Do **not** upload either test JSON file, the rule oracle, or this README as agent knowledge. The agent gets only its dated [knowledge-v0.md](../agentplace/knowledge-v0.md). Our tests measure whether it can **apply** that knowledge to new conversations.

Because this repository is public, the held-out cases are not cryptographically secret. They are held out **from the development and prompting process**, not from public view. For a stronger scientific experiment, generate additional unpublished cases after tuning.

## Manual test procedure

1. **Freeze the agent configuration first.** In Agentplace, identify the current editable/published version, or save a version/snapshot if available. Record the version ID or what was visible, the date, Luna model and knowledge version in [baseline-manifest.json](../agentplace/baseline-manifest.json). Avoid changing instructions or knowledge before measurement.
2. **Freeze the tests.** Review cases with [the policy model](../case_studies/bkk/knowledge/rules.json), check time-sensitive rules against official sources, fix ambiguities, then commit and record the Git SHA in your experiment notes. Do not change the cases mid-run.
3. **Fresh Preview chat** for each case. Send only the first `user_turns` entry, wait for the answer, then send the second. If the agent asks an unforeseen question, do not secretly supply more facts; note it in the transcript. Keep the test input wording unchanged where feasible.
4. **Capture evidence.** Save the response text (including citations), time, test ID and any unexpected model behaviour; redact personal/private data.
5. **Score independently.** PASS if the substantive expected conditions are met and no critical failure occurred. PARTIAL if useful but one or more noncritical expected elements are missing. FAIL for any `critical_failures`, substantial wrong advice or unsupported claims of completed actions.
6. **Diagnose.** Classify suspected cause, e.g., missing knowledge, incorrect rule selection, omitted clarification, loss of conversational context, hallucination, prompt-injection susceptibility, or action overclaim.
7. **Improve and retest.** Change one variable at a time when practical. Rerun the same 20 cases on fresh chats after updating the agent. Then run the 5 held-out cases only once at the end.
8. **Report limitations.** One run per case with manual scoring is useful for an application exercise but not a strong statistical reliability estimate. Repeated trials, multiple scorers and rigorous source review would improve confidence.

## Minimal transcript record

```json
{
  "test_id": "T001",
  "agent_version": "BASELINE_VERSION_ID",
  "started_at": "2026-11-06T...",
  "turns": [
    {"user": "...", "agent": "..."},
    {"user": "...", "agent": "..."}
  ],
  "score": "PASS",
  "notes": "Why the expected and critical criteria passed or failed",
  "suspected_failure_categories": [],
  "cited_source_urls": []
}
```

This is a **format example, not an actual result**. Do not fabricate or pre-fill measurements.

## Structural check

```bash
python evaluation/validate_scenarios.py
```

The validator checks IDs, missing rule/source references and the existence of at least two turns; it does not evaluate factual correctness or the actual agent.
