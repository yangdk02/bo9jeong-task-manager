import { AppSidebar } from "@/components/app-sidebar";
import { CountingRuleNote } from "@/components/counting-rule-note";
import { getDashboardData } from "@/lib/server/dashboard";
import Link from "next/link";
import type { CSSProperties } from "react";

export const dynamic = "force-dynamic";

const statusLabels = { draft: "작성 중", completed: "완료" } as const;

function formatDate(value: string) {
  const [, month, day] = value.split("-");
  return `${Number(month)}월 ${Number(day)}일`;
}

export default async function DashboardPage() {
  const data = await getDashboardData();
  const month = Number(data.monthKey.split("-")[1]);
  const overallProgress = Math.max(0, Math.min(data.totals.percent, 100));

  return <div className="app-shell">
    <AppSidebar people={data.people} active="dashboard" />

    <main className="dashboard-main">
      <header className="page-header">
        <div><p className="eyebrow">{data.monthKey.replace("-", ".")} 업무 요약</p><h1>{month}월 과업 현황</h1><p>이번 달의 반복 과업과 일회성 과업 목표를 한눈에 확인하세요.</p></div>
      </header>
      <section className="summary-grid" aria-label="전체 요약">
        <article><span>이번 달 과업</span><strong>{data.totals.target}</strong><small>반복 + 이달 등록한 일회성</small></article>
        <article><span>완료 과업</span><strong>{data.totals.completed}</strong><small>목표 수량을 채운 과업</small></article>
        <article><span>남은 과업</span><strong>{data.totals.remaining}</strong><small>목표 수량이 남은 과업</small></article>
        <article
          className={`accent progress-summary-card${overallProgress >= 100 ? " is-complete" : ""}`}
          style={{ "--progress-level": `${overallProgress}%` } as CSSProperties}
        >
          <div className="progress-summary-liquid" aria-hidden="true" />
          <div className="progress-summary-content"><span>전체 진행률</span><strong>{data.totals.percent}%</strong><small>이번 달 기준</small></div>
        </article>
      </section>
      <CountingRuleNote dashboardProgress />
      <section className="content-section">
        <div className="section-heading"><div><p className="eyebrow">PROJECTS</p><h2>프로젝트별 진행률</h2></div><span>{data.projectProgress.length}개 프로젝트</span></div>
        {data.projectProgress.length === 0 ? <div className="empty-state">등록된 프로젝트가 없습니다.</div> : <div className="project-grid">{data.projectProgress.map((item) => <Link className="project-card project-card-link" href={`/projects/${item.project.project_id}`} key={item.project.project_id}>
          <div className="project-top"><span>{item.project.vendor_name}</span><strong>{item.percent}%</strong></div><h3>{item.project.project_name}</h3><div className={`progress-track ${item.percent >= 100 ? "is-complete" : "is-incomplete"}`}><span style={{ width: `${item.percent}%` }} /></div><dl><div><dt>전체 과업</dt><dd>{item.target}개</dd></div><div><dt>완료 과업</dt><dd>{item.completed}개</dd></div><div><dt>남은 과업</dt><dd>{item.remaining}개</dd></div></dl>
        </Link>)}</div>}
      </section>
      <section className="content-section recent-section">
        <div className="section-heading"><div><p className="eyebrow">RECENT WORK</p><h2>최근 등록 작업</h2></div><span>{month}월 최신순</span></div>
        {data.recentWorks.length === 0 ? <div className="empty-state">이번 달 등록된 작업이 없습니다.</div> : <div className="table-wrap"><table><thead><tr><th>작업일</th><th>프로젝트</th><th>과업 / 작업</th><th>담당자</th><th>증빙</th><th>상태</th></tr></thead><tbody>{data.recentWorks.map((item) => <tr key={item.work.work_id}>
          <td>{formatDate(item.work.work_date)}</td><td><Link className="table-link" href={`/projects/${item.project.project_id}`}><strong>{item.project.vendor_name}</strong><small>{item.project.project_name}</small></Link></td><td><Link className="work-row-link" href={`/works/${item.work.work_id}`}><span className="task-label">{item.task.target_scope}</span><strong>{item.work.title}</strong><small>{item.task.task_name}</small></Link></td><td>{item.creatorName}</td><td>{item.fileCount}개</td><td><span className={`status status-${item.work.status}`}>{statusLabels[item.work.status]}</span></td>
        </tr>)}</tbody></table></div>}
      </section>
    </main>
  </div>;
}
