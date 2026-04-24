#!/usr/bin/env node

import fs from "node:fs/promises";
import process from "node:process";

import {
  JSON_CONTRACT_SCHEMA_FILES,
  validateStructuredReviewResult,
} from "ai-quality-loops";

const [, , reviewResultPath] = process.argv;

if (!reviewResultPath) {
  process.stderr.write(
    "Usage: node validate-review-result.template.mjs ./reviews/reviewer-contract/json/starter-review-result.json\n",
  );
  process.exit(1);
}

const rawReviewResult = await fs.readFile(reviewResultPath, "utf8");
const reviewResult = JSON.parse(rawReviewResult);
const validation = validateStructuredReviewResult(reviewResult);

if (!validation.ok) {
  throw validation.error;
}

process.stdout.write(
  `Validated structured review result: ${reviewResultPath}\n`,
);
process.stdout.write(
  `Published JSON Schema: ${JSON_CONTRACT_SCHEMA_FILES.structuredReviewResult}\n`,
);
