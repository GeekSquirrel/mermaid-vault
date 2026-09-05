import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../index.js";

describe("Diagram Controller & API Integration Tests", () => {
  it("GET /health and /api/health should return status ok", async () => {
    const res1 = await request(app).get("/health");
    expect(res1.status).toBe(200);
    expect(res1.body).toEqual({ status: "ok" });

    const res2 = await request(app).get("/api/health");
    expect(res2.status).toBe(200);
    expect(res2.body).toEqual({ status: "ok" });
  });

  it("GET /diagrams should also return list of diagrams via alias", async () => {
    const res = await request(app).get("/diagrams");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("should perform complete diagram lifecycle via REST API", async () => {
    // 1. Create diagram
    const createRes = await request(app)
      .post("/api/diagrams")
      .send({
        title: "Integration Test Flowchart",
        code: "graph LR\n  A[Start] --> B[End]",
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    expect(createRes.body.data.id).toBeDefined();
    expect(createRes.body.data.title).toBe("Integration Test Flowchart");
    expect(createRes.body.data.code).toBe("graph LR\n  A[Start] --> B[End]");
    const diagramId = createRes.body.data.id;

    // 2. Fetch created diagram by ID
    const getRes = await request(app).get(`/api/diagrams/${diagramId}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.success).toBe(true);
    expect(getRes.body.data.id).toBe(diagramId);
    expect(getRes.body.data.title).toBe("Integration Test Flowchart");

    // 3. List diagrams and ensure it is included
    const listRes = await request(app).get("/api/diagrams");
    expect(listRes.status).toBe(200);
    expect(listRes.body.success).toBe(true);
    expect(Array.isArray(listRes.body.data)).toBe(true);
    expect(listRes.body.data.some((p: { id: string }) => p.id === diagramId)).toBe(true);

    // 4. Update diagram title and code
    const updateRes = await request(app)
      .put(`/api/diagrams/${diagramId}`)
      .send({
        title: "Updated Flowchart Title",
        code: "graph TD\n  Step1 --> Step2",
      });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.title).toBe("Updated Flowchart Title");
    expect(updateRes.body.data.code).toBe("graph TD\n  Step1 --> Step2");

    // 5. Delete diagram
    const deleteRes = await request(app).delete(`/api/diagrams/${diagramId}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);
    expect(deleteRes.body.data.deleted).toBe(true);

    // 6. Verify 404 on deleted diagram
    const notFoundRes = await request(app).get(`/api/diagrams/${diagramId}`);
    expect(notFoundRes.status).toBe(404);
    expect(notFoundRes.body.success).toBe(false);
    expect(notFoundRes.body.error.code).toBe("NOT_FOUND");
  });

  it("should validate inputs for creation and return 400", async () => {
    const invalidTitleRes = await request(app)
      .post("/api/diagrams")
      .send({ title: "", code: "graph TD" });
    expect(invalidTitleRes.status).toBe(400);
    expect(invalidTitleRes.body.success).toBe(false);

    const missingCodeRes = await request(app)
      .post("/api/diagrams")
      .send({ title: "Valid Title" });
    expect(missingCodeRes.status).toBe(400);
    expect(missingCodeRes.body.success).toBe(false);
  });

  it("should return 404 for non-existent routes", async () => {
    const res = await request(app).get("/api/unknown-endpoint");
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("should cascade delete associated history entries when deleting diagram via DELETE /api/diagrams/:id", async () => {
    // 1. Create diagram
    const projRes = await request(app).post("/api/diagrams").send({
      title: "Cascade Diagram",
      code: "graph LR; X-->Y",
    });
    const projId = projRes.body.data.id;

    // 2. Create history entry for this diagram
    await request(app).post("/api/history").send({
      diagramId: projId,
      name: "Cascade Snapshot",
      state: { code: "graph LR; X-->Y" },
    });

    const listHistoryBefore = await request(app).get(`/api/history?diagramId=${projId}`);
    expect(listHistoryBefore.body.data).toHaveLength(1);

    // 3. Delete diagram
    const deleteRes = await request(app).delete(`/api/diagrams/${projId}`);
    expect(deleteRes.status).toBe(200);

    // 4. Verify diagram is deleted
    const getProjAfter = await request(app).get(`/api/diagrams/${projId}`);
    expect(getProjAfter.status).toBe(404);

    // 5. Verify associated history entries are also deleted
    const listHistoryAfter = await request(app).get(`/api/history?diagramId=${projId}`);
    expect(listHistoryAfter.body.data).toHaveLength(0);
  });
});


