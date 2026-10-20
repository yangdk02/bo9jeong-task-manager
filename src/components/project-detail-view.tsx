"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { ProjectDetailData, ProjectTaskItem, ProjectWorkItem } from "@/lib/server/projects";

const taskStatusLabels = { planned: "예정", active: "진행", completed: "완료" } as const;
const workStatusLabels = { draft: "작성 중", completed: "완료" } as const;

function taskWorksForPeriod(task: ProjectTaskItem, monthKey: string) {
  return task.task.cycle === "monthly" ? task.works.filter((item) => item.work.work_date.startsWith(monthKey)) : task.works;
}

function matchesWorkFilter(item: ProjectWorkItem, department: string, personId: string) {
  return (!department || item.assignees.some((person) => person.department === department)) &&
    (!personId || item.assignees.some((person) => person.person_id === personId));
}

export function ProjectDetailView({ data }: { data: ProjectDetailData }) {
  const router = useRouter();
  const [monthKey, setMonthKey] = useState(data.monthKey);
  const [department, setDepartment] = useState("");
  const [personId, setPersonId] = useState("");
  const [opened, setOpened] = useState<Record<string, boolean>>(() => data.tasks[0] ? { [data.tasks[0].task.task_id]: true } : {});
  const relevantPeople = useMemo(() => {
    const byId = new Map<string, (typeof data.people)[number]>();
    for (const person of data.assignees) byId.set(person.person_id, person);
    for (const task of data.tasks) {
      for (const person of task.assignees) byId.set(person.person_id, person);
      for (const item of task.works) for (const person of item.assignees) byId.set(person.person_id, person);
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, "ko"));
  }, [data]);
  const departments = [...new Set(relevantPeople.map((person) => person.department))];

  const visibleTasks = data.tasks.filter((task) => {
    if (!department && !personId) return true;
    const taskPeople = [...task.assignees, ...task.works.flatMap((item) => item.assignees)];
    return (!department || taskPeople.some((person) => person.department === department)) && (!personId || taskPeople.some((person) => person.person_id === personId));
  });

  const monthNumber = Number(monthKey.split("-")[1]);
  const monthlyTarget = data.tasks.filter((task) => task.task.cycle === "monthly").reduce((sum, task) => sum + task.task.target_count, 0);
  const monthlyCompleted = data.tasks.filter((task) => task.task.cycle === "monthly").reduce((sum, task) => sum + taskWorksForPeriod(task, monthKey).filter((item) => item.work.status === "completed").length, 0);

  return <>
    <section className="detail-controls card">
      <div><span>조회 월</span><input aria-label="조회 월" type="month" value={monthKey} onChange={(event) => setMonthKey(event.target.value)} /></div>
      <div className="department-filter"><span>부서별 보기</span><div role="group" aria-label="부서 필터"><button type="button" aria-pressed={!department} onClick={() => setDepartment("")}>전체</button>{departments.map((item) => <button key={item} type="button" aria-pressed={department === item} onClick={() => setDepartment(item)}>{item}</button>)}</div></div>
      <label><span>담당자</span><select value={personId} onChange={(event) => setPersonId(event.target.value)}><option value="">전체 담당자</option>{relevantPeople.map((person) => <option key={person.person_id} value={person.person_id}>{person.name} · {person.department}</option>)}</select></label>
    </section>

    <section className="detail-summary" aria-label={`${monthNumber}월 프로젝트 요약`}>
      <div><span>{monthNumber}월 목표</span><strong>{monthlyTarget}건</strong></div><div><span>완료 작업</span><strong>{monthlyCompleted}건</strong></div><div><span>남은 목표</span><strong>{Math.max(monthlyTarget - monthlyCompleted, 0)}건</strong></div>
    </section>

    <section className="task-section">
      <div className="section-heading"><div><p className="eyebrow">TASKS</p><h2>{monthNumber}월 과업 현황</h2></div><div className="section-actions"><span>{visibleTasks.length}개 과업</span><Link className="compact-action" href={`/projects/${data.project.project_id}/tasks/new`}>＋ 과업 생성</Link></div></div>
      {visibleTasks.length === 0 ? <div className="empty-state"><strong>선택한 조건의 과업이 없습니다.</strong><span>부서 또는 담당자 필터를 변경해 보세요.</span></div> : <div className="task-stack">{visibleTasks.map((task) => {
        const periodWorks = taskWorksForPeriod(task, monthKey);
        const filteredWorks = periodWorks.filter((item) => matchesWorkFilter(item, department, personId));
        const completed = periodWorks.filter((item) => item.work.status === "completed").length;
        const remaining = Math.max(task.task.target_count - completed, 0);
        const percent = task.task.target_count === 0 ? 0 : Math.min(Math.round((completed / task.task.target_count) * 100), 100);
        const isOpen = !!opened[task.task.task_id];
        return <article className="task-panel" key={task.task.task_id}>
          <div className="task-panel-head">
            <button className="task-toggle" type="button" aria-expanded={isOpen} onClick={() => setOpened((state) => ({ ...state, [task.task.task_id]: !isOpen }))}><span className={isOpen ? "rotated" : ""}>›</span><span className="sr-only">작업 목록 {isOpen ? "접기" : "펼치기"}</span></button>
            <div className="task-identity"><div><Link className="task-detail-link" href={`/tasks/${task.task.task_id}`}><strong>{task.task.task_name}</strong></Link><span className="mini-chip">{task.task.target_scope}</span><span className="mini-chip">{task.task.cycle === "monthly" ? "월간 반복" : "일회성"}</span></div><div className="mini-chip-row">{task.assignees.map((person) => <span key={person.person_id} className="assignee-chip"><b>{person.department}</b> {person.name}</span>)}</div></div>
            <div className="task-progress"><div><span style={{ width: `${percent}%` }} /></div><small>{completed} / {task.task.target_count}{task.task.target_unit}</small></div>
            <span className={`remain-pill${remaining === 0 ? " done" : ""}`}>{remaining === 0 ? "목표 완료" : `잔여 ${remaining}${task.task.target_unit}`}</span>
            <span className={`project-status status-${task.task.status}`}>{taskStatusLabels[task.task.status]}</span>
          </div>
          {isOpen && <div className="task-panel-body">{filteredWorks.length === 0 ? <p className="task-empty">선택한 기간과 담당 조건에 등록된 작업이 없습니다.</p> : <div className="task-work-table"><table><thead><tr><th>날짜</th><th>담당자</th><th>작업</th><th>결과 URL</th><th>증빙</th><th>상태</th></tr></thead><tbody>{filteredWorks.map((item) => {
            const href = `/works/${item.work.work_id}`;
            return <tr className="clickable-row" key={item.work.work_id} role="link" aria-label={`${item.work.title} 작업 열기`} tabIndex={0} onClick={(event) => {
              if ((event.target as HTMLElement).closest("a, button")) return;
              router.push(href);
            }} onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                router.push(href);
              }
            }}>
            <td>{item.work.work_date.slice(5).replace("-", ".")}</td><td><div className="work-assignees">{item.assignees.map((person) => <span key={person.person_id}><b>{person.department}</b> {person.name}</span>)}</div></td><td><strong>{item.work.title}</strong>{item.work.memo && <small>{item.work.memo}</small>}</td><td>{item.work.result_url ? <a className="result-link" href={item.work.result_url} target="_blank" rel="noreferrer">결과 보기 ↗</a> : <span className="muted">–</span>}</td><td>{item.fileCount > 0 ? `${item.fileCount}개` : <span className="muted">–</span>}</td><td><span className={`status status-${item.work.status}`}>{workStatusLabels[item.work.status]}</span></td>
          </tr>})}</tbody></table></div>}</div>}
        </article>;
      })}</div>}
    </section>
  </>;
}
