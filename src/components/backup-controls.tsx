"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import JSZip from "jszip";

const backupTables = ["people", "projects", "project_assignees", "tasks", "task_assignees", "works", "work_assignees", "work_files", "assets", "comments"] as const;
const backupFormat = "bo9jeong-task-manager-backup";
const backupVersion = 1;
type TableName = (typeof backupTables)[number];
type BackupCsvMap = Record<TableName, string>;
type Descriptor = {
  manifest: { format: string; version: number; created_at: string; tables: string[]; file_count: number };
  tables: BackupCsvMap;
  files: string[];
};

function fileUrl(filePath: string) {
  return `/api/files/${filePath.split("/").slice(1).map(encodeURIComponent).join("/")}`;
}

function uploadUrl(filePath: string) {
  return `/api/backups/files/${filePath.split("/").slice(1).map(encodeURIComponent).join("/")}`;
}

async function errorMessage(response: Response) {
  const payload = await response.json().catch(() => ({})) as { error?: string };
  return payload.error || "요청을 처리하지 못했습니다.";
}

export function BackupControls() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"download" | "restore" | null>(null);
  const [progress, setProgress] = useState("");
  const [message, setMessage] = useState("");

  async function downloadBackup() {
    setBusy("download");
    setMessage("");
    try {
      setProgress("백업 목록을 준비하는 중…");
      const response = await fetch("/api/backups", { cache: "no-store" });
      if (!response.ok) throw new Error(await errorMessage(response));
      const descriptor = await response.json() as Descriptor;
      const zip = new JSZip();
      zip.file("manifest.json", JSON.stringify(descriptor.manifest, null, 2));
      for (const table of backupTables) zip.file(`data/local/${table}.csv`, descriptor.tables[table]);
      for (let index = 0; index < descriptor.files.length; index += 1) {
        const filePath = descriptor.files[index];
        setProgress(`파일 내려받는 중 ${index + 1}/${descriptor.files.length}`);
        const fileResponse = await fetch(fileUrl(filePath));
        if (!fileResponse.ok) throw new Error(`${filePath} 파일을 읽지 못했습니다.`);
        zip.file(filePath, await fileResponse.blob());
      }
      setProgress("ZIP 파일을 만드는 중…");
      const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `bo9jeong-backup-${new Date().toISOString().slice(0, 10)}.zip`;
      link.click();
      URL.revokeObjectURL(url);
      setMessage("백업 ZIP을 다운로드했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "백업을 만들지 못했습니다.");
    } finally {
      setBusy(null);
      setProgress("");
    }
  }

  async function restoreBackup(file: File) {
    if (!window.confirm("현재 데이터와 등록 파일을 이 ZIP의 내용으로 교체합니다. 계속할까요?")) {
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setBusy("restore");
    setMessage("");
    try {
      setProgress("ZIP 내용을 확인하는 중…");
      const zip = await JSZip.loadAsync(file);
      const manifestEntry = zip.file("manifest.json");
      if (!manifestEntry) throw new Error("manifest.json이 없는 백업 ZIP입니다.");
      const manifest = JSON.parse(await manifestEntry.async("text")) as { format?: unknown; version?: unknown };
      if (manifest.format !== backupFormat || manifest.version !== backupVersion) throw new Error("현재 앱에서 만든 백업 ZIP이 아닙니다.");

      const tables = {} as BackupCsvMap;
      for (const table of backupTables) {
        const entry = zip.file(`data/local/${table}.csv`);
        if (!entry) throw new Error(`${table}.csv가 없는 백업 ZIP입니다.`);
        tables[table] = await entry.async("text");
      }
      const validation = await fetch("/api/backups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "validate", format: manifest.format, version: manifest.version, tables }),
      });
      if (!validation.ok) throw new Error(await errorMessage(validation));
      const validationResult = await validation.json() as { files: string[] };
      const requiredFiles = validationResult.files;
      for (const filePath of requiredFiles) if (!zip.file(filePath)) throw new Error(`필수 파일이 ZIP에 없습니다: ${filePath}`);

      const uploaded: string[] = [];
      for (let index = 0; index < requiredFiles.length; index += 1) {
        const filePath = requiredFiles[index];
        setProgress(`파일 복구 중 ${index + 1}/${requiredFiles.length}`);
        const entry = zip.file(filePath)!;
        const upload = await fetch(uploadUrl(filePath), { method: "PUT", headers: { "Content-Type": "application/octet-stream" }, body: await entry.async("blob") });
        if (!upload.ok) throw new Error(await errorMessage(upload));
        uploaded.push(filePath);
      }

      setProgress("데이터를 교체하는 중…");
      const commit = await fetch("/api/backups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "commit", confirm: "RESTORE", format: manifest.format, version: manifest.version, tables, uploaded_files: uploaded }),
      });
      if (!commit.ok) throw new Error(await errorMessage(commit));
      setMessage("백업 복구가 완료되었습니다.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "백업을 복구하지 못했습니다.");
    } finally {
      setBusy(null);
      setProgress("");
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return <section className="backup-card card" aria-labelledby="backup-title">
    <div><p className="eyebrow">BACKUP FILE</p><h2 id="backup-title">현재 데이터 보관하기</h2><p>데이터와 등록된 작업 증빙·자료 파일을 ZIP으로 내려받거나 복구하세요.</p></div>
    <div className="backup-actions">
      <button className="compact-action" type="button" disabled={busy !== null} onClick={downloadBackup}>{busy === "download" ? "백업 중…" : "ZIP 백업 다운로드"}</button>
      <button className="btn-accent" type="button" disabled={busy !== null} onClick={() => inputRef.current?.click()}>{busy === "restore" ? "복구 중…" : "ZIP으로 복구"}</button>
      <input ref={inputRef} className="backup-file-input" type="file" accept=".zip,application/zip" onChange={(event) => { const selected = event.target.files?.[0]; if (selected) void restoreBackup(selected); }} />
    </div>
    {(progress || message) && <p className="backup-status" role="status">{progress || message}</p>}
    <small>복구 전 ZIP의 구조와 데이터 관계를 검사합니다. 복구를 시작하면 현재 데이터가 ZIP 내용으로 교체됩니다.</small>
  </section>;
}
