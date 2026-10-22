import type { Person, Project, Task, Work } from "@/lib/domain/schemas";
import { isTaskVisibleInMonth, taskWorksForMonth } from "@/lib/domain/task-period";
import { readTables } from "@/lib/server/csv-repository";

export type ProjectProgress = {
  project: Project;
  target: number;
  completed: number;
  remaining: number;
  percent: number;
};

export type RecentWork = {
  work: Work;
  task: Task;
  project: Project;
  creatorName: string;
  fileCount: number;
};

export type DashboardData = {
  monthKey: string;
  people: Person[];
  projectProgress: ProjectProgress[];
  recentWorks: RecentWork[];
  totals: Pick<ProjectProgress, "target" | "completed" | "remaining" | "percent">;
};

export function seoulMonthKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  if (!year || !month) throw new Error("현재 월을 계산할 수 없습니다.");
  return `${year}-${month}`;
}

export function calculateProjectProgress(
  projects: Project[],
  tasks: Task[],
  works: Work[],
  monthKey: string,
): ProjectProgress[] {
  return projects.map((project) => {
    const periodTasks = tasks.filter(
      (task) => task.project_id === project.project_id && isTaskVisibleInMonth(task, monthKey),
    );
    const target = periodTasks.length;
    const completed = periodTasks.filter((task) => {
      const completedWorks = taskWorksForMonth(task, works, monthKey).filter((work) => work.status === "completed").length;
      return completedWorks >= task.target_count;
    }).length;
    const remaining = Math.max(target - completed, 0);
    const percent = target === 0 ? 0 : Math.round((completed / target) * 100);
    return { project, target, completed, remaining, percent };
  });
}

export async function getDashboardData(date = new Date()): Promise<DashboardData> {
  const monthKey = seoulMonthKey(date);
  const [people, projects, tasks, works, workFiles] = await readTables(["people", "projects", "tasks", "works", "work_files"]);
  const projectProgress = calculateProjectProgress(projects, tasks, works, monthKey);
  const personById = new Map(people.map((person) => [person.person_id, person]));
  const taskById = new Map(tasks.map((task) => [task.task_id, task]));
  const projectById = new Map(projects.map((project) => [project.project_id, project]));
  const fileCountByWork = new Map<string, number>();
  for (const file of workFiles) fileCountByWork.set(file.work_id, (fileCountByWork.get(file.work_id) ?? 0) + 1);

  const recentWorks = works
    .filter((work) => work.work_date.startsWith(monthKey))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .flatMap((work) => {
      const task = taskById.get(work.task_id);
      const project = task ? projectById.get(task.project_id) : undefined;
      if (!task || !project) return [];
      return [{
        work,
        task,
        project,
        creatorName: personById.get(work.created_by)?.name ?? "알 수 없음",
        fileCount: fileCountByWork.get(work.work_id) ?? 0,
      }];
    })
    .slice(0, 5);

  const totals = projectProgress.reduce(
    (sum, item) => ({
      target: sum.target + item.target,
      completed: sum.completed + item.completed,
      remaining: sum.remaining + item.remaining,
      percent: 0,
    }),
    { target: 0, completed: 0, remaining: 0, percent: 0 },
  );
  totals.percent = totals.target === 0 ? 0 : Math.round((totals.completed / totals.target) * 100);

  return { monthKey, people, projectProgress, recentWorks, totals };
}
