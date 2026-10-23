import { AppSidebar } from "@/components/app-sidebar";
import { BackupControls } from "@/components/backup-controls";
import { readTable } from "@/lib/server/csv-repository";

export const dynamic = "force-dynamic";

export default async function BackupsPage() {
  const people = await readTable("people");
  return <div className="app-shell"><AppSidebar people={people} active="backups" /><main className="dashboard-main">
    <header className="page-header"><div><p className="eyebrow">DATA BACKUP</p><h1>자료 백업 및 복구</h1><p>현재 데이터를 ZIP으로 안전하게 보관하고, 필요할 때 같은 상태로 되돌립니다.</p></div></header>
    <BackupControls />
    <section className="backup-guide-grid">
      <article className="card"><span>01</span><h2>백업하기</h2><p>데이터와 등록된 작업 증빙·자료 파일을 하나의 ZIP으로 내려받습니다.</p></article>
      <article className="card"><span>02</span><h2>보관하기</h2><p>내려받은 ZIP의 이름이나 내부 폴더 구조를 바꾸지 않고 안전한 위치에 보관합니다.</p></article>
      <article className="card"><span>03</span><h2>복구하기</h2><p>ZIP을 선택하면 데이터를 먼저 검사한 뒤, 확인을 거쳐 현재 내용을 백업 시점으로 교체합니다.</p></article>
    </section>
  </main></div>;
}
