"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { ProjectListItem } from "@/lib/server/projects";

type StatusFilter = "all" | "planned" | "active" | "completed";
const statusLabels = { planned: "예정", active: "진행", completed: "완료" } as const;

function displayDate(value: string) { return value.replaceAll("-", "."); }

export function ProjectListView({ items, monthKey }: { items: ProjectListItem[]; monthKey: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase("ko");
  const filtered = useMemo(() => items.filter((item) => {
    const matchesStatus = status === "all" || item.project.status === status;
    const searchable = `${item.project.vendor_name} ${item.project.project_name} ${item.project.management_category}`.toLocaleLowerCase("ko");
    return matchesStatus && (!normalizedQuery || searchable.includes(normalizedQuery));
  }), [items, normalizedQuery, status]);
  const counts = { all: items.length, planned: 0, active: 0, completed: 0 };
  for (const item of items) counts[item.project.status] += 1;

  return <>
    <div className="project-toolbar">
      <div className="status-filters" role="group" aria-label="프로젝트 상태 필터">
        {(["all", "active", "planned", "completed"] as const).map((value) => <button key={value} type="button" aria-pressed={status === value} onClick={() => setStatus(value)}>
          {value === "all" ? "전체" : statusLabels[value]} <span>{counts[value]}</span>
        </button>)}
      </div>
      <label className="project-search"><span className="sr-only">업체명 검색</span><span aria-hidden="true">⌕</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="업체명 또는 프로젝트 검색" /></label>
    </div>

    {filtered.length === 0 ? <div className="empty-state"><strong>조건에 맞는 프로젝트가 없습니다.</strong><span>검색어나 상태 필터를 바꿔 보세요.</span></div> : <div className="project-list-table table-wrap">
      <table><thead><tr><th>업체 / 프로젝트</th><th>계약 기간</th><th>담당 부서</th><th>과업</th><th>{Number(monthKey.split("-")[1])}월 수행</th><th>상태</th></tr></thead>
        <tbody>{filtered.map((item) => {
          const href = `/projects/${item.project.project_id}`;
          return <tr className="clickable-row" key={item.project.project_id} role="link" aria-label={`${item.project.vendor_name} ${item.project.project_name} 열기`} tabIndex={0} onClick={() => router.push(href)} onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              router.push(href);
            }
          }}>
          <td><strong>{item.project.vendor_name}</strong><span className="project-name">{item.project.project_name}</span></td>
          <td>{displayDate(item.project.start_date)}<small>– {displayDate(item.project.end_date)}</small></td>
          <td><div className="mini-chip-row">{item.departments.map((department) => <span className="mini-chip" key={department}>{department}</span>)}</div></td>
          <td><span className="cycle-count cycle-monthly">월간 {item.monthlyTaskCount}</span><span className="cycle-count cycle-once">일회성 {item.onceTaskCount}</span></td>
          <td><div className={`list-progress ${item.percent >= 100 ? "is-complete" : "is-incomplete"}`}><div><span style={{ width: `${item.percent}%` }} /></div><strong>{item.completed} / {item.target}</strong></div></td>
          <td><span className={`project-status status-${item.project.status}`}>{statusLabels[item.project.status]}</span></td>
        </tr>})}</tbody>
      </table>
    </div>}
  </>;
}
