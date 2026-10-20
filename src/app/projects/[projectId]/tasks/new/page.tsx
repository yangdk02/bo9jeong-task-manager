import Link from "next/link";
import { notFound } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { TaskEditor } from "@/components/task-editor";
import { getProjectDetailData } from "@/lib/server/projects";

export const dynamic = "force-dynamic";
export default async function NewTaskPage({ params }: { params: Promise<{ projectId: string }> }) { const { projectId } = await params; const data = await getProjectDetailData(projectId); if (!data) notFound(); return <div className="app-shell"><AppSidebar people={data.people} active="projects" /><main className="dashboard-main editor-page"><header className="detail-header"><div><p className="detail-breadcrumb"><Link href="/projects">프로젝트</Link><span>›</span><Link href={`/projects/${projectId}`}>{data.project.vendor_name}</Link><span>›</span>새 과업</p><h1>과업 생성</h1><p>{data.project.project_name}에 새 과업을 추가합니다.</p></div></header><TaskEditor people={data.people} projectId={projectId} /></main></div>; }
