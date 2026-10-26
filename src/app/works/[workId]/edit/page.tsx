import Link from "next/link";
import { notFound } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { WorkEditor } from "@/components/work-editor";
import { getProjectDetailData } from "@/lib/server/projects";
import { getWorkDetailData } from "@/lib/server/works";
import { readTable } from "@/lib/server/csv-repository";

export const dynamic = "force-dynamic";
export default async function EditWorkPage({ params }: { params: Promise<{ workId: string }> }) { const { workId } = await params; const data = await getWorkDetailData(workId); if (!data) notFound(); const [project, placeMonthlyMetrics] = await Promise.all([getProjectDetailData(data.project.project_id), readTable("place_monthly_metrics")]); if (!project) notFound(); const taskIds = new Set(project.tasks.map((item) => item.task.task_id)); return <div className="app-shell"><AppSidebar people={data.people} active="projects" /><main className="dashboard-main editor-page"><header className="detail-header"><div><p className="detail-breadcrumb"><Link href="/projects">프로젝트</Link><span>›</span><Link href={`/projects/${data.project.project_id}`}>{data.project.vendor_name}</Link><span>›</span><Link href={`/works/${workId}`}>{data.work.title}</Link><span>›</span>수정</p><h1>작업 수정</h1></div></header><WorkEditor people={data.people} tasks={project.tasks.map((item) => item.task)} placeMonthlyMetrics={placeMonthlyMetrics.filter((metric) => taskIds.has(metric.task_id))} work={data.work} assigneeIds={data.assignees.map((person) => person.person_id)} /></main></div>; }
