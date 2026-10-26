import { z } from "zod";

const id = z.string().min(1);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const isoDateTime = z.string().datetime({ offset: true });
const optionalText = z.string();

export const projectStatusSchema = z.enum(["planned", "active", "completed"]);
export const workStatusSchema = z.enum(["draft", "completed"]);

export const peopleSchema = z.object({
  person_id: id,
  name: z.string().min(1),
  department: z.string().min(1),
});

export const projectSchema = z.object({
  project_id: id,
  vendor_name: z.string().min(1),
  project_name: z.string().min(1),
  management_category: optionalText,
  start_date: isoDate,
  end_date: isoDate,
  status: projectStatusSchema,
  created_by: id,
  created_at: isoDateTime,
});

export const projectAssigneeSchema = z.object({
  project_assignee_id: id,
  project_id: id,
  person_id: id,
});

export const taskSchema = z.object({
  task_id: id,
  project_id: id,
  target_scope: z.enum(["SNS", "블로그", "디자인", "촬영", "영상", "네이버 플레이스", "광고", "기타"]),
  task_name: z.string().min(1),
  cycle: z.enum(["monthly", "once"]),
  target_count: z.coerce.number().int().nonnegative(),
  target_unit: z.enum(["건", "장", "곳", "회", "기타"]),
  status: projectStatusSchema,
  created_by: id,
  created_at: isoDateTime,
});

export const taskAssigneeSchema = z.object({
  task_assignee_id: id,
  task_id: id,
  person_id: id,
});

export const workSchema = z.object({
  work_id: id,
  task_id: id,
  work_date: isoDate,
  title: z.string().min(1),
  result_url: optionalText.refine((value) => value === "" || z.string().url().safeParse(value).success, "URL 형식이 아닙니다."),
  memo: optionalText,
  status: workStatusSchema,
  created_by: id,
  created_at: isoDateTime,
  updated_at: isoDateTime,
});

export const workAssigneeSchema = z.object({
  work_assignee_id: id,
  work_id: id,
  person_id: id,
});

export const workFileSchema = z.object({
  work_file_id: id,
  work_id: id,
  file_path: z.string().min(1),
  file_name: z.string().min(1),
  uploaded_by: id,
  uploaded_at: isoDateTime,
});

export const placeMonthlyMetricSchema = z.object({
  place_metric_id: id,
  task_id: id,
  year_month: z.string().regex(/^\d{4}-\d{2}$/),
  visitor_count: z.coerce.number().int().nonnegative(),
  entered_by: id,
  entered_at: isoDateTime,
  updated_at: isoDateTime,
});

export const assetSchema = z.object({
  asset_id: id,
  project_id: id,
  asset_name: z.string().min(1),
  asset_category: z.enum(["로고", "로고 배치 가이드", "브랜드 가이드", "패키지 시안", "카드뉴스", "배너", "썸네일", "상세페이지", "사진 원본", "영상 원본", "보고서", "기타"]),
  version: z.string().min(1),
  file_path: z.string().min(1),
  file_name: z.string().min(1),
  status: projectStatusSchema,
  note: optionalText,
  owner_person_id: optionalText,
  uploaded_by: id,
  uploaded_at: isoDateTime,
});

export const commentSchema = z.object({
  comment_id: id,
  target_type: z.enum(["work", "asset"]),
  target_id: id,
  comment_type: z.enum(["assignee", "system"]),
  author_person_id: optionalText,
  body: z.string().min(1),
  created_at: isoDateTime,
});

export type Person = z.infer<typeof peopleSchema>;
export type Project = z.infer<typeof projectSchema>;
export type Task = z.infer<typeof taskSchema>;
export type Work = z.infer<typeof workSchema>;
export type WorkFile = z.infer<typeof workFileSchema>;
export type PlaceMonthlyMetric = z.infer<typeof placeMonthlyMetricSchema>;

export const tableSchemas = {
  people: peopleSchema,
  projects: projectSchema,
  project_assignees: projectAssigneeSchema,
  tasks: taskSchema,
  task_assignees: taskAssigneeSchema,
  works: workSchema,
  work_assignees: workAssigneeSchema,
  work_files: workFileSchema,
  place_monthly_metrics: placeMonthlyMetricSchema,
  assets: assetSchema,
  comments: commentSchema,
} as const;

export type TableName = keyof typeof tableSchemas;
export type TableRow<K extends TableName> = z.infer<(typeof tableSchemas)[K]>;
