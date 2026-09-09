import { inflate } from "pako";
import { describe, expect, it } from "vitest";
import { encodeRenderState, encodeShareState } from "./state.js";

const decode = (state: string): Record<string, unknown> => {
  const [prefix, encoded] = state.split(":", 2) as [string, string];
  expect(prefix).toBe("pako");
  // Same decode path as controllers/renderController.decodeState
  const bytes = inflate(new Uint8Array(Buffer.from(encoded, "base64url")));
  return JSON.parse(Buffer.from(bytes).toString("utf8")) as Record<string, unknown>;
};

describe("MCP state serialization", () => {
  it("encodeRenderState round-trips the code through the render API shape", () => {
    const state = encodeRenderState("flowchart TD\n    A --> B");
    expect(state).toMatch(/^pako:[A-Za-z0-9_-]+$/);
    expect(decode(state)).toEqual({ code: "flowchart TD\n    A --> B" });
  });

  it("encodeRenderState keeps non-empty mermaid config", () => {
    const payload = decode(encodeRenderState("graph LR\n A --> B", '{"theme":"dark"}'));
    expect(payload).toEqual({
      code: "graph LR\n A --> B",
      config: '{"theme":"dark"}',
    });
  });

  it("encodeRenderState drops blank or empty-object configs", () => {
    expect(decode(encodeRenderState("A --> B", "  "))).not.toHaveProperty("config");
    expect(decode(encodeRenderState("A --> B", "{}"))).not.toHaveProperty("config");
  });

  it("encodeShareState matches the frontend editor State shape", () => {
    const payload = decode(encodeShareState("graph TD\n A --> B", '{"theme":"forest"}'));
    expect(payload).toEqual({
      code: "graph TD\n A --> B",
      mermaid: '{"theme":"forest"}',
      updateDiagram: true,
      rough: false,
    });
  });

  it("encodeShareState defaults the mermaid config to {}", () => {
    const payload = decode(encodeShareState("graph TD\n A --> B"));
    expect(payload.mermaid).toBe("{}");
  });
});
