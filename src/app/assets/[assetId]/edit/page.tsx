import Link from "next/link";
import { notFound } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { AssetEditor } from "@/components/asset-editor";
import { getAssetDetailData, getAssetListData } from "@/lib/server/assets";

export const dynamic = "force-dynamic";
export default async function EditAssetPage({ params }: { params: Promise<{ assetId: string }> }) { const { assetId } = await params; const [data, list] = await Promise.all([getAssetDetailData(assetId), getAssetListData()]); if (!data) notFound(); return <div className="app-shell"><AppSidebar people={data.people} active="assets" /><main className="dashboard-main editor-page"><header className="detail-header"><div><p className="detail-breadcrumb"><Link href="/assets">자료 검색</Link><span>›</span><Link href={`/assets/${assetId}`}>{data.asset.asset_name}</Link><span>›</span>수정</p><h1>자료 수정</h1></div></header><AssetEditor people={data.people} projects={list.projects} asset={data.asset} /></main></div>; }
