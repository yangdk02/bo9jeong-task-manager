import Link from "next/link";
import { AppSidebar } from "@/components/app-sidebar";
import { AssetEditor } from "@/components/asset-editor";
import { getAssetListData } from "@/lib/server/assets";

export const dynamic = "force-dynamic";
export default async function NewAssetPage() { const data = await getAssetListData(); return <div className="app-shell"><AppSidebar people={data.people} active="assets" /><main className="dashboard-main editor-page"><header className="detail-header"><div><p className="detail-breadcrumb"><Link href="/assets">자료 검색</Link><span>›</span>새 자료</p><h1>자료 등록</h1><p>프로젝트에 연결할 자료 파일과 검색 정보를 입력합니다.</p></div></header><AssetEditor people={data.people} projects={data.projects} /></main></div>; }
