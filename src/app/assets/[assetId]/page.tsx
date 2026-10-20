import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { EntityDeleteButton } from "@/components/entity-delete-button";
import { getAssetDetailData } from "@/lib/server/assets";

export const dynamic = "force-dynamic";
const statuses = { planned: "예정", active: "진행", completed: "완료" } as const;

function fileUrl(filePath: string) {
  const segments = filePath.replace(/\\/g, "/").split("/");
  if (segments[0] === "storage") segments.shift();
  return `/api/files/${segments.map(encodeURIComponent).join("/")}`;
}
function isImage(fileName: string) { return /\.(png|jpe?g|gif|webp|svg)$/i.test(fileName); }

export default async function AssetDetailPage({ params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await params;
  const data = await getAssetDetailData(assetId);
  if (!data) notFound();
  return <div className="app-shell"><AppSidebar people={data.people} active="assets" /><main className="dashboard-main asset-detail-page">
    <header className="detail-header"><div><p className="detail-breadcrumb"><Link href="/assets">자료 검색</Link><span>›</span><Link href={`/projects/${data.project.project_id}`}>{data.project.vendor_name}</Link><span>›</span>{data.asset.asset_name}</p><div className="detail-title-row"><h1>{data.asset.asset_name}</h1><span className={`project-status status-${data.asset.status}`}>{statuses[data.asset.status]}</span></div><p>{data.asset.asset_category} · {data.asset.version}</p></div><div className="detail-actions"><Link href={`/assets/${assetId}/edit`}>자료 수정</Link><EntityDeleteButton endpoint={`/api/assets/${assetId}`} label="자료 삭제" redirectTo="/assets" message="이 자료와 연결된 파일·활동 기록을 모두 삭제할까요? 이 작업은 되돌릴 수 없습니다." /></div></header>
    <div className="asset-detail-layout">
      <section className="card asset-preview">{isImage(data.asset.file_name) ? <Image src={fileUrl(data.asset.file_path)} width={1100} height={720} alt={data.asset.asset_name} unoptimized /> : <div className="asset-document-preview"><strong>{data.asset.file_name.split(".").pop()?.toUpperCase()}</strong><span>{data.asset.file_name}</span><a className="btn-primary" href={fileUrl(data.asset.file_path)} target="_blank" rel="noreferrer">파일 열기</a></div>}</section>
      <aside className="card asset-facts"><div className="section-heading"><div><p className="eyebrow">DETAIL</p><h2>자료 정보</h2></div></div><dl><div><dt>프로젝트</dt><dd><Link href={`/projects/${data.project.project_id}`}>{data.project.project_name}</Link></dd></div><div><dt>담당자</dt><dd>{data.owner ? `${data.owner.name} · ${data.owner.department}` : "미지정"}</dd></div><div><dt>파일명</dt><dd>{data.asset.file_name}</dd></div><div><dt>메모</dt><dd>{data.asset.note || "없음"}</dd></div></dl><a className="btn-primary asset-download" href={fileUrl(data.asset.file_path)} target="_blank" rel="noreferrer">파일 보기</a></aside>
    </div>
    <section className="card asset-activity"><div className="section-heading"><div><p className="eyebrow">ACTIVITY</p><h2>댓글·활동</h2></div><span>{data.comments.length}개</span></div>{data.comments.length === 0 ? <div className="empty-state">기록된 활동이 없습니다.</div> : <ol className="activity-list">{data.comments.map(({ comment, author }) => <li key={comment.comment_id}><span className={`activity-dot ${comment.comment_type}`} /><div><strong>{comment.comment_type === "system" ? "시스템" : author?.name ?? "담당자"}</strong><p>{comment.body}</p><small>{new Date(comment.created_at).toLocaleString("ko-KR")}</small></div></li>)}</ol>}</section>
  </main></div>;
}
