"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Person } from "@/lib/domain/schemas";
import { PersonCombobox } from "@/components/person-combobox";

const storageKey = "bo9jeong.currentPersonId";
const localChangeEvent = "bo9jeong-person-change";

export function LandingPersonPicker({ people }: { people: Person[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Person>();

  function continueToDashboard() {
    if (!selected) return;
    window.localStorage.setItem(storageKey, selected.person_id);
    window.dispatchEvent(new Event(localChangeEvent));
    router.push("/dashboard");
  }

  return <div className="landing-picker">
    <PersonCombobox people={people} selectedPersonId={selected?.person_id} onSelect={setSelected} />
    {selected && <div className="selected-person" aria-live="polite">
      <span className="person-avatar">{selected.name.slice(0, 1)}</span>
      <span><strong>{selected.name}</strong><small>{selected.department} 담당자로 시작합니다</small></span>
      <span aria-hidden="true">✓</span>
    </div>}
    <button className="btn-primary landing-continue" type="button" disabled={!selected} onClick={continueToDashboard}>대시보드 시작하기 <span aria-hidden="true">→</span></button>
  </div>;
}
