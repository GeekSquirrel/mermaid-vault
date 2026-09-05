import { describe, expect, it } from "vitest";
import { HistoryModel } from "./HistoryModel.js";
import { DiagramModel } from "./DiagramModel.js";

describe("DiagramModel CRUD operations", () => {
  it("should create, read, update, and delete a diagram", () => {
    // Create
    const title = "Test Architecture Diagram";
    const code = "graph TD\n  A --> B";
    const diagram = DiagramModel.create(title, code);

    expect(diagram.id).toBeDefined();
    expect(diagram.title).toBe(title);
    expect(diagram.code).toBe(code);
    expect(diagram.created_at).toBeGreaterThan(0);
    expect(diagram.updated_at).toBeGreaterThan(0);

    // Read by ID
    const fetched = DiagramModel.getById(diagram.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.id).toBe(diagram.id);
    expect(fetched?.title).toBe(title);

    // List all
    const all = DiagramModel.getAll();
    expect(all.some((p) => p.id === diagram.id)).toBe(true);

    // Update
    const updatedTitle = "Updated Diagram Title";
    const updatedCode = "graph LR\n  Start --> End";
    const updated = DiagramModel.update(diagram.id, updatedTitle, updatedCode);
    expect(updated).not.toBeNull();
    expect(updated?.title).toBe(updatedTitle);
    expect(updated?.code).toBe(updatedCode);
    expect(updated?.updated_at).toBeGreaterThanOrEqual(diagram.updated_at);

    // Delete
    const deleted = DiagramModel.delete(diagram.id);
    expect(deleted).toBe(true);

    // Verify deletion
    const afterDelete = DiagramModel.getById(diagram.id);
    expect(afterDelete).toBeNull();
  });

  it("should cascade delete associated history entries when diagram is deleted", () => {
    const diagram = DiagramModel.create("Cascading Test Diagram", "graph TD; C-->D");
    HistoryModel.create({
      name: "snapshot-1",
      state: { code: "graph TD; C-->D" },
      diagramId: diagram.id,
    });
    HistoryModel.create({
      name: "snapshot-2",
      state: { code: "graph TD; C-->D v2" },
      diagramId: diagram.id,
    });

    expect(HistoryModel.getAll("manual", diagram.id)).toHaveLength(2);

    const deleted = DiagramModel.delete(diagram.id);
    expect(deleted).toBe(true);

    expect(DiagramModel.getById(diagram.id)).toBeNull();
    expect(HistoryModel.getAll("manual", diagram.id)).toHaveLength(0);
  });
});


