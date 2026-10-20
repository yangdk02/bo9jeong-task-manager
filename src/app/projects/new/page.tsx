import Link from "next/link";
import { AppSidebar } from "@/components/app-sidebar";
import { ProjectEditor } from "@/components/project-editor";
import { getProjectListData } from "@/lib/server/projects";

export const dynamic = "force-dynamic";
export default async function NewProjectPage() { const { people } = await getProjectListData(); return <div className="app-shell"><AppSidebar people={people} active="projects" /><main className="dashboard-main editor-page"><header className="detail-header"><div><p className="detail-breadcrumb"><Link href="/projects">프로젝트</Link><span>›</span>새 프로젝트</p><h1>프로젝트 생성</h1><p>계약 기본 정보와 담당자를 입력합니다.</p></div></header><ProjectEditor people={people} /></main></div>; }
