"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function EntityDeleteButton({ endpoint, label, redirectTo, message }: { endpoint: string; label: string; redirectTo: string; message: string }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function remove() {
    if (!window.confirm(message)) return;
    setBusy(true); setError("");
    const response = await fetch(endpoint, { method: "DELETE" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { setError(body.error ?? "삭제하지 못했습니다."); setBusy(false); return; }
    router.push(redirectTo); router.refresh();
  }
  return <span className="delete-action-wrap"><button className="btn-danger" type="button" disabled={busy} onClick={remove}>{busy ? "삭제 중…" : label}</button>{error && <small>{error}</small>}</span>;
}
