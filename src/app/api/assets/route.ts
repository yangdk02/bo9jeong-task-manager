import { NextResponse } from "next/server";
import { createAsset } from "@/lib/server/mutations";

function input(form: FormData) { return { project_id: String(form.get("project_id") ?? ""), asset_name: String(form.get("asset_name") ?? ""), asset_category: String(form.get("asset_category") ?? ""), version: String(form.get("version") ?? ""), status: String(form.get("status") ?? ""), note: String(form.get("note") ?? ""), owner_person_id: String(form.get("owner_person_id") ?? ""), actor_id: String(form.get("actor_id") ?? "") }; }
export async function POST(request: Request) {
  try { const form = await request.formData(); const candidate = form.get("file"); const id = await createAsset(input(form), candidate instanceof File ? candidate : undefined); return NextResponse.json({ id }, { status: 201 }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "자료를 저장하지 못했습니다." }, { status: 400 }); }
}
