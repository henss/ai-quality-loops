import fs from "node:fs/promises";
import path from "node:path";

type ParsedArgs = Record<string, string[]>;

function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }

    parsed[key] = [...(parsed[key] || []), next];
    index += 1;
  }

  return parsed;
}

function getRequiredArg(args: ParsedArgs, key: string): string {
  const value = args[key]?.[0];
  if (!value) {
    throw new Error(`Missing required argument --${key}`);
  }
  return value;
}

function getOptionalArg(args: ParsedArgs, key: string): string | undefined {
  return args[key]?.[0];
}

function getOptionalList(args: ParsedArgs, key: string): string[] {
  return args[key] || [];
}

function yamlQuote(value: string): string {
  return JSON.stringify(value);
}

function yamlList(values: string[], indent = ""): string[] {
  if (values.length === 0) {
    return [`${indent}[]`];
  }

  return values.map((value) => `${indent}- ${yamlQuote(value)}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outputPath = path.resolve(getRequiredArg(args, "output"));
  const sourcePath = getOptionalArg(args, "source");
  if (sourcePath) {
    const resolvedSourcePath = path.resolve(sourcePath);
    const sourceMarkdown = await fs.readFile(resolvedSourcePath, "utf8");
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, sourceMarkdown, "utf8");
    process.stdout.write(`${outputPath}\n`);
    return;
  }

  const title = getRequiredArg(args, "title");
  const summary = getRequiredArg(args, "summary");
  const tracker = getRequiredArg(args, "tracker");
  const packet = getOptionalArg(args, "packet") || "not recorded";
  const validation = getOptionalList(args, "validation");
  const changed = getOptionalList(args, "changed");
  const uncertainties = getOptionalList(args, "uncertainty");
  const blockers = getOptionalList(args, "blocker");
  const followUp = getOptionalArg(args, "follow-up") || "not recorded";
  const efficiency = getOptionalArg(args, "efficiency") || "not recorded";
  const decisionAction =
    getOptionalArg(args, "decision-action") || "continue";
  const decisionSummary =
    getOptionalArg(args, "decision-summary") || "not recorded";
  const nextOwner = getOptionalArg(args, "next-owner") || "agent";
  const lifecycleStatus =
    getOptionalArg(args, "status") ||
    (decisionAction === "stop" ? "blocked" : "completed");
  const now = new Date().toISOString();
  const idBase = path.basename(outputPath, path.extname(outputPath));
  const outcomeId = `outcome_${idBase.replace(/[^a-zA-Z0-9]+/g, "_")}`;
  const validationSummary =
    validation.length > 0 ? validation.join("; ") : "not recorded";

  const lines = [
    `# ${title}`,
    "",
    `Originating tracker: Linear issue \`${tracker}\``,
    "",
    "## What changed",
    "",
    summary,
    "",
    "## Validation",
    "",
    ...(validation.length > 0 ? validation.map((item) => `- \`${item}\``) : ["- none recorded"]),
    "",
    "## Remaining explicit boundary question",
    "",
    ...(uncertainties.length > 0
      ? uncertainties.map((item) => `- ${item}`)
      : ["- none recorded"]),
    "",
    "## Efficiency reflection",
    "",
    efficiency,
    "",
    "## Recommended next step",
    "",
    followUp,
    "",
    "## Structured Outcome Data",
    "```yaml",
    `id: ${outcomeId}`,
    `projectId: ai-quality-loops`,
    `title: ${yamlQuote(title)}`,
    `trackerIssue: ${yamlQuote(tracker)}`,
    `sourcePacketPath: ${yamlQuote(packet)}`,
    `recordedAt: ${yamlQuote(now)}`,
    `lifecycleStatus: ${yamlQuote(lifecycleStatus)}`,
    `validationSummary: ${yamlQuote(validationSummary)}`,
    `summary: ${yamlQuote(summary)}`,
    "whatChanged:",
    ...yamlList(changed, "  "),
    "uncertainties:",
    ...yamlList(uncertainties, "  "),
    "blockers:",
    ...yamlList(blockers, "  "),
    `efficiency: ${yamlQuote(efficiency)}`,
    `followUp: ${yamlQuote(followUp)}`,
    "continuationDecision:",
    `  action: ${yamlQuote(decisionAction)}`,
    `  nextStepOwner: ${yamlQuote(nextOwner)}`,
    `  summary: ${yamlQuote(decisionSummary)}`,
    "```",
    "",
  ];

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${lines.join("\n").trim()}\n`, "utf8");

  process.stdout.write(`${outputPath}\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
