import { deflate } from "pako";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../index.js";
import { findChromiumPath } from "../util/renderer.js";

const serializePakoState = (payload: unknown): string => {
  const json = JSON.stringify(payload);
  return `pako:${Buffer.from(deflate(json, { level: 9 })).toString("base64url")}`;
};

const SAMPLE_STATE = {
  code: "flowchart TD\n    A[Start] --> B[End]",
  mermaid: "{}",
  autoSync: true,
  updateDiagram: true,
  panZoom: true,
};

describe("Render API", () => {
  it("should serve the internal renderer page", async () => {
    const res = await request(app).get("/render-page");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");
    expect(res.text).toContain("mermaid.esm.min.mjs");
  });

  it("should return 400 for an undecodable state", async () => {
    const res = await request(app).get("/api/render/svg/pako:not-a-valid-state");
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("RENDER_FAILED");
  });

  it("should return 400 for an unsupported serde prefix", async () => {
    const res = await request(app).get(
      `/api/render/svg/base64:${Buffer.from("{}").toString("base64")}`
    );
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("Unsupported serde");
  });

  it("should return 400 for a state without diagram code", async () => {
    const res = await request(app).get(
      `/api/render/svg/${encodeURIComponent(serializePakoState({ mermaid: "{}" }))}`
    );
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("diagram code");
  });

  it("should render an SVG or report the renderer as unavailable", async () => {
    const res = await request(app).get(
      `/api/render/svg/${encodeURIComponent(serializePakoState(SAMPLE_STATE))}`
    );
    // Without Chromium installed the endpoint degrades to a clear 503 instead
    // of crashing; with Chromium present it must return a real SVG.
    if (findChromiumPath()) {
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("image/svg+xml");
      expect(res.text).toContain("<svg");
    } else {
      expect(res.status).toBe(503);
      expect(res.body.error.code).toBe("RENDER_UNAVAILABLE");
    }
  });
});
