import Link from "next/link";
import { notFound } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { EntityDeleteButton } from "@/components/entity-delete-button";
import { getTaskDetailData } from "@/lib/server/tasks";

export const dynamic = "force-dynamic";

const taskStatusLabels = { planned: "예정", active: "진행", completed: "완료" } as const;
const workStatusLabels = { draft: "작성 중", completed: "완료" } as const;

export default async function TaskDetailPage({ params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;
  const data = await getTaskDetailData(taskId);
  if (!data) notFound();
  const works = data.task.task.cycle === "monthly"
    ? data.task.works.filter((item) => item.work.work_date.startsWith(data.monthKey))
    : data.task.works;
  const completed = works.filter((item) => item.work.status === "completed").length;
  const remaining = Math.max(data.task.task.target_count - completed, 0);
  const percent = data.task.task.target_count === 0 ? 0 : Math.min(Math.round((completed / data.task.task.target_count) * 100), 100);

  return <div className="app-shell">
    <AppSidebar people={data.people} active="projects" />
    <main className="dashboard-main task-detail-page">
      <header className="detail-header">
        <div>
          <p className="detail-breadcrumb"><Link href="/projects">프로젝트</Link><span>›</span><Link href={`/projects/${data.project.project_id}`}>{data.project.vendor_name}</Link><span>›</span>{data.task.task.task_name}</p>
          <div className="detail-title-row"><h1>{data.task.task.task_name}</h1><span className={`project-status status-${data.task.task.status}`}>{taskStatusLabels[data.task.task.status]}</span></div>
          <p>{data.task.task.target_scope} · <span className={`cycle-label cycle-${data.task.task.cycle}`}>{data.task.task.cycle === "monthly" ? "월간 반복" : "일회성"}</span></p>
        </div>
        <div className="detail-actions"><Link className="btn-accent" href={`/projects/${data.project.project_id}/works/new?taskId=${taskId}`}>작업 등록</Link><Link href={`/tasks/${taskId}/edit`}>과업 수정</Link><EntityDeleteButton endpoint={`/api/tasks/${taskId}`} label="과업 삭제" redirectTo={`/projects/${data.project.project_id}`} message="이 과업과 연결된 모든 작업을 삭제할까요? 이 작업은 되돌릴 수 없습니다." /></div>
      </header>
      <section className="task-detail-hero card">
        <div><span>목표</span><strong>{data.task.task.target_count}{data.task.task.target_unit}</strong></div>
        <div><span>완료 작업</span><strong>{completed}{data.task.task.target_unit}</strong></div>
        <div><span>남은 목표</span><strong>{remaining}{data.task.task.target_unit}</strong></div>
        <div className={`task-detail-progress ${percent >= 100 ? "is-complete" : "is-incomplete"}`}><span><i style={{ width: `${percent}%` }} /></span><strong>{percent}%</strong></div>
      </section>
      <section className="content-section">
        <div className="section-heading"><div><p className="eyebrow">WORKS</p><h2>{data.task.task.cycle === "monthly" ? `${Number(data.monthKey.split("-")[1])}월 작업` : "전체 작업"}</h2></div><span>{works.length}개</span></div>
        {works.length === 0 ? <div className="empty-state">등록된 작업이 없습니다.</div> : <div className="work-card-list">{works.map((item) => <Link className="work-list-card" href={`/works/${item.work.work_id}`} key={item.work.work_id}>
          <div><time>{item.work.work_date}</time><span className={`status status-${item.work.status}`}>{workStatusLabels[item.work.status]}</span></div>
          <h3>{item.work.title}</h3><p>{item.work.memo || "등록된 메모가 없습니다."}</p>
          <footer><span>{item.assignees.map((person) => person.name).join(", ") || "담당자 미지정"}</span><span>증빙 {item.fileCount}개</span></footer>
        </Link>)}</div>}
      </section>
    </main>
  </div>;
}
