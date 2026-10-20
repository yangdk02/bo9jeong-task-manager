import Link from "next/link";
import { notFound } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { TaskEditor } from "@/components/task-editor";
import { getTaskDetailData } from "@/lib/server/tasks";

export const dynamic = "force-dynamic";
export default async function EditTaskPage({ params }: { params: Promise<{ taskId: string }> }) { const { taskId } = await params; const data = await getTaskDetailData(taskId); if (!data) notFound(); return <div className="app-shell"><AppSidebar people={data.people} active="projects" /><main className="dashboard-main editor-page"><header className="detail-header"><div><p className="detail-breadcrumb"><Link href="/projects">프로젝트</Link><span>›</span><Link href={`/projects/${data.project.project_id}`}>{data.project.vendor_name}</Link><span>›</span><Link href={`/tasks/${taskId}`}>{data.task.task.task_name}</Link><span>›</span>수정</p><h1>과업 수정</h1></div></header><TaskEditor people={data.people} projectId={data.project.project_id} task={data.task.task} assigneeIds={data.task.assignees.map((person) => person.person_id)} /></main></div>; }
