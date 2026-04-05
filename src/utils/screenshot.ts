import { execa } from "execa";
import path from "node:path";
import fs from "node:fs";
import { sanitizeReviewSurfaceValue } from "../shared/review-surface.js";

const CHROME_PATH =
  process.env.CHROME_PATH ||
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

/**
 * Capture a screenshot of a URL or local file using a headless browser.
 *
 * @param urlOrPath - The URL or local file path to capture.
 * @param outputPath - Where to save the resulting image.
 * @param options - Screenshot configuration (viewport size, browser path).
 * @returns The absolute path to the saved screenshot.
 */
export async function takeScreenshot(
  urlOrPath: string,
  outputPath: string,
  options: { width?: number; height?: number; chromePath?: string } = {},
): Promise<string> {
  const width = options.width || 1280;
  const height = options.height || 720;
  const chromePath = options.chromePath || CHROME_PATH;

  let targetUrl = urlOrPath;
  if (!urlOrPath.startsWith("http") && !urlOrPath.startsWith("file://")) {
    const absolutePath = path.resolve(urlOrPath);
    targetUrl = `file://${absolutePath.replace(/\\/g, "/")}`;
  }

  const absoluteOutputPath = path.isAbsolute(outputPath)
    ? outputPath
    : path.resolve(process.cwd(), outputPath);

  const outputDir = path.dirname(absoluteOutputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.info(
    `[Screenshot] Capturing ${sanitizeReviewSurfaceValue(targetUrl)} to ${sanitizeReviewSurfaceValue(absoluteOutputPath)}... using ${sanitizeReviewSurfaceValue(chromePath)}`,
  );

  try {
    const { stdout, stderr } = await execa(chromePath, [
      "--headless=new",
      `--screenshot=${absoluteOutputPath}`,
      `--window-size=${width},${height}`,
      "--no-sandbox",
      "--disable-gpu",
      "--no-first-run",
      "--hide-scrollbars",
      "--disable-smooth-scrolling",
      "--run-all-compositor-stages-before-draw",
      "--virtual-time-budget=10000",
      targetUrl,
    ]);

    if (fs.existsSync(absoluteOutputPath)) {
      console.info(
        `[Screenshot] Success: ${sanitizeReviewSurfaceValue(absoluteOutputPath)} (${fs.statSync(absoluteOutputPath).size} bytes)`,
      );
      return absoluteOutputPath;
    } else {
      throw new Error(
        `Screenshot file was not created. Output: ${stdout} ${stderr}`,
      );
    }
  } catch (error) {
    console.error(`[Screenshot] Failed to capture screenshot:`, error);
    throw error;
  }
}
