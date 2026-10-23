"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MAX_UPLOAD_LABEL, UPLOAD_ACCEPT, UPLOAD_FORMAT_LABEL, validateUploadFiles } from "@/lib/upload-policy";

type Props = {
  label: string;
  multiple?: boolean;
  required?: boolean;
  currentFileName?: string;
  onFilesChange: (files: File[]) => void;
};

function fileKey(file: File) { return `${file.name}:${file.size}:${file.lastModified}`; }
function formatSize(size: number) { return size >= 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)}MB` : `${Math.max(1, Math.round(size / 1024))}KB`; }

export function FileUploadField({ label, multiple = false, required = false, currentFileName, onFilesChange }: Props) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");

  function applyFiles(incoming: File[]) {
    if (!incoming.length) return;
    const next = multiple
      ? [...new Map([...files, ...incoming].map((file) => [fileKey(file), file])).values()]
      : [incoming[0]];
    const validation = validateUploadFiles(next);
    if (validation) { setError(validation); return; }
    setError(""); setFiles(next); onFilesChange(next);
  }

  function removeFile(key: string) {
    const next = files.filter((file) => fileKey(file) !== key);
    setFiles(next); setError(""); onFilesChange(next);
    if (inputRef.current) inputRef.current.value = "";
  }

  useEffect(() => {
    function paste(event: ClipboardEvent) {
      const pasted = Array.from(event.clipboardData?.files ?? []);
      if (!pasted.length) return;
      event.preventDefault();
      applyFiles(pasted);
    }
    document.addEventListener("paste", paste);
    return () => document.removeEventListener("paste", paste);
  });

  return <div className="file-upload-field wide">
    <div className="file-upload-heading"><label htmlFor={id}>{label}{required ? " *" : ""}</label><span>한 번에 총 {MAX_UPLOAD_LABEL} 이하</span></div>
    <button className="file-upload-dropzone" type="button" onClick={() => inputRef.current?.click()}>
      <strong>파일 선택 또는 Ctrl+V 붙여넣기</strong><small>이미지 캡처도 클립보드에서 바로 추가할 수 있습니다.</small>
    </button>
    <input ref={inputRef} id={id} className="file-upload-native" type="file" multiple={multiple} accept={UPLOAD_ACCEPT} onChange={(event) => applyFiles(Array.from(event.target.files ?? []))} />
    <p className="file-upload-policy"><b>가능:</b> {UPLOAD_FORMAT_LABEL}<br /><b>동영상 업로드 불가</b> · {MAX_UPLOAD_LABEL}로 제한합니다.</p>
    {currentFileName && files.length === 0 && <small className="asset-file-current">현재 파일: {currentFileName} · 새 파일을 선택하지 않으면 유지됩니다.</small>}
    {files.length > 0 && <ul className="selected-file-list">{files.map((file) => <li key={fileKey(file)}><span><strong>{file.name}</strong><small>{formatSize(file.size)}</small></span><button type="button" onClick={() => removeFile(fileKey(file))}>삭제</button></li>)}</ul>}
    {error && <p className="file-upload-error" role="alert">{error}</p>}
  </div>;
}
