import type { Task, Work } from "@/lib/domain/schemas";

function monthOf(value: string) {
  return value.slice(0, 7);
}

export function onceTaskCompletionMonth(task: Task, works: Work[]) {
  if (task.cycle !== "once") return undefined;
  if (task.target_count === 0) return monthOf(task.created_at);

  const completedDates = works
    .filter((work) => work.task_id === task.task_id && work.status === "completed")
    .map((work) => work.work_date)
    .sort();

  return completedDates.length >= task.target_count
    ? monthOf(completedDates[task.target_count - 1])
    : undefined;
}

export function isTaskVisibleInMonth(task: Task, works: Work[], monthKey: string) {
  if (task.cycle === "monthly") return true;

  const createdMonth = monthOf(task.created_at);
  if (monthKey < createdMonth) return false;

  const completionMonth = onceTaskCompletionMonth(task, works);
  if (completionMonth) return monthKey <= completionMonth;

  // 수동으로 완료 처리됐지만 목표 수량만큼의 완료 작업이 없는 경우도 다음 달로 넘기지 않는다.
  return task.status !== "completed" || monthKey === createdMonth;
}

export function taskWorksForMonth(task: Task, works: Work[], monthKey: string) {
  const taskWorks = works.filter((work) => work.task_id === task.task_id);
  return task.cycle === "monthly"
    ? taskWorks.filter((work) => monthOf(work.work_date) === monthKey)
    : taskWorks.filter((work) => monthOf(work.work_date) <= monthKey);
}
