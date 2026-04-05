import * as fs from "node:fs/promises";
import fsSync from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

export interface PreparedVisionCaptureTarget {
  target: string;
  cleanup: () => Promise<void>;
}

function splitTargetFragment(target: string): {
  baseTarget: string;
  fragment?: string;
} {
  const hashIndex = target.indexOf("#");
  if (hashIndex < 0) {
    return { baseTarget: target };
  }

  return {
    baseTarget: target.slice(0, hashIndex),
    fragment: target.slice(hashIndex),
  };
}

function extractLocalHtmlPath(target: string): string | undefined {
  const { baseTarget } = splitTargetFragment(target);

  if (/^file:\/\//i.test(baseTarget)) {
    try {
      const parsed = new URL(baseTarget);
      const filePath = decodeURIComponent(parsed.pathname);
      const normalizedPath =
        process.platform === "win32" && /^\/[a-zA-Z]:/.test(filePath)
          ? filePath.slice(1)
          : filePath;
      return normalizedPath.endsWith(".html") && fsSync.existsSync(normalizedPath)
        ? normalizedPath
        : undefined;
    } catch {
      return undefined;
    }
  }

  if (!baseTarget.endsWith(".html")) {
    return undefined;
  }

  const resolvedPath = path.resolve(baseTarget);
  return fsSync.existsSync(resolvedPath) ? resolvedPath : undefined;
}

function injectCustomCss(html: string, customCss: string): string {
  const styleBlock = `<style id="custom-vision-fix">\n${customCss}\n</style>`;

  if (/<\/head>/i.test(html)) {
    return html.replace(/<\/head>/i, `${styleBlock}\n</head>`);
  }

  return `${styleBlock}\n${html}`;
}

export async function prepareVisionCaptureTarget(
  target: string,
  customCss?: string,
): Promise<PreparedVisionCaptureTarget> {
  const { fragment } = splitTargetFragment(target);

  if (!customCss) {
    return {
      target,
      cleanup: async () => {},
    };
  }

  const localHtmlPath = extractLocalHtmlPath(target);
  if (!localHtmlPath) {
    return {
      target,
      cleanup: async () => {},
    };
  }

  const originalHtml = await fs.readFile(localHtmlPath, "utf-8");
  const tempHtmlPath = path.join(
    os.tmpdir(),
    `aiql_vision_capture_${Date.now()}_${Math.floor(Math.random() * 1000)}.html`,
  );

  await fs.writeFile(tempHtmlPath, injectCustomCss(originalHtml, customCss), "utf-8");

  return {
    target: `${tempHtmlPath}${fragment || ""}`,
    cleanup: async () => {
      await fs.rm(tempHtmlPath, { force: true });
    },
  };
}
