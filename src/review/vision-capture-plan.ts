import {
  sanitizeReviewSurfaceValue,
  type ReviewSurfaceRedactions,
} from "../shared/review-surface.js";
import { prepareVisionCaptureTarget } from "./vision-capture-target.js";

const DEFAULT_VISION_CAPTURE_WIDTH = 1280;
const DEFAULT_VISION_CAPTURE_HEIGHT = 720;
const DEFAULT_FULL_PAGE_CAPTURE_HEIGHT = 6000;

export interface VisionCapturePlanOptions {
  urlOrPath: string;
  sections?: string[];
  width?: number;
  height?: number;
  customCss?: string;
  extraRedactions?: ReviewSurfaceRedactions;
}

export interface PlannedVisionCapture {
  label: string;
  target: string;
  width: number;
  height: number;
  section?: string;
}

export interface PreparedVisionCapturePlan {
  targetSummary: string;
  captureMode: "full-page" | "targeted-sections";
  customCssRequested: boolean;
  customCssInjected: boolean;
  usesPreparedTarget: boolean;
  captures: PlannedVisionCapture[];
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
    fragment: target.slice(hashIndex + 1),
  };
}

export async function planVisionCaptures(
  options: VisionCapturePlanOptions,
): Promise<PreparedVisionCapturePlan> {
  const width = options.width || DEFAULT_VISION_CAPTURE_WIDTH;
  const height = options.height || DEFAULT_VISION_CAPTURE_HEIGHT;
  const sections = options.sections || [];
  const extraRedactions = options.extraRedactions || [];
  const preparedTarget = await prepareVisionCaptureTarget(
    options.urlOrPath,
    options.customCss,
  );
  const preparedTargetChanged = preparedTarget.target !== options.urlOrPath;
  const { baseTarget } = splitTargetFragment(preparedTarget.target);
  const captures =
    sections.length > 0
      ? sections.map((section, index) => ({
          label: `section-${index + 1}`,
          section,
          target: `${baseTarget}#${section}`,
          width,
          height,
        }))
      : [
          {
            label: "full",
            target: preparedTarget.target,
            width,
            height: DEFAULT_FULL_PAGE_CAPTURE_HEIGHT,
          },
        ];

  return {
    targetSummary: sanitizeReviewSurfaceValue(options.urlOrPath, {
      extraRedactions,
    }),
    captureMode: sections.length > 0 ? "targeted-sections" : "full-page",
    customCssRequested: Boolean(options.customCss),
    customCssInjected: Boolean(options.customCss) && preparedTargetChanged,
    usesPreparedTarget: preparedTargetChanged,
    captures,
    cleanup: preparedTarget.cleanup,
  };
}
