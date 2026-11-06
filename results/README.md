# Captured results

Copy the structure of `run.example.json` to `baseline.json` and, after improvements, `improved.json`. Use actual observed outcomes only. Include transcript references and notes so that scoring is auditable.

The example run is illustrative and must not be used to claim agent performance.

Automated Playwright runs are written to `results/automated/<run-id>/` (see the README section on the automated regression runner). They never overwrite the manual `T0xx.baseline.json` / `T0xx.v1.json` files above. Automated results carry `PENDING_REVIEW` correctness until a reviewer judges the transcript.
