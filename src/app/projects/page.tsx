import Link from "next/link";
import { AppSidebar } from "@/components/app-sidebar";
import { ProjectListView } from "@/components/project-list-view";
import { getProjectListData } from "@/lib/server/projects";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const data = await getProjectListData();
  return <div className="app-shell">
    <AppSidebar people={data.people} active="projects" />
    <main className="dashboard-main">
      <header className="page-header project-page-header">
        <div><p className="eyebrow">PROJECTS</p><h1>프로젝트</h1><p>업체별 계약 프로젝트와 과업 진행 상황을 관리합니다.</p></div>
        <Link className="btn-primary header-action" href="/projects/new"><span>＋</span> 프로젝트 등록</Link>
      </header>
      <ProjectListView items={data.items} monthKey={data.monthKey} />
    </main>
  </div>;
}
