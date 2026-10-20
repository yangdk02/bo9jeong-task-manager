import Link from "next/link";
import { notFound } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { ProjectEditor } from "@/components/project-editor";
import { getProjectDetailData } from "@/lib/server/projects";

export const dynamic = "force-dynamic";
export default async function EditProjectPage({ params }: { params: Promise<{ projectId: string }> }) { const { projectId } = await params; const data = await getProjectDetailData(projectId); if (!data) notFound(); return <div className="app-shell"><AppSidebar people={data.people} active="projects" /><main className="dashboard-main editor-page"><header className="detail-header"><div><p className="detail-breadcrumb"><Link href="/projects">프로젝트</Link><span>›</span><Link href={`/projects/${projectId}`}>{data.project.vendor_name}</Link><span>›</span>수정</p><h1>프로젝트 수정</h1></div></header><ProjectEditor people={data.people} project={data.project} assigneeIds={data.assignees.map((person) => person.person_id)} /></main></div>; }
