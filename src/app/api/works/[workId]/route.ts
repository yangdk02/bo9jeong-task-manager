import { NextResponse } from "next/server";
import { deleteWork, updateWork } from "@/lib/server/mutations";

type Context = { params: Promise<{ workId: string }> };
function input(form: FormData) { return { task_id: String(form.get("task_id") ?? ""), work_date: String(form.get("work_date") ?? ""), title: String(form.get("title") ?? ""), result_url: String(form.get("result_url") ?? ""), memo: String(form.get("memo") ?? ""), status: String(form.get("status") ?? ""), actor_id: String(form.get("actor_id") ?? ""), assignee_ids: form.getAll("assignee_ids").map(String), visitor_count: String(form.get("visitor_count") ?? "") }; }
export async function PATCH(request: Request, { params }: Context) {
  try { const { workId } = await params; const form = await request.formData(); await updateWork(workId, input(form), form.getAll("files").filter((item): item is File => item instanceof File)); return NextResponse.json({ id: workId }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "작업을 수정하지 못했습니다." }, { status: 400 }); }
}
export async function DELETE(_: Request, { params }: Context) {
  try { const { workId } = await params; await deleteWork(workId); return NextResponse.json({ ok: true }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "작업을 삭제하지 못했습니다." }, { status: 400 }); }
}
