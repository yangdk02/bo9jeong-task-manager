import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { parse } from "csv-parse/sync";
import postgres from "postgres";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const seedDirectory = path.join(projectRoot, "data", "seed");
const seedFileDirectory = path.join(projectRoot, "data", "seed-files");
const force = process.argv.includes("--force");
const connectionString = process.env.POSTGRES_URL?.trim() || process.env.DATABASE_URL?.trim();
const supabaseUrl = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseKey = process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "bo9jeong-files";

if (!connectionString || !supabaseUrl || !supabaseKey) {
  throw new Error("POSTGRES_URL, SUPABASE_URL, SUPABASE_SECRET_KEY 환경변수가 필요합니다.");
}

const database = postgres(connectionString, { max: 1, prepare: false });
const storage = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });
const tableOrder = ["people", "projects", "project_assignees", "tasks", "task_assignees", "works", "work_assignees", "work_files", "assets", "comments"];

try {
  const schema = await readFile(path.join(projectRoot, "supabase", "schema.sql"), "utf8");
  await database.unsafe(schema);
  console.log("Supabase schema ready.");

  const [{ count }] = await database`select count(*)::int as count from people`;
  if (count > 0 && !force) {
    console.log("Existing data detected. Seed import skipped. Use --force only when a full reset is intended.");
  } else {
    await database.begin(async (transaction) => {
      await transaction.unsafe("select pg_advisory_xact_lock(hashtext('bo9jeong-data-write'))");
      if (force) {
        for (const table of [...tableOrder].reverse()) await transaction.unsafe(`delete from "${table}"`);
      }

      for (const table of tableOrder) {
        const source = await readFile(path.join(seedDirectory, `${table}.csv`), "utf8");
        const rows = parse(source, { bom: true, columns: true, skip_empty_lines: true });
        if (!rows.length) continue;
        if (table === "tasks") for (const row of rows) row.target_count = Number(row.target_count);
        const columns = Object.keys(rows[0]);
        await transaction`insert into ${transaction(table)} ${transaction(rows, ...columns)}`;
        console.log(`seeded ${table}: ${rows.length}`);
      }
    });
  }

  const { error: bucketError } = await storage.storage.createBucket(bucket, { public: false });
  if (bucketError && !/already exists|duplicate/i.test(bucketError.message)) throw bucketError;

  const manifest = JSON.parse(await readFile(path.join(seedFileDirectory, "manifest.json"), "utf8"));
  let uploaded = 0;
  for (const [logicalPath, seedFile] of Object.entries(manifest.files)) {
    const objectPath = logicalPath.replace(/^storage\//, "");
    const contents = await readFile(path.join(seedFileDirectory, seedFile));
    const { error } = await storage.storage.from(bucket).upload(objectPath, contents, { contentType: "image/png", upsert: force });
    if (error && !/already exists|duplicate/i.test(error.message)) throw error;
    if (!error) uploaded += 1;
  }
  console.log(`Storage bucket ready: ${bucket} (${uploaded} files uploaded)`);
} finally {
  await database.end();
}

