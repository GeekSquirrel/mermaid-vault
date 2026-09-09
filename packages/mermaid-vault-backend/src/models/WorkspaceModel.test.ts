import { describe, expect, it } from "vitest";
import { DiagramModel } from "./DiagramModel.js";
import { WorkspaceModel } from "./WorkspaceModel.js";

/** Remove every diagram and workspace so a test starts from a known state. */
function resetToEmpty() {
  for (const p of DiagramModel.getAll()) {
    DiagramModel.delete(p.id);
  }
  for (const w of WorkspaceModel.getAll()) {
    WorkspaceModel.delete(w.id);
  }
}

describe("WorkspaceModel CRUD operations", () => {
  it("should seed a sample workspace on first initialization", () => {
    const all = WorkspaceModel.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe("Sample Workspace");
  });

  it("should create, read, update, and delete a workspace", () => {
    const created = WorkspaceModel.create("Engineering");
    expect(created.id).toBeDefined();
    expect(created.name).toBe("Engineering");
    expect(created.created_at).toBeGreaterThan(0);

    const fetched = WorkspaceModel.getById(created.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.name).toBe("Engineering");

    const renamed = WorkspaceModel.update(created.id, "Design");
    expect(renamed).not.toBeNull();
    expect(renamed?.name).toBe("Design");

    expect(WorkspaceModel.delete(created.id)).toBe(true);
    expect(WorkspaceModel.getById(created.id)).toBeNull();
  });

  it("should move diagrams to the oldest remaining workspace when a workspace is deleted", () => {
    resetToEmpty();
    const first = WorkspaceModel.create("First");
    const second = WorkspaceModel.create("Second");
    const diagram = DiagramModel.create("In Second", "graph TD; A-->B", second.id);

    expect(WorkspaceModel.delete(second.id)).toBe(true);

    const moved = DiagramModel.getById(diagram.id);
    expect(moved?.workspace_id).toBe(first.id);
  });

  it("should create a new workspace when the last one with diagrams is deleted", () => {
    resetToEmpty();
    const only = WorkspaceModel.create("Only One");
    const diagram = DiagramModel.create("Keeper", "graph TD; A-->B", only.id);

    expect(WorkspaceModel.delete(only.id)).toBe(true);

    const all = WorkspaceModel.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe("My Workspace");

    const moved = DiagramModel.getById(diagram.id);
    expect(moved?.workspace_id).toBe(all[0].id);
    expect(moved?.workspace_id).not.toBe(only.id);
  });

  it("should leave an empty list when the last workspace has no diagrams", () => {
    resetToEmpty();
    const only = WorkspaceModel.create("Empty One");
    expect(WorkspaceModel.delete(only.id)).toBe(true);
    expect(WorkspaceModel.getAll()).toHaveLength(0);

    // ensureUsableWorkspace creates a workspace for the next diagram
    const wsId = WorkspaceModel.ensureUsableWorkspace(undefined);
    expect(WorkspaceModel.exists(wsId)).toBe(true);
  });

  it("should persist manual workspace ordering", () => {
    resetToEmpty();
    const a = WorkspaceModel.create("A");
    const b = WorkspaceModel.create("B");
    const c = WorkspaceModel.create("C");
    // New workspaces appear at the top of the list
    expect(WorkspaceModel.getAll().map((w) => w.name)).toEqual(["C", "B", "A"]);

    WorkspaceModel.updateOrder([a.id, b.id, c.id]);
    expect(WorkspaceModel.getAll().map((w) => w.name)).toEqual(["A", "B", "C"]);
  });

  it("should fall back to an existing workspace for new diagrams when the preferred one is missing", () => {
    const wsId = WorkspaceModel.ensureUsableWorkspace("no-such-workspace");
    expect(wsId).not.toBe("no-such-workspace");
    expect(WorkspaceModel.exists(wsId)).toBe(true);
  });

  it("should assign new diagrams to the oldest workspace when none is specified", () => {
    resetToEmpty();
    const oldest = WorkspaceModel.create("Oldest");
    WorkspaceModel.create("Newer");
    const diagram = DiagramModel.create("No Workspace Given", "graph TD; A-->B");
    expect(diagram.workspace_id).toBe(oldest.id);
  });
});
