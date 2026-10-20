import type { Person, Project, Task, Work, WorkFile, TableRow } from "@/lib/domain/schemas";
import { readTables } from "@/lib/server/csv-repository";

export type WorkDetailComment = {
  comment: TableRow<"comments">;
  author?: Person;
};

export type WorkDetailData = {
  people: Person[];
  work: Work;
  task: Task;
  project: Project;
  creator?: Person;
  assignees: Person[];
  files: WorkFile[];
  comments: WorkDetailComment[];
};

export async function getWorkDetailData(workId: string): Promise<WorkDetailData | undefined> {
  const [people, projects, tasks, works, workAssignees, workFiles, comments] = await readTables([
    "people", "projects", "tasks", "works", "work_assignees", "work_files", "comments",
  ]);

  const work = works.find((item) => item.work_id === workId);
  if (!work) return undefined;
  const task = tasks.find((item) => item.task_id === work.task_id);
  if (!task) return undefined;
  const project = projects.find((item) => item.project_id === task.project_id);
  if (!project) return undefined;

  const personById = new Map(people.map((person) => [person.person_id, person]));
  const assignees = workAssignees
    .filter((item) => item.work_id === workId)
    .flatMap((item) => {
      const person = personById.get(item.person_id);
      return person ? [person] : [];
    });

  return {
    people,
    work,
    task,
    project,
    creator: personById.get(work.created_by),
    assignees,
    files: workFiles.filter((file) => file.work_id === workId).sort((a, b) => a.uploaded_at.localeCompare(b.uploaded_at)),
    comments: comments
      .filter((comment) => comment.target_type === "work" && comment.target_id === workId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((comment) => ({ comment, author: personById.get(comment.author_person_id) })),
  };
}
