"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Person } from "@/lib/domain/schemas";
import { PersonCombobox } from "@/components/person-combobox";

const storageKey = "bo9jeong.currentPersonId";
const localChangeEvent = "bo9jeong-person-change";

export function LandingPersonPicker({ people }: { people: Person[] }) {
  const router = useRouter();
  const [availablePeople, setAvailablePeople] = useState(people);
  const [selected, setSelected] = useState<Person>();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("마케팅");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function openAddPerson(query: string) {
    setName(query.trim());
    setError("");
    setShowAdd(true);
  }

  async function addPerson(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const response = await fetch("/api/people", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, department }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { setError(body.error ?? "담당자를 추가하지 못했습니다."); setBusy(false); return; }
    const person = body.person as Person;
    setAvailablePeople((current) => [...current, person]);
    setSelected(person);
    setShowAdd(false);
    setName("");
    setBusy(false);
  }

  function continueToDashboard() {
    if (!selected) return;
    window.localStorage.setItem(storageKey, selected.person_id);
    window.dispatchEvent(new Event(localChangeEvent));
    router.push("/dashboard");
  }

  return <div className="landing-picker">
    <PersonCombobox people={availablePeople} selectedPersonId={selected?.person_id} onSelect={setSelected} onAdd={openAddPerson} />
    {showAdd && <form className="landing-person-form" onSubmit={addPerson}>
      <div className="landing-person-form-head"><strong>새 담당자 추가</strong><button type="button" aria-label="담당자 추가 닫기" onClick={() => setShowAdd(false)}>×</button></div>
      <label><span>이름</span><input autoFocus required maxLength={50} value={name} onChange={(event) => setName(event.target.value)} placeholder="담당자 이름" /></label>
      <label><span>부서</span><select value={department} onChange={(event) => setDepartment(event.target.value)}>{["경영관리", "총무", "기획", "영상촬영", "디자인", "마케팅"].map((value) => <option key={value}>{value}</option>)}</select></label>
      {error && <p>{error}</p>}
      <button className="btn-primary" type="submit" disabled={busy}>{busy ? "추가 중…" : "추가하고 선택"}</button>
    </form>}
    {selected && <div className="selected-person" aria-live="polite">
      <span className="person-avatar">{selected.name.slice(0, 1)}</span>
      <span><strong>{selected.name}</strong><small>{selected.department} 담당자로 시작합니다</small></span>
      <span aria-hidden="true">✓</span>
    </div>}
    <button className="btn-primary landing-continue" type="button" disabled={!selected} onClick={continueToDashboard}>보구정 워크플레이스 시작하기 <span aria-hidden="true">→</span></button>
  </div>;
}
