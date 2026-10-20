import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { CommentComposer } from "@/components/comment-composer";
import { EntityDeleteButton } from "@/components/entity-delete-button";
import { getWorkDetailData } from "@/lib/server/works";

export const dynamic = "force-dynamic";

const statusLabels = { draft: "작성 중", completed: "완료" } as const;

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function fileUrl(filePath: string) {
  const segments = filePath.replace(/\\/g, "/").split("/");
  if (segments[0] === "storage") segments.shift();
  return `/api/files/${segments.map(encodeURIComponent).join("/")}`;
}

function isImage(fileName: string) {
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(fileName);
}

export default async function WorkDetailPage({ params }: { params: Promise<{ workId: string }> }) {
  const { workId } = await params;
  const data = await getWorkDetailData(workId);
  if (!data) notFound();

  return <div className="app-shell">
    <AppSidebar people={data.people} active="projects" />
    <main className="dashboard-main work-detail-page">
      <header className="detail-header work-detail-header">
        <div>
          <p className="detail-breadcrumb"><Link href="/projects">프로젝트</Link><span>›</span><Link href={`/projects/${data.project.project_id}`}>{data.project.vendor_name}</Link><span>›</span><Link href={`/tasks/${data.task.task_id}`}>{data.task.task_name}</Link><span>›</span>{data.work.title}</p>
          <div className="detail-title-row"><h1>{data.work.title}</h1><span className={`status status-${data.work.status}`}>{statusLabels[data.work.status]}</span></div>
          <p>{data.work.work_id} · {data.work.work_date}</p>
        </div>
        <div className="detail-actions"><Link className="btn-primary" href={`/works/${workId}/edit`}>작업 수정</Link><EntityDeleteButton endpoint={`/api/works/${workId}`} label="작업 삭제" redirectTo={`/projects/${data.project.project_id}`} message="작업과 연결된 증빙 파일·활동 기록을 삭제할까요? 이 작업은 되돌릴 수 없습니다." /></div>
      </header>

      {data.files.length === 0 && <div className="work-file-warning">증빙 파일이 아직 등록되지 않았습니다.</div>}

      <div className="work-detail-layout">
        <div className="work-main-column">
          <section className="card work-info-card">
            <div className="section-heading"><div><p className="eyebrow">WORK INFO</p><h2>작업 정보</h2></div></div>
            <dl className="work-info-grid">
              <div><dt>작업일</dt><dd>{data.work.work_date}</dd></div>
              <div><dt>프로젝트</dt><dd><Link href={`/projects/${data.project.project_id}`}>{data.project.project_name}</Link></dd></div>
              <div><dt>과업</dt><dd>{data.task.task_name}</dd></div>
              <div><dt>담당자</dt><dd>{data.assignees.length ? data.assignees.map((person) => `${person.name} · ${person.department}`).join(", ") : "미지정"}</dd></div>
              <div><dt>등록자</dt><dd>{data.creator?.name ?? "알 수 없음"}</dd></div>
              <div><dt>등록 시각</dt><dd>{formatDateTime(data.work.created_at)}</dd></div>
              <div className="wide"><dt>결과 URL</dt><dd>{data.work.result_url ? <a className="result-link" href={data.work.result_url} target="_blank" rel="noreferrer">결과물 보기 ↗</a> : "등록되지 않음"}</dd></div>
            </dl>
          </section>

          <section className="card work-files-card">
            <div className="section-heading"><div><p className="eyebrow">FILES</p><h2>캡처본·증빙 파일</h2></div><span>{data.files.length}개</span></div>
            {data.files.length === 0 ? <div className="empty-state">등록된 파일이 없습니다.</div> : <div className="work-file-grid">{data.files.map((file) => <a className="work-file-card" href={fileUrl(file.file_path)} target="_blank" rel="noreferrer" key={file.work_file_id}>
              {isImage(file.file_name) ? <Image src={fileUrl(file.file_path)} alt={file.file_name} width={640} height={420} unoptimized /> : <div className="file-document-preview"><strong>{file.file_name.split(".").pop()?.toUpperCase()}</strong><span>파일 열기 ↗</span></div>}
              <span><strong>{file.file_name}</strong><small>{formatDateTime(file.uploaded_at)}</small></span>
            </a>)}</div>}
          </section>

          <section className="card work-memo-card">
            <div className="section-heading"><div><p className="eyebrow">MEMO</p><h2>작업 메모</h2></div></div>
            <p>{data.work.memo || "등록된 메모가 없습니다."}</p>
          </section>
        </div>

        <aside className="card activity-card">
          <div className="section-heading"><div><p className="eyebrow">ACTIVITY</p><h2>댓글·활동</h2></div><span>{data.comments.length}개</span></div>
          <CommentComposer targetType="work" targetId={workId} />
          {data.comments.length === 0 ? <div className="empty-state">기록된 활동이 없습니다.</div> : <ol className="activity-list">{data.comments.map(({ comment, author }) => <li key={comment.comment_id}>
            <span className={`activity-dot ${comment.comment_type}`} />
            <div><strong>{comment.comment_type === "system" ? "시스템" : author?.name ?? "담당자"}</strong><p>{comment.body}</p><small>{formatDateTime(comment.created_at)}</small></div>
          </li>)}</ol>}
        </aside>
      </div>
    </main>
  </div>;
}
