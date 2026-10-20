"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { AssetListItem } from "@/lib/server/assets";

const statuses = { planned: "예정", active: "진행", completed: "완료" } as const;

function fileUrl(filePath: string) {
  const segments = filePath.replace(/\\/g, "/").split("/");
  if (segments[0] === "storage") segments.shift();
  return `/api/files/${segments.map(encodeURIComponent).join("/")}`;
}

export function AssetListView({ items }: { items: AssetListItem[] }) {
  const [query, setQuery] = useState("");
  const [projectId, setProjectId] = useState("");
  const [category, setCategory] = useState("");
  const projects = [...new Map(items.map((item) => [item.project.project_id, item.project])).values()];
  const categories = [...new Set(items.map((item) => item.asset.asset_category))];
  const filtered = useMemo(() => items.filter((item) => {
    const haystack = `${item.asset.asset_name} ${item.asset.file_name} ${item.project.vendor_name} ${item.owner?.name ?? ""} ${item.owner?.department ?? ""}`.toLocaleLowerCase("ko");
    return (!query.trim() || haystack.includes(query.trim().toLocaleLowerCase("ko"))) &&
      (!projectId || item.project.project_id === projectId) && (!category || item.asset.asset_category === category);
  }), [category, items, projectId, query]);

  return <>
    <div className="asset-toolbar card">
      <label className="project-search asset-search"><span aria-hidden="true">⌕</span><span className="sr-only">자료 검색</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="자료명, 업체, 담당자 또는 부서 검색" /></label>
      <label><span>프로젝트</span><select value={projectId} onChange={(event) => setProjectId(event.target.value)}><option value="">전체 프로젝트</option>{projects.map((project) => <option value={project.project_id} key={project.project_id}>{project.vendor_name}</option>)}</select></label>
      <label><span>자료 유형</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">전체 유형</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
    </div>
    <div className="section-heading asset-result-heading"><div><p className="eyebrow">ASSETS</p><h2>검색 결과</h2></div><span>{filtered.length}개 자료</span></div>
    {filtered.length === 0 ? <div className="empty-state">조건에 맞는 자료가 없습니다.</div> : <div className="asset-grid">{filtered.map((item) => <Link className="asset-card" href={`/assets/${item.asset.asset_id}`} key={item.asset.asset_id}>
      <Image src={fileUrl(item.asset.file_path)} width={520} height={340} alt={item.asset.asset_name} unoptimized />
      <div><div className="asset-card-meta"><span>{item.asset.asset_category}</span><span className={`project-status status-${item.asset.status}`}>{statuses[item.asset.status]}</span></div><h3>{item.asset.asset_name}</h3><p>{item.project.vendor_name} · {item.asset.version}</p><small>{item.owner ? `${item.owner.name} · ${item.owner.department}` : "담당자 미지정"}</small></div>
    </Link>)}</div>}
  </>;
}
