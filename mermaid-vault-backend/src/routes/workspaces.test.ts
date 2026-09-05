import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../index.js";

describe("Workspace Controller & API Integration Tests", () => {
  it("GET /api/workspaces should list workspaces including the seeded sample workspace", async () => {
    const res = await request(app).get("/api/workspaces");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it("should perform a complete workspace lifecycle via REST API", async () => {
    // Oldest existing workspace receives diagrams without an explicit workspace_id
    const listRes = await request(app).get("/api/workspaces");
    const oldestId = listRes.body.data[0].id;

    // 1. Create
    const createRes = await request(app).post("/api/workspaces").send({ name: "Integration WS" });
    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    expect(createRes.body.data.name).toBe("Integration WS");
    const workspaceId = createRes.body.data.id;

    // 2. Fetch by id
    const getRes = await request(app).get(`/api/workspaces/${workspaceId}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.id).toBe(workspaceId);

    // 3. Rename
    const renameRes = await request(app)
      .put(`/api/workspaces/${workspaceId}`)
      .send({ name: "Renamed WS" });
    expect(renameRes.status).toBe(200);
    expect(renameRes.body.data.name).toBe("Renamed WS");

    // 4. Create a diagram inside the workspace
    const diagramRes = await request(app)
      .post("/api/diagrams")
      .send({ title: "WS Diagram", code: "graph TD; A-->B", workspace_id: workspaceId });
    expect(diagramRes.status).toBe(201);
    expect(diagramRes.body.data.workspace_id).toBe(workspaceId);
    const diagramId = diagramRes.body.data.id;

    // 5. Unknown workspace on diagram create falls back to the oldest workspace
    const badRes = await request(app)
      .post("/api/diagrams")
      .send({ title: "Bad", code: "graph TD; A-->B", workspace_id: "does-not-exist" });
    expect(badRes.status).toBe(201);
    expect(badRes.body.data.workspace_id).toBe(oldestId);
    await request(app).delete(`/api/diagrams/${badRes.body.data.id}`);

    // 6. Delete workspace: diagram falls back to the oldest remaining workspace
    const deleteRes = await request(app).delete(`/api/workspaces/${workspaceId}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.data.deleted).toBe(true);

    const orphanRes = await request(app).get(`/api/diagrams/${diagramId}`);
    expect(orphanRes.status).toBe(200);
    expect(orphanRes.body.data.workspace_id).toBe(oldestId);

    // Cleanup
    await request(app).delete(`/api/diagrams/${diagramId}`);
  });

  it("should allow deleting the seeded workspace and reject invalid names", async () => {
    // Create a diagram (it lands in the oldest workspace) to verify the takeover
    const diagramRes = await request(app)
      .post("/api/diagrams")
      .send({ title: "Sample Diagram", code: "graph TD; A-->B" });
    expect(diagramRes.status).toBe(201);
    const diagramId = diagramRes.body.data.id;

    const listRes = await request(app).get("/api/workspaces");
    const oldestId = listRes.body.data[0].id;

    const deleteOldest = await request(app).delete(`/api/workspaces/${oldestId}`);
    expect(deleteOldest.status).toBe(200);
    expect(deleteOldest.body.data.deleted).toBe(true);

    // The diagram must still belong to an existing workspace
    const movedRes = await request(app).get(`/api/diagrams/${diagramId}`);
    expect(movedRes.status).toBe(200);
    expect(movedRes.body.data.workspace_id).not.toBe(oldestId);
    const workspaceRes = await request(app).get(`/api/workspaces/${movedRes.body.data.workspace_id}`);
    expect(workspaceRes.status).toBe(200);

    await request(app).delete(`/api/diagrams/${diagramId}`);

    const emptyName = await request(app).post("/api/workspaces").send({ name: "   " });
    expect(emptyName.status).toBe(400);

    const missing = await request(app).get("/api/workspaces/no-such-workspace");
    expect(missing.status).toBe(404);
  });

  it("PUT /api/workspaces/order should persist manual ordering and validate input", async () => {
    await request(app).post("/api/workspaces").send({ name: "Order WS 1" });
    await request(app).post("/api/workspaces").send({ name: "Order WS 2" });

    const listRes = await request(app).get("/api/workspaces");
    const ids: string[] = listRes.body.data.map((w: { id: string }) => w.id);
    expect(ids.length).toBeGreaterThanOrEqual(2);

    const reversed = [...ids].reverse();
    const putRes = await request(app).put("/api/workspaces/order").send({ order: reversed });
    expect(putRes.status).toBe(200);

    const after = await request(app).get("/api/workspaces");
    expect(after.body.data.map((w: { id: string }) => w.id)).toEqual(reversed);

    const unknown = await request(app).put("/api/workspaces/order").send({ order: ["nope"] });
    expect(unknown.status).toBe(400);

    const partial = await request(app)
      .put("/api/workspaces/order")
      .send({ order: [reversed[0]] });
    expect(partial.status).toBe(400);
  });
});
