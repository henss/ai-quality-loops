# Packet Verification-Command Fit Review

This review records the OPS-851 fit decision for using AI Quality Loops to assess whether a task packet's requested verification command matches the target repository. It is intentionally generic and does not document private repositories, tracker internals, company workflows, source paths, or domain-specific implementation details.

## Classification

Packet output: review and proposal.

No implementation path was chosen. The packet asks whether AIQL is the right shared surface for a verification-command fit check over a synthetic packet and ownership decision. The build-vs-buy scout check is not applicable because this session adds no reusable tooling, shared helper, workflow automation, adapter, review loop, extraction tool, observability, scheduling, memory, agent infrastructure, or package-like code.

## Evidence Reviewed

- `README.md` frames AIQL as a local review package with caller-owned policy decisions.
- `examples/ci-review-gate-check.md` shows AIQL can document generic command recipes while letting embedding repos adapt package-manager wrappers, paths, and budgets.
- `docs/adoption-pressure-matrix.md` suppresses new public surfaces when the evidence is about downstream workflow friction rather than a proven missing package contract.
- `docs/public-private-utility-boundary-review.md` warns that helper commands can leak private policy through names, default paths, labels, and convenience wrappers.
- `package.json` exposes a repo-local `verify:session` for this repository, which is useful local evidence but not a portable assumption for downstream packets.

## Fit Decision

AIQL is a good fit for reviewing a sanitized packet or prompt artifact for verification-command fit, but not for owning command discovery, enforcement, or repository-specific launcher behavior.

The safe shared role is a generic text-review check over caller-provided packet content: identify whether the packet assumes a non-existent or non-authoritative verification command, whether it tells the agent to inspect repo-local scripts before validation, and whether ownership of the final verification command remains with the target repository. The embedding system must own repository inspection, command selection, hook installation policy, launcher prompts, and any enforcement that blocks or rewrites packets.

## Boundary Recommendations

| Candidate surface | Recommendation | Reason |
| --- | --- | --- |
| Sanitized packet verification-fit review target | Keep as caller-provided input | Existing `expert-review` and `batch-review` can review a redacted packet excerpt for command-fit risks without a new command. |
| Generic rubric wording | Allow as documentation | Useful dimensions are domain-neutral: repo-native command evidence, stale default-command assumptions, explicit validation ownership, and missing blocker language. |
| New `packet-verification-fit` CLI or helper | Defer | A helper would likely encode orchestrator packet structure or launcher behavior before repeated generic adoption proves a missing AIQL contract. |
| Verification command discovery | Keep outside AIQL | Discovery depends on each repository's scripts, docs, hooks, package manager, and policy. AIQL should not infer or enforce that operational contract. |
| Launcher or tracker enforcement | Reject for AIQL | Blocking, rewriting, or routing packets is workflow automation owned by the embedding system, not a review primitive. |
| Examples using real packet paths or tracker labels | Reject | Public examples must avoid private paths, tracker taxonomies, issue labels, or company-specific continuation rules. |

## Suggested Review Shape

A safe caller-owned check can pass a sanitized task packet excerpt to `expert-review` or `batch-review` and ask for findings on:

- whether the packet names a concrete verification command without citing repo-local evidence
- whether it incorrectly assumes a shared command such as `verify:session` is portable across repos
- whether it instructs the agent to inspect available repo scripts, documented checks, or wrapper commands before validation
- whether the packet separates AIQL review ownership from embedding-repo command selection and enforcement
- whether unresolved command ambiguity becomes an explicit blocker instead of silent fallback

The review should produce findings and recommendations only. It should not choose commands for a real repository, edit launcher prompts, update tracker state, or add enforcement logic.

## Extraction Question

Before moving any packet verification-command helper into AIQL, require a yes answer to this question:

Can the helper operate only on caller-provided, sanitized packet text and published AIQL review contracts, while repository inspection, command discovery, hook policy, launcher behavior, tracker state, and enforcement remain outside AIQL?

If the answer is no or uncertain, keep the helper in the embedding system and call AIQL only as a generic review engine.

The remaining generic-vs-domain-specific extraction question is whether repeated adopters need the same neutral rubric wording for verification-command fit, or whether each case is really about a specific launcher, tracker schema, or repository policy. If repeated sanitized usage proves the rubric gap, add a documentation-only recipe or synthetic manifest first; do not add command discovery or enforcement.

## Next Bounded Slice

Do not add a new public utility from OPS-851 alone. The next useful slice is a synthetic example manifest that reviews a redacted packet excerpt if another downstream adoption repeats this setup. The value would be fewer failed validation runs caused by stale default-command assumptions; the downside of waiting is low because current AIQL text review surfaces already support the check, while premature promotion risks turning private launcher policy into public package behavior.
