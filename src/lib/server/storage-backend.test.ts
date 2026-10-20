import { describe, expect, it } from "vitest";
import { storageObjectPath } from "@/lib/server/storage-backend";

describe("storageObjectPath", () => {
  it("keeps the logical path below storage", () => {
    expect(storageObjectPath("storage/work_files/WRK-001/evidence.png")).toBe("work_files/WRK-001/evidence.png");
    expect(storageObjectPath("storage\\assets\\PRJ-001\\logo.ai")).toBe("assets/PRJ-001/logo.ai");
  });

  it("rejects paths outside the storage namespace", () => {
    expect(() => storageObjectPath("data/local/works.csv")).toThrow("잘못된 저장 파일 경로");
    expect(() => storageObjectPath("storage/../people.csv")).toThrow("잘못된 저장 파일 경로");
    expect(() => storageObjectPath("storage/work_files/.." )).toThrow("잘못된 저장 파일 경로");
  });
});

