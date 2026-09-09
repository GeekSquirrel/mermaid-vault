import { deflate } from "pako";

/**
 * Serde helpers for the "pako:<base64url(deflate(json))>" state format shared
 * by the frontend URL hash (see mermaid-vault-frontend src/lib/util/serde.ts)
 * and the /api/render endpoints (see controllers/renderController.ts).
 *
 * Two payload shapes exist on purpose:
 * - Render API:   { code, config }   — what renderController.decodeState expects
 * - Frontend URL: { code, mermaid, updateDiagram, rough } — the editor State shape
 *   consumed by loadState() in the frontend (mermaid holds the config JSON string)
 */

const encode = (payload: unknown): string => {
  // pako is quirky with Node Buffers (see renderController.decodeState), so
  // deflate a plain Uint8Array from TextEncoder.
  const bytes = deflate(new TextEncoder().encode(JSON.stringify(payload)), {
    level: 9,
  });
  return `pako:${Buffer.from(bytes).toString("base64url")}`;
};

/** Serializes a diagram for the /api/render endpoints. */
export const encodeRenderState = (code: string, config?: string): string => {
  const payload: { code: string; config?: string } = { code };
  const trimmed = config?.trim();
  if (trimmed && trimmed !== "{}") {
    payload.config = trimmed;
  }
  return encode(payload);
};

/**
 * Serializes a diagram in the frontend editor State shape, suitable for
 * view/edit share links (the fragment after "#" in frontend URLs).
 */
export const encodeShareState = (code: string, config?: string): string =>
  encode({
    code,
    mermaid: config?.trim() ? config.trim() : "{}",
    updateDiagram: true,
    rough: false,
  });
