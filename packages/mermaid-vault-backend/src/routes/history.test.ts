import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../index.js";

describe("History Controller & API Integration Tests", () => {
  it("GET /history and /api/history should return list of history entries", async () => {
    const res1 = await request(app).get("/history");
    expect(res1.status).toBe(200);
    expect(res1.body.success).toBe(true);
    expect(Array.isArray(res1.body.data)).toBe(true);

    const res2 = await request(app).get("/api/history");
    expect(res2.status).toBe(200);
    expect(res2.body.success).toBe(true);
    expect(Array.isArray(res2.body.data)).toBe(true);
  });

  it("should perform complete history entry lifecycle via REST API", async () => {
    // 1. Create history entry
    const createRes = await request(app)
      .post("/api/history")
      .send({
        name: "test-snapshot",
        state: {
          code: "sequenceDiagram\n  Alice->>Bob: Hello",
          mermaid: "{}",
          updateDiagram: true,
        },
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    expect(createRes.body.data.id).toBeDefined();
    expect(createRes.body.data.name).toBe("test-snapshot");
    expect(createRes.body.data.state.code).toBe("sequenceDiagram\n  Alice->>Bob: Hello");
    const historyId = createRes.body.data.id;

    // 2. Fetch created history entry by ID
    const getRes = await request(app).get(`/api/history/${historyId}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.success).toBe(true);
    expect(getRes.body.data.id).toBe(historyId);
    expect(getRes.body.data.name).toBe("test-snapshot");

    // 3. List history and verify inclusion
    const listRes = await request(app).get("/api/history");
    expect(listRes.status).toBe(200);
    expect(listRes.body.success).toBe(true);
    expect(listRes.body.data.some((h: { id: string }) => h.id === historyId)).toBe(true);

    // 4. Update history entry name
    const updateRes = await request(app)
      .put(`/api/history/${historyId}`)
      .send({
        name: "renamed-snapshot",
      });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.name).toBe("renamed-snapshot");

    // 5. Delete history entry
    const deleteRes = await request(app).delete(`/api/history/${historyId}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);
    expect(deleteRes.body.data.deleted).toBe(true);

    // 6. Verify 404 after deletion
    const notFoundRes = await request(app).get(`/api/history/${historyId}`);
    expect(notFoundRes.status).toBe(404);
    expect(notFoundRes.body.success).toBe(false);
  });

  it("should validate input when creating history entry", async () => {
    const invalidRes1 = await request(app)
      .post("/api/history")
      .send({ name: "", state: {} });
    expect(invalidRes1.status).toBe(400);

    const invalidRes2 = await request(app)
      .post("/api/history")
      .send({ name: "Snapshot without state" });
    expect(invalidRes2.status).toBe(400);
  });

  it("should clear all history entries via DELETE /api/history", async () => {
    // Create an entry
    await request(app).post("/api/history").send({
      name: "to-be-cleared",
      state: { code: "graph TD; A-->B" },
    });

    const clearRes = await request(app).delete("/api/history");
    expect(clearRes.status).toBe(200);
    expect(clearRes.body.success).toBe(true);

    const listRes = await request(app).get("/api/history");
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBe(0);
  });

  it("should support diagramId query filtering and scoping via REST API", async () => {
    const proj1 = "proj-1-uuid";
    const proj2 = "proj-2-uuid";

    await request(app)
      .post("/api/history")
      .send({
        diagramId: proj1,
        name: "proj1-diag",
        state: { code: "graph LR; P1" },
      });

    await request(app)
      .post("/api/history")
      .send({
        diagramId: proj2,
        name: "proj2-diag",
        state: { code: "graph LR; P2" },
      });

    // Fetch proj1
    const res1 = await request(app).get(`/api/history?diagramId=${proj1}`);
    expect(res1.status).toBe(200);
    expect(res1.body.data).toHaveLength(1);
    expect(res1.body.data[0].name).toBe("proj1-diag");

    // Fetch proj2
    const res2 = await request(app).get(`/api/history?diagramId=${proj2}`);
    expect(res2.status).toBe(200);
    expect(res2.body.data).toHaveLength(1);
    expect(res2.body.data[0].name).toBe("proj2-diag");

    // Clear proj1 only
    const del1 = await request(app).delete(`/api/history?diagramId=${proj1}`);
    expect(del1.status).toBe(200);

    const res1After = await request(app).get(`/api/history?diagramId=${proj1}`);
    expect(res1After.body.data).toHaveLength(0);

    const res2After = await request(app).get(`/api/history?diagramId=${proj2}`);
    expect(res2After.body.data).toHaveLength(1);
  });
});
