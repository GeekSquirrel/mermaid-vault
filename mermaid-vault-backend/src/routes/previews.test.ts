import crypto from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../index.js";

const sha256 = (input: string): string =>
  crypto.createHash("sha256").update(input, "utf-8").digest("hex");

const SAMPLE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="100"><rect/></svg>';

describe("Preview API Integration Tests", () => {
  it("should round-trip a project preview and invalidate it when code changes", async () => {
    const code = "graph LR\n  A[Start] --> B[End]";
    const createRes = await request(app)
      .post("/api/projects")
      .send({ title: "Preview Test Project", code });
    expect(createRes.status).toBe(201);
    const projectId = createRes.body.data.id;
    const hash = sha256(code);

    // Missing preview -> 404 so the client falls back to live rendering
    const missingRes = await request(app).get(
      `/api/projects/${projectId}/preview.svg?theme=light`
    );
    expect(missingRes.status).toBe(404);
    expect(missingRes.body.success).toBe(false);

    // Upload preview for both themes
    const putLight = await request(app).put(`/api/projects/${projectId}/preview`).send({
      theme: "light",
      codeHash: hash,
      svg: SAMPLE_SVG,
    });
    expect(putLight.status).toBe(200);
    expect(putLight.body.success).toBe(true);

    const putDark = await request(app).put(`/api/projects/${projectId}/preview`).send({
      theme: "dark",
      codeHash: hash,
      svg: SAMPLE_SVG,
    });
    expect(putDark.status).toBe(200);

    // Fresh previews are served per theme (binary parser yields a Buffer body)
    const getLight = await request(app).get(`/api/projects/${projectId}/preview.svg?theme=light`);
    expect(getLight.status).toBe(200);
    expect(getLight.headers["content-type"]).toContain("image/svg+xml");
    expect(getLight.body.toString("utf-8")).toBe(SAMPLE_SVG);
    expect(getLight.headers.etag).toBe(`"${hash}"`);

    const getDark = await request(app).get(`/api/projects/${projectId}/preview.svg?theme=dark`);
    expect(getDark.status).toBe(200);
    expect(getDark.body.toString("utf-8")).toBe(SAMPLE_SVG);

    // Conditional request revalidates via ETag
    const notModified = await request(app)
      .get(`/api/projects/${projectId}/preview.svg?theme=light`)
      .set("If-None-Match", `"${hash}"`);
    expect(notModified.status).toBe(304);

    // Code update invalidates the stored preview
    const newCode = "graph TD\n  Step1 --> Step2";
    await request(app).put(`/api/projects/${projectId}`).send({ code: newCode });
    const staleRes = await request(app).get(`/api/projects/${projectId}/preview.svg?theme=light`);
    expect(staleRes.status).toBe(404);

    // Uploading a preview rendered from the old code is rejected
    const stalePut = await request(app).put(`/api/projects/${projectId}/preview`).send({
      theme: "light",
      codeHash: hash,
      svg: SAMPLE_SVG,
    });
    expect(stalePut.status).toBe(409);

    // Uploading a preview rendered from the new code succeeds
    const freshPut = await request(app).put(`/api/projects/${projectId}/preview`).send({
      theme: "light",
      codeHash: sha256(newCode),
      svg: SAMPLE_SVG,
    });
    expect(freshPut.status).toBe(200);
    const refreshed = await request(app).get(`/api/projects/${projectId}/preview.svg?theme=light`);
    expect(refreshed.status).toBe(200);

    // Cleanup
    await request(app).delete(`/api/projects/${projectId}`);
  });

  it("should validate preview upload inputs", async () => {
    const createRes = await request(app)
      .post("/api/projects")
      .send({ title: "Validation Project", code: "graph TD; A-->B" });
    const projectId = createRes.body.data.id;

    const badTheme = await request(app).put(`/api/projects/${projectId}/preview`).send({
      theme: "blue",
      codeHash: sha256("graph TD; A-->B"),
      svg: SAMPLE_SVG,
    });
    expect(badTheme.status).toBe(400);

    const badHash = await request(app).put(`/api/projects/${projectId}/preview`).send({
      theme: "light",
      codeHash: "not-a-hash",
      svg: SAMPLE_SVG,
    });
    expect(badHash.status).toBe(400);

    const emptySvg = await request(app).put(`/api/projects/${projectId}/preview`).send({
      theme: "light",
      codeHash: sha256("graph TD; A-->B"),
      svg: "",
    });
    expect(emptySvg.status).toBe(400);

    const badThemeQuery = await request(app).get(
      `/api/projects/${projectId}/preview.svg?theme=sepia`
    );
    expect(badThemeQuery.status).toBe(400);

    await request(app).delete(`/api/projects/${projectId}`);
  });

  it("should round-trip a history entry (bookmark) preview keyed on state code", async () => {
    const code = "sequenceDiagram\n  Alice->>Bob: Hello";
    const createRes = await request(app).post("/api/history").send({
      name: "Bookmark Preview Test",
      state: { code },
      type: "manual",
    });
    expect(createRes.status).toBe(201);
    const entryId = createRes.body.data.id;

    const missingRes = await request(app).get(`/api/history/${entryId}/preview.svg?theme=dark`);
    expect(missingRes.status).toBe(404);

    const put = await request(app).put(`/api/history/${entryId}/preview`).send({
      theme: "dark",
      codeHash: sha256(code),
      svg: SAMPLE_SVG,
    });
    expect(put.status).toBe(200);

    const get = await request(app).get(`/history/${entryId}/preview.svg?theme=dark`);
    expect(get.status).toBe(200);
    expect(get.headers["content-type"]).toContain("image/svg+xml");
    expect(get.body.toString("utf-8")).toBe(SAMPLE_SVG);

    // State update invalidates the preview
    await request(app).put(`/api/history/${entryId}`).send({
      state: { code: "stateDiagram-v2\n  [*] --> Still" },
    });
    const staleRes = await request(app).get(`/api/history/${entryId}/preview.svg?theme=dark`);
    expect(staleRes.status).toBe(404);

    // Uploading a preview rendered from the old code is rejected
    const stalePut = await request(app).put(`/api/history/${entryId}/preview`).send({
      theme: "dark",
      codeHash: sha256(code),
      svg: SAMPLE_SVG,
    });
    expect(stalePut.status).toBe(409);

    await request(app).delete(`/api/history/${entryId}`);
  });

  it("should return 404 for previews of non-existent resources", async () => {
    const res = await request(app).get("/api/projects/no-such-id/preview.svg?theme=light");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");

    const resHistory = await request(app).get("/api/history/no-such-id/preview.svg?theme=light");
    expect(resHistory.status).toBe(404);
  });
});
