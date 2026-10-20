import Link from "next/link";
import { notFound } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { EntityDeleteButton } from "@/components/entity-delete-button";
import { ProjectDetailView } from "@/components/project-detail-view";
import { getProjectDetailData } from "@/lib/server/projects";

export const dynamic = "force-dynamic";

const statusLabels = { planned: "예정", active: "진행", completed: "완료" } as const;

export default async function ProjectDetailPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const data = await getProjectDetailData(projectId);
  if (!data) notFound();

  return <div className="app-shell">
    <AppSidebar people={data.people} active="projects" />
    <main className="dashboard-main project-detail-page">
      <header className="detail-header">
        <div><p className="detail-breadcrumb"><Link href="/projects">프로젝트</Link><span>›</span>{data.project.vendor_name}</p><div className="detail-title-row"><h1>{data.project.project_name}</h1><span className={`project-status status-${data.project.status}`}>{statusLabels[data.project.status]}</span></div><p>{data.project.vendor_name} · {data.project.management_category || "분류 없음"}</p></div>
        <div className="detail-actions"><Link href={`/reports?projectId=${projectId}`}>보고서 생성</Link><Link className="btn-accent" href={`/projects/${projectId}/works/new`}>작업 등록</Link><Link href={`/projects/${projectId}/edit`}>프로젝트 수정</Link><EntityDeleteButton endpoint={`/api/projects/${projectId}`} label="프로젝트 삭제" redirectTo="/projects" message="프로젝트와 연결된 과업·작업·자료를 모두 삭제할까요? 이 작업은 되돌릴 수 없습니다." /></div>
      </header>
      <section className="project-meta card">
        <div><span>계약 기간</span><strong>{data.project.start_date.replaceAll("-", ".")} – {data.project.end_date.replaceAll("-", ".")}</strong></div>
        <div><span>프로젝트 담당자</span><div className="mini-chip-row">{data.assignees.map((person) => <span className="assignee-chip" key={person.person_id}><b>{person.department}</b> {person.name}</span>)}</div></div>
      </section>
      <ProjectDetailView data={data} />
    </main>
  </div>;
}
