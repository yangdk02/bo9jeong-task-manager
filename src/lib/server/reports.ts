import type { Person, PlaceMonthlyMetric, Project, Task, Work, WorkFile } from "@/lib/domain/schemas";
import { readTables } from "@/lib/server/csv-repository";

export type ReportProject = {
  project: Project;
  tasks: Task[];
  works: Array<Work & { files: WorkFile[] }>;
  placeMonthlyMetrics: PlaceMonthlyMetric[];
};

export async function getReportSetupData(): Promise<{ people: Person[]; projects: ReportProject[] }> {
  const [people, projects, tasks, works, workFiles, placeMonthlyMetrics] = await readTables(["people", "projects", "tasks", "works", "work_files", "place_monthly_metrics"]);
  return {
    people,
    projects: projects.map((project) => {
      const projectTasks = tasks.filter((task) => task.project_id === project.project_id);
      const taskIds = new Set(projectTasks.map((task) => task.task_id));
      return {
        project,
        tasks: projectTasks,
        works: works.filter((work) => taskIds.has(work.task_id)).map((work) => ({ ...work, files: workFiles.filter((file) => file.work_id === work.work_id).sort((a, b) => a.uploaded_at.localeCompare(b.uploaded_at)) })),
        placeMonthlyMetrics: placeMonthlyMetrics.filter((metric) => taskIds.has(metric.task_id)),
      };
    }),
  };
}
