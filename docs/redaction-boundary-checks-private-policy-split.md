# Redaction Boundary Checks and Private Policy Bindings Split

This proposal records the OPS-689 split decision for redaction-boundary checks. It uses only generic review-surface terms, synthetic examples, and caller-owned labels; it does not document private workflows, customer fields, company-specific policies, source paths, tracker semantics, or downstream implementation details.

## Classification

Packet output: proposal and artifact update.

No implementation path was chosen. The safe deliverable is a classification and split plan for redaction-boundary checks only; it stops before moving code, creating a shared layer, adding reusable tooling, or publishing package behavior. The build-vs-buy scout check is not applicable because this session adds no reusable tooling, shared helper, workflow automation, adapter, review loop, extraction tool, observability, scheduling, memory, agent infrastructure, or package-like code.

## Existing Public Surface

AIQL already has the generic redaction seam needed for safe composition:

- `sanitizeReviewSurfaceValue(...)` and related review-surface summarizers remove or summarize sensitive URLs, paths, data URIs, contact links, and error details before they appear in prompts, logs, review metadata, or artifacts.
- `defineReviewSurfaceRedactions(...)` lets embedding repos pass project-local redaction rules as caller-owned configuration without turning those rules into AIQL defaults.
- Review runners, batch artifacts, gates, comparison reports, capture plans, and screenshot utilities thread those generic summaries through public review surfaces.

## Split Plan

| Candidate concern | Public AIQL boundary | Caller-owned boundary | Decision |
| --- | --- | --- | --- |
| Generic secret and provenance leakage | Built-in summarization for URLs, query strings, local paths, data URIs, email-style contacts, and error surfaces. | None, unless a caller needs stricter local policy. | Keep public. These are generic safety primitives for any open-source adopter. |
| Project-local identifiers | `extraRedactions` rule injection and immutable redaction bundles. | Literal names, internal labels, account IDs, private object identifiers, and any rule labels that reveal a workflow. | Split. Keep rule bundles in the embedding repo and pass only generic replacement text into AIQL. |
| Customer or domain field semantics | Generic structured review metadata and sanitized evidence descriptors. | Which fields represent customers, tenants, accounts, risk classes, escalation paths, or policy exceptions. | Split. AIQL should not learn or encode those semantics. |
| Policy binding and action routing | Generic findings, severity fields, comparison reports, and explicit gate inputs. | Approval thresholds, incident routing, ticket creation, release blocking, audit ownership, and exception policy. | Split. Callers interpret sanitized findings under their own policy. |
| Repeated redaction-boundary checks | Documentation-only checklist or synthetic fixture if repeated generic adoption proves the gap. | Any private examples, production data, repo-local naming, or domain-specific rule defaults. | Monitor. Do not add a new helper from OPS-689 alone. |

## OPS-1008 Boundary Clarification

OPS-1008 keeps the same split but makes the policy-name boundary explicit: AIQL can own generic source inspection and sanitized review-surface examples, while callers own the literal rule names, field names, and policy labels that explain why a value matters in their environment.

Do not promote caller policy names into default redaction checks. A safe public check may say that a string looks like a URL with a redacted query, a local path, a contact link, a data URL, or a caller-supplied project identifier. It should not say that the value is a customer id, escalation route, release blocker, tenant field, audit exception, or any other caller policy concept unless that label was supplied by the embedding repo and remains outside AIQL defaults.

The current repository evidence supports a proposal rather than implementation: the public helper is `src/shared/review-surface.ts`, the package tests already cover caller-owned `extraRedactions`, and there is no `src/redaction-boundary/index.ts` implementation surface to split inside this repo. The next implementation step should wait until repeated open-source-safe adoption shows that the missing piece is a neutral checklist or synthetic fixture, not a private policy-name bundle.

## Promotion Test

Before promoting a redaction-boundary check into AIQL, require a yes answer to all of these questions:

- Does the check operate on generic text, paths, URLs, metadata labels, or error summaries rather than private domain objects?
- Can examples use synthetic identifiers and placeholder replacement labels without teaching a private workflow?
- Are caller-specific rule bundles, field meanings, policy thresholds, and escalation behavior supplied entirely by the embedding repo?
- Would two unrelated adopters need the same built-in behavior without sharing private identifiers, field semantics, or policy?
- Does the shared code stop at sanitization or review reporting without deciding what the finding means operationally?

If any answer is no or uncertain, keep the check in the embedding repo as a caller-owned `extraRedactions` bundle, a private review policy, or a sanitized wrapper over existing AIQL contracts.

## Recommendation

Do not move private redaction rules or policy bindings into AIQL for OPS-689. The next bounded useful step is to monitor one downstream adoption that uses caller-owned redaction bundles against sanitized review artifacts. If the same generic gap appears again, add a documentation-only recipe or synthetic fixture for redaction-boundary review; avoid a new public helper until repeated evidence shows the missing piece is generic sanitization shape rather than private policy.

The remaining generic-vs-domain-specific extraction question is whether repeated adopters need a neutral redaction-boundary checklist for public review artifacts. The downside of waiting is low because the existing `extraRedactions` seam already supports private rules, while premature promotion could expose private field semantics or normalize one caller's policy as an open-source default.
