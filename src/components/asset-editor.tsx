"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Person, Project, TableRow } from "@/lib/domain/schemas";
import { FileUploadField } from "@/components/file-upload-field";
import { PersonCombobox } from "@/components/person-combobox";
import { useUnsavedWarning } from "@/lib/use-unsaved-warning";
import { validateUploadFiles } from "@/lib/upload-policy";

const categories = ["로고", "로고 배치 가이드", "브랜드 가이드", "패키지 시안", "카드뉴스", "배너", "썸네일", "상세페이지", "사진 원본", "영상 원본", "보고서", "기타"] as const;

export function AssetEditor({ people, projects, asset }: { people: Person[]; projects: Project[]; asset?: TableRow<"assets"> }) {
  const router = useRouter();
  const [ownerPersonId, setOwnerPersonId] = useState(asset?.owner_person_id ?? "");
  const [file, setFile] = useState<File>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { setChanged, markSaved, confirmLeave } = useUnsavedWarning();
  const owner = people.find((person) => person.person_id === ownerPersonId);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!asset && !file) { setError("자료 파일을 선택하거나 Ctrl+V로 붙여넣어 주세요."); return; }
    const fileError = validateUploadFiles(file ? [file] : []);
    if (fileError) { setError(fileError); return; }
    setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    if (file) form.set("file", file);
    form.set("actor_id", localStorage.getItem("bo9jeong.currentPersonId") ?? "");
    form.set("owner_person_id", ownerPersonId);
    const response = await fetch(asset ? `/api/assets/${asset.asset_id}` : "/api/assets", { method: asset ? "PATCH" : "POST", body: form });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { setError(body.error ?? "자료를 저장하지 못했습니다."); setBusy(false); return; }
    markSaved(); router.push(`/assets/${body.id ?? asset?.asset_id}`); router.refresh();
  }

  function cancel() { if (confirmLeave()) { markSaved(); router.back(); } }

  return <form className="entity-form card" onSubmit={submit} onChange={setChanged}>
    <div className="form-grid">
      <label><span>프로젝트 *</span><select name="project_id" required defaultValue={asset?.project_id ?? projects[0]?.project_id}>{projects.map((project) => <option value={project.project_id} key={project.project_id}>{project.vendor_name} · {project.project_name}</option>)}</select></label>
      <label><span>자료 유형 *</span><select name="asset_category" required defaultValue={asset?.asset_category ?? "로고"}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
      <label className="wide"><span>자료명 *</span><input name="asset_name" required defaultValue={asset?.asset_name} /></label>
      <label><span>버전 *</span><input name="version" required defaultValue={asset?.version ?? "v1"} placeholder="예: v1, v2-final" /></label>
      <label><span>상태</span><select name="status" defaultValue={asset?.status ?? "active"}><option value="planned">예정</option><option value="active">진행</option><option value="completed">완료</option></select></label>
      <label className="wide"><span>메모</span><textarea name="note" rows={4} defaultValue={asset?.note} /></label>
      <FileUploadField label={asset ? "파일 교체" : "자료 파일"} required={!asset} currentFileName={asset?.file_name} onFilesChange={(files) => { setFile(files[0]); setChanged(); }} />
    </div>
    <div className="asset-owner-picker"><PersonCombobox people={people} selectedPersonId={ownerPersonId} label="자료 담당자" placeholder="이름 또는 부서를 검색하세요" onSelect={(person) => { setOwnerPersonId(person.person_id); setChanged(); }} />{owner && <div className="selected-owner"><span><b>{owner.name}</b> · {owner.department}</span><button type="button" onClick={() => { setOwnerPersonId(""); setChanged(); }}>담당자 해제</button></div>}</div>
    {projects.length === 0 && <p className="form-error">자료를 연결할 프로젝트를 먼저 생성해 주세요.</p>}
    {error && <p className="form-error">{error}</p>}
    <div className="form-actions"><button type="button" onClick={cancel}>취소</button><button className="btn-primary" disabled={busy || projects.length === 0}>{busy ? "저장 중…" : asset ? "수정 저장" : "자료 등록"}</button></div>
  </form>;
}
