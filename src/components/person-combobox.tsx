"use client";

import { useId, useMemo, useState } from "react";
import type { Person } from "@/lib/domain/schemas";

type Props = {
  people: Person[];
  selectedPersonId?: string;
  onSelect: (person: Person) => void;
  label?: string;
  placeholder?: string;
  compact?: boolean;
  onAdd?: (query: string) => void;
};

export function PersonCombobox({ people, selectedPersonId, onSelect, label = "담당자 이름", placeholder = "이름을 입력해 주세요", compact = false, onAdd }: Props) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const selected = people.find((person) => person.person_id === selectedPersonId);
  const normalizedQuery = query.trim().toLocaleLowerCase("ko");
  const matches = useMemo(() => {
    if (!normalizedQuery) return [];
    return people.filter((person) => `${person.name} ${person.department}`.toLocaleLowerCase("ko").includes(normalizedQuery)).slice(0, 6);
  }, [normalizedQuery, people]);

  function choose(person: Person) {
    onSelect(person);
    setQuery("");
    setIsOpen(false);
  }

  return <div className={`person-combobox${compact ? " compact" : ""}`}>
    <label htmlFor={`${listId}-input`}>{label}</label>
    <div className="combobox-input-wrap">
      <span aria-hidden="true">⌕</span>
      <input
        id={`${listId}-input`}
        role="combobox"
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={isOpen && normalizedQuery.length > 0}
        autoComplete="off"
        value={query}
        placeholder={selected ? `${selected.name} · ${selected.department}` : placeholder}
        onChange={(event) => { setQuery(event.target.value); setIsOpen(true); }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && matches[0]) { event.preventDefault(); choose(matches[0]); }
          if (event.key === "Escape") setIsOpen(false);
        }}
      />
      {onAdd && <button className="person-create-trigger" type="button" aria-label="새 담당자 추가" title="새 담당자 추가" onClick={() => { setIsOpen(false); onAdd(query); }}>＋</button>}
    </div>
    {isOpen && normalizedQuery && <div className="combobox-results" id={listId} role="listbox">
      {matches.length > 0 ? matches.map((person) => <button key={person.person_id} type="button" role="option" aria-selected={person.person_id === selectedPersonId} onClick={() => choose(person)}>
        <span className="person-avatar">{person.name.slice(0, 1)}</span>
        <span><strong>{person.name}</strong><small>{person.department}</small></span>
      </button>) : <p>일치하는 담당자가 없습니다.</p>}
    </div>}
  </div>;
}
