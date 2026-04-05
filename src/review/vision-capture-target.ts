import * as fs from "node:fs/promises";
import fsSync from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

export interface PreparedVisionCaptureTarget {
  target: string;
  cleanup: () => Promise<void>;
}

function extractLocalHtmlPath(target: string): string | undefined {
  const withoutFragment = target.split("#", 1)[0];

  if (/^file:\/\//i.test(withoutFragment)) {
    try {
      const parsed = new URL(withoutFragment);
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

  if (!withoutFragment.endsWith(".html")) {
    return undefined;
  }

  const resolvedPath = path.resolve(withoutFragment);
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
    target: tempHtmlPath,
    cleanup: async () => {
      await fs.rm(tempHtmlPath, { force: true });
    },
  };
}

