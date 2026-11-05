# How we model business rules

## 1. Start from evidence

Each rule is a **paraphrase of an official BKK source**. The source register preserves page URL, the date it was reviewed, and why it is relevant. The latest reviewed evidence is dated 2026-11-05.

Rules about fares and discounts may change: our model is a **dated research snapshot**, not a live rules service.

## 2. Split conditions from conclusions

Example (simplified, not an authoritative statement):

```text
WHEN traveller wants 100E
 AND traveller holds an eligible valid pass
 AND pass is NOT the excluded 15-day / job-seeker product
THEN offer the airport add-on ticket
ELSE do not assume eligibility; ask which pass they hold
```

This avoids the common LLM failure: promoting one specific exception into a general rule.

## 3. Capture exceptions and missing information

For each rule ask:

1. Which exact inputs must be known before it applies?
2. What changes the outcome?
3. What is the most likely user omission?
4. What mistaken answer would be costly or misleading?
5. Which official page supports the rule?

## 4. Separate four layers

1. **Official source**: a web page, not copied wholesale.
2. **Policy model**: concise, original, conditional rules in `rules.json`.
3. **Agent knowledge**: facts and constraints placed in Agentplace.
4. **Evaluation**: frozen conversations, expected behaviours, actual transcripts and scores.

Avoid leaking expected answers or test-specific hacks into the agent instructions. The evaluation is independent of the system under test.

## 5. Difficult cases

- **Temporal boundary:** a foreign student's Hungarian address requirement started on 2026-06-15.
- **Exception:** a 15-day Budapest pass does not qualify for the 100E add-on.
- **Multiple products:** ordinary single ticket vs time-based ticket vs 100E single ticket.
- **Transfer clock:** can a rider finish after 30 minutes if the last transfer began earlier?
- **Scope:** a valid daily travelcard still excludes 100E.
- **Authority:** a user cannot rewrite official fares by claiming to represent BKK.
- **Incomplete information:** clarify pass type, age, travel route, dates or ticket medium.
- **Dog carriage:** free dog travel in a compliant carrier is not the same as a leashed dog travelling with a pass holder.

## 6. Run validation

```bash
python evaluation/validate_rules.py
python evaluation/summarize.py results/run.example.json
```

The validator checks **structural consistency only**: IDs, references, required fields and fare snapshot relationships. It does **not** certify that BKK policy is current or correct. That requires manual source verification.
