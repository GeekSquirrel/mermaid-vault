import crypto from "node:crypto";

/** sha256 hex digest used as the freshness key for stored previews. */
export function codeHash(code: string): string {
  return crypto.createHash("sha256").update(code, "utf-8").digest("hex");
}
