import { describe, expect, it } from "vitest";
import { HistoryModel } from "./HistoryModel.js";
import { ProjectModel } from "./ProjectModel.js";

describe("ProjectModel CRUD operations", () => {
  it("should create, read, update, and delete a project", () => {
    // Create
    const title = "Test Architecture Diagram";
    const code = "graph TD\n  A --> B";
    const project = ProjectModel.create(title, code);

    expect(project.id).toBeDefined();
    expect(project.title).toBe(title);
    expect(project.code).toBe(code);
    expect(project.created_at).toBeGreaterThan(0);
    expect(project.updated_at).toBeGreaterThan(0);

    // Read by ID
    const fetched = ProjectModel.getById(project.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.id).toBe(project.id);
    expect(fetched?.title).toBe(title);

    // List all
    const all = ProjectModel.getAll();
    expect(all.some((p) => p.id === project.id)).toBe(true);

    // Update
    const updatedTitle = "Updated Diagram Title";
    const updatedCode = "graph LR\n  Start --> End";
    const updated = ProjectModel.update(project.id, updatedTitle, updatedCode);
    expect(updated).not.toBeNull();
    expect(updated?.title).toBe(updatedTitle);
    expect(updated?.code).toBe(updatedCode);
    expect(updated?.updated_at).toBeGreaterThanOrEqual(project.updated_at);

    // Delete
    const deleted = ProjectModel.delete(project.id);
    expect(deleted).toBe(true);

    // Verify deletion
    const afterDelete = ProjectModel.getById(project.id);
    expect(afterDelete).toBeNull();
  });

  it("should cascade delete associated history entries when project is deleted", () => {
    const project = ProjectModel.create("Cascading Test Project", "graph TD; C-->D");
    HistoryModel.create({
      name: "snapshot-1",
      state: { code: "graph TD; C-->D" },
      projectId: project.id,
    });
    HistoryModel.create({
      name: "snapshot-2",
      state: { code: "graph TD; C-->D v2" },
      projectId: project.id,
    });

    expect(HistoryModel.getAll("manual", project.id)).toHaveLength(2);

    const deleted = ProjectModel.delete(project.id);
    expect(deleted).toBe(true);

    expect(ProjectModel.getById(project.id)).toBeNull();
    expect(HistoryModel.getAll("manual", project.id)).toHaveLength(0);
  });
});


