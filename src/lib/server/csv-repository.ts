import { constants } from "node:fs";
import { copyFile, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { tableSchemas, type TableName, type TableRow } from "@/lib/domain/schemas";
import { getDatabaseClient, usesPostgres, withDataWriteLock } from "@/lib/server/data-backend";

const projectRoot = process.cwd();
const localDataDirectory = path.join(projectRoot, "data", "local");
const templateDirectory = path.join(projectRoot, "data", "templates");

async function ensureLocalTable(table: TableName) {
  await mkdir(localDataDirectory, { recursive: true });

  const destination = path.join(localDataDirectory, `${table}.csv`);
  const source = path.join(templateDirectory, `${table}.csv`);

  try {
    await copyFile(source, destination, constants.COPYFILE_EXCL);
  } catch (error) {
    const code = error instanceof Error && "code" in error ? error.code : undefined;
    if (code !== "EEXIST") throw error;
  }

  return destination;
}

export async function readTable<K extends TableName>(table: K): Promise<TableRow<K>[]> {
  if (usesPostgres()) {
    const template = await readFile(path.join(templateDirectory, `${table}.csv`), "utf8");
    const headers = template.replace(/^\uFEFF/, "").split(/\r?\n/, 1)[0].split(",");
    const result = await getDatabaseClient()
      .unsafe(`select coalesce(json_agg(row_to_json(source)), '[]'::json)::text from "${table}" source`)
      .values();
    const encodedRows = result[0]?.[0];
    const rows = JSON.parse(String(encodedRows ?? "[]")) as Record<string, unknown>[];
    return rows.map((source, index) => {
      const row = Object.fromEntries(headers.map((header) => [header, databaseCell(header, source[header])]));
      const result = tableSchemas[table].safeParse(row);
      if (!result.success) {
        const issue = result.error.issues[0];
        const field = issue?.path.join(".") || "행";
        throw new Error(`${table} 테이블 ${index + 1}번째 데이터의 ${field} 형식이 올바르지 않습니다: ${issue?.message ?? "알 수 없는 오류"}`);
      }
      return result.data as TableRow<K>;
    });
  }

  const filePath = await ensureLocalTable(table);
  const source = await readFile(filePath, "utf8");
  const rows = parse(source, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
  }) as Record<string, string>[];

  return rows.map((row, index) => {
    const result = tableSchemas[table].safeParse(row);
    if (!result.success) {
      throw new Error(`${table}.csv ${index + 2}행의 형식이 올바르지 않습니다: ${result.error.issues[0]?.message ?? "알 수 없는 오류"}`);
    }
    return result.data as TableRow<K>;
  });
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function databaseCell(header: string, value: unknown) {
  if (value === null || value === undefined) return "";
  if (header.endsWith("_date")) {
    const date = String(value).match(/\d{4}-\d{2}-\d{2}/)?.[0];
    if (date) return date;
  }
  if (header.endsWith("_at") && value instanceof Date) return value.toISOString();
  return value;
}

export async function writeTables(updates: Partial<{ [K in TableName]: TableRow<K>[] }>) {
  if (usesPostgres()) {
    const write = async () => {
      const database = getDatabaseClient();
      for (const [tableName, rows] of Object.entries(updates) as [TableName, TableRow<TableName>[]][]) {
        const template = await readFile(path.join(templateDirectory, `${tableName}.csv`), "utf8");
        const headers = template.replace(/^\uFEFF/, "").split(/\r?\n/, 1)[0].split(",");
        const validated = rows.map((row, index) => {
          const result = tableSchemas[tableName].safeParse(row);
          if (!result.success) throw new Error(`${tableName} ${index + 1}번째 데이터가 올바르지 않습니다: ${result.error.issues[0]?.message}`);
          return result.data as Record<string, unknown>;
        });

        await database.unsafe(`delete from "${tableName}"`);
        if (validated.length) {
          await database`insert into ${database(tableName)} ${database(validated, ...headers)}`;
        }
      }
    };

    await withDataWriteLock(write);
    return;
  }

  const transactionId = `${process.pid}-${Date.now()}`;
  const prepared: Array<{ destination: string; temporary: string; backup: string }> = [];

  try {
    for (const [tableName, rows] of Object.entries(updates) as [TableName, TableRow<TableName>[]][]) {
      const destination = await ensureLocalTable(tableName);
      const template = await readFile(path.join(templateDirectory, `${tableName}.csv`), "utf8");
      const headers = template.replace(/^\uFEFF/, "").split(/\r?\n/, 1)[0].split(",");
      const validated = rows.map((row, index) => {
        const result = tableSchemas[tableName].safeParse(row);
        if (!result.success) throw new Error(`${tableName} ${index + 1}번째 데이터가 올바르지 않습니다: ${result.error.issues[0]?.message}`);
        return result.data as Record<string, unknown>;
      });
      const body = [headers.join(","), ...validated.map((row) => headers.map((header) => csvCell(row[header])).join(","))].join("\n") + "\n";
      const temporary = `${destination}.${transactionId}.tmp`;
      const backup = `${destination}.${transactionId}.bak`;
      await writeFile(temporary, body, "utf8");
      prepared.push({ destination, temporary, backup });
    }

    for (const file of prepared) await rename(file.destination, file.backup);
    try {
      for (const file of prepared) await rename(file.temporary, file.destination);
    } catch (error) {
      for (const file of prepared) {
        await rm(file.destination, { force: true });
        await rename(file.backup, file.destination).catch(() => undefined);
      }
      throw error;
    }
    for (const file of prepared) await rm(file.backup, { force: true });
  } finally {
    for (const file of prepared) {
      await rm(file.temporary, { force: true });
      if (!(await readFile(file.destination).then(() => true).catch(() => false))) {
        await rename(file.backup, file.destination).catch(() => undefined);
      }
    }
  }
}
