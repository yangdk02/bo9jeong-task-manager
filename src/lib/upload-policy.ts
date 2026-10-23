export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const MAX_UPLOAD_LABEL = "4MB";

export const ALLOWED_UPLOAD_EXTENSIONS = [
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".txt", ".csv", ".zip", ".ai", ".psd", ".indd",
] as const;

export const UPLOAD_ACCEPT = ALLOWED_UPLOAD_EXTENSIONS.join(",");
export const UPLOAD_FORMAT_LABEL = "PNG, JPG, JPEG, GIF, WEBP, SVG, PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV, ZIP, AI, PSD, INDD";

const allowed = new Set<string>(ALLOWED_UPLOAD_EXTENSIONS);

export function fileExtension(fileName: string) {
  const index = fileName.lastIndexOf(".");
  return index >= 0 ? fileName.slice(index).toLowerCase() : "";
}

export function validateUploadFiles(files: ArrayLike<{ name: string; size: number }>) {
  const list = Array.from(files);
  const unsupported = list.find((file) => !allowed.has(fileExtension(file.name)));
  if (unsupported) return `${unsupported.name}: 허용되지 않는 확장자입니다. 동영상 파일은 업로드할 수 없습니다.`;
  const total = list.reduce((sum, file) => sum + file.size, 0);
  if (total > MAX_UPLOAD_BYTES) return `선택한 파일의 총용량이 ${MAX_UPLOAD_LABEL}를 초과합니다. Vercel 전송 한도 때문에 한 번에 총 ${MAX_UPLOAD_LABEL}까지만 업로드할 수 있습니다.`;
  return "";
}
