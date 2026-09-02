import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../index.js";

describe("Project Controller & API Integration Tests", () => {
  it("GET /health should return status ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("should perform complete project lifecycle via REST API", async () => {
    // 1. Create project
    const createRes = await request(app)
      .post("/api/projects")
      .send({
        title: "Integration Test Flowchart",
        code: "graph LR\n  A[Start] --> B[End]",
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    expect(createRes.body.data.id).toBeDefined();
    expect(createRes.body.data.title).toBe("Integration Test Flowchart");
    expect(createRes.body.data.code).toBe("graph LR\n  A[Start] --> B[End]");
    const projectId = createRes.body.data.id;

    // 2. Fetch created project by ID
    const getRes = await request(app).get(`/api/projects/${projectId}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.success).toBe(true);
    expect(getRes.body.data.id).toBe(projectId);
    expect(getRes.body.data.title).toBe("Integration Test Flowchart");

    // 3. List projects and ensure it is included
    const listRes = await request(app).get("/api/projects");
    expect(listRes.status).toBe(200);
    expect(listRes.body.success).toBe(true);
    expect(Array.isArray(listRes.body.data)).toBe(true);
    expect(listRes.body.data.some((p: { id: string }) => p.id === projectId)).toBe(true);

    // 4. Update project title and code
    const updateRes = await request(app)
      .put(`/api/projects/${projectId}`)
      .send({
        title: "Updated Flowchart Title",
        code: "graph TD\n  Step1 --> Step2",
      });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.title).toBe("Updated Flowchart Title");
    expect(updateRes.body.data.code).toBe("graph TD\n  Step1 --> Step2");

    // 5. Delete project
    const deleteRes = await request(app).delete(`/api/projects/${projectId}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);
    expect(deleteRes.body.data.deleted).toBe(true);

    // 6. Verify 404 on deleted project
    const notFoundRes = await request(app).get(`/api/projects/${projectId}`);
    expect(notFoundRes.status).toBe(404);
    expect(notFoundRes.body.success).toBe(false);
    expect(notFoundRes.body.error.code).toBe("NOT_FOUND");
  });

  it("should validate inputs for creation and return 400", async () => {
    const invalidTitleRes = await request(app)
      .post("/api/projects")
      .send({ title: "", code: "graph TD" });
    expect(invalidTitleRes.status).toBe(400);
    expect(invalidTitleRes.body.success).toBe(false);

    const missingCodeRes = await request(app)
      .post("/api/projects")
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
});


