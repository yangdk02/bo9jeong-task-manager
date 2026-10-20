import { randomUUID } from "node:crypto";
import path from "node:path";
import { z } from "zod";
import { projectStatusSchema, workStatusSchema, type TableRow } from "@/lib/domain/schemas";
import { readTables, writeTables } from "@/lib/server/csv-repository";
import { withDataWriteLock } from "@/lib/server/data-backend";
import { removeStoredFiles, saveStoredFile } from "@/lib/server/storage-backend";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const personIds = z.array(z.string().min(1)).default([]).transform((ids) => [...new Set(ids)]);

export const projectInputSchema = z.object({
  vendor_name: z.string().trim().min(1, "업체명을 입력해 주세요."),
  project_name: z.string().trim().min(1, "프로젝트명을 입력해 주세요."),
  management_category: z.string().trim().default(""),
  start_date: date,
  end_date: date,
  status: projectStatusSchema,
  assignee_ids: personIds,
  actor_id: z.string().min(1),
}).refine((value) => value.start_date <= value.end_date, { message: "종료일은 시작일보다 빠를 수 없습니다.", path: ["end_date"] });

export const taskInputSchema = z.object({
  project_id: z.string().min(1),
  target_scope: z.enum(["SNS", "블로그", "디자인", "촬영", "영상", "네이버 플레이스", "광고", "기타"]),
  task_name: z.string().trim().min(1, "과업명을 입력해 주세요."),
  cycle: z.enum(["monthly", "once"]),
  target_count: z.coerce.number().int().nonnegative(),
  target_unit: z.enum(["건", "장", "곳", "회", "기타"]),
  status: projectStatusSchema,
  assignee_ids: personIds,
  actor_id: z.string().min(1),
});

export const workInputSchema = z.object({
  task_id: z.string().min(1),
  work_date: date,
  title: z.string().trim().min(1, "작업명을 입력해 주세요."),
  result_url: z.string().trim().refine((value) => value === "" || z.url().safeParse(value).success, "URL 형식이 아닙니다."),
  memo: z.string().trim().default(""),
  status: workStatusSchema,
  assignee_ids: personIds,
  actor_id: z.string().min(1),
});

export type ProjectInput = z.input<typeof projectInputSchema>;
export type TaskInput = z.input<typeof taskInputSchema>;
export type WorkInput = z.input<typeof workInputSchema>;

let mutationQueue = Promise.resolve();
function locked<T>(operation: () => Promise<T>) {
  const guarded = () => withDataWriteLock(operation);
  const run = mutationQueue.then(guarded, guarded);
  mutationQueue = run.then(() => undefined, () => undefined);
  return run;
}

function id(prefix: string) { return `${prefix}_${randomUUID().replaceAll("-", "").slice(0, 16)}`; }
function now() { return new Date().toISOString(); }
function ensureActor(people: TableRow<"people">[], actorId: string) {
  if (!people.some((person) => person.person_id === actorId)) throw new Error("현재 담당자를 다시 선택해 주세요.");
}
function ensureAssignees(people: TableRow<"people">[], ids: string[]) {
  const known = new Set(people.map((person) => person.person_id));
  if (ids.some((personId) => !known.has(personId))) throw new Error("존재하지 않는 담당자가 포함되어 있습니다.");
}

export async function createProject(raw: ProjectInput) {
  return locked(async () => {
    const input = projectInputSchema.parse(raw);
    const [people, projects, links] = await readTables(["people", "projects", "project_assignees"]);
    ensureActor(people, input.actor_id); ensureAssignees(people, input.assignee_ids);
    const projectId = id("proj");
    const project: TableRow<"projects"> = { project_id: projectId, vendor_name: input.vendor_name, project_name: input.project_name, management_category: input.management_category, start_date: input.start_date, end_date: input.end_date, status: input.status, created_by: input.actor_id, created_at: now() };
    await writeTables({ projects: [...projects, project], project_assignees: [...links, ...input.assignee_ids.map((personId) => ({ project_assignee_id: id("pa"), project_id: projectId, person_id: personId }))] });
    return projectId;
  });
}

export async function updateProject(projectId: string, raw: ProjectInput) {
  return locked(async () => {
    const input = projectInputSchema.parse(raw);
    const [people, projects, links] = await readTables(["people", "projects", "project_assignees"]);
    ensureActor(people, input.actor_id); ensureAssignees(people, input.assignee_ids);
    if (!projects.some((project) => project.project_id === projectId)) throw new Error("프로젝트를 찾을 수 없습니다.");
    await writeTables({
      projects: projects.map((project) => project.project_id === projectId ? { ...project, vendor_name: input.vendor_name, project_name: input.project_name, management_category: input.management_category, start_date: input.start_date, end_date: input.end_date, status: input.status } : project),
      project_assignees: [...links.filter((link) => link.project_id !== projectId), ...input.assignee_ids.map((personId) => ({ project_assignee_id: id("pa"), project_id: projectId, person_id: personId }))],
    });
  });
}

async function removePhysicalFiles(paths: string[]) {
  await removeStoredFiles(paths);
}

export async function deleteProject(projectId: string) {
  return locked(async () => {
    const [projects, projectLinks, tasks, taskLinks, works, workLinks, workFiles, assets, comments] = await readTables(["projects", "project_assignees", "tasks", "task_assignees", "works", "work_assignees", "work_files", "assets", "comments"]);
    if (!projects.some((project) => project.project_id === projectId)) throw new Error("프로젝트를 찾을 수 없습니다.");
    const taskIds = new Set(tasks.filter((task) => task.project_id === projectId).map((task) => task.task_id));
    const workIds = new Set(works.filter((work) => taskIds.has(work.task_id)).map((work) => work.work_id));
    const assetIds = new Set(assets.filter((asset) => asset.project_id === projectId).map((asset) => asset.asset_id));
    const deletedPaths = [...workFiles.filter((file) => workIds.has(file.work_id)).map((file) => file.file_path), ...assets.filter((asset) => assetIds.has(asset.asset_id)).map((asset) => asset.file_path)];
    await writeTables({
      projects: projects.filter((project) => project.project_id !== projectId), project_assignees: projectLinks.filter((link) => link.project_id !== projectId),
      tasks: tasks.filter((task) => !taskIds.has(task.task_id)), task_assignees: taskLinks.filter((link) => !taskIds.has(link.task_id)),
      works: works.filter((work) => !workIds.has(work.work_id)), work_assignees: workLinks.filter((link) => !workIds.has(link.work_id)), work_files: workFiles.filter((file) => !workIds.has(file.work_id)),
      assets: assets.filter((asset) => !assetIds.has(asset.asset_id)), comments: comments.filter((comment) => !(comment.target_type === "work" && workIds.has(comment.target_id)) && !(comment.target_type === "asset" && assetIds.has(comment.target_id))),
    });
    await removePhysicalFiles(deletedPaths);
  });
}

export async function createTask(raw: TaskInput) {
  return locked(async () => {
    const input = taskInputSchema.parse(raw);
    const [people, projects, tasks, links] = await readTables(["people", "projects", "tasks", "task_assignees"]);
    ensureActor(people, input.actor_id); ensureAssignees(people, input.assignee_ids);
    if (!projects.some((project) => project.project_id === input.project_id)) throw new Error("프로젝트를 찾을 수 없습니다.");
    const taskId = id("task");
    const task: TableRow<"tasks"> = { task_id: taskId, project_id: input.project_id, target_scope: input.target_scope, task_name: input.task_name, cycle: input.cycle, target_count: input.target_count, target_unit: input.target_unit, status: input.status, created_by: input.actor_id, created_at: now() };
    await writeTables({ tasks: [...tasks, task], task_assignees: [...links, ...input.assignee_ids.map((personId) => ({ task_assignee_id: id("ta"), task_id: taskId, person_id: personId }))] });
    return taskId;
  });
}

export async function updateTask(taskId: string, raw: TaskInput) {
  return locked(async () => {
    const input = taskInputSchema.parse(raw);
    const [people, projects, tasks, links] = await readTables(["people", "projects", "tasks", "task_assignees"]);
    ensureActor(people, input.actor_id); ensureAssignees(people, input.assignee_ids);
    const existing = tasks.find((task) => task.task_id === taskId);
    if (!existing) throw new Error("과업을 찾을 수 없습니다.");
    if (!projects.some((project) => project.project_id === input.project_id)) throw new Error("프로젝트를 찾을 수 없습니다.");
    await writeTables({ tasks: tasks.map((task) => task.task_id === taskId ? { ...task, project_id: input.project_id, target_scope: input.target_scope, task_name: input.task_name, cycle: input.cycle, target_count: input.target_count, target_unit: input.target_unit, status: input.status } : task), task_assignees: [...links.filter((link) => link.task_id !== taskId), ...input.assignee_ids.map((personId) => ({ task_assignee_id: id("ta"), task_id: taskId, person_id: personId }))] });
  });
}

export async function deleteTask(taskId: string) {
  return locked(async () => {
    const [tasks, taskLinks, works, workLinks, workFiles, comments] = await readTables(["tasks", "task_assignees", "works", "work_assignees", "work_files", "comments"]);
    if (!tasks.some((task) => task.task_id === taskId)) throw new Error("과업을 찾을 수 없습니다.");
    const workIds = new Set(works.filter((work) => work.task_id === taskId).map((work) => work.work_id));
    const deletedPaths = workFiles.filter((file) => workIds.has(file.work_id)).map((file) => file.file_path);
    await writeTables({ tasks: tasks.filter((task) => task.task_id !== taskId), task_assignees: taskLinks.filter((link) => link.task_id !== taskId), works: works.filter((work) => !workIds.has(work.work_id)), work_assignees: workLinks.filter((link) => !workIds.has(link.work_id)), work_files: workFiles.filter((file) => !workIds.has(file.work_id)), comments: comments.filter((comment) => !(comment.target_type === "work" && workIds.has(comment.target_id))) });
    await removePhysicalFiles(deletedPaths);
  });
}

const allowedExtensions = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".csv", ".zip", ".mp4", ".mov", ".avi", ".webm"]);
async function saveFiles(workId: string, actorId: string, files: File[]) {
  const created: TableRow<"work_files">[] = [];
  try {
    for (const file of files.filter((item) => item.size > 0)) {
      const extension = path.extname(file.name).toLowerCase();
      if (!allowedExtensions.has(extension)) throw new Error(`${file.name}: 지원하지 않는 파일 형식입니다.`);
      const fileId = id("wf");
      const safeName = path.basename(file.name).replace(/[^0-9A-Za-z가-힣._-]/g, "_");
      const storedName = `${fileId}_${safeName}`;
      const filePath = path.posix.join("storage", "work_files", workId, storedName);
      await saveStoredFile(filePath, Buffer.from(await file.arrayBuffer()), file.type || undefined);
      created.push({ work_file_id: fileId, work_id: workId, file_path: filePath, file_name: file.name, uploaded_by: actorId, uploaded_at: now() });
    }
    return created;
  } catch (error) {
    await Promise.all(created.map((file) => removePhysicalFiles([file.file_path])));
    throw error;
  }
}

export async function createWork(raw: unknown, files: File[] = []) {
  return locked(async () => {
    const input = workInputSchema.parse(raw);
    const [people, tasks, works, links, workFiles, comments] = await readTables(["people", "tasks", "works", "work_assignees", "work_files", "comments"]);
    ensureActor(people, input.actor_id); ensureAssignees(people, input.assignee_ids);
    if (!tasks.some((task) => task.task_id === input.task_id)) throw new Error("과업을 찾을 수 없습니다.");
    const workId = id("work"); const timestamp = now();
    const work: TableRow<"works"> = { work_id: workId, task_id: input.task_id, work_date: input.work_date, title: input.title, result_url: input.result_url, memo: input.memo, status: input.status, created_by: input.actor_id, created_at: timestamp, updated_at: timestamp };
    let addedFiles: TableRow<"work_files">[] = [];
    try {
      addedFiles = await saveFiles(workId, input.actor_id, files);
      await writeTables({ works: [...works, work], work_assignees: [...links, ...input.assignee_ids.map((personId) => ({ work_assignee_id: id("wa"), work_id: workId, person_id: personId }))], work_files: [...workFiles, ...addedFiles], comments: [...comments, { comment_id: id("comment"), target_type: "work", target_id: workId, author_person_id: input.actor_id, comment_type: "system", body: "작업이 등록되었습니다.", created_at: timestamp }] });
    } catch (error) { await removeStoredFiles(addedFiles.map((file) => file.file_path)); throw error; }
    return workId;
  });
}

export async function updateWork(workId: string, raw: unknown, files: File[] = []) {
  return locked(async () => {
    const input = workInputSchema.parse(raw);
    const [people, tasks, works, links, workFiles, comments] = await readTables(["people", "tasks", "works", "work_assignees", "work_files", "comments"]);
    ensureActor(people, input.actor_id); ensureAssignees(people, input.assignee_ids);
    if (!works.some((work) => work.work_id === workId)) throw new Error("작업을 찾을 수 없습니다.");
    if (!tasks.some((task) => task.task_id === input.task_id)) throw new Error("과업을 찾을 수 없습니다.");
    const timestamp = now(); let addedFiles: TableRow<"work_files">[] = [];
    try {
      addedFiles = await saveFiles(workId, input.actor_id, files);
      await writeTables({ works: works.map((work) => work.work_id === workId ? { ...work, task_id: input.task_id, work_date: input.work_date, title: input.title, result_url: input.result_url, memo: input.memo, status: input.status, updated_at: timestamp } : work), work_assignees: [...links.filter((link) => link.work_id !== workId), ...input.assignee_ids.map((personId) => ({ work_assignee_id: id("wa"), work_id: workId, person_id: personId }))], work_files: [...workFiles, ...addedFiles], comments: [...comments, { comment_id: id("comment"), target_type: "work", target_id: workId, author_person_id: input.actor_id, comment_type: "system", body: "작업 정보가 수정되었습니다.", created_at: timestamp }] });
    } catch (error) { await Promise.all(addedFiles.map((file) => removePhysicalFiles([file.file_path]))); throw error; }
  });
}

export async function deleteWork(workId: string) {
  return locked(async () => {
    const [works, links, files, comments] = await readTables(["works", "work_assignees", "work_files", "comments"]);
    if (!works.some((work) => work.work_id === workId)) throw new Error("작업을 찾을 수 없습니다.");
    const deletedPaths = files.filter((file) => file.work_id === workId).map((file) => file.file_path);
    await writeTables({ works: works.filter((work) => work.work_id !== workId), work_assignees: links.filter((link) => link.work_id !== workId), work_files: files.filter((file) => file.work_id !== workId), comments: comments.filter((comment) => !(comment.target_type === "work" && comment.target_id === workId)) });
    await removePhysicalFiles(deletedPaths);
  });
}
