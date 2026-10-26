import { NextResponse } from "next/server";
import { createWork } from "@/lib/server/mutations";

function input(form: FormData) { return { task_id: String(form.get("task_id") ?? ""), work_date: String(form.get("work_date") ?? ""), title: String(form.get("title") ?? ""), result_url: String(form.get("result_url") ?? ""), memo: String(form.get("memo") ?? ""), status: String(form.get("status") ?? ""), actor_id: String(form.get("actor_id") ?? ""), assignee_ids: form.getAll("assignee_ids").map(String), visitor_count: String(form.get("visitor_count") ?? ""), register_as_assets: form.get("register_as_assets") === "true", asset_category: String(form.get("asset_category") ?? "기타"), asset_version: String(form.get("asset_version") ?? "v1"), asset_status: String(form.get("asset_status") ?? "active") }; }
export async function POST(request: Request) {
  try { const form = await request.formData(); const id = await createWork(input(form), form.getAll("files").filter((item): item is File => item instanceof File)); return NextResponse.json({ id }, { status: 201 }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "작업을 저장하지 못했습니다." }, { status: 400 }); }
}
