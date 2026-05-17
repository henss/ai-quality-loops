# Downstream Agent Read-Efficiency Pilot

This note defines a small product-learning pilot for measuring how much a downstream agent can avoid reading when a task packet gives it a narrow evidence registry, boundary constraints, and outcome requirements. It is generic on purpose: real tracker data, internal ledgers, customer facts, source URLs, private repository paths, approval policy, and routing decisions stay in the embedding workflow.

In the portfolio strategy, this is part of AIQL's active local-first review and gate role: measure whether review packets, context packs, and outcome artifacts reduce unnecessary reads without turning AIQL into a hosted observability product.

## Classification

Packet output: proposal and artifact.

No reusable tooling was added. A build-vs-buy scout check is not applicable because this note does not add shared helpers, workflow automation, adapters, observability, scheduling, parser or renderer infrastructure, connector clients, dependencies, or package-like code.

## Pilot Shape

Run one controlled downstream-agent review or artifact pass using an already-approved task packet. The agent should start from the packet-declared contract, confirm evidence surfaces before reading them, and stop if the required evidence is unavailable or would cross a private boundary.

The pilot measures saved reads, not reviewer quality. A saved read is a concrete broad read the agent does not perform because the packet, registry, or repo-local guidance lets it choose a narrower action. Count only reads that are observable from the session transcript or command history.

## Measurement Fields

Record these fields in the caller-owned outcome artifact:

- `output_classification`: one of `code`, `investigation`, `estimate`, `review`, `proposal`, `artifact`, `coordination`, or `blocker`
- `confirmed_evidence`: the repo-local or packet-declared surfaces that were actually read
- `skipped_or_deferred_reads`: broad reads intentionally avoided, such as full raw ledgers, tracker comment history, unconfirmed path probes, or repeated failed commands
- `saved_read_count`: the count of concrete skipped or deferred reads
- `why_saved`: the packet rule, registry entry, existing doc, or repo-local convention that made each skipped read unnecessary
- `confidence`: `low`, `medium`, or `high`, based on whether the required evidence was available and whether the result stayed within the declared boundary

## Counting Rules

Count one saved read when the agent can point to a specific avoided action that would otherwise be plausible for the task. Do not count vague possibilities, duplicate commands that were never considered, or private artifacts whose existence was not confirmed.

Examples of countable saved reads:

- The packet says linked tracker comments are optional, so the agent does not fetch them when the packet already resolves scope.
- `rg --files` confirms the active repo surface, so the agent avoids probing guessed paths.
- A bounded excerpt answers the question, so the agent avoids reading a large raw file in full.
- A deterministic command fails once, the error identifies a precondition, and the agent avoids rerunning the same command without a material change.

Examples that should not be counted:

- A read avoided only because the agent forgot to check a required artifact.
- A private or production surface the agent had no authority to access.
- A broad web search where repo-local or packet evidence was already the required source.

## Scope

AIQL can host the generic measurement contract and public-safe examples. The embedding workflow owns real task selection, source registry semantics, tracker freshness, private context packaging, approval gates, and any downstream product decision.

Recommended portfolio dogfood surfaces include WorkLoop outcomes, Agent Atlas context packs, ContextWeave context packs, venture concept briefs, and SMARTSEER beta packets when the caller has made source, data, IP, legal, and action boundaries explicit.

## Extraction Question

If future sessions repeatedly need the same measurement, ask whether the next step can stay generic as a small fixture or parser over public-safe outcome fields. If it needs private tracker semantics, product-pressure labels, company-specific ledgers, or private routing rules, keep it in the embedding workflow.
