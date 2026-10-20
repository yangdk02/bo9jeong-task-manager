"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

function fileUrl(filePath: string) {
  const segments = filePath.replace(/\\/g, "/").split("/");
  if (segments[0] === "storage") segments.shift();
  return `/api/files/${segments.map(encodeURIComponent).join("/")}`;
}

function isImage(fileName: string) {
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(fileName);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function WorkFileCard({ workId, file }: { workId: string; file: { work_file_id: string; file_path: string; file_name: string; uploaded_at: string } }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    if (!window.confirm(`${file.file_name} 파일을 삭제할까요? 이 작업은 되돌릴 수 없습니다.`)) return;
    const actorId = localStorage.getItem("bo9jeong.currentPersonId") ?? "";
    if (!actorId) { setError("먼저 현재 담당자를 선택해 주세요."); return; }
    setBusy(true); setError("");
    const response = await fetch(`/api/works/${encodeURIComponent(workId)}/files/${encodeURIComponent(file.work_file_id)}`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ actor_id: actorId }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setError(result.error ?? "증빙 파일을 삭제하지 못했습니다."); setBusy(false); return; }
    router.refresh();
  }

  return <article className="work-file-card-wrap">
    <a className="work-file-card" href={fileUrl(file.file_path)} target="_blank" rel="noreferrer">
      {isImage(file.file_name) ? <Image src={fileUrl(file.file_path)} alt={file.file_name} width={640} height={420} unoptimized /> : <div className="file-document-preview"><strong>{file.file_name.split(".").pop()?.toUpperCase()}</strong><span>파일 열기 ↗</span></div>}
      <span><strong>{file.file_name}</strong><small>{formatDateTime(file.uploaded_at)}</small></span>
    </a>
    <button className="work-file-delete" type="button" disabled={busy} onClick={remove} aria-label={`${file.file_name} 삭제`}>{busy ? "삭제 중…" : "삭제"}</button>
    {error && <small className="work-file-error">{error}</small>}
  </article>;
}
