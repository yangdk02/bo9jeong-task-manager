"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Person, Project } from "@/lib/domain/schemas";
import { MultiPersonCombobox } from "@/components/multi-person-combobox";

export function ProjectEditor({ people, project, assigneeIds = [] }: { people: Person[]; project?: Project; assigneeIds?: string[] }) {
  const router = useRouter(); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); const form = new FormData(event.currentTarget);
    const actorId = localStorage.getItem("bo9jeong.currentPersonId") ?? "";
    const payload = { vendor_name: form.get("vendor_name"), project_name: form.get("project_name"), management_category: form.get("management_category"), start_date: form.get("start_date"), end_date: form.get("end_date"), status: form.get("status"), assignee_ids: form.getAll("assignee_ids"), actor_id: actorId };
    const response = await fetch(project ? `/api/projects/${project.project_id}` : "/api/projects", { method: project ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { setError(body.error ?? "저장하지 못했습니다."); setBusy(false); return; }
    router.push(`/projects/${body.id ?? project?.project_id}`); router.refresh();
  }
  return <form className="entity-form card" onSubmit={submit}>
    <div className="form-grid"><label><span>업체명 *</span><input name="vendor_name" required defaultValue={project?.vendor_name} /></label><label><span>프로젝트명 *</span><input name="project_name" required defaultValue={project?.project_name} /></label><label><span>관리 분류</span><input name="management_category" defaultValue={project?.management_category} placeholder="예: 통합 마케팅" /></label><label><span>상태</span><select name="status" defaultValue={project?.status ?? "planned"}><option value="planned">예정</option><option value="active">진행</option><option value="completed">완료</option></select></label><label><span>시작일 *</span><input name="start_date" type="date" required defaultValue={project?.start_date} /></label><label><span>종료일 *</span><input name="end_date" type="date" required defaultValue={project?.end_date} /></label></div>
    <MultiPersonCombobox people={people} defaultSelectedIds={assigneeIds} label="프로젝트 담당자" />
    {error && <p className="form-error">{error}</p>}<div className="form-actions"><button type="button" onClick={() => router.back()}>취소</button><button className="btn-primary" disabled={busy}>{busy ? "저장 중…" : project ? "수정 저장" : "프로젝트 생성"}</button></div>
  </form>;
}
