import { describe, expect, it } from "vitest";
import { changedFields, describeChange, type AuditRow } from "./audit";

const base: AuditRow = {
  id: 1,
  table_name: "projects",
  record_id: "x",
  action: "update",
  changed_by: null,
  changed_at: "2026-10-22T10:00:00Z",
  old_data: { name: "Hospital", stage: "documentation", updated_at: "a" },
  new_data: { name: "Hospital", stage: "diagnosis", updated_at: "b" },
};

describe("audit log", () => {
  it("describes what changed", () => {
    expect(changedFields(base)).toEqual(["etapa"]);
    expect(describeChange(base)).toBe('alterou projeto "Hospital" (etapa)');
    expect(describeChange({ ...base, action: "insert", table_name: "clients", old_data: null })).toBe(
      'criou cliente "Hospital"',
    );
    expect(describeChange({ ...base, action: "delete", table_name: "project_documents", new_data: null, old_data: { item_key: "cnpj" } })).toBe(
      'excluiu documento "cnpj"',
    );
  });
});
