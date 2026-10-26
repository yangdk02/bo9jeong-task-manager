"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Person, Task } from "@/lib/domain/schemas";
import { MultiPersonCombobox } from "@/components/multi-person-combobox";
import { useUnsavedWarning } from "@/lib/use-unsaved-warning";
import { catalogItemForTaskName, TASK_CATALOG } from "@/lib/domain/task-catalog";

export function TaskEditor({ people, projectId, task, assigneeIds = [] }: { people: Person[]; projectId: string; task?: Task; assigneeIds?: string[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const matchedCatalog = task ? catalogItemForTaskName(task.task_name) : TASK_CATALOG[0]!;
  const initialCatalog = matchedCatalog ?? TASK_CATALOG[0]!;
  const [catalogKey, setCatalogKey] = useState(task && !matchedCatalog ? "custom" : initialCatalog.key);
  const [customName, setCustomName] = useState(task && !matchedCatalog ? task.task_name : "");
  const [scope, setScope] = useState<Task["target_scope"]>(task?.target_scope ?? initialCatalog.scope);
  const [cycle, setCycle] = useState<Task["cycle"]>(task?.cycle ?? initialCatalog.cycle);
  const [targetCount, setTargetCount] = useState(task?.target_count ?? initialCatalog.count);
  const [targetUnit, setTargetUnit] = useState<Task["target_unit"]>(task?.target_unit ?? initialCatalog.unit);
  const { setChanged, markSaved, confirmLeave } = useUnsavedWarning();
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    const selectedCatalog = TASK_CATALOG.find((item) => item.key === catalogKey);
    const payload = { project_id: projectId, target_scope: scope, task_name: selectedCatalog?.name ?? customName, cycle, target_count: targetCount, target_unit: targetUnit, status: form.get("status"), assignee_ids: form.getAll("assignee_ids"), actor_id: localStorage.getItem("bo9jeong.currentPersonId") ?? "" };
    const response = await fetch(task ? `/api/tasks/${task.task_id}` : "/api/tasks", { method: task ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { setError(body.error ?? "저장하지 못했습니다."); setBusy(false); return; }
    markSaved(); router.push(task ? `/tasks/${task.task_id}` : `/projects/${projectId}`); router.refresh();
  }
  function cancel() { if (confirmLeave()) { markSaved(); router.back(); } }
  function selectCatalog(nextKey: string) {
    setCatalogKey(nextKey); setChanged();
    const selected = TASK_CATALOG.find((item) => item.key === nextKey);
    if (!selected) { setScope("기타"); setCycle("once"); setTargetCount(1); setTargetUnit("건"); return; }
    setScope(selected.scope); setCycle(selected.cycle); setTargetCount(selected.count); setTargetUnit(selected.unit);
  }
  return <form className="entity-form card" onSubmit={submit} onChange={setChanged}>
    <div className="form-grid"><label className="wide"><span>과업 선택 *</span><select value={catalogKey} onChange={(event) => selectCatalog(event.target.value)}>{TASK_CATALOG.map((item) => <option value={item.key} key={item.key}>{item.group} · {item.name}</option>)}<option value="custom">기타 · 직접 입력</option></select></label>{catalogKey === "custom" && <label className="wide"><span>기타 과업명 *</span><input required value={customName} onChange={(event) => setCustomName(event.target.value)} placeholder="계약서의 과업명을 입력해 주세요" /></label>}<label><span>대상 범위</span><select value={scope} onChange={(event) => setScope(event.target.value as Task["target_scope"])}>{["SNS","블로그","디자인","촬영","영상","네이버 플레이스","광고","기타"].map((value) => <option key={value}>{value}</option>)}</select></label><label><span>주기</span><select value={cycle} onChange={(event) => setCycle(event.target.value as Task["cycle"])}><option value="monthly">월간 반복</option><option value="once">일회성</option></select></label><label><span>목표 수량</span><input type="number" min="0" required value={targetCount} onChange={(event) => setTargetCount(Number(event.target.value))} /></label><label><span>목표 단위</span><select value={targetUnit} onChange={(event) => setTargetUnit(event.target.value as Task["target_unit"])}>{["건","장","곳","회","기타"].map((value) => <option key={value}>{value}</option>)}</select></label><label><span>상태</span><select name="status" defaultValue={task?.status ?? "planned"}><option value="planned">예정</option><option value="active">진행</option><option value="completed">완료</option></select></label></div>
    <MultiPersonCombobox people={people} defaultSelectedIds={assigneeIds} label="과업 담당자" />
    {error && <p className="form-error">{error}</p>}
    <div className="form-actions"><button type="button" onClick={cancel}>취소</button><button className="btn-primary" disabled={busy}>{busy ? "저장 중…" : task ? "수정 저장" : "과업 생성"}</button></div>
  </form>;
}
