import { cac } from "cac";
import * as dotenv from "dotenv";
import { formatReviewFocusLintReport, runReviewFocusLint } from "../review/review-focus-lint.js";
import { reportCliError } from "../shared/cli-errors.js";

dotenv.config();

function parseList(value: unknown): string[] {
  const rawValues = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? [value]
      : [];
  return rawValues
    .flatMap((entry) => entry.split(","))
    .map((entry) => entry.trim())
    .filter(Boolean);
}

async function main() {
  const cli = cac("review-focus-lint");
  cli
    .command("", "Lint review artifacts for off-topic focus drift")
    .option("--path <path>", "File or directory to scan. Repeat or use comma-separated values.")
    .option("--forbid <term>", "Forbidden term or phrase. Repeat or use comma-separated values.")
    .option("--allow <term>", "Allowed context term or phrase. Repeat or use comma-separated values.")
    .option("--require-user-benefit", "Fail files that do not state a concrete user-facing benefit.")
    .option("--benefit <term>", "User-benefit term or phrase. Repeat or use comma-separated values.")
    .option("--json", "Emit JSON")
    .action(async (options) => {
      const report = await runReviewFocusLint({
        paths: parseList(options.path),
        forbiddenTerms: parseList(options.forbid),
        allowedTerms: parseList(options.allow),
        requireUserBenefit: Boolean(options.requireUserBenefit),
        userBenefitTerms: parseList(options.benefit),
      });
      console.info(options.json ? JSON.stringify(report, null, 2) : formatReviewFocusLintReport(report));
      if (!report.ok) {
        process.exitCode = 1;
      }
    });

  cli.help();
  cli.parse();
}

main().catch((error) => {
  reportCliError(error);
  process.exit(1);
});
