import * as fs from "node:fs/promises";
import path from "node:path";
import { resolveFromCwd } from "../shared/io.js";

export interface ReviewFocusLintInput {
  paths: string[];
  forbiddenTerms: string[];
  allowedTerms?: string[];
  requireUserBenefit?: boolean;
  userBenefitTerms?: string[];
  cwd?: string;
}

export interface ReviewFocusLintFinding {
  path: string;
  term: string;
  line: number;
  excerpt: string;
  classification: "prompt_drift" | "missing_user_relevance";
}

export interface ReviewFocusLintReport {
  ok: boolean;
  scannedFiles: number;
  findings: ReviewFocusLintFinding[];
}

function normalizeTerms(terms: string[]): string[] {
  return [...new Set(terms.map((term) => term.trim()).filter(Boolean))];
}

const DEFAULT_USER_BENEFIT_TERMS = [
  "attention",
  "risk",
  "decision",
  "triage",
  "review time",
  "manual review",
];

async function collectFiles(targetPath: string): Promise<string[]> {
  const stat = await fs.stat(targetPath);
  if (stat.isFile()) {
    return [targetPath];
  }
  if (!stat.isDirectory()) {
    return [];
  }
  const entries = await fs.readdir(targetPath, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => collectFiles(path.join(targetPath, entry.name))),
  );
  return nested.flat().filter((file) => /\.(md|txt|json)$/i.test(file));
}

function lineHasAllowedContext(line: string, allowedTerms: string[]): boolean {
  const lower = line.toLowerCase();
  return allowedTerms.some((term) => lower.includes(term.toLowerCase()));
}

function textHasTerm(text: string, terms: string[]): boolean {
  const lower = text.toLowerCase();
  return terms.some((term) => lower.includes(term.toLowerCase()));
}

function firstNonEmptyExcerpt(text: string): { line: number; excerpt: string } {
  const lines = text.split(/\r?\n/);
  const index = lines.findIndex((line) => line.trim().length > 0);
  const line = index === -1 ? "" : lines[index] ?? "";
  return {
    line: index === -1 ? 1 : index + 1,
    excerpt: line.trim().slice(0, 240),
  };
}

function lintText(filePath: string, text: string, forbiddenTerms: string[], allowedTerms: string[]): ReviewFocusLintFinding[] {
  const findings: ReviewFocusLintFinding[] = [];
  const lines = text.split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    if (lineHasAllowedContext(line, allowedTerms)) {
      continue;
    }
    const lower = line.toLowerCase();
    for (const term of forbiddenTerms) {
      if (lower.includes(term.toLowerCase())) {
        findings.push({
          path: filePath,
          term,
          line: index + 1,
          excerpt: line.trim().slice(0, 240),
          classification: "prompt_drift",
        });
      }
    }
  }
  return findings;
}

export async function runReviewFocusLint(input: ReviewFocusLintInput): Promise<ReviewFocusLintReport> {
  const cwd = input.cwd ?? process.cwd();
  const forbiddenTerms = normalizeTerms(input.forbiddenTerms);
  const allowedTerms = normalizeTerms(input.allowedTerms ?? []);
  const configuredUserBenefitTerms = normalizeTerms(input.userBenefitTerms ?? []);
  const userBenefitTerms =
    configuredUserBenefitTerms.length > 0 ? configuredUserBenefitTerms : DEFAULT_USER_BENEFIT_TERMS;
  if (input.paths.length === 0) {
    throw new Error("Provide at least one review output path to lint.");
  }
  if (forbiddenTerms.length === 0 && !input.requireUserBenefit) {
    throw new Error("Provide at least one forbidden focus term.");
  }

  const files = [
    ...new Set(
      (
        await Promise.all(input.paths.map((targetPath) => collectFiles(resolveFromCwd(targetPath, cwd))))
      ).flat(),
    ),
  ];
  const findings = (
    await Promise.all(
      files.map(async (file) => {
        const text = await fs.readFile(file, "utf8");
        const fileFindings = lintText(file, text, forbiddenTerms, allowedTerms);
        if (input.requireUserBenefit && !textHasTerm(text, userBenefitTerms)) {
          const excerpt = firstNonEmptyExcerpt(text);
          fileFindings.push({
            path: file,
            term: "user benefit",
            line: excerpt.line,
            excerpt: excerpt.excerpt,
            classification: "missing_user_relevance",
          });
        }
        return fileFindings;
      }),
    )
  ).flat();

  return {
    ok: findings.length === 0,
    scannedFiles: files.length,
    findings,
  };
}

export function formatReviewFocusLintReport(report: ReviewFocusLintReport): string {
  const lines = [
    `Review focus lint: ${report.ok ? "pass" : "fail"}`,
    `Scanned files: ${report.scannedFiles}`,
    `Findings: ${report.findings.length}`,
  ];
  for (const finding of report.findings) {
    lines.push(
      `- ${finding.classification}: ${finding.term} at ${finding.path}:${finding.line} :: ${finding.excerpt}`,
    );
  }
  return lines.join("\n");
}
