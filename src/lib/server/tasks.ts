import type { ProjectDetailData, ProjectTaskItem } from "@/lib/server/projects";
import { getProjectDetailData } from "@/lib/server/projects";
import { readTable } from "@/lib/server/csv-repository";

export type TaskDetailData = {
  people: ProjectDetailData["people"];
  project: ProjectDetailData["project"];
  task: ProjectTaskItem;
  monthKey: string;
};

export async function getTaskDetailData(taskId: string, date = new Date()): Promise<TaskDetailData | undefined> {
  const tasks = await readTable("tasks");
  const task = tasks.find((item) => item.task_id === taskId);
  if (!task) return undefined;
  const project = await getProjectDetailData(task.project_id, date);
  if (!project) return undefined;
  const taskItem = project.tasks.find((item) => item.task.task_id === taskId);
  if (!taskItem) return undefined;
  return { people: project.people, project: project.project, task: taskItem, monthKey: project.monthKey };
}
