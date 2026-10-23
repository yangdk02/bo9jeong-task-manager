"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Person, Project } from "@/lib/domain/schemas";
import { MultiPersonCombobox } from "@/components/multi-person-combobox";
import { useUnsavedWarning } from "@/lib/use-unsaved-warning";

const scopes = ["SNS", "블로그", "디자인", "촬영", "영상", "네이버 플레이스", "광고", "기타"] as const;
const units = ["건", "장", "곳", "회", "기타"] as const;
type Scope = (typeof scopes)[number];
type Unit = (typeof units)[number];
type TaskDraft = { key: string; group: string; name: string; scope: Scope; cycle: "monthly" | "once"; count: number; unit: Unit; selected: boolean; custom?: boolean };

const taskCatalog: TaskDraft[] = [
  { key: "blog", group: "블로그", name: "블로그 포스팅", scope: "블로그", cycle: "monthly", count: 8, unit: "건", selected: false },
  { key: "card", group: "인스타그램", name: "카드디자인", scope: "디자인", cycle: "monthly", count: 4, unit: "건", selected: false },
  { key: "post", group: "인스타그램", name: "일반 포스팅", scope: "SNS", cycle: "monthly", count: 8, unit: "건", selected: false },
  { key: "reels", group: "인스타그램", name: "릴스 · 숏폼 영상", scope: "영상", cycle: "monthly", count: 4, unit: "건", selected: false },
  { key: "shoot", group: "촬영", name: "출사 (사진·영상 촬영)", scope: "촬영", cycle: "monthly", count: 2, unit: "회", selected: false },
  { key: "thumbnail", group: "콘텐츠 제작", name: "맛집 소식 썸네일 제작", scope: "디자인", cycle: "once", count: 1, unit: "건", selected: false },
  { key: "detail", group: "콘텐츠 제작", name: "상세페이지 디자인", scope: "디자인", cycle: "once", count: 1, unit: "건", selected: false },
  { key: "place", group: "네이버 플레이스", name: "플레이스 관리 (월 통계 캡처)", scope: "네이버 플레이스", cycle: "monthly", count: 1, unit: "회", selected: false },
  { key: "ad", group: "네이버 플레이스", name: "플레이스 광고 집행", scope: "광고", cycle: "monthly", count: 1, unit: "회", selected: false },
];

function TaskChecklist({ people, drafts, setDrafts, onChange }: { people: Person[]; drafts: TaskDraft[]; setDrafts: React.Dispatch<React.SetStateAction<TaskDraft[]>>; onChange: () => void }) {
  const selectedCount = drafts.filter((draft) => draft.selected).length;
  const groups = [...new Set(drafts.map((draft) => draft.group))];
  function update(key: string, patch: Partial<TaskDraft>) { onChange(); setDrafts((items) => items.map((item) => item.key === key ? { ...item, ...patch } : item)); }
  function addCustomTask() {
    onChange();
    const key = `custom-${Date.now()}`;
    setDrafts((items) => [...items, { key, group: "직접 추가", name: "", scope: "기타", cycle: "once", count: 1, unit: "건", selected: true, custom: true }]);
  }

  return <section className="project-task-section">
    <div className="project-form-section-head"><div><span>2</span><div><h2>계약 과업 체크리스트</h2><p>계약서에 있는 과업을 선택하고 목표와 담당자를 입력해 주세요.</p></div></div><strong>{selectedCount}개 선택</strong></div>
    <div className="task-checklist-groups">
      {groups.map((group) => <section key={group} className="task-checklist-group">
        <h3>{group}</h3>
        <div className="task-checklist-list">
          {drafts.filter((draft) => draft.group === group).map((draft) => <article className={`task-checklist-item ${draft.selected ? "selected" : ""}`} key={draft.key}>
            <label className="task-check-toggle"><input type="checkbox" checked={draft.selected} onChange={(event) => update(draft.key, { selected: event.target.checked })} /><span>{draft.name || "새 과업"}</span>{draft.custom && <button type="button" onClick={(event) => { event.preventDefault(); onChange(); setDrafts((items) => items.filter((item) => item.key !== draft.key)); }}>삭제</button>}</label>
            {draft.selected && <div className="task-check-fields">
              <label className="task-name-field"><span>과업명</span><input name={`task_name_${draft.key}`} required defaultValue={draft.name} /></label>
              <label><span>대상 범위</span><select name={`task_scope_${draft.key}`} defaultValue={draft.scope}>{scopes.map((scope) => <option key={scope}>{scope}</option>)}</select></label>
              <label><span>주기</span><select name={`task_cycle_${draft.key}`} defaultValue={draft.cycle}><option value="monthly">월간 반복</option><option value="once">일회성</option></select></label>
              <label><span>목표 수량</span><input name={`task_count_${draft.key}`} type="number" min="0" required defaultValue={draft.count} /></label>
              <label><span>목표 단위</span><select name={`task_unit_${draft.key}`} defaultValue={draft.unit}>{units.map((unit) => <option key={unit}>{unit}</option>)}</select></label>
              <div className="task-assignee-picker"><MultiPersonCombobox people={people} label="과업 담당자" name={`task_assignee_${draft.key}`} /></div>
            </div>}
          </article>)}
        </div>
      </section>)}
    </div>
    <button className="add-custom-task" type="button" onClick={addCustomTask}>＋ 목록에 없는 과업 직접 추가</button>
  </section>;
}

export function ProjectEditor({ people, project, assigneeIds = [] }: { people: Person[]; project?: Project; assigneeIds?: string[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [taskDrafts, setTaskDrafts] = useState(() => taskCatalog.map((task) => ({ ...task })));
  const { setChanged, markSaved, confirmLeave } = useUnsavedWarning();
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    const status = form.get("status");
    const payload: Record<string, unknown> = { vendor_name: form.get("vendor_name"), project_name: form.get("project_name"), management_category: form.get("management_category"), start_date: form.get("start_date"), end_date: form.get("end_date"), status, assignee_ids: form.getAll("assignee_ids"), actor_id: localStorage.getItem("bo9jeong.currentPersonId") ?? "" };
    if (!project) {
      const selectedTasks = taskDrafts.filter((task) => task.selected);
      if (!selectedTasks.length) { setError("과업을 한 개 이상 선택해 주세요."); setBusy(false); return; }
      payload.tasks = selectedTasks.map((task) => ({ target_scope: form.get(`task_scope_${task.key}`), task_name: form.get(`task_name_${task.key}`), cycle: form.get(`task_cycle_${task.key}`), target_count: form.get(`task_count_${task.key}`), target_unit: form.get(`task_unit_${task.key}`), status, assignee_ids: form.getAll(`task_assignee_${task.key}`) }));
    }
    const response = await fetch(project ? `/api/projects/${project.project_id}` : "/api/projects", { method: project ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { setError(body.error ?? "저장하지 못했습니다."); setBusy(false); return; }
    markSaved(); router.push(`/projects/${body.id ?? project?.project_id}`); router.refresh();
  }
  function cancel() { if (confirmLeave()) { markSaved(); router.back(); } }
  return <form className="entity-form card project-creation-form" onSubmit={submit} onChange={setChanged}>
    <section>{!project && <div className="project-form-section-head"><div><span>1</span><div><h2>기본 정보</h2><p>프로젝트 정보와 복수 담당자를 입력합니다.</p></div></div></div>}
      <div className="form-grid"><label><span>업체명 *</span><input name="vendor_name" required defaultValue={project?.vendor_name} /></label><label><span>프로젝트명 *</span><input name="project_name" required defaultValue={project?.project_name} /></label><label><span>관리 분류</span><input name="management_category" defaultValue={project?.management_category} placeholder="예: 통합 마케팅" /></label><label><span>상태</span><select name="status" defaultValue={project?.status ?? "planned"}><option value="planned">예정</option><option value="active">진행</option><option value="completed">완료</option></select></label><label><span>시작일 *</span><input name="start_date" type="date" required defaultValue={project?.start_date} /></label><label><span>종료일 *</span><input name="end_date" type="date" required defaultValue={project?.end_date} /></label></div>
      <MultiPersonCombobox people={people} defaultSelectedIds={assigneeIds} label="프로젝트 담당자" />
    </section>
    {!project && <TaskChecklist people={people} drafts={taskDrafts} setDrafts={setTaskDrafts} onChange={setChanged} />}
    {error && <p className="form-error">{error}</p>}<div className="form-actions"><button type="button" onClick={cancel}>취소</button><button className="btn-primary" disabled={busy}>{busy ? "저장 중…" : project ? "수정 저장" : "프로젝트와 과업 생성"}</button></div>
  </form>;
}
