"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { ReportProject } from "@/lib/server/reports";
import { metricMonthLabel, metricValueLabel, placeMetricComparison } from "@/lib/domain/place-metrics";
import { PLACE_MONTHLY_TASK_NAME } from "@/lib/domain/task-catalog";

function fileUrl(filePath: string) {
  const segments = filePath.replace(/\\/g, "/").split("/");
  if (segments[0] === "storage") segments.shift();
  return `/api/files/${segments.map(encodeURIComponent).join("/")}`;
}

function isImage(fileName: string) { return /\.(png|jpe?g|gif|webp|svg)$/i.test(fileName); }
function displayDate(value: string) { return value.replaceAll("-", "."); }

export function ReportSetupView({ projects, initialProjectId }: { projects: ReportProject[]; initialProjectId?: string }) {
  const [projectId, setProjectId] = useState(projects.some((item) => item.project.project_id === initialProjectId) ? initialProjectId! : projects[0]?.project.project_id ?? "");
  const [startDate, setStartDate] = useState("2026-10-01");
  const [endDate, setEndDate] = useState("2026-10-31");
  const [comment, setComment] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [showSources, setShowSources] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const selected = projects.find((item) => item.project.project_id === projectId);
  const works = useMemo(() => selected?.works.filter((work) => work.status === "completed" && work.work_date >= startDate && work.work_date <= endDate) ?? [], [endDate, selected, startDate]);
  const pages = useMemo(() => {
    if (!selected) return [];
    return [
      { key: "cover", kind: "cover" as const, title: "표지 · 진행 내역", status: comment.trim() ? "자동 반영" : "작성 필요" },
      ...selected.tasks.flatMap((task) => {
        const taskWorks = works.filter((work) => work.task_id === task.task_id);
        const missingEvidence = taskWorks.some((work) => work.files.length === 0);
        const missingPlaceMetric = task.task_name === PLACE_MONTHLY_TASK_NAME && placeMetricComparison(selected.placeMonthlyMetrics, task.task_id, endDate.slice(0, 7)).current === undefined;
        const chunks = taskWorks.length ? Array.from({ length: Math.ceil(taskWorks.length / 4) }, (_, index) => taskWorks.slice(index * 4, index * 4 + 4)) : [[]];
        return chunks.map((chunk, index) => ({ key: `${task.task_id}-${index}`, kind: "task" as const, title: `${task.task_name}${chunks.length > 1 ? ` (${index + 1}/${chunks.length})` : ""}`, status: taskWorks.length === 0 ? "자료 없음" : missingEvidence ? "증빙 누락" : missingPlaceMetric ? "수치 누락" : "자동 반영", task, works: chunk, taskWorkCount: taskWorks.length }));
      }),
    ];
  }, [comment, endDate, selected, works]);
  const current = pages[Math.min(pageIndex, Math.max(pages.length - 1, 0))];
  const placeComparison = current?.kind === "task" && current.task.task_name === PLACE_MONTHLY_TASK_NAME && selected
    ? placeMetricComparison(selected.placeMonthlyMetrics, current.task.task_id, endDate.slice(0, 7))
    : undefined;
  const issueCount = pages.filter((page) => page.status !== "자동 반영").length;

  async function generateReport() {
    if (!selected) return;
    setGenerating(true); setError("");
    const response = await fetch("/api/reports", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ project_id: projectId, start_date: startDate, end_date: endDate, comment }) });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      setError(result.error ?? "보고서를 생성하지 못했습니다."); setGenerating(false); return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `보구정_결과보고서_${selected.project.vendor_name}_${startDate}_${endDate}.pptx`.replace(/[\\/:*?"<>|]/g, "_");
    document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
    setGenerating(false);
  }

  return <div className="report-builder">
    <section className="card report-form-card">
      <div className="section-heading"><div><p className="eyebrow">REPORT SETUP</p><h2>보고서 조건</h2></div><span>입력값이 아래 미리보기에 즉시 반영됩니다.</span></div>
      <div className="form-grid report-condition-grid">
        <label><span>프로젝트</span><select value={projectId} onChange={(event) => { setProjectId(event.target.value); setPageIndex(0); }}>{projects.map((item) => <option value={item.project.project_id} key={item.project.project_id}>{item.project.vendor_name} · {item.project.project_name}</option>)}</select></label>
        <label><span>시작일</span><input type="date" value={startDate} onChange={(event) => { setStartDate(event.target.value); setPageIndex(0); }} /></label>
        <label><span>종료일</span><input type="date" min={startDate} value={endDate} onChange={(event) => { setEndDate(event.target.value); setPageIndex(0); }} /></label>
        <label><span>보고서 코멘트</span><input className="report-comment-input" type="text" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="성과 요약이나 다음 달 제안 내용을 입력하세요." /></label>
      </div>
      <div className="report-form-footer"><div><p className="form-note">보구정 A4 세로 양식이며, 과업과 완료 실적 수에 따라 페이지가 자동 구성됩니다.</p>{error && <p className="form-error">{error}</p>}</div><button className="btn-primary report-generate" type="button" disabled={generating || !selected || startDate > endDate} onClick={generateReport}>{generating ? "PPTX 생성 중…" : "편집 가능한 PPTX 생성"}</button></div>
    </section>

    <section className="report-preview-shell" aria-label="보고서 미리보기">
      <header className="report-preview-toolbar"><div><p className="eyebrow">LIVE PREVIEW</p><h2>결과 보고서 미리보기</h2><p>{pages.length}쪽 · 완료 실적 {works.length}건 · 확인 필요 {issueCount}쪽</p></div><label><input type="checkbox" checked={showSources} onChange={(event) => setShowSources(event.target.checked)} /> 자동 입력 영역 표시</label></header>
      {selected && current ? <div className="report-preview-grid">
        <nav className="report-page-list" aria-label="보고서 페이지"><strong>페이지</strong>{pages.map((page, index) => <button type="button" className={current.key === page.key ? "active" : ""} onClick={() => setPageIndex(index)} key={page.key}><span><b>{index + 1}</b>{page.title}</span><small className={`preview-status preview-status-${page.status.replaceAll(" ", "-")}`}>{page.status}</small></button>)}</nav>

        <div className="report-paper-stage">
          <article className={`report-paper${showSources ? " show-sources" : ""}`}>
            {current.kind === "cover" ? <>
              <div className="report-paper-topline"><span>ONLINE MARKETING REPORT</span><Image src="/images/bo9jeong-logo.png" width={24} height={40} alt="보구정" /></div>
              <div className="report-cover-title"><small>{selected.project.management_category || "온라인 마케팅"}</small><h3>{selected.project.vendor_name}</h3><p>{selected.project.project_name}</p><time>{displayDate(startDate)} — {displayDate(endDate)}</time></div>
              <div className="report-cover-metrics source-area"><div><span>진행 과업</span><strong>{selected.tasks.length}</strong></div><div><span>완료 실적</span><strong>{works.length}</strong></div><div><span>증빙 파일</span><strong>{works.reduce((sum, work) => sum + work.files.length, 0)}</strong></div></div>
              <div className={`report-cover-comment ${comment.trim() ? "source-area-manual" : "source-area-missing"}`}><span>보구정&apos;s 코멘트</span><p>{comment || "보고서 조건에서 성과 요약이나 다음 달 제안 내용을 입력해 주세요."}</p></div>
            </> : <>
              <div className="report-paper-topline"><span>{current.task.target_scope.toUpperCase()} PERFORMANCE</span><span>{displayDate(startDate)} — {displayDate(endDate)}</span></div>
              <div className="report-task-title"><small>{selected.project.vendor_name}</small><h3>{current.task.task_name}</h3><p>{current.task.cycle === "monthly" ? "월간 반복 과업" : "일회성 과업"} · 목표 {current.task.target_count}{current.task.target_unit}</p></div>
              <div className="report-task-summary source-area"><div><span>목표</span><strong>{current.task.target_count}{current.task.target_unit}</strong></div><div><span>완료</span><strong>{current.taskWorkCount}{current.task.target_unit}</strong>{current.taskWorkCount > current.task.target_count && <small>+{current.taskWorkCount - current.task.target_count} 초과</small>}</div><div><span>달성률</span><strong>{current.task.target_count ? Math.round(current.taskWorkCount / current.task.target_count * 100) : 0}%</strong></div></div>
              {current.works.length ? <div className={`report-evidence-grid${placeComparison ? " report-place-evidence-grid" : ""}`}>{current.works.slice(0, placeComparison ? 2 : 4).map((work) => { const evidence = work.files[0]; return <div className={evidence ? "source-area" : "source-area-missing"} key={work.work_id}>{evidence && isImage(evidence.file_name) ? <Image src={fileUrl(evidence.file_path)} width={300} height={210} unoptimized alt={evidence.file_name} /> : <div className="report-evidence-placeholder"><b>{evidence ? evidence.file_name.split(".").pop()?.toUpperCase() : "증빙 없음"}</b><span>{evidence ? "첨부 파일" : "작업에서 파일을 추가해 주세요"}</span></div>}<p><time>{work.work_date.slice(5).replace("-", ".")}</time><strong>{work.title}</strong></p></div>})}</div> : <div className="report-empty-page source-area-missing"><strong>선택한 기간에 완료된 실적이 없습니다.</strong><span>기간을 변경하거나 해당 과업의 작업 상태를 확인해 주세요.</span></div>}
              {placeComparison && <div className={`report-place-metric source-area${placeComparison.current === undefined ? " source-area-missing" : ""}`}><div><span>방문 지표</span><span>{metricMonthLabel(placeComparison.previousMonth)}</span><span>{metricMonthLabel(placeComparison.month)}</span><span>증감</span><span>증감률</span></div><div><strong>방문자 수</strong><span>{metricValueLabel(placeComparison.previous, "전월 자료 없음")}</span><span>{metricValueLabel(placeComparison.current, "미입력")}</span><span>{placeComparison.difference === undefined ? "—" : `${placeComparison.difference >= 0 ? "+" : ""}${placeComparison.difference.toLocaleString("ko-KR")}`}</span><strong>{placeComparison.rate ?? "—"}</strong></div></div>}
              <div className="report-task-footer"><span /><b>BO9JEONG</b></div>
            </>}
          </article>
          <p>{pageIndex + 1} / {pages.length}</p>
        </div>

        <aside className="report-source-panel"><h3>{pageIndex + 1}쪽 · 자동으로 들어간 값</h3>{current.kind === "cover" ? <dl><div><dt>관리업체·프로젝트</dt><dd>프로젝트 기본 정보</dd></div><div><dt>조회 기간</dt><dd>선택한 시작일·종료일</dd></div><div><dt>진행 내역 건수</dt><dd>완료 처리된 작업 수</dd></div><div><dt>증빙 파일 수</dt><dd>기간 내 작업 첨부 파일</dd></div><div><dt>보구정&apos;s 코멘트</dt><dd>담당자 직접 입력</dd></div></dl> : <dl><div><dt>과업명·목표</dt><dd>과업 등록 정보</dd></div><div><dt>완료·달성률</dt><dd>기간 내 완료 작업 수</dd></div><div><dt>작업명·날짜</dt><dd>완료된 작업 정보</dd></div><div><dt>대표 캡처</dt><dd>가장 먼저 등록한 증빙</dd></div>{placeComparison && <div><dt>방문자 수 비교</dt><dd>작업 등록 시 입력한 월별 수치</dd></div>}</dl>}{current.status !== "자동 반영" && <div className="report-preview-notice"><strong>{current.status}</strong><p>{current.kind === "cover" ? "표지 코멘트를 작성해 주세요." : current.status === "증빙 누락" ? "일부 완료 작업에 증빙 파일이 없습니다." : current.status === "수치 누락" ? "작업 등록에서 조회 월 방문자 수를 입력해 주세요." : "선택한 기간에 완료 작업이 없습니다."}</p></div>}<p>내보낸 PPTX의 글상자·표·이미지는 PowerPoint에서 직접 수정할 수 있습니다.</p><div className="report-preview-legend"><span><i className="auto" />자동 입력</span><span><i className="manual" />직접 입력</span><span><i className="missing" />자료 누락</span></div></aside>
      </div> : <div className="empty-state">미리 볼 프로젝트가 없습니다.</div>}
    </section>
  </div>;
}
