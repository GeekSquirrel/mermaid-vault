import { describe, expect, it } from "bun:test";
import { ProjectModel } from "../models/ProjectModel.js";

describe("Project Controller & Model Integration", () => {
  it("should handle full lifecycle of a project", () => {
    const created = ProjectModel.create("Integration Project", "sequenceDiagram\nAlice->>Bob: Hello");
    expect(created.id).toBeDefined();

    const retrieved = ProjectModel.getById(created.id);
    expect(retrieved?.title).toBe("Integration Project");

    const updated = ProjectModel.update(created.id, "Renamed Integration Project");
    expect(updated?.title).toBe("Renamed Integration Project");
    expect(updated?.code).toBe("sequenceDiagram\nAlice->>Bob: Hello");

    const deleted = ProjectModel.delete(created.id);
    expect(deleted).toBe(true);

    const missing = ProjectModel.getById(created.id);
    expect(missing).toBeNull();
  });
});
