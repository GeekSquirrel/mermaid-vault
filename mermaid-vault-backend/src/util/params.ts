/**
 * Narrows an Express route parameter to a string. Under Express 5
 * (path-to-regexp v8) param values are typed `string | string[]` because
 * wildcard segments yield arrays; our routes only declare single named
 * segments, so anything else is treated as missing.
 */
export const stringParam = (
  value: string | string[] | undefined
): string | undefined => (typeof value === "string" ? value : undefined);
