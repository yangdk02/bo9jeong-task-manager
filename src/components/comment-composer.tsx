"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CommentComposer({ targetType, targetId }: { targetType: "work" | "asset"; targetId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const authorPersonId = localStorage.getItem("bo9jeong.currentPersonId") ?? "";
    if (!authorPersonId) { setError("먼저 현재 담당자를 선택해 주세요."); return; }
    setBusy(true); setError("");
    const response = await fetch("/api/comments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ target_type: targetType, target_id: targetId, author_person_id: authorPersonId, body }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setError(result.error ?? "댓글을 등록하지 못했습니다."); setBusy(false); return; }
    setBody(""); setBusy(false); router.refresh();
  }

  return <form className="comment-composer" onSubmit={submit}>
    <label htmlFor={`comment-${targetType}-${targetId}`}>담당자 댓글</label>
    <div><textarea id={`comment-${targetType}-${targetId}`} value={body} maxLength={2000} rows={3} required placeholder="진행 상황이나 확인할 내용을 남겨 주세요." onChange={(event) => setBody(event.target.value)} /><button className="btn-primary" type="submit" disabled={busy || !body.trim()}>{busy ? "등록 중…" : "댓글 등록"}</button></div>
    {error && <p>{error}</p>}
  </form>;
}
