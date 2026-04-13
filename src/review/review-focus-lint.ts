import * as fs from "node:fs/promises";
import path from "node:path";
import { resolveFromCwd } from "../shared/io.js";

export interface ReviewFocusLintInput {
  paths: string[];
  forbiddenTerms: string[];
  allowedTerms?: string[];
  cwd?: string;
}

export interface ReviewFocusLintFinding {
  path: string;
  term: string;
  line: number;
  excerpt: string;
  classification: "prompt_drift";
}

export interface ReviewFocusLintReport {
  ok: boolean;
  scannedFiles: number;
  findings: ReviewFocusLintFinding[];
}

function normalizeTerms(terms: string[]): string[] {
  return [...new Set(terms.map((term) => term.trim()).filter(Boolean))];
}

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
  if (input.paths.length === 0) {
    throw new Error("Provide at least one review output path to lint.");
  }
  if (forbiddenTerms.length === 0) {
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
      files.map(async (file) => lintText(file, await fs.readFile(file, "utf8"), forbiddenTerms, allowedTerms)),
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
