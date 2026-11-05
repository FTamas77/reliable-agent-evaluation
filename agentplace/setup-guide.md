# Step-by-step: first Agentplace version

## Before you start

- Visit https://agentplace.io/ and open the workspace / sign in.
- This project is an **unofficial demo** based on the services of a real provider, BKK. Do not imply authorization, use official logos, connect payment methods or collect real passenger data.
- Keep the **agent knowledge** separate from **evaluation ground truth**. Do not upload the rule oracle or hidden test cases.

## Build v0

1. Start a **new agent** in the AI Builder, using the message in [builder-brief.md](builder-brief.md). The Builder may propose options or ask for information; answer based on the brief, not invented details.
2. Give it the official source URLs and the content of [knowledge-v0.md](knowledge-v0.md). Ask to use the note as a dated snapshot and include official BKK page links in user-facing explanations.
3. Choose the **Luna** model for the agent. The job assignment requires using the free Luna model.
4. Review the draft preview. Check that it identifies itself as an independent demo, cannot purchase tickets or make bookings, and presents a reasonable normal-case recommendation. Fix unsafe publishing or obvious identity confusion before making the agent public.
5. Record the version as **baseline-v0** (using Agentplace Versions if available), and record the chosen model, instructions, knowledge source version and date in [baseline-manifest.example.json](baseline-manifest.example.json).
6. **Do not tune against the planned evaluation cases** until we have fixed a formal test set and recorded baseline outputs. Tests should run in fresh conversations.
7. When ready to publish, review Agentplace access settings. Choose **Public**, consider disabling duplication, and confirm published access. The published version is distinct from the editable preview: changes require publishing again.
8. Save the published URL and share it so we can proceed to real baseline tests. No results should be claimed until actual conversations are run.

## If the Builder asks for capabilities you do not need

Decline external integrations, payment handling, calendar access, passenger accounts, persistent personal data and automated purchases. The exercise is an AI Engineer reliability evaluation, not a production ticket-sales system.

## Sources

- https://agentplace.io/docs/getting-started/create-your-first-agent
- https://agentplace.io/docs/building/add-business-knowledge
- https://agentplace.io/docs/building/test-and-refine
- https://agentplace.io/docs/publishing/publish-and-share
- https://agentplace.io/careers/ai-engineer
