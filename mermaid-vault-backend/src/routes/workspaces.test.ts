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
    // Oldest existing workspace receives projects without an explicit workspace_id
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

    // 4. Create a project inside the workspace
    const projectRes = await request(app)
      .post("/api/projects")
      .send({ title: "WS Project", code: "graph TD; A-->B", workspace_id: workspaceId });
    expect(projectRes.status).toBe(201);
    expect(projectRes.body.data.workspace_id).toBe(workspaceId);
    const projectId = projectRes.body.data.id;

    // 5. Unknown workspace on project create falls back to the oldest workspace
    const badRes = await request(app)
      .post("/api/projects")
      .send({ title: "Bad", code: "graph TD; A-->B", workspace_id: "does-not-exist" });
    expect(badRes.status).toBe(201);
    expect(badRes.body.data.workspace_id).toBe(oldestId);
    await request(app).delete(`/api/projects/${badRes.body.data.id}`);

    // 6. Delete workspace: project falls back to the oldest remaining workspace
    const deleteRes = await request(app).delete(`/api/workspaces/${workspaceId}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.data.deleted).toBe(true);

    const orphanRes = await request(app).get(`/api/projects/${projectId}`);
    expect(orphanRes.status).toBe(200);
    expect(orphanRes.body.data.workspace_id).toBe(oldestId);

    // Cleanup
    await request(app).delete(`/api/projects/${projectId}`);
  });

  it("should allow deleting the seeded workspace and reject invalid names", async () => {
    // Create a project (it lands in the oldest workspace) to verify the takeover
    const projectRes = await request(app)
      .post("/api/projects")
      .send({ title: "Sample Project", code: "graph TD; A-->B" });
    expect(projectRes.status).toBe(201);
    const projectId = projectRes.body.data.id;

    const listRes = await request(app).get("/api/workspaces");
    const oldestId = listRes.body.data[0].id;

    const deleteOldest = await request(app).delete(`/api/workspaces/${oldestId}`);
    expect(deleteOldest.status).toBe(200);
    expect(deleteOldest.body.data.deleted).toBe(true);

    // The project must still belong to an existing workspace
    const movedRes = await request(app).get(`/api/projects/${projectId}`);
    expect(movedRes.status).toBe(200);
    expect(movedRes.body.data.workspace_id).not.toBe(oldestId);
    const workspaceRes = await request(app).get(`/api/workspaces/${movedRes.body.data.workspace_id}`);
    expect(workspaceRes.status).toBe(200);

    await request(app).delete(`/api/projects/${projectId}`);

    const emptyName = await request(app).post("/api/workspaces").send({ name: "   " });
    expect(emptyName.status).toBe(400);

    const missing = await request(app).get("/api/workspaces/no-such-workspace");
    expect(missing.status).toBe(404);
  });
});
