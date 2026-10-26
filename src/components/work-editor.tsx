"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Person, PlaceMonthlyMetric, Task, Work } from "@/lib/domain/schemas";
import { FileUploadField } from "@/components/file-upload-field";
import { MultiPersonCombobox } from "@/components/multi-person-combobox";
import { useUnsavedWarning } from "@/lib/use-unsaved-warning";
import { validateUploadFiles } from "@/lib/upload-policy";
import { PLACE_MONTHLY_TASK_NAME } from "@/lib/domain/task-catalog";

export function WorkEditor({ people, tasks, placeMonthlyMetrics = [], work, assigneeIds = [], initialTaskId }: { people: Person[]; tasks: Task[]; placeMonthlyMetrics?: PlaceMonthlyMetric[]; work?: Work; assigneeIds?: string[]; initialTaskId?: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [registerAsAssets, setRegisterAsAssets] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const initialDate = work?.work_date ?? new Date().toISOString().slice(0, 10);
  const initialSelectedTaskId = work?.task_id ?? initialTaskId ?? tasks[0]?.task_id ?? "";
  function savedVisitorCount(taskId: string, date: string) {
    const metric = placeMonthlyMetrics.find((item) => item.task_id === taskId && item.year_month === date.slice(0, 7));
    return metric === undefined ? "" : String(metric.visitor_count);
  }
  const [selectedTaskId, setSelectedTaskId] = useState(initialSelectedTaskId);
  const [workDate, setWorkDate] = useState(initialDate);
  const [visitorCount, setVisitorCount] = useState(() => savedVisitorCount(initialSelectedTaskId, initialDate));
  const { setChanged, markSaved, confirmLeave } = useUnsavedWarning();
  const selectedTask = tasks.find((task) => task.task_id === selectedTaskId);
  const isPlaceMonthlyTask = selectedTask?.task_name === PLACE_MONTHLY_TASK_NAME;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fileError = validateUploadFiles(files);
    if (fileError) { setError(fileError); return; }
    setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    for (const file of files) form.append("files", file);
    form.set("actor_id", localStorage.getItem("bo9jeong.currentPersonId") ?? "");
    const response = await fetch(work ? `/api/works/${work.work_id}` : "/api/works", { method: work ? "PATCH" : "POST", body: form });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { setError(body.error ?? "저장하지 못했습니다."); setBusy(false); return; }
    markSaved(); router.push(`/works/${body.id ?? work?.work_id}`); router.refresh();
  }

  function cancel() { if (confirmLeave()) { markSaved(); router.back(); } }

  return <form className="entity-form card" onSubmit={submit} onChange={setChanged}>
    <div className="form-grid">
      <label className="wide"><span>과업 *</span><select name="task_id" required value={selectedTaskId} onChange={(event) => { const nextTaskId = event.target.value; setSelectedTaskId(nextTaskId); setVisitorCount(savedVisitorCount(nextTaskId, workDate)); setChanged(); }}>{tasks.map((task) => <option value={task.task_id} key={task.task_id}>{task.task_name}</option>)}</select></label>
      <label><span>작업일 *</span><input name="work_date" type="date" required value={workDate} onChange={(event) => { const nextDate = event.target.value; setWorkDate(nextDate); setVisitorCount(savedVisitorCount(selectedTaskId, nextDate)); setChanged(); }} /></label>
      <label><span>상태</span><select name="status" defaultValue={work?.status ?? "draft"}><option value="draft">작성 중</option><option value="completed">완료</option></select></label>
      {isPlaceMonthlyTask && <label className="wide place-visitor-input"><span>해당 월 방문자 수 *</span><input name="visitor_count" type="number" min="0" step="1" required value={visitorCount} onChange={(event) => setVisitorCount(event.target.value)} placeholder="네이버 플레이스 통계의 방문자 수를 입력하세요" /><small>작업일이 속한 달의 수치로 저장되며, 실제 수치가 0이면 0을 입력합니다.</small></label>}
      <label className="wide"><span>작업명 *</span><input name="title" required defaultValue={work?.title} /></label>
      <label className="wide"><span>결과 URL</span><input name="result_url" type="url" defaultValue={work?.result_url} placeholder="https://" /></label>
      <label className="wide"><span>메모</span><textarea name="memo" rows={5} defaultValue={work?.memo} /></label>
      <FileUploadField label={work ? "증빙 파일 추가" : "캡처본·증빙 파일"} multiple onFilesChange={(next) => { setFiles(next); setChanged(); }} />
    </div>
    {!work && <section className={`work-asset-option${registerAsAssets ? " selected" : ""}`}><label className="work-asset-toggle"><input name="register_as_assets" type="checkbox" value="true" checked={registerAsAssets} onChange={(event) => { setRegisterAsAssets(event.target.checked); setChanged(); }} /><span><strong>자료로도 등록하기</strong><small>첨부한 파일을 프로젝트 자료 검색에도 함께 등록합니다.</small></span></label>{registerAsAssets && <div className="form-grid work-asset-fields"><label><span>자료 유형</span><select name="asset_category" defaultValue="기타">{["로고","로고 배치 가이드","브랜드 가이드","패키지 시안","카드뉴스","배너","썸네일","상세페이지","사진 원본","영상 원본","보고서","기타"].map((value) => <option key={value}>{value}</option>)}</select></label><label><span>버전</span><input name="asset_version" required defaultValue="v1" /></label><label><span>자료 상태</span><select name="asset_status" defaultValue="active"><option value="planned">예정</option><option value="active">진행</option><option value="completed">완료</option></select></label></div>}</section>}
    <MultiPersonCombobox people={people} defaultSelectedIds={assigneeIds} label="작업 담당자" />
    {error && <p className="form-error">{error}</p>}
    <div className="form-actions"><button type="button" onClick={cancel}>취소</button><button className="btn-primary" disabled={busy || tasks.length === 0}>{busy ? "저장 중…" : work ? "수정 저장" : "작업 생성"}</button></div>
  </form>;
}
