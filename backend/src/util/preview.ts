import type { PreviewTheme, SavePreviewDto } from "../types/index.js";

const MAX_PREVIEW_SVG_LENGTH = 1_000_000;

/** Parse and validate the theme query param; returns null when invalid. */
export function parsePreviewTheme(value: unknown): PreviewTheme | null {
  if (value === "light" || value === "dark") {
    return value;
  }
  return null;
}

/** Validate a SavePreviewDto body; returns an error message or null. */
export function validateSavePreviewBody(body: SavePreviewDto): string | null {
  const { theme, codeHash, svg } = body;
  if (theme !== "light" && theme !== "dark") {
    return "Theme must be 'light' or 'dark'";
  }
  if (typeof codeHash !== "string" || !/^[0-9a-f]{64}$/.test(codeHash)) {
    return "codeHash must be a sha256 hex string";
  }
  if (typeof svg !== "string" || svg.length === 0) {
    return "svg must be a non-empty string";
  }
  if (svg.length > MAX_PREVIEW_SVG_LENGTH) {
    return "svg is too large";
  }
  return null;
}
