import { summarizeReviewSurfaceError } from "./review-surface.js";

export function formatCliError(error: unknown): string {
  return `Command failed: ${summarizeReviewSurfaceError(error)}`;
}

export function reportCliError(
  error: unknown,
  logger: Pick<Console, "error"> = console,
): void {
  logger.error(formatCliError(error));
}
