import * as fs from "node:fs/promises";
import path from "node:path";
import type { MultiReviewContradictionCoverageMatrix } from "../review/multi-review-contradiction-coverage-matrix.js";
import { formatMultiReviewContradictionCoverageMatrix } from "../review/multi-review-contradiction-coverage-matrix.js";

export interface BatchReviewCompareMatrixArtifactOptions {
  matrix?: boolean;
  matrixOutput?: string;
  matrixJsonOutput?: string;
}

export function shouldCreateMatrixArtifact(
  options: BatchReviewCompareMatrixArtifactOptions,
): boolean {
  return Boolean(
    options.matrix || options.matrixOutput || options.matrixJsonOutput,
  );
}

async function writeTextArtifact(
  outputPath: string,
  content: string,
): Promise<void> {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, content);
}

export async function writeMatrixArtifacts(
  matrix: MultiReviewContradictionCoverageMatrix,
  options: BatchReviewCompareMatrixArtifactOptions,
): Promise<void> {
  const writes: Promise<void>[] = [];

  if (typeof options.matrixOutput === "string") {
    writes.push(
      writeTextArtifact(
        options.matrixOutput,
        `${formatMultiReviewContradictionCoverageMatrix(matrix)}\n`,
      ),
    );
  }

  if (typeof options.matrixJsonOutput === "string") {
    writes.push(
      writeTextArtifact(
        options.matrixJsonOutput,
        `${JSON.stringify(matrix, null, 2)}\n`,
      ),
    );
  }

  await Promise.all(writes);
}
