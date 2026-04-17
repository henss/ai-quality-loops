# Non-Final Creative Surface Pilot Review

This note records the OPS-920 pilot proposal for using AI Quality Loops as a read-only reviewer of one non-final public creative surface, such as a release page draft, rendered page section, screenshot, or thumbnail. It intentionally avoids real project copy, private URLs, company workflows, account data, audience strategy, publication plans, and final creative direction.

## Classification

Packet output: proposal and blocker.

No implementation path was chosen. The packet authorizes a bounded advisory review, but it does not provide the actual page, thumbnail, URL, screenshot, local artifact, or sanitized context needed to run that review. The build-vs-buy scout check is not applicable because this session adds no reusable tooling, shared helper, workflow automation, adapter, review loop, extraction tool, observability, scheduling, memory, agent infrastructure, or package-like code.

## Evidence Reviewed

- `README.md` exposes generic `expert-review`, `vision-review`, `vision-preview`, `batch-review`, structured outputs, and gates for caller-provided targets.
- `examples/README.md` frames starter manifests as copyable shapes whose real targets, prompts, budgets, and policy stay in the embedding repo.
- `docs/public-facing-creative-support-fit-review.md` already allows advisory review of sanitized public-facing creative support surfaces while keeping final taste, brand direction, market positioning, publication approval, and routing outside AIQL.
- `docs/capture-review-adapter-contract.md` keeps target selection, raw captures, private labels, retention, and action routing caller-owned.
- `docs/public-private-utility-boundary-review.md` identifies examples, manifest names, paths, labels, redaction defaults, and convenience wrappers as the likely leakage paths.

## Pilot Decision

AIQL can support the OPS-920 pilot as a caller-owned, read-only review run over one sanitized non-final creative artifact. The package should not decide whether the surface ships, rewrite final copy, choose visual taste, infer real audience strategy, approve publication, open tickets, schedule checks, or encode project-specific release policy.

The correct shared shape is a normal `vision-review` or `batch-review` invocation against a target supplied by the caller:

- use `vision-review` for one URL, local HTML file, screenshot, or thumbnail image
- use `vision-preview` first when the target is a rendered page or page section and the operator needs to confirm the captured pixels before spending model time
- use `batch-review` only when the caller wants a checked-in, repeatable manifest for the same sanitized target
- use `--json-output` or structured batch output when downstream tooling needs findings without parsing Markdown

## Minimum Caller Inputs

Before the pilot can produce an actual review, the caller must provide:

- one sanitized target reference accepted by the existing review commands, such as a local image path, local HTML file, screenshot path, or public-safe URL
- a short, non-private review brief stating the intended audience at a generic level
- explicit advisory-only scope, for example: clarity, visual hierarchy, contrast, accessibility, unsupported claims, call-to-action ambiguity, and authority-boundary issues
- any caller-owned prompt library or context file needed for project policy, kept outside this package
- local redaction rules before the artifact reaches AIQL if filenames, text, paths, or screenshots contain private identifiers

Without that target, the valid completion is this proposal plus a classified blocker for execution: missing external information.

## Suggested Pilot Shape

For one image or screenshot:

```bash
vision-review ./artifacts/public-surface-candidate.png --expert "UI/UX" --json-output ./reviews/public-surface-candidate.json
```

For one rendered page or section:

```bash
vision-sections ./site/public-surface.html --json
vision-preview ./site/public-surface.html --sections hero --output-dir ./reviews/public-surface-preview
vision-review ./site/public-surface.html --sections hero --expert "UI/UX" --json-output ./reviews/public-surface-hero.json
```

For a repeatable checked-in plan:

```json
{
  "defaults": {
    "mode": "vision",
    "expert": "UI/UX",
    "outputDir": "./reviews/public-surface",
    "structuredOutputDir": "./reviews/public-surface/json"
  },
  "reviews": [
    {
      "name": "Public surface candidate",
      "target": "./artifacts/public-surface-candidate.png"
    }
  ]
}
```

The placeholder labels should be replaced only with repo-safe names. Real campaign labels, private paths, account facts, audience strategy, publication decisions, and action routing should remain outside AIQL.

## Extraction Question

The remaining generic-vs-domain-specific extraction question is whether repeated adopters need the same neutral pilot recipe for advisory checks of clarity, support, visual hierarchy, accessibility, and authority boundaries. If yes, promote a synthetic documentation recipe or fixture. If the missing value is brand taste, audience strategy, release approval, target selection, evidence thresholds, or action routing, keep it in the embedding repo and pass only sanitized artifacts through AIQL.

## Next Bounded Slice

Run one caller-owned pilot only after a sanitized target exists. The value is a concrete advisory finding set for Stefan or another human reviewer without shifting creative authority into AIQL. The downside of waiting for the target is low because the current commands already support the review, while inventing a synthetic verdict now would create false evidence and blur the public/private boundary.
