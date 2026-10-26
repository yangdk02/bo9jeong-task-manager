import Link from "next/link";
import { notFound } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { WorkEditor } from "@/components/work-editor";
import { getProjectDetailData } from "@/lib/server/projects";
import { readTable } from "@/lib/server/csv-repository";

export const dynamic = "force-dynamic";
export default async function NewWorkPage({ params, searchParams }: { params: Promise<{ projectId: string }>; searchParams: Promise<{ taskId?: string }> }) { const { projectId } = await params; const { taskId } = await searchParams; const [data, placeMonthlyMetrics] = await Promise.all([getProjectDetailData(projectId), readTable("place_monthly_metrics")]); if (!data) notFound(); const taskIds = new Set(data.tasks.map((item) => item.task.task_id)); return <div className="app-shell"><AppSidebar people={data.people} active="projects" /><main className="dashboard-main editor-page"><header className="detail-header"><div><p className="detail-breadcrumb"><Link href="/projects">프로젝트</Link><span>›</span><Link href={`/projects/${projectId}`}>{data.project.vendor_name}</Link><span>›</span>새 작업</p><h1>작업 등록</h1><p>실행 결과와 증빙 파일을 함께 기록합니다.</p></div></header>{data.tasks.length ? <WorkEditor people={data.people} tasks={data.tasks.map((item) => item.task)} placeMonthlyMetrics={placeMonthlyMetrics.filter((metric) => taskIds.has(metric.task_id))} initialTaskId={taskId} /> : <div className="empty-state">먼저 과업을 생성해 주세요.</div>}</main></div>; }
