import Link from "next/link";
import { AppSidebar } from "@/components/app-sidebar";
import { AssetListView } from "@/components/asset-list-view";
import { BackupControls } from "@/components/backup-controls";
import { getAssetListData } from "@/lib/server/assets";

export const dynamic = "force-dynamic";

export default async function AssetsPage() {
  const data = await getAssetListData();
  return <div className="app-shell"><AppSidebar people={data.people} active="assets" /><main className="dashboard-main">
    <header className="page-header"><div><p className="eyebrow">ASSET LIBRARY</p><h1>자료 검색</h1><p>프로젝트별 로고, 가이드와 제작물을 한곳에서 검색합니다.</p></div><Link className="btn-primary header-action" href="/assets/new">＋ 자료 등록</Link></header>
    <BackupControls />
    <AssetListView items={data.items} />
  </main></div>;
}
