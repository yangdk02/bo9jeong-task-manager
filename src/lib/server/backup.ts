import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { tableSchemas, type TableName, type TableRow } from "@/lib/domain/schemas";
import { readTables, writeTables } from "@/lib/server/csv-repository";
import { removeStoredFiles } from "@/lib/server/storage-backend";
import { PLACE_MONTHLY_TASK_NAME } from "@/lib/domain/task-catalog";

export const BACKUP_TABLES = [
  "people",
  "projects",
  "project_assignees",
  "tasks",
  "task_assignees",
  "works",
  "work_assignees",
  "work_files",
  "place_monthly_metrics",
  "assets",
  "comments",
] as const satisfies readonly TableName[];

export const BACKUP_FORMAT = "bo9jeong-task-manager-backup";
export const BACKUP_VERSION = 2;

type BackupRows = { [K in TableName]: TableRow<K>[] };
export type BackupCsvMap = { [K in TableName]: string };

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

async function tableHeaders(table: TableName) {
  const template = await readFile(path.join(process.cwd(), "data", "templates", `${table}.csv`), "utf8");
  return template.replace(/^\uFEFF/, "").split(/\r?\n/, 1)[0].split(",");
}

async function serializeTable(table: TableName, rows: Record<string, unknown>[]) {
  const headers = await tableHeaders(table);
  return [headers.join(","), ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))].join("\n") + "\n";
}

export async function getBackupDescriptor() {
  const rows = await readTables(BACKUP_TABLES);
  const tables = {} as BackupCsvMap;
  await Promise.all(BACKUP_TABLES.map(async (table, index) => {
    tables[table] = await serializeTable(table, rows[index] as unknown as Record<string, unknown>[]);
  }));

  const workFiles = rows[7] as BackupRows["work_files"];
  const assets = rows[9] as BackupRows["assets"];
  const files = [...new Set([...workFiles.map((item) => item.file_path), ...assets.map((item) => item.file_path)])].sort();
  files.forEach(validateStoragePath);

  return {
    manifest: {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      created_at: new Date().toISOString(),
      tables: [...BACKUP_TABLES],
      file_count: files.length,
    },
    tables,
    files,
  };
}

export function validateStoragePath(filePath: string) {
  const normalized = filePath.replaceAll("\\", "/");
  const segments = normalized.split("/");
  if (normalized !== filePath || segments[0] !== "storage" || segments.length < 3 || segments.some((part) => !part || part === "." || part === "..")) {
    throw new Error(`백업에 잘못된 파일 경로가 있습니다: ${filePath}`);
  }
  return normalized;
}

export async function parseAndValidateBackupTables(csvTables: Partial<Record<TableName, unknown>>) {
  const parsed = {} as BackupRows;
  for (const table of BACKUP_TABLES) {
    const source = csvTables[table];
    if (typeof source !== "string") throw new Error(`${table}.csv가 없습니다.`);
    const headers = await tableHeaders(table);
    const sourceHeaders = source.replace(/^\uFEFF/, "").split(/\r?\n/, 1)[0]?.split(",") ?? [];
    if (headers.join(",") !== sourceHeaders.join(",")) throw new Error(`${table}.csv의 컬럼 구성이 현재 앱과 다릅니다.`);
    const rawRows = parse(source, { bom: true, columns: true, skip_empty_lines: true }) as Record<string, string>[];
    parsed[table] = rawRows.map((row, index) => {
      const result = tableSchemas[table].safeParse(row);
      if (!result.success) {
        const issue = result.error.issues[0];
        throw new Error(`${table}.csv ${index + 2}행의 ${issue?.path.join(".") || "값"} 형식이 올바르지 않습니다.`);
      }
      return result.data;
    }) as never;
  }
  validateRelations(parsed);
  return parsed;
}

function ensureUnique(rows: Array<Record<string, unknown>>, field: string, table: string) {
  const seen = new Set<string>();
  for (const row of rows) {
    const value = String(row[field] ?? "");
    if (seen.has(value)) throw new Error(`${table}에 중복된 ${field} 값이 있습니다: ${value}`);
    seen.add(value);
  }
}

function ensureLinks(
  rows: Array<Record<string, unknown>>,
  field: string,
  targets: Set<string>,
  table: string,
) {
  for (const row of rows) {
    const value = String(row[field] ?? "");
    if (value && !targets.has(value)) throw new Error(`${table}.${field}가 존재하지 않는 항목을 가리킵니다: ${value}`);
  }
}

function validateRelations(rows: BackupRows) {
  for (const table of BACKUP_TABLES) {
    const idField = table === "people" ? "person_id" : table === "projects" ? "project_id" :
      table === "project_assignees" ? "project_assignee_id" : table === "tasks" ? "task_id" :
      table === "task_assignees" ? "task_assignee_id" : table === "works" ? "work_id" :
      table === "work_assignees" ? "work_assignee_id" : table === "work_files" ? "work_file_id" :
      table === "place_monthly_metrics" ? "place_metric_id" : table === "assets" ? "asset_id" : "comment_id";
    ensureUnique(rows[table] as unknown as Array<Record<string, unknown>>, idField, table);
  }

  const people = new Set(rows.people.map((row) => row.person_id));
  const projects = new Set(rows.projects.map((row) => row.project_id));
  const tasks = new Set(rows.tasks.map((row) => row.task_id));
  const works = new Set(rows.works.map((row) => row.work_id));
  const assets = new Set(rows.assets.map((row) => row.asset_id));

  ensureLinks(rows.projects, "created_by", people, "projects");
  ensureLinks(rows.project_assignees, "project_id", projects, "project_assignees");
  ensureLinks(rows.project_assignees, "person_id", people, "project_assignees");
  ensureLinks(rows.tasks, "project_id", projects, "tasks");
  ensureLinks(rows.tasks, "created_by", people, "tasks");
  ensureLinks(rows.task_assignees, "task_id", tasks, "task_assignees");
  ensureLinks(rows.task_assignees, "person_id", people, "task_assignees");
  ensureLinks(rows.works, "task_id", tasks, "works");
  ensureLinks(rows.works, "created_by", people, "works");
  ensureLinks(rows.work_assignees, "work_id", works, "work_assignees");
  ensureLinks(rows.work_assignees, "person_id", people, "work_assignees");
  ensureLinks(rows.work_files, "work_id", works, "work_files");
  ensureLinks(rows.work_files, "uploaded_by", people, "work_files");
  ensureLinks(rows.place_monthly_metrics, "task_id", tasks, "place_monthly_metrics");
  ensureLinks(rows.place_monthly_metrics, "entered_by", people, "place_monthly_metrics");
  const taskById = new Map(rows.tasks.map((row) => [row.task_id, row]));
  for (const metric of rows.place_monthly_metrics) {
    if (taskById.get(metric.task_id)?.task_name !== PLACE_MONTHLY_TASK_NAME) throw new Error(`플레이스 방문자 수는 '${PLACE_MONTHLY_TASK_NAME}' 과업에만 연결할 수 있습니다.`);
  }
  ensureLinks(rows.assets, "project_id", projects, "assets");
  ensureLinks(rows.assets, "uploaded_by", people, "assets");
  ensureLinks(rows.assets.filter((row) => row.owner_person_id), "owner_person_id", people, "assets");
  ensureLinks(rows.comments.filter((row) => row.author_person_id), "author_person_id", people, "comments");

  for (const row of rows.comments) {
    const targets = row.target_type === "work" ? works : assets;
    if (!targets.has(row.target_id)) throw new Error(`comments.target_id가 존재하지 않는 ${row.target_type} 항목을 가리킵니다: ${row.target_id}`);
    if (row.comment_type === "assignee" && !row.author_person_id) throw new Error("담당자 댓글에는 작성 담당자가 필요합니다.");
  }

  for (const [table, left, right] of [
    ["project_assignees", "project_id", "person_id"],
    ["task_assignees", "task_id", "person_id"],
    ["work_assignees", "work_id", "person_id"],
  ] as const) {
    const values = new Set<string>();
    for (const row of rows[table] as unknown as Array<Record<string, unknown>>) {
      const key = `${row[left]}\u0000${row[right]}`;
      if (values.has(key)) throw new Error(`${table}에 중복 담당자 연결이 있습니다.`);
      values.add(key);
    }
  }

  const metricMonths = new Set<string>();
  for (const row of rows.place_monthly_metrics) {
    const key = `${row.task_id}\u0000${row.year_month}`;
    if (metricMonths.has(key)) throw new Error("place_monthly_metrics에 같은 과업·월 데이터가 중복되어 있습니다.");
    metricMonths.add(key);
  }

  [...rows.work_files.map((row) => row.file_path), ...rows.assets.map((row) => row.file_path)].forEach(validateStoragePath);
}

export function requiredBackupFiles(rows: BackupRows) {
  return [...new Set([...rows.work_files.map((row) => row.file_path), ...rows.assets.map((row) => row.file_path)])].sort();
}

export async function commitBackupRestore(rows: BackupRows) {
  const [currentWorkFiles, currentAssets] = await readTables(["work_files", "assets"]);
  const previousPaths = new Set([...currentWorkFiles.map((row) => row.file_path), ...currentAssets.map((row) => row.file_path)]);
  const nextPaths = new Set(requiredBackupFiles(rows));
  await writeTables(rows);
  const obsolete = [...previousPaths].filter((filePath) => !nextPaths.has(filePath));
  await removeStoredFiles(obsolete);
  return { tables: BACKUP_TABLES.length, files: nextPaths.size, removed_files: obsolete.length };
}
