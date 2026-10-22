import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const defaultBucket = "bo9jeong-files";
let storageClient: SupabaseClient | undefined;

function storageConfig() {
  const url = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  const key =
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim() ||
    process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ||
    "";
  return { url, key, bucket: process.env.SUPABASE_STORAGE_BUCKET?.trim() || defaultBucket };
}

export function usesSupabaseStorage() {
  const { url, key } = storageConfig();
  return Boolean(url && key);
}

function getStorageClient() {
  if (!storageClient) {
    const { url, key } = storageConfig();
    if (!url || !key) throw new Error("Supabase Storage 환경변수가 설정되지 않았습니다.");
    storageClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return storageClient;
}

export function storageObjectPath(filePath: string) {
  const normalized = filePath.replaceAll("\\", "/").replace(/^\/+/, "");
  const segments = normalized.split("/");
  if (segments.shift() !== "storage" || !segments.length || segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error("잘못된 저장 파일 경로입니다.");
  }
  return segments.join("/");
}

function localStoragePath(filePath: string) {
  const storageRoot = path.resolve(process.cwd(), "storage");
  const target = path.resolve(storageRoot, ...storageObjectPath(filePath).split("/"));
  if (!target.startsWith(`${storageRoot}${path.sep}`)) throw new Error("잘못된 저장 파일 경로입니다.");
  return target;
}

export async function saveStoredFile(filePath: string, contents: Buffer, contentType?: string, options?: { upsert?: boolean }) {
  if (usesSupabaseStorage()) {
    const { bucket } = storageConfig();
    const { error } = await getStorageClient().storage.from(bucket).upload(storageObjectPath(filePath), contents, {
      contentType,
      upsert: options?.upsert ?? false,
    });
    if (error) throw new Error(`파일을 저장하지 못했습니다: ${error.message}`);
    return;
  }

  const target = localStoragePath(filePath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, contents);
}

export async function removeStoredFiles(filePaths: string[]) {
  if (!filePaths.length) return;

  if (usesSupabaseStorage()) {
    const { bucket } = storageConfig();
    const { error } = await getStorageClient().storage.from(bucket).remove(filePaths.map(storageObjectPath));
    if (error) throw new Error(`파일을 삭제하지 못했습니다: ${error.message}`);
    return;
  }

  await Promise.all(filePaths.map((filePath) => rm(localStoragePath(filePath), { force: true })));
}

export async function readLocalStoredFile(filePath: string) {
  return readFile(localStoragePath(filePath));
}

export async function readStoredFile(filePath: string) {
  if (!usesSupabaseStorage()) return readLocalStoredFile(filePath);
  const { bucket } = storageConfig();
  const { data, error } = await getStorageClient().storage.from(bucket).download(storageObjectPath(filePath));
  if (error) throw new Error(`파일을 읽지 못했습니다: ${error.message}`);
  return Buffer.from(await data.arrayBuffer());
}

export async function getStoredFileUrl(filePath: string) {
  if (!usesSupabaseStorage()) return undefined;
  const { bucket } = storageConfig();
  const { data, error } = await getStorageClient().storage.from(bucket).createSignedUrl(storageObjectPath(filePath), 3600);
  if (error) throw new Error(`파일 주소를 만들지 못했습니다: ${error.message}`);
  return data.signedUrl;
}

