"use client";

import { useId, useMemo, useState } from "react";
import type { Person } from "@/lib/domain/schemas";

export function MultiPersonCombobox({ people, defaultSelectedIds = [], label = "담당자", name = "assignee_ids" }: { people: Person[]; defaultSelectedIds?: string[]; label?: string; name?: string }) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => [...new Set(defaultSelectedIds)]);
  const selected = selectedIds.flatMap((personId) => people.find((person) => person.person_id === personId) ?? []);
  const normalizedQuery = query.trim().toLocaleLowerCase("ko");
  const matches = useMemo(() => {
    if (!normalizedQuery) return [];
    return people
      .filter((person) => !selectedIds.includes(person.person_id) && `${person.name} ${person.department}`.toLocaleLowerCase("ko").includes(normalizedQuery))
      .slice(0, 6);
  }, [normalizedQuery, people, selectedIds]);

  function add(person: Person) {
    setSelectedIds((ids) => [...ids, person.person_id]);
    setQuery("");
    setIsOpen(false);
  }

  return <div className="multi-person-picker">
    <label htmlFor={`${listId}-input`}>{label}</label>
    <div className="person-combobox">
      <div className="combobox-input-wrap">
        <span aria-hidden="true">⌕</span>
        <input id={`${listId}-input`} role="combobox" aria-autocomplete="list" aria-controls={listId} aria-expanded={isOpen && !!normalizedQuery} autoComplete="off" value={query} placeholder="이름 또는 부서로 검색해 추가하세요" onChange={(event) => { setQuery(event.target.value); setIsOpen(true); }} onFocus={() => setIsOpen(true)} onKeyDown={(event) => { if (event.key === "Enter" && matches[0]) { event.preventDefault(); add(matches[0]); } if (event.key === "Escape") setIsOpen(false); }} />
      </div>
      {isOpen && normalizedQuery && <div className="combobox-results" id={listId} role="listbox">{matches.length ? matches.map((person) => <button key={person.person_id} type="button" role="option" aria-selected="false" onClick={() => add(person)}><span className="person-avatar">{person.name.slice(0, 1)}</span><span><strong>{person.name}</strong><small>{person.department}</small></span><span className="person-add-mark">＋</span></button>) : <p>추가할 수 있는 담당자가 없습니다.</p>}</div>}
    </div>
    {selected.length > 0 ? <div className="selected-person-list">{selected.map((person) => <span className="selected-person-chip" key={person.person_id}><span className="person-avatar">{person.name.slice(0, 1)}</span><span><strong>{person.name}</strong><small>{person.department}</small></span><button type="button" aria-label={`${person.name} 담당자 제거`} onClick={() => setSelectedIds((ids) => ids.filter((id) => id !== person.person_id))}>×</button><input type="hidden" name={name} value={person.person_id} /></span>)}</div> : <p className="picker-empty">선택된 담당자가 없습니다.</p>}
  </div>;
}
