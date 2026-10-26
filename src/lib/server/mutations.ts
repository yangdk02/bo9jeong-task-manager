import { randomUUID } from "node:crypto";
import path from "node:path";
import { z } from "zod";
import { projectStatusSchema, workStatusSchema, type TableRow } from "@/lib/domain/schemas";
import { readTables, writeTables } from "@/lib/server/csv-repository";
import { withDataWriteLock } from "@/lib/server/data-backend";
import { removeStoredFiles, saveStoredFile } from "@/lib/server/storage-backend";
import { validateUploadFiles } from "@/lib/upload-policy";
import { PLACE_MONTHLY_TASK_NAME } from "@/lib/domain/task-catalog";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const personIds = z.array(z.string().min(1)).default([]).transform((ids) => [...new Set(ids)]);
const departments = ["경영관리", "총무", "기획", "영상촬영", "디자인", "마케팅"] as const;

export const personInputSchema = z.object({
  name: z.string().trim().min(1, "담당자 이름을 입력해 주세요.").max(50, "담당자 이름은 50자 이하로 입력해 주세요."),
  department: z.enum(departments, { error: "부서를 선택해 주세요." }),
});

const projectFieldsSchema = z.object({
  vendor_name: z.string().trim().min(1, "업체명을 입력해 주세요."),
  project_name: z.string().trim().min(1, "프로젝트명을 입력해 주세요."),
  management_category: z.string().trim().default(""),
  start_date: date,
  end_date: date,
  status: projectStatusSchema,
  assignee_ids: personIds,
  actor_id: z.string().min(1),
});

export const projectInputSchema = projectFieldsSchema.refine((value) => value.start_date <= value.end_date, { message: "종료일은 시작일보다 빠를 수 없습니다.", path: ["end_date"] });

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

const projectTaskInputSchema = taskInputSchema.omit({ project_id: true, actor_id: true });
export const projectCreationInputSchema = projectFieldsSchema.extend({
  tasks: z.array(projectTaskInputSchema).min(1, "과업을 한 개 이상 선택해 주세요."),
}).refine((value) => value.start_date <= value.end_date, { message: "종료일은 시작일보다 빠를 수 없습니다.", path: ["end_date"] });

export const workInputSchema = z.object({
  task_id: z.string().min(1),
  work_date: date,
  title: z.string().trim().min(1, "작업명을 입력해 주세요."),
  result_url: z.string().trim().refine((value) => value === "" || z.url().safeParse(value).success, "URL 형식이 아닙니다."),
  memo: z.string().trim().default(""),
  status: workStatusSchema,
  assignee_ids: personIds,
  actor_id: z.string().min(1),
  visitor_count: z.union([z.literal(""), z.coerce.number().int("방문자 수는 정수로 입력해 주세요.").nonnegative("방문자 수는 0 이상이어야 합니다.")]).optional().default(""),
});

const assetCategories = ["로고", "로고 배치 가이드", "브랜드 가이드", "패키지 시안", "카드뉴스", "배너", "썸네일", "상세페이지", "사진 원본", "영상 원본", "보고서", "기타"] as const;
export const workCreationInputSchema = workInputSchema.extend({
  register_as_assets: z.boolean().default(false),
  asset_category: z.enum(assetCategories).default("기타"),
  asset_version: z.string().trim().min(1, "자료 버전을 입력해 주세요.").default("v1"),
  asset_status: projectStatusSchema.default("active"),
});
export const assetInputSchema = z.object({
  project_id: z.string().min(1),
  asset_name: z.string().trim().min(1, "자료명을 입력해 주세요."),
  asset_category: z.enum(assetCategories),
  version: z.string().trim().min(1, "버전을 입력해 주세요."),
  status: projectStatusSchema,
  note: z.string().trim().default(""),
  owner_person_id: z.string().default(""),
  actor_id: z.string().min(1),
});
export const commentInputSchema = z.object({
  target_type: z.enum(["work", "asset"]),
  target_id: z.string().min(1),
  author_person_id: z.string().min(1),
  body: z.string().trim().min(1, "댓글 내용을 입력해 주세요.").max(2000, "댓글은 2,000자 이하로 입력해 주세요."),
});
export const workFileDeleteInputSchema = z.object({
  actor_id: z.string().min(1, "현재 담당자를 다시 선택해 주세요."),
});
export const placeMonthlyMetricInputSchema = z.object({
  task_id: z.string().min(1),
  year_month: z.string().regex(/^\d{4}-\d{2}$/, "조회 월 형식이 올바르지 않습니다."),
  visitor_count: z.coerce.number().int("방문자 수는 정수로 입력해 주세요.").nonnegative("방문자 수는 0 이상이어야 합니다."),
  actor_id: z.string().min(1, "현재 담당자를 다시 선택해 주세요."),
});

export type ProjectInput = z.input<typeof projectInputSchema>;
export type ProjectCreationInput = z.input<typeof projectCreationInputSchema>;
export type PersonInput = z.input<typeof personInputSchema>;
export type TaskInput = z.input<typeof taskInputSchema>;
export type WorkInput = z.input<typeof workInputSchema>;
export type WorkCreationInput = z.input<typeof workCreationInputSchema>;
export type AssetInput = z.input<typeof assetInputSchema>;

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
function systemActivity(targetType: "work" | "asset", targetId: string, actorId: string, body: string, timestamp: string): TableRow<"comments"> {
  return { comment_id: id("comment"), target_type: targetType, target_id: targetId, author_person_id: actorId, comment_type: "system", body, created_at: timestamp };
}
function sameIds(left: string[], right: string[]) {
  return [...new Set(left)].sort().join("|") === [...new Set(right)].sort().join("|");
}
function personNames(people: TableRow<"people">[], ids: string[]) {
  const names = ids.flatMap((personId) => people.find((person) => person.person_id === personId)?.name ?? []);
  return names.length ? names.join(", ") : "미지정";
}
function statusLabel(status: string) {
  return ({ planned: "예정", active: "진행", completed: "완료", draft: "작성 중" } as Record<string, string>)[status] ?? status;
}

export async function createPerson(raw: PersonInput) {
  return locked(async () => {
    const input = personInputSchema.parse(raw);
    const [people] = await readTables(["people"]);
    const normalizedName = input.name.toLocaleLowerCase("ko");
    if (people.some((person) => person.department === input.department && person.name.toLocaleLowerCase("ko") === normalizedName)) {
      throw new Error("같은 부서에 동일한 이름의 담당자가 이미 있습니다.");
    }
    const person: TableRow<"people"> = { person_id: id("person"), name: input.name, department: input.department };
    await writeTables({ people: [...people, person] });
    return person;
  });
}

export async function createComment(raw: unknown) {
  return locked(async () => {
    const input = commentInputSchema.parse(raw);
    const [people, works, assets, comments] = await readTables(["people", "works", "assets", "comments"]);
    ensureActor(people, input.author_person_id);
    const targetExists = input.target_type === "work"
      ? works.some((work) => work.work_id === input.target_id)
      : assets.some((asset) => asset.asset_id === input.target_id);
    if (!targetExists) throw new Error("댓글을 남길 대상을 찾을 수 없습니다.");
    const commentId = id("comment");
    await writeTables({ comments: [...comments, { comment_id: commentId, target_type: input.target_type, target_id: input.target_id, author_person_id: input.author_person_id, comment_type: "assignee", body: input.body, created_at: now() }] });
    return commentId;
  });
}

export async function createProject(raw: ProjectCreationInput) {
  return locked(async () => {
    const input = projectCreationInputSchema.parse(raw);
    const [people, projects, projectLinks, tasks, taskLinks] = await readTables(["people", "projects", "project_assignees", "tasks", "task_assignees"]);
    ensureActor(people, input.actor_id);
    ensureAssignees(people, input.assignee_ids);
    ensureAssignees(people, input.tasks.flatMap((task) => task.assignee_ids));
    const projectId = id("proj");
    const timestamp = now();
    const project: TableRow<"projects"> = { project_id: projectId, vendor_name: input.vendor_name, project_name: input.project_name, management_category: input.management_category, start_date: input.start_date, end_date: input.end_date, status: input.status, created_by: input.actor_id, created_at: timestamp };
    const createdTasks = input.tasks.map((task) => ({
      taskId: id("task"),
      task,
    }));
    await writeTables({
      projects: [...projects, project],
      project_assignees: [...projectLinks, ...input.assignee_ids.map((personId) => ({ project_assignee_id: id("pa"), project_id: projectId, person_id: personId }))],
      tasks: [...tasks, ...createdTasks.map(({ taskId, task }) => ({ task_id: taskId, project_id: projectId, target_scope: task.target_scope, task_name: task.task_name, cycle: task.cycle, target_count: task.target_count, target_unit: task.target_unit, status: task.status, created_by: input.actor_id, created_at: timestamp }))],
      task_assignees: [...taskLinks, ...createdTasks.flatMap(({ taskId, task }) => task.assignee_ids.map((personId) => ({ task_assignee_id: id("ta"), task_id: taskId, person_id: personId })))],
    });
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
    const [projects, projectLinks, tasks, taskLinks, works, workLinks, workFiles, placeMetrics, assets, comments] = await readTables(["projects", "project_assignees", "tasks", "task_assignees", "works", "work_assignees", "work_files", "place_monthly_metrics", "assets", "comments"]);
    if (!projects.some((project) => project.project_id === projectId)) throw new Error("프로젝트를 찾을 수 없습니다.");
    const taskIds = new Set(tasks.filter((task) => task.project_id === projectId).map((task) => task.task_id));
    const workIds = new Set(works.filter((work) => taskIds.has(work.task_id)).map((work) => work.work_id));
    const assetIds = new Set(assets.filter((asset) => asset.project_id === projectId).map((asset) => asset.asset_id));
    const deletedPaths = [...workFiles.filter((file) => workIds.has(file.work_id)).map((file) => file.file_path), ...assets.filter((asset) => assetIds.has(asset.asset_id)).map((asset) => asset.file_path)];
    await writeTables({
      projects: projects.filter((project) => project.project_id !== projectId), project_assignees: projectLinks.filter((link) => link.project_id !== projectId),
      tasks: tasks.filter((task) => !taskIds.has(task.task_id)), task_assignees: taskLinks.filter((link) => !taskIds.has(link.task_id)),
      works: works.filter((work) => !workIds.has(work.work_id)), work_assignees: workLinks.filter((link) => !workIds.has(link.work_id)), work_files: workFiles.filter((file) => !workIds.has(file.work_id)),
      place_monthly_metrics: placeMetrics.filter((metric) => !taskIds.has(metric.task_id)),
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
    const [tasks, taskLinks, works, workLinks, workFiles, placeMetrics, comments] = await readTables(["tasks", "task_assignees", "works", "work_assignees", "work_files", "place_monthly_metrics", "comments"]);
    if (!tasks.some((task) => task.task_id === taskId)) throw new Error("과업을 찾을 수 없습니다.");
    const workIds = new Set(works.filter((work) => work.task_id === taskId).map((work) => work.work_id));
    const deletedPaths = workFiles.filter((file) => workIds.has(file.work_id)).map((file) => file.file_path);
    await writeTables({ tasks: tasks.filter((task) => task.task_id !== taskId), task_assignees: taskLinks.filter((link) => link.task_id !== taskId), works: works.filter((work) => !workIds.has(work.work_id)), work_assignees: workLinks.filter((link) => !workIds.has(link.work_id)), work_files: workFiles.filter((file) => !workIds.has(file.work_id)), place_monthly_metrics: placeMetrics.filter((metric) => metric.task_id !== taskId), comments: comments.filter((comment) => !(comment.target_type === "work" && workIds.has(comment.target_id))) });
    await removePhysicalFiles(deletedPaths);
  });
}

function savePlaceMetricForWork(metrics: TableRow<"place_monthly_metrics">[], task: TableRow<"tasks">, workDate: string, visitorCount: number | "" | undefined, actorId: string, timestamp: string) {
  if (task.task_name !== PLACE_MONTHLY_TASK_NAME) return metrics;
  if (visitorCount === "" || visitorCount === undefined) throw new Error("해당 월 방문자 수를 입력해 주세요.");
  const yearMonth = workDate.slice(0, 7);
  const existing = metrics.find((metric) => metric.task_id === task.task_id && metric.year_month === yearMonth);
  const next: TableRow<"place_monthly_metrics"> = existing
    ? { ...existing, visitor_count: visitorCount, entered_by: actorId, updated_at: timestamp }
    : { place_metric_id: id("place_metric"), task_id: task.task_id, year_month: yearMonth, visitor_count: visitorCount, entered_by: actorId, entered_at: timestamp, updated_at: timestamp };
  return existing ? metrics.map((metric) => metric.place_metric_id === existing.place_metric_id ? next : metric) : [...metrics, next];
}

async function saveFiles(workId: string, actorId: string, files: File[]) {
  const created: TableRow<"work_files">[] = [];
  try {
    const selected = files.filter((item) => item.size > 0);
    const validation = validateUploadFiles(selected);
    if (validation) throw new Error(validation);
    for (const file of selected) {
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

async function saveAssetFile(assetId: string, projectId: string, actorId: string, file: File) {
  if (!file.size) throw new Error("자료 파일을 선택해 주세요.");
  const validation = validateUploadFiles([file]);
  if (validation) throw new Error(validation);
  const safeName = path.basename(file.name).replace(/[^0-9A-Za-z가-힣._-]/g, "_");
  const filePath = path.posix.join("storage", "assets", projectId, `${assetId}_${randomUUID().replaceAll("-", "").slice(0, 8)}_${safeName}`);
  await saveStoredFile(filePath, Buffer.from(await file.arrayBuffer()), file.type || undefined);
  return { file_path: filePath, file_name: file.name, uploaded_by: actorId, uploaded_at: now() };
}

export async function createAsset(raw: unknown, file?: File) {
  return locked(async () => {
    const input = assetInputSchema.parse(raw);
    const [people, projects, assets, comments] = await readTables(["people", "projects", "assets", "comments"]);
    ensureActor(people, input.actor_id);
    if (input.owner_person_id) ensureAssignees(people, [input.owner_person_id]);
    if (!projects.some((project) => project.project_id === input.project_id)) throw new Error("프로젝트를 찾을 수 없습니다.");
    if (!file) throw new Error("자료 파일을 선택해 주세요.");

    const assetId = id("asset");
    const stored = await saveAssetFile(assetId, input.project_id, input.actor_id, file);
    const timestamp = now();
    const asset: TableRow<"assets"> = { asset_id: assetId, project_id: input.project_id, asset_name: input.asset_name, asset_category: input.asset_category, version: input.version, ...stored, status: input.status, note: input.note, owner_person_id: input.owner_person_id };
    try {
      await writeTables({ assets: [...assets, asset], comments: [...comments, systemActivity("asset", assetId, input.actor_id, "자료가 등록되었습니다.", timestamp), systemActivity("asset", assetId, input.actor_id, `파일 ${file.name}이(가) 추가되었습니다.`, timestamp)] });
    } catch (error) {
      await removeStoredFiles([stored.file_path]);
      throw error;
    }
    return assetId;
  });
}

export async function updateAsset(assetId: string, raw: unknown, file?: File) {
  return locked(async () => {
    const input = assetInputSchema.parse(raw);
    const [people, projects, assets, comments] = await readTables(["people", "projects", "assets", "comments"]);
    ensureActor(people, input.actor_id);
    if (input.owner_person_id) ensureAssignees(people, [input.owner_person_id]);
    if (!projects.some((project) => project.project_id === input.project_id)) throw new Error("프로젝트를 찾을 수 없습니다.");
    const existing = assets.find((asset) => asset.asset_id === assetId);
    if (!existing) throw new Error("자료를 찾을 수 없습니다.");

    const stored = file?.size ? await saveAssetFile(assetId, input.project_id, input.actor_id, file) : undefined;
    const next: TableRow<"assets"> = { ...existing, project_id: input.project_id, asset_name: input.asset_name, asset_category: input.asset_category, version: input.version, status: input.status, note: input.note, owner_person_id: input.owner_person_id, ...(stored ?? {}) };
    const timestamp = now();
    const activities: TableRow<"comments">[] = [];
    const metadataChanged = existing.project_id !== input.project_id || existing.asset_name !== input.asset_name || existing.asset_category !== input.asset_category || existing.version !== input.version || existing.note !== input.note;
    if (metadataChanged) activities.push(systemActivity("asset", assetId, input.actor_id, "자료 정보가 수정되었습니다.", timestamp));
    if (existing.status !== input.status) activities.push(systemActivity("asset", assetId, input.actor_id, `자료 상태가 ${statusLabel(existing.status)}에서 ${statusLabel(input.status)}(으)로 변경되었습니다.`, timestamp));
    if (existing.owner_person_id !== input.owner_person_id) activities.push(systemActivity("asset", assetId, input.actor_id, `자료 담당자가 ${personNames(people, input.owner_person_id ? [input.owner_person_id] : [])}(으)로 변경되었습니다.`, timestamp));
    if (stored) activities.push(systemActivity("asset", assetId, input.actor_id, `파일이 ${stored.file_name}(으)로 교체되었습니다.`, timestamp));
    try {
      await writeTables({ assets: assets.map((asset) => asset.asset_id === assetId ? next : asset), comments: [...comments, ...activities] });
    } catch (error) {
      if (stored) await removeStoredFiles([stored.file_path]);
      throw error;
    }
    if (stored && stored.file_path !== existing.file_path) await removeStoredFiles([existing.file_path]);
  });
}

export async function deleteAsset(assetId: string) {
  return locked(async () => {
    const [assets, comments] = await readTables(["assets", "comments"]);
    const existing = assets.find((asset) => asset.asset_id === assetId);
    if (!existing) throw new Error("자료를 찾을 수 없습니다.");
    await writeTables({ assets: assets.filter((asset) => asset.asset_id !== assetId), comments: comments.filter((comment) => !(comment.target_type === "asset" && comment.target_id === assetId)) });
    await removeStoredFiles([existing.file_path]);
  });
}

export async function createWork(raw: unknown, files: File[] = []) {
  return locked(async () => {
    const input = workCreationInputSchema.parse(raw);
    const [people, tasks, works, links, workFiles, placeMetrics, assets, comments] = await readTables(["people", "tasks", "works", "work_assignees", "work_files", "place_monthly_metrics", "assets", "comments"]);
    ensureActor(people, input.actor_id); ensureAssignees(people, input.assignee_ids);
    const task = tasks.find((item) => item.task_id === input.task_id);
    if (!task) throw new Error("과업을 찾을 수 없습니다.");
    const selectedFiles = files.filter((file) => file.size > 0);
    if (input.register_as_assets && selectedFiles.length === 0) throw new Error("자료로 등록할 파일을 한 개 이상 선택해 주세요.");
    const workId = id("work"); const timestamp = now();
    const work: TableRow<"works"> = { work_id: workId, task_id: input.task_id, work_date: input.work_date, title: input.title, result_url: input.result_url, memo: input.memo, status: input.status, created_by: input.actor_id, created_at: timestamp, updated_at: timestamp };
    const nextPlaceMetrics = savePlaceMetricForWork(placeMetrics, task, input.work_date, input.visitor_count, input.actor_id, timestamp);
    let addedFiles: TableRow<"work_files">[] = [];
    const addedAssets: TableRow<"assets">[] = [];
    const assetActivities: TableRow<"comments">[] = [];
    try {
      addedFiles = await saveFiles(workId, input.actor_id, selectedFiles);
      if (input.register_as_assets) {
        for (const file of selectedFiles) {
          const assetId = id("asset");
          const stored = await saveAssetFile(assetId, task.project_id, input.actor_id, file);
          const assetName = selectedFiles.length === 1 ? input.title : `${input.title} · ${file.name}`;
          addedAssets.push({ asset_id: assetId, project_id: task.project_id, asset_name: assetName, asset_category: input.asset_category, version: input.asset_version, ...stored, status: input.asset_status, note: `작업 '${input.title}'에서 함께 등록`, owner_person_id: input.actor_id });
          assetActivities.push(systemActivity("asset", assetId, input.actor_id, "작업 등록과 함께 자료가 등록되었습니다.", timestamp), systemActivity("asset", assetId, input.actor_id, `파일 ${file.name}이(가) 추가되었습니다.`, timestamp));
        }
      }
      const activities = [systemActivity("work", workId, input.actor_id, "작업이 등록되었습니다.", timestamp)];
      if (addedFiles.length) activities.push(systemActivity("work", workId, input.actor_id, `증빙 파일 ${addedFiles.length}개가 추가되었습니다.`, timestamp));
      if (addedAssets.length) activities.push(systemActivity("work", workId, input.actor_id, `증빙 파일 ${addedAssets.length}개를 자료로도 등록했습니다.`, timestamp));
      await writeTables({ works: [...works, work], work_assignees: [...links, ...input.assignee_ids.map((personId) => ({ work_assignee_id: id("wa"), work_id: workId, person_id: personId }))], work_files: [...workFiles, ...addedFiles], place_monthly_metrics: nextPlaceMetrics, assets: [...assets, ...addedAssets], comments: [...comments, ...activities, ...assetActivities] });
    } catch (error) { await removeStoredFiles([...addedFiles.map((file) => file.file_path), ...addedAssets.map((asset) => asset.file_path)]); throw error; }
    return workId;
  });
}

export async function updateWork(workId: string, raw: unknown, files: File[] = []) {
  return locked(async () => {
    const input = workInputSchema.parse(raw);
    const [people, tasks, works, links, workFiles, placeMetrics, comments] = await readTables(["people", "tasks", "works", "work_assignees", "work_files", "place_monthly_metrics", "comments"]);
    ensureActor(people, input.actor_id); ensureAssignees(people, input.assignee_ids);
    const existing = works.find((work) => work.work_id === workId);
    if (!existing) throw new Error("작업을 찾을 수 없습니다.");
    const task = tasks.find((item) => item.task_id === input.task_id);
    if (!task) throw new Error("과업을 찾을 수 없습니다.");
    const timestamp = now(); let addedFiles: TableRow<"work_files">[] = [];
    const nextPlaceMetrics = savePlaceMetricForWork(placeMetrics, task, input.work_date, input.visitor_count, input.actor_id, timestamp);
    const existingAssigneeIds = links.filter((link) => link.work_id === workId).map((link) => link.person_id);
    try {
      addedFiles = await saveFiles(workId, input.actor_id, files);
      const activities: TableRow<"comments">[] = [];
      const informationChanged = existing.task_id !== input.task_id || existing.work_date !== input.work_date || existing.title !== input.title || existing.result_url !== input.result_url || existing.memo !== input.memo;
      if (informationChanged) activities.push(systemActivity("work", workId, input.actor_id, "작업 정보가 수정되었습니다.", timestamp));
      if (existing.status !== input.status) activities.push(systemActivity("work", workId, input.actor_id, `작업 상태가 ${statusLabel(existing.status)}에서 ${statusLabel(input.status)}(으)로 변경되었습니다.`, timestamp));
      if (!sameIds(existingAssigneeIds, input.assignee_ids)) activities.push(systemActivity("work", workId, input.actor_id, `작업 담당자가 ${personNames(people, input.assignee_ids)}(으)로 변경되었습니다.`, timestamp));
      if (addedFiles.length) activities.push(systemActivity("work", workId, input.actor_id, `증빙 파일 ${addedFiles.length}개가 추가되었습니다.`, timestamp));
      await writeTables({ works: works.map((work) => work.work_id === workId ? { ...work, task_id: input.task_id, work_date: input.work_date, title: input.title, result_url: input.result_url, memo: input.memo, status: input.status, updated_at: timestamp } : work), work_assignees: [...links.filter((link) => link.work_id !== workId), ...input.assignee_ids.map((personId) => ({ work_assignee_id: id("wa"), work_id: workId, person_id: personId }))], work_files: [...workFiles, ...addedFiles], place_monthly_metrics: nextPlaceMetrics, comments: [...comments, ...activities] });
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

export async function deleteWorkFile(workId: string, workFileId: string, raw: unknown) {
  return locked(async () => {
    const input = workFileDeleteInputSchema.parse(raw);
    const [people, works, files, comments] = await readTables(["people", "works", "work_files", "comments"]);
    ensureActor(people, input.actor_id);
    if (!works.some((work) => work.work_id === workId)) throw new Error("작업을 찾을 수 없습니다.");
    const existing = files.find((file) => file.work_file_id === workFileId && file.work_id === workId);
    if (!existing) throw new Error("삭제할 증빙 파일을 찾을 수 없습니다.");
    const activity = systemActivity("work", workId, input.actor_id, `증빙 파일 ${existing.file_name}이(가) 삭제되었습니다.`, now());
    await writeTables({
      work_files: files.filter((file) => file.work_file_id !== workFileId),
      comments: [...comments, activity],
    });
    await removeStoredFiles([existing.file_path]);
  });
}
