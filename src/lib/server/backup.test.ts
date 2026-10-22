import { describe, expect, it } from "vitest";
import { BACKUP_TABLES, getBackupDescriptor, parseAndValidateBackupTables, requiredBackupFiles } from "@/lib/server/backup";

describe("backup", () => {
  it("현재 데이터를 10개 CSV와 등록 파일 목록으로 구성한다", async () => {
    const descriptor = await getBackupDescriptor();
    expect(descriptor.manifest.tables).toEqual([...BACKUP_TABLES]);
    expect(Object.keys(descriptor.tables)).toHaveLength(10);
    const rows = await parseAndValidateBackupTables(descriptor.tables);
    expect(requiredBackupFiles(rows)).toEqual(descriptor.files);
  });

  it("필수 CSV가 빠진 백업을 거부한다", async () => {
    const descriptor = await getBackupDescriptor();
    const incomplete = { ...descriptor.tables } as Partial<typeof descriptor.tables>;
    delete incomplete.people;
    await expect(parseAndValidateBackupTables(incomplete)).rejects.toThrow("people.csv가 없습니다");
  });

  it("중복 담당자 연결을 거부한다", async () => {
    const descriptor = await getBackupDescriptor();
    const duplicate = `${descriptor.tables.project_assignees}${descriptor.tables.project_assignees.split(/\r?\n/)[1]}\n`;
    await expect(parseAndValidateBackupTables({ ...descriptor.tables, project_assignees: duplicate })).rejects.toThrow("중복");
  });
});
