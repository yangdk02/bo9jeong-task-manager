import { AppSidebar } from "@/components/app-sidebar";
import { ReportSetupView } from "@/components/report-setup-view";
import { getReportSetupData } from "@/lib/server/reports";

export const dynamic = "force-dynamic";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ projectId?: string }> }) {
  const { projectId } = await searchParams;
  const data = await getReportSetupData();
  return <div className="app-shell"><AppSidebar people={data.people} active="reports" /><main className="dashboard-main">
    <header className="page-header"><div><p className="eyebrow">REPORT</p><h1>결과 보고서</h1><p>프로젝트와 기간을 선택해 보고서에 포함될 실적을 미리 확인합니다.</p></div></header>
    <ReportSetupView projects={data.projects} initialProjectId={projectId} />
  </main></div>;
}
