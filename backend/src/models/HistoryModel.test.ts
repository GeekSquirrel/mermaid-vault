import { describe, expect, it } from "vitest";
import { HistoryModel } from "./HistoryModel.js";

describe("HistoryModel CRUD operations", () => {
  it("should create, read, update, and delete a history entry", () => {
    // 1. Create entry
    const name = "flowchart-v1";
    const state = { code: "graph TD\n  A --> B", mermaid: '{"theme":"dark"}' };
    const entry = HistoryModel.create({ name, state });

    expect(entry.id).toBeDefined();
    expect(entry.name).toBe(name);
    expect(entry.state).toEqual(state);
    expect(entry.type).toBe("manual");
    expect(entry.time).toBeGreaterThan(0);

    // 2. Read by ID
    const fetched = HistoryModel.getById(entry.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.id).toBe(entry.id);
    expect(fetched?.name).toBe(name);
    expect(fetched?.state).toEqual(state);

    // 3. List all
    const all = HistoryModel.getAll("manual");
    expect(all.some((h) => h.id === entry.id)).toBe(true);

    // 4. Update
    const updatedName = "flowchart-v2";
    const updatedState = { code: "graph LR\n  A --> B" };
    const updated = HistoryModel.update(entry.id, {
      name: updatedName,
      state: updatedState,
    });
    expect(updated).not.toBeNull();
    expect(updated?.name).toBe(updatedName);
    expect(updated?.state).toEqual(updatedState);

    // 5. Delete
    const deleted = HistoryModel.delete(entry.id);
    expect(deleted).toBe(true);

    // 6. Verify deletion
    const afterDelete = HistoryModel.getById(entry.id);
    expect(afterDelete).toBeNull();
  });

  it("should clear entries by type", () => {
    HistoryModel.create({ name: "clear-test-1", state: { code: "A" }, type: "manual" });
    HistoryModel.create({ name: "clear-test-2", state: { code: "B" }, type: "manual" });
    expect(HistoryModel.getAll("manual").length).toBeGreaterThanOrEqual(2);

    HistoryModel.clearAll("manual");
    expect(HistoryModel.getAll("manual").length).toBe(0);
  });
});
