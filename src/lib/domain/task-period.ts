import type { Task, Work } from "@/lib/domain/schemas";

function monthOf(value: string) {
  return value.slice(0, 7);
}

export function isTaskVisibleInMonth(task: Task, monthKey: string) {
  if (task.cycle === "monthly") return true;
  return monthKey === monthOf(task.created_at);
}

export function isTaskVisibleInPeriod(task: Task, startMonth: string, endMonth: string) {
  if (task.cycle === "monthly") return true;
  const createdMonth = monthOf(task.created_at);
  return createdMonth >= startMonth && createdMonth <= endMonth;
}

export function taskWorksForMonth(task: Task, works: Work[], monthKey: string) {
  return works.filter((work) => work.task_id === task.task_id && monthOf(work.work_date) === monthKey);
}
