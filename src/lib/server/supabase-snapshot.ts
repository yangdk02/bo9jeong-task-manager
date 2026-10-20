import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { TableName } from "@/lib/domain/schemas";

export type DatabaseSnapshot = Record<TableName, Record<string, unknown>[]>;

let dataClient: SupabaseClient | undefined;

function dataApiConfig() {
  const url = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  const key = process.env.SUPABASE_ANON_KEY?.trim() || process.env.SUPABASE_PUBLISHABLE_KEY?.trim() || "";
  return { url, key };
}

export function usesSupabaseDataApi() {
  const { url, key } = dataApiConfig();
  return Boolean(url && key);
}

export async function readSupabaseSnapshot(): Promise<DatabaseSnapshot> {
  if (!dataClient) {
    const { url, key } = dataApiConfig();
    if (!url || !key) throw new Error("Supabase Data API 환경변수가 설정되지 않았습니다.");
    dataClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }

  const { data, error } = await dataClient.rpc("bo9jeong_read_snapshot");
  if (error) throw new Error(`Supabase 데이터를 읽지 못했습니다: ${error.message}`);
  return data as DatabaseSnapshot;
}
