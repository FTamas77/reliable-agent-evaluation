# v1 knowledge-only change plan

**Prepared:** 2026-11-06  
**State:** Prepared in GitHub, **not yet deployed to Agentplace**.  
**Baseline:** [v0 agent knowledge](knowledge-v0.md), [20-case results](../results/baseline-v0.run.json), [baseline report](../reports/baseline-v0-2026-11-06.md).  
**Candidate knowledge:** [v1 agent knowledge](knowledge-v1.md).

## Experiment question

Will adding missing provider rules and clarifying fare-product categories improve three partially successful BKK scenarios while leaving the other 17 already-passing cases intact?

## Changed variable

Replace the *contents of the agent knowledge document* from `knowledge-v0.md` to `knowledge-v1.md`. **Do not simultaneously change** the Luna model, initial agent instructions, external tool permissions, visual design, or user-facing identity. Do not upload the independent `rules.json` test oracle, `baseline-cases.json` or held-out test cases into Agentplace.

## Targeted changes

| Area | Baseline observation | Knowledge change in v1 | Source verified 2026-11-06 |
|---|---|---|---|
| T005 / 100E | Confused 24-hour travelcard with qualifying pass | State explicitly that daily travelcard is not an eligible pass for add-on; a different qualifying pass or free-travel entitlement can change the answer | [24-hour travelcard](https://bkk.hu/en/tickets-and-passes/prices/24-hour-budapest-travelcard/) · [airport shuttle ticket](https://bkk.hu/en/tickets-and-passes/prices/airport-shuttle-bus-single-ticket/) · [add-on](https://bkk.hu/en/tickets-and-passes/prices/add-on-airport-shuttle-bus-single-ticket/) |
| T017 / paper block refund | Agent could not determine ordinary partial refund | Require all ten unused, consecutive ticket numbers; distinguish expired June–August 2026 exchange window | [BKK refunds](https://bkk.hu/en/tickets-and-passes/purchase-information/product-replacement-and-refund/) |
| T018 / mobile refund | Agent knew its own limits but not the provider refund pathway | Explain no mobile-ticket exchange/replacement; eligible unused mobile singles/time tickets refundable in app within one year, with product-specific exceptions | [BKK refunds](https://bkk.hu/en/tickets-and-passes/purchase-information/product-replacement-and-refund/) |

Other prices and fare information remain the 2026-11-05 snapshot. The file is not a live BKK feed.

## Deployment protocol (manual)

1. Keep the v0 file and the baseline result files in GitHub unchanged.
2. Open the existing **Budapest Fare Advisor — Unofficial Demo** in Agentplace AI Builder.
3. Replace the **v0 knowledge attachment** with **v1** (or instruct the Builder to remove the old file before adding the new one). The two files must not coexist as conflicting instructions.
4. Explicitly request **no other changes**: preserve Luna, existing system/business instructions, disclaimer, tools and branding; do not publish yet.
5. Review Builder's change report to check only the knowledge was replaced; note any automatic edits.
6. If Agentplace shows a version identifier or revision timestamp, capture it. Do not label an Agentplace version as immutable unless the UI confirms that.
7. Start fresh Preview chats for each test; never reuse baseline chat context.
8. First rerun the three previously partial tests for a fast diagnostic, then the other 17 baseline tests for regressions. **These are exploratory if the v1 is further tuned between subsets**; for a clean v1 score, freeze v1 and run all 20 without changing it.
9. Once the complete retest is finished, run the five held-out tests **once** to estimate generalisation. They are public cases intentionally not used for v1 tuning.
10. Publish the agent only after reviewing demo identity, external data collection and safety, then add the actual published URL to the final report.

## Scoring and caveats

- Score with the prewritten behavioural criteria: PASS, PARTIAL, FAIL. Preserve full observed transcripts and official links.
- The v0 result is **17 PASS / 3 PARTIAL / 0 FAIL** over one two-turn manual sample per case; this is not a rigorous reliability probability.
- The Agentplace v0 version ID was **not pinned**, so attributing a score difference solely to knowledge remains a qualified inference, not proof.
- The v1 knowledge is a **candidate configuration** until a human uploads it and verifies the actual Agentplace state.
