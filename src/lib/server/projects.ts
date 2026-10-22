import type { Person, Project, Task, Work } from "@/lib/domain/schemas";
import { isTaskVisibleInMonth, taskWorksForMonth } from "@/lib/domain/task-period";
import { seoulMonthKey } from "@/lib/server/dashboard";
import { readTables } from "@/lib/server/csv-repository";

export type ProjectListItem = {
  project: Project;
  assignees: Person[];
  departments: string[];
  monthlyTaskCount: number;
  onceTaskCount: number;
  target: number;
  completed: number;
  exceeded: number;
  percent: number;
};

export type ProjectWorkItem = {
  work: Work;
  assignees: Person[];
  fileCount: number;
};

export type ProjectTaskItem = {
  task: Task;
  assignees: Person[];
  works: ProjectWorkItem[];
};

export type ProjectDetailData = {
  monthKey: string;
  people: Person[];
  project: Project;
  assignees: Person[];
  tasks: ProjectTaskItem[];
};

export async function getProjectListData(date = new Date()) {
  const monthKey = seoulMonthKey(date);
  const [people, projects, projectAssignees, tasks, works] = await readTables(["people", "projects", "project_assignees", "tasks", "works"]);
  const personById = new Map(people.map((person) => [person.person_id, person]));

  const items: ProjectListItem[] = projects.map((project) => {
    const projectTasks = tasks.filter((task) => task.project_id === project.project_id);
    const monthlyTasks = projectTasks.filter((task) => task.cycle === "monthly");
    const visibleOnceTasks = projectTasks.filter((task) => task.cycle === "once" && isTaskVisibleInMonth(task, monthKey));
    const periodTasks = [...monthlyTasks, ...visibleOnceTasks];
    const target = periodTasks.reduce((sum, task) => sum + task.target_count, 0);
    const completed = periodTasks.reduce(
      (sum, task) => sum + taskWorksForMonth(task, works, monthKey).filter((work) => work.status === "completed").length,
      0,
    );
    const assignees = projectAssignees
      .filter((link) => link.project_id === project.project_id)
      .flatMap((link) => personById.get(link.person_id) ?? []);
    return {
      project,
      assignees,
      departments: [...new Set(assignees.map((person) => person.department))],
      monthlyTaskCount: monthlyTasks.length,
      onceTaskCount: visibleOnceTasks.length,
      target,
      completed,
      exceeded: Math.max(completed - target, 0),
      percent: target === 0 ? 0 : Math.round((completed / target) * 100),
    };
  });

  return { people, monthKey, items };
}

export async function getProjectDetailData(projectId: string, date = new Date()): Promise<ProjectDetailData | undefined> {
  const monthKey = seoulMonthKey(date);
  const [people, projects, projectAssignees, tasks, taskAssignees, works, workAssignees, workFiles] = await readTables([
    "people", "projects", "project_assignees", "tasks", "task_assignees", "works", "work_assignees", "work_files",
  ]);
  const project = projects.find((item) => item.project_id === projectId);
  if (!project) return undefined;

  const personById = new Map(people.map((person) => [person.person_id, person]));
  const workAssigneesByWork = new Map<string, Person[]>();
  for (const link of workAssignees) {
    const person = personById.get(link.person_id);
    if (!person) continue;
    workAssigneesByWork.set(link.work_id, [...(workAssigneesByWork.get(link.work_id) ?? []), person]);
  }
  const fileCountByWork = new Map<string, number>();
  for (const file of workFiles) fileCountByWork.set(file.work_id, (fileCountByWork.get(file.work_id) ?? 0) + 1);

  const projectTasks = tasks.filter((task) => task.project_id === projectId);
  const taskItems: ProjectTaskItem[] = projectTasks.map((task) => ({
    task,
    assignees: taskAssignees
      .filter((link) => link.task_id === task.task_id)
      .flatMap((link) => personById.get(link.person_id) ?? []),
    works: works
      .filter((work) => work.task_id === task.task_id)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .map((work) => ({ work, assignees: workAssigneesByWork.get(work.work_id) ?? [], fileCount: fileCountByWork.get(work.work_id) ?? 0 })),
  }));

  const assignees = projectAssignees
    .filter((link) => link.project_id === projectId)
    .flatMap((link) => personById.get(link.person_id) ?? []);

  return { monthKey, people, project, assignees, tasks: taskItems };
}
