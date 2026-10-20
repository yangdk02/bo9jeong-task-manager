"use client";

import { useSyncExternalStore } from "react";
import type { Person } from "@/lib/domain/schemas";
import { PersonCombobox } from "@/components/person-combobox";

const storageKey = "bo9jeong.currentPersonId";
const localChangeEvent = "bo9jeong-person-change";

export function CurrentPersonSelector({ people }: { people: Person[] }) {
  const personId = useSyncExternalStore(
    (onChange) => {
      window.addEventListener("storage", onChange);
      window.addEventListener(localChangeEvent, onChange);
      return () => {
        window.removeEventListener("storage", onChange);
        window.removeEventListener(localChangeEvent, onChange);
      };
    },
    () => {
      const saved = window.localStorage.getItem(storageKey);
      return saved && people.some((person) => person.person_id === saved) ? saved : "";
    },
    () => "",
  );

  function updatePerson(nextPersonId: string) {
    window.localStorage.setItem(storageKey, nextPersonId);
    window.dispatchEvent(new Event(localChangeEvent));
  }

  const current = people.find((person) => person.person_id === personId);

  if (people.length === 0) return <p className="empty-person">등록된 담당자가 없습니다.</p>;

  return <div className="person-selector">
    <PersonCombobox compact people={people} selectedPersonId={personId} label="현재 담당자" placeholder="이름으로 변경" onSelect={(person) => updatePerson(person.person_id)} />
    <small>{current ? `${current.name}님으로 보고 있습니다` : "담당자를 선택해 주세요"}</small>
  </div>;
}
