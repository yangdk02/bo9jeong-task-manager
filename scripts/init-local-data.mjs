import { copyFile, mkdir, readFile, readdir } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const templateDir = path.join(projectRoot, "data", "templates");
const seedDir = path.join(projectRoot, "data", "seed");
const seedFileDir = path.join(projectRoot, "data", "seed-files");
const localDir = path.join(projectRoot, "data", "local");
const useSeed = process.argv.includes("--seed");

const storageDirs = [
  path.join(projectRoot, "storage", "work_files"),
  path.join(projectRoot, "storage", "assets"),
  path.join(projectRoot, "storage", "generated_reports"),
];

await mkdir(localDir, { recursive: true });
await Promise.all(storageDirs.map((dir) => mkdir(dir, { recursive: true })));

const sourceDir = useSeed ? seedDir : templateDir;
const templates = (await readdir(sourceDir))
  .filter((name) => name.toLowerCase().endsWith(".csv"))
  .sort();

let created = 0;
let preserved = 0;

for (const fileName of templates) {
  const source = path.join(sourceDir, fileName);
  const destination = path.join(localDir, fileName);

  try {
    await copyFile(source, destination, constants.COPYFILE_EXCL);
    created += 1;
    console.log(`created   data/local/${fileName}`);
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
    preserved += 1;
    console.log(`preserved data/local/${fileName}`);
  }
}

if (useSeed) {
  const manifest = JSON.parse(await readFile(path.join(seedFileDir, "manifest.json"), "utf8"));
  for (const [logicalPath, seedFile] of Object.entries(manifest.files)) {
    const destination = path.resolve(projectRoot, ...logicalPath.split("/"));
    const storageRoot = path.resolve(projectRoot, "storage");
    if (!destination.startsWith(`${storageRoot}${path.sep}`)) throw new Error(`invalid seed path: ${logicalPath}`);
    await mkdir(path.dirname(destination), { recursive: true });
    try {
      await copyFile(path.join(seedFileDir, seedFile), destination, constants.COPYFILE_EXCL);
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
    }
  }
}

console.log(`local data ready: ${created} created, ${preserved} preserved${useSeed ? ", sample files ready" : ""}`);
