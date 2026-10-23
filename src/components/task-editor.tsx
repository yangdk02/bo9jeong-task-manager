"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Person, Task } from "@/lib/domain/schemas";
import { MultiPersonCombobox } from "@/components/multi-person-combobox";
import { useUnsavedWarning } from "@/lib/use-unsaved-warning";

export function TaskEditor({ people, projectId, task, assigneeIds = [] }: { people: Person[]; projectId: string; task?: Task; assigneeIds?: string[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { setChanged, markSaved, confirmLeave } = useUnsavedWarning();
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    const payload = { project_id: projectId, target_scope: form.get("target_scope"), task_name: form.get("task_name"), cycle: form.get("cycle"), target_count: form.get("target_count"), target_unit: form.get("target_unit"), status: form.get("status"), assignee_ids: form.getAll("assignee_ids"), actor_id: localStorage.getItem("bo9jeong.currentPersonId") ?? "" };
    const response = await fetch(task ? `/api/tasks/${task.task_id}` : "/api/tasks", { method: task ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { setError(body.error ?? "저장하지 못했습니다."); setBusy(false); return; }
    markSaved(); router.push(task ? `/tasks/${task.task_id}` : `/projects/${projectId}`); router.refresh();
  }
  function cancel() { if (confirmLeave()) { markSaved(); router.back(); } }
  return <form className="entity-form card" onSubmit={submit} onChange={setChanged}>
    <div className="form-grid"><label className="wide"><span>과업명 *</span><input name="task_name" required defaultValue={task?.task_name} /></label><label><span>대상 범위</span><select name="target_scope" defaultValue={task?.target_scope ?? "SNS"}>{["SNS","블로그","디자인","촬영","영상","네이버 플레이스","광고","기타"].map((value) => <option key={value}>{value}</option>)}</select></label><label><span>주기</span><select name="cycle" defaultValue={task?.cycle ?? "monthly"}><option value="monthly">월간 반복</option><option value="once">일회성</option></select></label><label><span>목표 수량</span><input name="target_count" type="number" min="0" required defaultValue={task?.target_count ?? 1} /></label><label><span>목표 단위</span><select name="target_unit" defaultValue={task?.target_unit ?? "건"}>{["건","장","곳","회","기타"].map((value) => <option key={value}>{value}</option>)}</select></label><label><span>상태</span><select name="status" defaultValue={task?.status ?? "planned"}><option value="planned">예정</option><option value="active">진행</option><option value="completed">완료</option></select></label></div>
    <MultiPersonCombobox people={people} defaultSelectedIds={assigneeIds} label="과업 담당자" />
    {error && <p className="form-error">{error}</p>}
    <div className="form-actions"><button type="button" onClick={cancel}>취소</button><button className="btn-primary" disabled={busy}>{busy ? "저장 중…" : task ? "수정 저장" : "과업 생성"}</button></div>
  </form>;
}
