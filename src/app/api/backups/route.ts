import { NextResponse } from "next/server";
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  commitBackupRestore,
  getBackupDescriptor,
  parseAndValidateBackupTables,
  requiredBackupFiles,
  type BackupCsvMap,
} from "@/lib/server/backup";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const descriptor = await getBackupDescriptor();
    return NextResponse.json(descriptor, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "백업 정보를 만들지 못했습니다." }, { status: 500 });
  }
}

type RestoreBody = {
  action?: unknown;
  confirm?: unknown;
  format?: unknown;
  version?: unknown;
  tables?: Partial<BackupCsvMap>;
  uploaded_files?: unknown;
};

export async function POST(request: Request) {
  try {
    const body = await request.json() as RestoreBody;
    if (body.format !== BACKUP_FORMAT || body.version !== BACKUP_VERSION) {
      throw new Error("현재 앱에서 만든 백업 ZIP만 복구할 수 있습니다.");
    }
    const rows = await parseAndValidateBackupTables(body.tables ?? {});
    const requiredFiles = requiredBackupFiles(rows);
    if (body.action === "validate") {
      return NextResponse.json({ valid: true, tables: Object.keys(body.tables ?? {}).length, files: requiredFiles });
    }
    if (body.action !== "commit" || body.confirm !== "RESTORE") throw new Error("복구 확인값이 올바르지 않습니다.");
    const uploaded = Array.isArray(body.uploaded_files) ? body.uploaded_files.filter((value): value is string => typeof value === "string").sort() : [];
    if (uploaded.length !== requiredFiles.length || uploaded.some((filePath, index) => filePath !== requiredFiles[index])) {
      throw new Error("ZIP 안의 필수 파일이 모두 업로드되지 않았습니다.");
    }
    const result = await commitBackupRestore(rows);
    return NextResponse.json({ restored: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "백업을 복구하지 못했습니다." }, { status: 400 });
  }
}
